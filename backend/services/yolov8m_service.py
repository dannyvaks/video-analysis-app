"""
YOLOv8m Detection Service
Handles object detection using the YOLOv8m model with focus on micro-mobility vehicles.
"""

import os
import time
import logging
from typing import List, Dict, Tuple, Optional, Callable
import numpy as np
import cv2
from PIL import Image
import torch
from ultralytics import YOLO
from dataclasses import dataclass
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VehicleType(Enum):
    """Vehicle classification types"""
    BICYCLE = "bicycle"
    MOTORCYCLE = "motorcycle"
    ELECTRIC_MOTORCYCLE = "electric_motorcycle"
    ELECTRIC_SCOOTER = "electric_scooter"
    MOTORCYCLE_CAB = "motorcycle_cab"
    CAR = "car"
    TRUCK = "truck"
    BUS = "bus"
    VAN = "van"
    UNKNOWN = "unknown"

class DetectionMode(Enum):
    """Detection filtering modes"""
    MICRO_MOBILITY_ONLY = "micro_mobility_only"
    ALL_VEHICLES = "all_vehicles"

@dataclass
class BoundingBox:
    """Bounding box coordinates"""
    x: float
    y: float
    width: float
    height: float
    
    def to_dict(self) -> Dict:
        return {
            "x": self.x,
            "y": self.y,
            "width": self.width,
            "height": self.height
        }

@dataclass
class ModelSuggestion:
    """Model prediction with confidence"""
    vehicle_type: VehicleType
    confidence: float
    
    def to_dict(self) -> Dict:
        return {
            "type": self.vehicle_type.value,
            "confidence": self.confidence
        }

@dataclass
class Detection:
    """Single object detection result"""
    class_name: str
    confidence: float
    bbox: BoundingBox
    class_id: int
    
    def to_dict(self) -> Dict:
        return {
            "class": self.class_name,
            "confidence": self.confidence,
            "bbox": self.bbox.to_dict(),
            "class_id": self.class_id
        }

class YOLOv8mService:
    """
    YOLOv8m detection service optimized for micro-mobility and vehicle detection.
    
    Features:
    - YOLOv8m model with proven 88% F1 score for micro-mobility detection
    - Smart class mapping for micro-mobility vehicles
    - Configurable confidence thresholds
    - GPU acceleration support
    - Progress tracking capabilities
    """
    
    # COCO class names mapping to our vehicle types
    COCO_TO_VEHICLE_TYPE = {
        'bicycle': VehicleType.BICYCLE,
        'motorcycle': VehicleType.MOTORCYCLE,
        'car': VehicleType.CAR,
        'truck': VehicleType.TRUCK,
        'bus': VehicleType.BUS,
    }
    
    # Micro-mobility specific classes
    MICRO_MOBILITY_CLASSES = {
        VehicleType.BICYCLE,
        VehicleType.MOTORCYCLE,
        VehicleType.ELECTRIC_MOTORCYCLE,
        VehicleType.ELECTRIC_SCOOTER,
        VehicleType.MOTORCYCLE_CAB
    }
    
    def __init__(self, 
                 model_path: str = "yolov8m.pt",
                 confidence_threshold: float = 0.5,
                 iou_threshold: float = 0.45,
                 device: str = "auto"):
        """
        Initialize YOLOv8m service.
        
        Args:
            model_path: Path to YOLOv8m model weights
            confidence_threshold: Minimum confidence for detections
            iou_threshold: IoU threshold for NMS
            device: Device to run inference on ('auto', 'cpu', 'cuda')
        """
        self.model_path = model_path
        self.confidence_threshold = confidence_threshold
        self.iou_threshold = iou_threshold
        self.device = self._setup_device(device)
        
        self.model = None
        self.is_loaded = False
        self.class_names = []
        
        # Progress callback
        self.progress_callback: Optional[Callable] = None
        
        logger.info(f"YOLOv8m Service initialized with device: {self.device}")
    
    def _setup_device(self, device: str) -> str:
        """Setup and validate device for inference."""
        if device == "auto":
            if torch.cuda.is_available():
                device = "cuda"
                logger.info(f"CUDA available. Using GPU: {torch.cuda.get_device_name()}")
            else:
                device = "cpu"
                logger.info("CUDA not available. Using CPU.")
        
        return device
    
    async def load_model(self) -> bool:
        """
        Load YOLOv8m model with progress tracking.
        
        Returns:
            bool: True if model loaded successfully
        """
        try:
            if self.progress_callback:
                self.progress_callback({
                    "status": "downloading",
                    "message": "Loading YOLOv8m model...",
                    "percentage": 0
                })
            
            logger.info(f"Loading YOLOv8m model from: {self.model_path}")
            start_time = time.time()
            
            # Load model
            self.model = YOLO(self.model_path)
            
            # Configure model
            self.model.to(self.device)
            
            # Get class names
            self.class_names = list(self.model.names.values())
            
            if self.progress_callback:
                self.progress_callback({
                    "status": "loading",
                    "message": "Initializing model...",
                    "percentage": 50
                })
            
            # Warm up model with dummy inference
            dummy_image = np.zeros((640, 640, 3), dtype=np.uint8)
            _ = self.model(dummy_image, verbose=False)
            
            load_time = time.time() - start_time
            self.is_loaded = True
            
            if self.progress_callback:
                self.progress_callback({
                    "status": "ready",
                    "message": f"Model loaded successfully in {load_time:.2f}s",
                    "percentage": 100
                })
            
            logger.info(f"✅ YOLOv8m model loaded successfully in {load_time:.2f}s")
            logger.info(f"📊 Model info: {len(self.class_names)} classes, Device: {self.device}")
            
            return True
            
        except Exception as e:
            error_msg = f"Failed to load YOLOv8m model: {str(e)}"
            logger.error(error_msg)
            
            if self.progress_callback:
                self.progress_callback({
                    "status": "error",
                    "message": error_msg,
                    "percentage": 0
                })
            
            return False
    
    def detect_objects(self, 
                      image: np.ndarray,
                      detection_mode: DetectionMode = DetectionMode.MICRO_MOBILITY_ONLY) -> List[Detection]:
        """
        Detect objects in an image using YOLOv8m.
        
        Args:
            image: Input image as numpy array (BGR format)
            detection_mode: Filter mode for vehicle types
            
        Returns:
            List of Detection objects
        """
        if not self.is_loaded:
            logger.error("Model not loaded!")
            return []
        
        # Add debugging info
        logger.info(f"Input image shape: {image.shape}, dtype: {image.dtype}")
        logger.info(f"Model device: {self.device}")
        logger.info(f"Confidence threshold: {self.confidence_threshold}")
        
        try:
            # Run inference
            results = self.model(
                image,
                conf=self.confidence_threshold,
                iou=self.iou_threshold,
                verbose=False
            )
            
            # Add detailed logging about raw results
            logger.info(f"Model returned {len(results)} result objects")
            
            if results and len(results) > 0:
                result = results[0]
                logger.info(f"First result: boxes shape = {result.boxes.data.shape if result.boxes is not None else 'None'}")
                if result.boxes is not None:
                    logger.info(f"Raw boxes tensor: {result.boxes.data}")
            
            detections = []
            
            # Process results
            for result in results:
                if result.boxes is not None:
                    boxes = result.boxes.cpu().numpy()
                    
                    for i, box in enumerate(boxes):
                        # Extract detection data
                        class_id = int(box.cls[0])
                        confidence = float(box.conf[0])
                        x1, y1, x2, y2 = box.xyxy[0]
                        
                        # Get class name
                        class_name = self.class_names[class_id]
                        
                        # Add this logging in detect_objects method, after getting class_name:
                        logger.info(f"Detection: class_id={class_id}, class_name='{class_name}', confidence={confidence:.2f}")
                        logger.info(f"Vehicle type mapping: {self.COCO_TO_VEHICLE_TYPE.get(class_name, 'NOT_MAPPED')}")
                        logger.info(f"Should include: {self._should_include_detection(class_name, detection_mode)}")
                        
                        # Filter based on detection mode
                        if self._should_include_detection(class_name, detection_mode):
                            # Create bounding box
                            bbox = BoundingBox(
                                x=float(x1),
                                y=float(y1),
                                width=float(x2 - x1),
                                height=float(y2 - y1)
                            )
                            
                            # Create detection
                            detection = Detection(
                                class_name=class_name,
                                confidence=confidence,
                                bbox=bbox,
                                class_id=class_id
                            )
                            
                            detections.append(detection)
            
            logger.debug(f"Detected {len(detections)} objects")
            
            # After processing all detections, add this logging:
            if detections:
                logger.info(f"✅ Returning {len(detections)} detections after filtering")
                for det in detections:
                    logger.info(f"  - {det.class_name}: {det.confidence:.2f}")
            else:
                logger.warning(f"❌ No detections passed filtering. Mode: {detection_mode}")
                logger.warning(f"   Available classes in COCO_TO_VEHICLE_TYPE: {list(self.COCO_TO_VEHICLE_TYPE.keys())}")
            
            return detections
            
        except Exception as e:
            logger.error(f"Detection failed: {str(e)}")
            raise
    
    def _should_include_detection(self, class_name: str, mode: DetectionMode) -> bool:
        """Check if detection should be included based on filtering mode."""
        vehicle_type = self.COCO_TO_VEHICLE_TYPE.get(class_name, VehicleType.UNKNOWN)
        
        if mode == DetectionMode.MICRO_MOBILITY_ONLY:
            return vehicle_type in self.MICRO_MOBILITY_CLASSES
        elif mode == DetectionMode.ALL_VEHICLES:
            return vehicle_type != VehicleType.UNKNOWN
        
        return False
    
    def get_top_suggestions(self, 
                           detections: List[Detection], 
                           max_suggestions: int = 3) -> List[ModelSuggestion]:
        """
        Get top model suggestions for detected objects.
        
        Args:
            detections: List of detections from the same object
            max_suggestions: Maximum number of suggestions to return
            
        Returns:
            List of model suggestions sorted by confidence
        """
        if not detections:
            return []
        
        # Sort detections by confidence
        sorted_detections = sorted(detections, key=lambda d: d.confidence, reverse=True)
        
        suggestions = []
        seen_classes = set()
        
        for detection in sorted_detections:
            if len(suggestions) >= max_suggestions:
                break
                
            if detection.class_name not in seen_classes:
                vehicle_type = self.COCO_TO_VEHICLE_TYPE.get(
                    detection.class_name, 
                    VehicleType.UNKNOWN
                )
                
                suggestion = ModelSuggestion(
                    vehicle_type=vehicle_type,
                    confidence=detection.confidence
                )
                
                suggestions.append(suggestion)
                seen_classes.add(detection.class_name)
        
        return suggestions
    
    def set_progress_callback(self, callback: Callable):
        """Set progress callback for model loading."""
        self.progress_callback = callback
    
    def get_model_info(self) -> Dict:
        """Get information about the loaded model."""
        if not self.is_loaded:
            return {"loaded": False}
        
        return {
            "loaded": True,
            "model_path": self.model_path,
            "device": self.device,
            "confidence_threshold": self.confidence_threshold,
            "iou_threshold": self.iou_threshold,
            "num_classes": len(self.class_names),
            "class_names": self.class_names,
            "micro_mobility_classes": [vt.value for vt in self.MICRO_MOBILITY_CLASSES]
        }
    
    def update_thresholds(self, confidence: float, iou: float):
        """Update detection thresholds."""
        self.confidence_threshold = confidence
        self.iou_threshold = iou
        logger.info(f"Updated thresholds - Confidence: {confidence}, IoU: {iou}")

# Example usage and testing
if __name__ == "__main__":
    import asyncio
    
    async def test_service():
        """Test the YOLOv8m service."""
        service = YOLOv8mService()
        
        # Set up progress callback
        def progress_callback(progress):
            print(f"Progress: {progress}")
        
        service.set_progress_callback(progress_callback)
        
        # Load model
        success = await service.load_model()
        if not success:
            print("Failed to load model")
            return
        
        # Test with dummy image
        test_image = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        
        # Detect objects
        detections = service.detect_objects(test_image, DetectionMode.MICRO_MOBILITY_ONLY)
        print(f"Found {len(detections)} micro-mobility detections")
        
        # Get model info
        info = service.get_model_info()
        print(f"Model info: {info}")
    
    # Run test
    asyncio.run(test_service())
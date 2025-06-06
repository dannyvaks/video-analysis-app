"""
Video Processor Service
Handles video frame extraction, object tracking, and unique detection filtering.
"""

import os
import time
import logging
import base64
from typing import List, Dict, Tuple, Optional, Callable, Set
from dataclasses import dataclass, field
from enum import Enum
import uuid
import asyncio

import cv2
import numpy as np
from moviepy.editor import VideoFileClip
import tempfile
from scipy.spatial.distance import euclidean
from filterpy.kalman import KalmanFilter
from PIL import Image
import io

from .yolov8m_service import YOLOv8mService, Detection, DetectionMode, VehicleType

# Configure logging
logger = logging.getLogger(__name__)

@dataclass
class VideoMetadata:
    """Video file metadata"""
    filename: str
    duration: float
    width: int
    height: int
    fps: float
    frame_count: int
    file_size: int
    uploaded_at: str
    
    def to_dict(self) -> Dict:
        return {
            "filename": self.filename,
            "duration": self.duration,
            "width": self.width,
            "height": self.height,
            "fps": self.fps,
            "frameCount": self.frame_count,
            "fileSize": self.file_size,
            "uploadedAt": self.uploaded_at
        }

@dataclass
class ProcessingProgress:
    """Video processing progress tracking"""
    current_frame: int
    total_frames: int
    percentage: float
    estimated_time_remaining: Optional[float]
    status: str
    message: str
    
    def to_dict(self) -> Dict:
        return {
            "currentFrame": self.current_frame,
            "totalFrames": self.total_frames,
            "percentage": self.percentage,
            "estimatedTimeRemaining": self.estimated_time_remaining,
            "status": self.status,
            "message": self.message
        }

@dataclass
class TrackedObject:
    """Object being tracked across frames"""
    id: str
    class_name: str
    last_seen_frame: int
    track_history: List[Tuple[float, float]] = field(default_factory=list)
    confidence_history: List[float] = field(default_factory=list)
    bbox_history: List[Tuple[float, float, float, float]] = field(default_factory=list)
    age: int = 0
    
    def update(self, detection: Detection, frame_number: int):
        """Update tracked object with new detection"""
        center_x = detection.bbox.x + detection.bbox.width / 2
        center_y = detection.bbox.y + detection.bbox.height / 2
        
        self.track_history.append((center_x, center_y))
        self.confidence_history.append(detection.confidence)
        self.bbox_history.append((
            detection.bbox.x, 
            detection.bbox.y, 
            detection.bbox.width, 
            detection.bbox.height
        ))
        self.last_seen_frame = frame_number
        self.age += 1
        
        # Keep only recent history (last 10 frames)
        if len(self.track_history) > 10:
            self.track_history = self.track_history[-10:]
            self.confidence_history = self.confidence_history[-10:]
            self.bbox_history = self.bbox_history[-10:]

@dataclass
class UniqueDetection:
    """A unique detection event for user review"""
    id: str
    timestamp: str
    frame_number: int
    full_frame_image_data: str  # Base64 encoded full frame with bbox overlay
    frame_image_data: str  # Base64 encoded fixed-size crop
    bbox: Dict
    model_suggestions: List[Dict]
    user_choice: Optional[str]
    is_manual_label: bool
    is_manual_correction: bool
    processed_at: str
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "timestamp": self.timestamp,
            "frameNumber": self.frame_number,
            "fullFrameImageData": self.full_frame_image_data,
            "frameImageData": self.frame_image_data,
            "boundingBox": self.bbox,
            "modelSuggestions": self.model_suggestions,
            "userChoice": self.user_choice,
            "isManualLabel": self.is_manual_label,
            "isManualCorrection": self.is_manual_correction,
            "processedAt": self.processed_at
        }

class VideoProcessorService:
    """
    Video processing service with object tracking and unique detection filtering.
    
    Features:
    - Frame-by-frame video analysis
    - Object tracking across frames to avoid duplicates
    - Smart deduplication using IoU and distance metrics
    - Unique detection extraction for user review
    - Progress tracking and async processing
    """
    
    def __init__(self, 
                 iou_threshold: float = 0.5,
                 distance_threshold: float = 50.0,
                 max_missing_frames: int = 10):
        """
        Initialize video processor.
        
        Args:
            iou_threshold: IoU threshold for object matching
            distance_threshold: Distance threshold for tracking
            max_missing_frames: Max frames an object can be missing before removal
        """
        self.iou_threshold = iou_threshold
        self.distance_threshold = distance_threshold
        self.max_missing_frames = max_missing_frames
        
        # Tracking state
        self.tracked_objects: Dict[str, TrackedObject] = {}
        self.unique_detections: List[UniqueDetection] = []
        self.frame_skip = 1  # Process every nth frame for efficiency
        
        # Progress callback
        self.progress_callback: Optional[Callable] = None
        
        logger.info("Video Processor Service initialized")
    
    def set_progress_callback(self, callback: Callable):
        """Set progress callback for processing updates."""
        self.progress_callback = callback
    
    async def extract_metadata(self, video_path: str) -> VideoMetadata:
        """
        Extract metadata from video file.
        
        Args:
            video_path: Path to video file
            
        Returns:
            VideoMetadata object
        """
        try:
            # Use OpenCV for basic metadata (faster)
            cap = cv2.VideoCapture(video_path)
            
            if not cap.isOpened():
                raise ValueError(f"Cannot open video file: {video_path}")
            
            # Get video properties
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            duration = frame_count / fps if fps > 0 else 0
            
            cap.release()
            
            # Get file size
            file_size = os.path.getsize(video_path)
            filename = os.path.basename(video_path)
            
            metadata = VideoMetadata(
                filename=filename,
                duration=duration,
                width=width,
                height=height,
                fps=fps,
                frame_count=frame_count,
                file_size=file_size,
                uploaded_at=time.strftime('%Y-%m-%d %H:%M:%S')
            )
            
            logger.info(f"Video metadata extracted: {metadata.filename} "
                       f"({duration:.1f}s, {frame_count} frames, {fps:.1f} FPS)")
            
            return metadata
            
        except Exception as e:
            logger.error(f"Failed to extract video metadata: {str(e)}")
            raise
    
    async def process_video(self, 
                           video_path: str,
                           yolo_service: YOLOv8mService,
                           detection_mode: DetectionMode = DetectionMode.MICRO_MOBILITY_ONLY,
                           frame_skip: int = 1) -> List[UniqueDetection]:
        """
        Process video and extract unique detections.
        
        Args:
            video_path: Path to video file
            yolo_service: YOLOv8m detection service
            detection_mode: Vehicle detection filtering mode
            frame_skip: Process every nth frame (1 = all frames)
            
        Returns:
            List of unique detections for user review
        """
        if not yolo_service.is_loaded:
            raise RuntimeError("YOLOv8m model not loaded")
        
        # Reset state
        self.tracked_objects = {}
        self.unique_detections = []
        self.frame_skip = frame_skip
        
        try:
            # Open video
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise ValueError(f"Cannot open video: {video_path}")
            
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            
            logger.info(f"Processing video: {total_frames} frames at {fps:.1f} FPS")
            
            frame_number = 0
            processed_frames = 0
            start_time = time.time()
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Skip frames if configured
                if frame_number % self.frame_skip != 0:
                    frame_number += 1
                    continue
                
                # Update progress
                await self._update_progress(
                    frame_number, total_frames, start_time, "Processing frames..."
                )
                
                # Detect objects in current frame
                detections = yolo_service.detect_objects(frame, detection_mode)
                
                logger.info(f"Frame {frame_number}: Raw detections before filtering: {len(detections)}")
                for det in detections:
                    logger.info(f"  - {det.class_name}: {det.confidence:.2f}")
                
                # Process detections and update tracking
                await self._process_frame_detections(
                    detections, frame, frame_number, fps
                )
                
                processed_frames += 1
                frame_number += 1
                
                # Yield control periodically for async processing
                if processed_frames % 10 == 0:
                    await asyncio.sleep(0.001)
            
            cap.release()
            
            # Final progress update
            await self._update_progress(
                total_frames, total_frames, start_time, "Processing complete!"
            )
            
            logger.info(f"Video processing complete: {len(self.unique_detections)} "
                       f"unique detections found")
            
            return self.unique_detections
            
        except Exception as e:
            logger.error(f"Video processing failed: {str(e)}")
            if 'cap' in locals():
                cap.release()
            raise
    
    async def _process_frame_detections(self, 
                                       detections: List[Detection],
                                       frame: np.ndarray,
                                       frame_number: int,
                                       fps: float):
        """Process detections from a single frame."""
        # Match detections to existing tracked objects
        matched_objects, unmatched_detections = self._match_detections_to_tracks(detections)
        
        # Update existing tracks
        for track_id, detection in matched_objects.items():
            self.tracked_objects[track_id].update(detection, frame_number)
        
        # Create new tracks for unmatched detections
        for detection in unmatched_detections:
            await self._create_new_track(detection, frame, frame_number, fps)
        
        # Clean up old tracks
        self._cleanup_old_tracks(frame_number)
    
    def _match_detections_to_tracks(self, 
                                   detections: List[Detection]) -> Tuple[Dict[str, Detection], List[Detection]]:
        """Match current detections to existing tracked objects."""
        matched_objects = {}
        unmatched_detections = list(detections)
        
        for track_id, tracked_obj in self.tracked_objects.items():
            if not tracked_obj.track_history:
                continue
            
            best_match = None
            best_score = float('inf')
            
            for i, detection in enumerate(unmatched_detections):
                # Calculate IoU and distance
                iou = self._calculate_iou(detection, tracked_obj)
                distance = self._calculate_center_distance(detection, tracked_obj)
                
                # Combined score (lower is better)
                score = (1 - iou) + (distance / self.distance_threshold)
                
                if (iou > self.iou_threshold or distance < self.distance_threshold) and score < best_score:
                    best_match = i
                    best_score = score
            
            if best_match is not None:
                matched_objects[track_id] = unmatched_detections.pop(best_match)
        
        return matched_objects, unmatched_detections
    
    def _calculate_iou(self, detection: Detection, tracked_obj: TrackedObject) -> float:
        """Calculate IoU between detection and tracked object."""
        if not tracked_obj.bbox_history:
            return 0.0
        
        # Get last known bbox
        last_bbox = tracked_obj.bbox_history[-1]
        
        # Current detection bbox
        det_x1, det_y1 = detection.bbox.x, detection.bbox.y
        det_x2, det_y2 = det_x1 + detection.bbox.width, det_y1 + detection.bbox.height
        
        # Tracked object bbox
        track_x1, track_y1, track_w, track_h = last_bbox
        track_x2, track_y2 = track_x1 + track_w, track_y1 + track_h
        
        # Calculate intersection
        inter_x1 = max(det_x1, track_x1)
        inter_y1 = max(det_y1, track_y1)
        inter_x2 = min(det_x2, track_x2)
        inter_y2 = min(det_y2, track_y2)
        
        if inter_x2 <= inter_x1 or inter_y2 <= inter_y1:
            return 0.0
        
        inter_area = (inter_x2 - inter_x1) * (inter_y2 - inter_y1)
        det_area = detection.bbox.width * detection.bbox.height
        track_area = track_w * track_h
        union_area = det_area + track_area - inter_area
        
        return inter_area / union_area if union_area > 0 else 0.0
    
    def _calculate_center_distance(self, detection: Detection, tracked_obj: TrackedObject) -> float:
        """Calculate distance between detection center and tracked object center."""
        if not tracked_obj.track_history:
            return float('inf')
        
        # Detection center
        det_center_x = detection.bbox.x + detection.bbox.width / 2
        det_center_y = detection.bbox.y + detection.bbox.height / 2
        
        # Last known center of tracked object
        track_center_x, track_center_y = tracked_obj.track_history[-1]
        
        return euclidean([det_center_x, det_center_y], [track_center_x, track_center_y])
    
    async def _create_new_track(self, 
                               detection: Detection,
                               frame: np.ndarray,
                               frame_number: int,
                               fps: float):
        """Create new tracked object and unique detection."""
        track_id = str(uuid.uuid4())
        
        # Create tracked object
        tracked_obj = TrackedObject(
            id=track_id,
            class_name=detection.class_name,
            last_seen_frame=frame_number
        )
        tracked_obj.update(detection, frame_number)
        
        self.tracked_objects[track_id] = tracked_obj
        
        # Create unique detection for user review
        await self._create_unique_detection(detection, frame, frame_number, fps, track_id)
    
    async def _create_unique_detection(self, 
                                      detection: Detection,
                                      frame: np.ndarray,
                                      frame_number: int,
                                      fps: float,
                                      track_id: str):
        """Create unique detection entry for user review."""
        logger.info(f"🎯 Fresh: Creating unique detection for {detection.class_name} at frame {frame_number}")
        
        # Calculate timestamp
        timestamp = self._frame_to_timestamp(frame_number, fps)
        
        # Extract both full frame with bbox and crop
        logger.info(f"🖼️ Fresh: About to extract images for {detection.class_name}")
        full_frame_data, crop_image_data = self._extract_detection_images(frame, detection)
        logger.info(f"🖼️ Fresh: Image extraction complete - Full: {len(full_frame_data)} chars, Crop: {len(crop_image_data)} chars")
        
        # Generate model suggestions (top 3)
        model_suggestions = self._generate_model_suggestions(detection)
        logger.info(f"🤖 Fresh: Generated {len(model_suggestions)} suggestions")
        
        unique_detection = UniqueDetection(
            id=track_id,
            timestamp=timestamp,
            frame_number=frame_number,
            full_frame_image_data=full_frame_data,
            frame_image_data=crop_image_data,
            bbox=detection.bbox.to_dict(),
            model_suggestions=model_suggestions,
            user_choice=None,
            is_manual_label=False,
            is_manual_correction=False,
            processed_at=time.strftime('%Y-%m-%d %H:%M:%S')
        )
        
        self.unique_detections.append(unique_detection)
        
        logger.info(f"✅ Fresh: Created unique detection with full_frame_data: {len(full_frame_data) > 0}, crop_data: {len(crop_image_data) > 0}")
    
    def _frame_to_timestamp(self, frame_number: int, fps: float) -> str:
        """Convert frame number to timestamp string."""
        total_seconds = frame_number / fps
        hours = int(total_seconds // 3600)
        minutes = int((total_seconds % 3600) // 60)
        seconds = total_seconds % 60
        
        return f"{hours:02d}:{minutes:02d}:{seconds:06.3f}"
    
    def _extract_detection_images(self, frame: np.ndarray, detection: Detection) -> Tuple[str, str]:
        """Extract full frame with bbox overlay and fixed-size crop."""
        try:
            logger.info(f"🖼️ Extracting images for detection: {detection.class_name} at ({detection.bbox.x}, {detection.bbox.y})")
            
            # Create full frame with bounding box overlay
            full_frame_with_bbox = self._create_full_frame_with_bbox(frame, detection)
            full_frame_data = self._encode_image_to_base64(full_frame_with_bbox)
            
            # Create fixed-size crop of detected object
            crop_image = self._create_detection_crop(frame, detection, target_size=224)
            crop_data = self._encode_image_to_base64(crop_image)
            
            logger.info(f"✅ Generated images - Full frame: {len(full_frame_data)} chars, Crop: {len(crop_data)} chars")
            
            return full_frame_data, crop_data
            
        except Exception as e:
            logger.error(f"❌ Failed to extract detection images: {str(e)}")
            return "", ""
    
    def _create_full_frame_with_bbox(self, frame: np.ndarray, detection: Detection) -> np.ndarray:
        """Create full frame with bounding box overlay."""
        frame_with_bbox = frame.copy()
        
        # Extract bbox coordinates
        x1, y1 = int(detection.bbox.x), int(detection.bbox.y)
        x2, y2 = x1 + int(detection.bbox.width), y1 + int(detection.bbox.height)
        
        # Draw bounding box (bright green)
        cv2.rectangle(frame_with_bbox, (x1, y1), (x2, y2), (0, 255, 0), 3)
        
        # Add label with class name and confidence
        label = f"{detection.class_name}: {detection.confidence:.2f}"
        label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)[0]
        
        # Draw label background
        cv2.rectangle(frame_with_bbox, 
                     (x1, y1 - label_size[1] - 10), 
                     (x1 + label_size[0], y1), 
                     (0, 255, 0), -1)
        
        # Draw label text
        cv2.putText(frame_with_bbox, label, 
                   (x1, y1 - 5), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
        
        return frame_with_bbox
    
    def _create_detection_crop(self, frame: np.ndarray, detection: Detection, target_size: int = 224) -> np.ndarray:
        """Create fixed-size crop of detected object."""
        # Extract bbox coordinates with padding
        bbox_area = detection.bbox.width * detection.bbox.height
        padding_ratio = max(0.2, min(0.5, 5000 / bbox_area))  # Adaptive padding
        
        pad_w = detection.bbox.width * padding_ratio
        pad_h = detection.bbox.height * padding_ratio
        
        x1 = max(0, int(detection.bbox.x - pad_w))
        y1 = max(0, int(detection.bbox.y - pad_h))
        x2 = min(frame.shape[1], int(detection.bbox.x + detection.bbox.width + pad_w))
        y2 = min(frame.shape[0], int(detection.bbox.y + detection.bbox.height + pad_h))
        
        # Extract crop region
        crop = frame[y1:y2, x1:x2]
        
        # Resize to fixed size while maintaining aspect ratio
        h, w = crop.shape[:2]
        if h == 0 or w == 0:
            # Fallback to minimal crop if region is invalid
            crop = frame[int(detection.bbox.y):int(detection.bbox.y + detection.bbox.height),
                        int(detection.bbox.x):int(detection.bbox.x + detection.bbox.width)]
            h, w = crop.shape[:2]
        
        if h > w:
            new_h, new_w = target_size, int(w * target_size / h)
        else:
            new_h, new_w = int(h * target_size / w), target_size
        
        resized_crop = cv2.resize(crop, (new_w, new_h))
        
        # Center crop to exact target size
        final_crop = np.zeros((target_size, target_size, 3), dtype=np.uint8)
        y_offset = (target_size - new_h) // 2
        x_offset = (target_size - new_w) // 2
        final_crop[y_offset:y_offset + new_h, x_offset:x_offset + new_w] = resized_crop
        
        return final_crop
    
    def _encode_image_to_base64(self, image: np.ndarray, max_size: int = 800) -> str:
        """Encode image to base64 with optional resizing."""
        # Convert BGR to RGB
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Resize if too large
        h, w = image_rgb.shape[:2]
        if max(h, w) > max_size:
            scale = max_size / max(h, w)
            new_w, new_h = int(w * scale), int(h * scale)
            image_rgb = cv2.resize(image_rgb, (new_w, new_h))
        
        # Convert to PIL and encode
        pil_image = Image.fromarray(image_rgb)
        buffer = io.BytesIO()
        pil_image.save(buffer, format='JPEG', quality=90)
        
        image_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
        return f"data:image/jpeg;base64,{image_data}"
    
    def _generate_model_suggestions(self, detection: Detection) -> List[Dict]:
        """Generate top 3 model suggestions for detection."""
        suggestions = [
            {
                "type": detection.class_name,
                "confidence": detection.confidence
            }
        ]
        
        # Add alternative suggestions based on class similarity
        alternatives = self._get_similar_classes(detection.class_name)
        for alt_class in alternatives[:2]:  # Top 2 alternatives
            suggestions.append({
                "type": alt_class,
                "confidence": detection.confidence * 0.8  # Lower confidence for alternatives
            })
        
        # Ensure we always have exactly 3 suggestions
        while len(suggestions) < 3:
            suggestions.append({
                "type": "unknown",
                "confidence": detection.confidence * 0.6
            })
        
        return suggestions[:3]  # Return exactly 3
    
    def _get_similar_classes(self, class_name: str) -> List[str]:
        """Get similar vehicle classes for suggestions."""
        similar_classes = {
            'bicycle': ['motorcycle', 'electric_scooter'],
            'motorcycle': ['bicycle', 'electric_motorcycle'],
            'car': ['truck', 'van'],
            'truck': ['car', 'bus'],
            'bus': ['truck', 'van']
        }
        
        return similar_classes.get(class_name, [])
    
    def _cleanup_old_tracks(self, current_frame: int):
        """Remove tracks that haven't been seen for too long."""
        tracks_to_remove = []
        
        for track_id, tracked_obj in self.tracked_objects.items():
            frames_missing = current_frame - tracked_obj.last_seen_frame
            if frames_missing > self.max_missing_frames:
                tracks_to_remove.append(track_id)
        
        for track_id in tracks_to_remove:
            del self.tracked_objects[track_id]
    
    async def _update_progress(self, 
                              current_frame: int,
                              total_frames: int,
                              start_time: float,
                              message: str):
        """Update processing progress."""
        if not self.progress_callback:
            return
        
        percentage = (current_frame / total_frames) * 100
        elapsed_time = time.time() - start_time
        
        # Estimate remaining time
        if current_frame > 0:
            avg_time_per_frame = elapsed_time / current_frame
            remaining_frames = total_frames - current_frame
            estimated_time_remaining = avg_time_per_frame * remaining_frames
        else:
            estimated_time_remaining = None
        
        progress = ProcessingProgress(
            current_frame=current_frame,
            total_frames=total_frames,
            percentage=percentage,
            estimated_time_remaining=estimated_time_remaining,
            status="processing",
            message=message
        )
        
        await self.progress_callback(progress.to_dict())

# Example usage
if __name__ == "__main__":
    import asyncio
    from .yolov8m_service import YOLOv8mService, DetectionMode
    
    async def test_processor():
        # Initialize services
        yolo_service = YOLOv8mService()
        processor = VideoProcessorService()
        
        # Load model
        await yolo_service.load_model()
        
        # Test video processing (replace with actual video path)
        video_path = "test_video.mp4"
        if os.path.exists(video_path):
            detections = await processor.process_video(
                video_path, yolo_service, DetectionMode.MICRO_MOBILITY_ONLY
            )
            print(f"Found {len(detections)} unique detections")
        else:
            print("Test video not found")
    
    # Run test
    asyncio.run(test_processor())
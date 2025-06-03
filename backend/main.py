"""
FastAPI Backend for Video Analysis Application
Main application orchestrating YOLOv8m detection, video processing, and export services.
"""

import os
import logging
import tempfile
import asyncio
from typing import List, Dict, Optional
from contextlib import asynccontextmanager
import shutil

from fastapi import FastAPI, File, UploadFile, HTTPException, WebSocket, WebSocketDisconnect, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import uvicorn
from datetime import datetime
import json

# Import our services
from services.yolov8m_service import YOLOv8mService, DetectionMode
from services.video_processor_service import VideoProcessorService, VideoMetadata
from services.export_service import ExportService, ExportConfig

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('video_analysis.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Global service instances
yolo_service: Optional[YOLOv8mService] = None
video_processor: Optional[VideoProcessorService] = None
export_service: Optional[ExportService] = None

# WebSocket connections for real-time updates
active_connections: List[WebSocket] = []

# Pydantic models for API
class ProcessingRequest(BaseModel):
    detection_mode: str = Field(default="micro_mobility_only", description="Detection mode: micro_mobility_only or all_vehicles")
    frame_skip: int = Field(default=1, description="Process every nth frame (1 = all frames)")

class DetectionChoice(BaseModel):
    detection_id: str
    selected_type: str
    confidence: float
    is_manual: bool

class ExportRequest(BaseModel):
    include_frame_images: bool = Field(default=False)
    include_charts: bool = Field(default=True)
    file_format: str = Field(default="xlsx", description="Export format: xlsx or csv")

class ModelStatus(BaseModel):
    loaded: bool
    model_info: Optional[Dict] = None
    loading_progress: Optional[Dict] = None

# Application lifespan management
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown."""
    # Startup
    logger.info("🚀 Starting Video Analysis API")
    
    # Initialize services
    global yolo_service, video_processor, export_service
    
    try:
        yolo_service = YOLOv8mService()
        video_processor = VideoProcessorService()
        export_service = ExportService()
        
        # Load YOLOv8m model
        logger.info("Loading YOLOv8m model...")
        success = await yolo_service.load_model()
        
        if success:
            logger.info("✅ YOLOv8m model loaded successfully")
        else:
            logger.error("❌ Failed to load YOLOv8m model")
        
    except Exception as e:
        logger.error(f"Failed to initialize services: {str(e)}")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down Video Analysis API")

# Create FastAPI app
app = FastAPI(
    title="Video Analysis API",
    description="Advanced video analysis for micro-mobility and vehicle detection using YOLOv8m",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files (for uploaded videos and exports)
os.makedirs("uploads", exist_ok=True)
os.makedirs("exports", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/exports", StaticFiles(directory="exports"), name="exports")

# WebSocket connection manager
class ConnectionManager:
    """Manage WebSocket connections for real-time updates."""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
    
    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients."""
        if not self.active_connections:
            logger.warning(f"📡 No active WebSocket connections to broadcast to")
            return
        
        logger.info(f"📡 Broadcasting to {len(self.active_connections)} connections")
        
        disconnected = []
        for i, connection in enumerate(self.active_connections):
            try:
                message_json = json.dumps(message)
                logger.info(f"📡 Sending to connection {i+1}: {len(message_json)} chars")
                await connection.send_text(message_json)
                logger.info(f"✅ Successfully sent to connection {i+1}")
            except Exception as e:
                logger.error(f"❌ Failed to send WebSocket message to connection {i+1}: {str(e)}")
                logger.error(f"❌ Error type: {type(e).__name__}")
                disconnected.append(connection)
        
        # Remove disconnected connections
        for connection in disconnected:
            self.disconnect(connection)
            
        logger.info(f"📡 Broadcast complete. Sent to {len(self.active_connections) - len(disconnected)}/{len(self.active_connections)} connections")

manager = ConnectionManager()

# API Routes

@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "message": "Video Analysis API",
        "status": "running",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    """Detailed health check."""
    model_loaded = yolo_service.is_loaded if yolo_service else False
    
    return {
        "status": "healthy" if model_loaded else "initializing",
        "services": {
            "yolo_model": model_loaded,
            "video_processor": video_processor is not None,
            "export_service": export_service is not None
        },
        "timestamp": datetime.now().isoformat()
    }

@app.get("/model/status", response_model=ModelStatus)
async def get_model_status():
    """Get YOLOv8m model status and information."""
    if not yolo_service:
        raise HTTPException(status_code=503, detail="Model service not initialized")
    
    return ModelStatus(
        loaded=yolo_service.is_loaded,
        model_info=yolo_service.get_model_info() if yolo_service.is_loaded else None
    )

@app.post("/model/reload")
async def reload_model():
    """Reload the YOLOv8m model."""
    if not yolo_service:
        raise HTTPException(status_code=503, detail="Model service not initialized")
    
    try:
        success = await yolo_service.load_model()
        if success:
            return {"message": "Model reloaded successfully", "status": "success"}
        else:
            raise HTTPException(status_code=500, detail="Failed to reload model")
    except Exception as e:
        logger.error(f"Model reload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/video/upload")
async def upload_video(file: UploadFile = File(...)):
    """Upload video file and extract metadata."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Validate file type
    allowed_extensions = {'.mp4', '.avi', '.mov', '.mkv', '.wmv'}
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
        )
    
    try:
        # Save uploaded file
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        
        file_path = os.path.join(upload_dir, f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}")
        
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Extract metadata
        metadata = await video_processor.extract_metadata(file_path)
        
        # Store file path for processing
        metadata_dict = metadata.to_dict()
        metadata_dict['file_path'] = file_path
        
        logger.info(f"Video uploaded successfully: {file.filename}")
        return metadata_dict
        
    except Exception as e:
        logger.error(f"Video upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/video/process")
async def process_video(
    request: ProcessingRequest,
    file_path: str
):
    """Process video and return results directly (like resume)."""
    if not yolo_service or not yolo_service.is_loaded:
        raise HTTPException(status_code=503, detail="YOLOv8m model not loaded")
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Video file not found")
    
    try:
        logger.info(f"Starting synchronous video processing: {file_path}")
        
        # Set up progress callback for WebSocket updates
        async def progress_callback(progress_data):
            await manager.broadcast({
                "type": "processing_progress",
                "data": progress_data
            })
        
        video_processor.set_progress_callback(progress_callback)
        
        # Process video synchronously
        detections = await video_processor.process_video(
            file_path, yolo_service, DetectionMode(request.detection_mode), request.frame_skip
        )
        
        logger.info(f"🎉 Fresh processing complete: {len(detections)} detections")
        
        # Get video metadata
        metadata = await video_processor.extract_metadata(file_path)
        
        # Return results directly like resume
        return {
            "status": "success",
            "message": f"Video processing complete: {len(detections)} detections found",
            "video": metadata.to_dict(),
            "detections": [d.to_dict() for d in detections],
            "detection_mode": request.detection_mode,
            "frame_skip": request.frame_skip
        }
        
    except Exception as e:
        logger.error(f"Video processing failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



@app.post("/detection/choice")
async def submit_detection_choice(choice: DetectionChoice):
    """Submit user choice for a detection."""
    try:
        # In a real application, you might want to store these choices in a database
        # For now, we'll just acknowledge the choice
        
        logger.info(f"Detection choice received: {choice.detection_id} -> {choice.selected_type}")
        
        return {
            "message": "Detection choice recorded",
            "detection_id": choice.detection_id,
            "selected_type": choice.selected_type
        }
        
    except Exception as e:
        logger.error(f"Failed to record detection choice: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/export/excel")
async def export_to_excel(export_data: dict):
    """Export analysis results to Excel format."""
    try:
        logger.info(f"🚀 Export request received: {list(export_data.keys())}")
        
        # Extract data from request
        include_frame_images = export_data.get('include_frame_images', False)
        include_charts = export_data.get('include_charts', True)
        file_format = export_data.get('file_format', 'xlsx')
        video_metadata = export_data.get('video_metadata', {})
        detections = export_data.get('detections', [])
        
        logger.info(f"  - Video: {video_metadata.get('filename', 'unknown')}")
        logger.info(f"  - Detections: {len(detections)}")
        logger.info(f"  - Format: {file_format}")
        
        # Convert dictionaries back to objects
        from services.video_processor_service import VideoMetadata, UniqueDetection
        from services.export_service import ExportConfig
        
        # Reconstruct VideoMetadata
        metadata = VideoMetadata(
            filename=video_metadata['filename'],
            duration=video_metadata['duration'],
            width=video_metadata['width'],
            height=video_metadata['height'],
            fps=video_metadata['fps'],
            frame_count=video_metadata['frameCount'],
            file_size=video_metadata['fileSize'],
            uploaded_at=video_metadata['uploadedAt']
        )
        
        # Reconstruct UniqueDetections
        detection_objects = []
        for det_dict in detections:
            detection = UniqueDetection(
                id=det_dict['id'],
                timestamp=det_dict['timestamp'],
                frame_number=det_dict['frameNumber'],
                full_frame_image_data=det_dict.get('fullFrameImageData', ''),
                frame_image_data=det_dict['frameImageData'],
                bbox=det_dict['boundingBox'],
                model_suggestions=det_dict['modelSuggestions'],
                user_choice=det_dict.get('userChoice'),
                is_manual_label=det_dict['isManualLabel'],
                is_manual_correction=det_dict['isManualCorrection'],
                processed_at=det_dict['processedAt']
            )
            detection_objects.append(detection)
        
        logger.info(f"✅ Converted {len(detection_objects)} detection objects")
        
        # Create export configuration
        config = ExportConfig(
            include_frame_images=include_frame_images,
            include_charts=include_charts,
            file_format=file_format
        )
        
        # Generate export
        logger.info("📊 Generating Excel export...")
        export_data = await export_service.export_to_excel(
            metadata, detection_objects, config
        )
        
        # Save export file
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"video_analysis_{timestamp}.{file_format}"
        export_path = os.path.join("exports", filename)
        
        logger.info(f"💾 Saving export to: {export_path}")
        with open(export_path, 'wb') as f:
            f.write(export_data)
        
        logger.info(f"✅ Export completed: {filename} ({len(export_data)} bytes)")
        
        # Return download link
        return {
            "message": "Export completed successfully",
            "filename": filename,
            "download_url": f"/exports/{filename}",
            "file_size": len(export_data)
        }
        
    except Exception as e:
        logger.error(f"❌ Export failed: {str(e)}")
        import traceback
        logger.error(f"Stack trace: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/export/download/{filename}")
async def download_export(filename: str):
    """Download exported file."""
    file_path = os.path.join("exports", filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Export file not found")
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type='application/octet-stream'
    )

# WebSocket endpoint for real-time updates
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time progress updates."""
    await manager.connect(websocket)
    
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        manager.disconnect(websocket)

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return {"error": "Not found", "detail": "The requested resource was not found"}

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    logger.error(f"Internal server error: {str(exc)}")
    return {"error": "Internal server error", "detail": "An unexpected error occurred"}

import cv2
import base64
import numpy as np
from io import BytesIO
from PIL import Image

@app.post("/video/resume")
async def resume_analysis(
    video_file: UploadFile = File(...),
    excel_file: UploadFile = File(...),
    detection_mode: str = Form(...),
    model_confidence: float = Form(...)
):
    """Resume analysis from previously exported Excel file with frame extraction"""
    try:
        logger.info(f"🔄 Starting resume analysis...")
        logger.info(f"Video: {video_file.filename}")
        logger.info(f"Excel: {excel_file.filename}")
        
        # Validate files
        if not video_file.filename.lower().endswith(('.mp4', '.avi', '.mov', '.mkv')):
            raise HTTPException(status_code=400, detail="Invalid video format")
        
        if not excel_file.filename.lower().endswith(('.xlsx', '.xls')):
            raise HTTPException(status_code=400, detail="Invalid Excel format")

        # Create upload directory if it doesn't exist
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save uploaded files
        video_filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{video_file.filename}"
        video_path = os.path.join(upload_dir, video_filename)
        
        excel_filename = f"resume_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{excel_file.filename}"
        excel_path = os.path.join(upload_dir, excel_filename)
        
        logger.info(f"💾 Saving files...")
        
        # Save video file
        with open(video_path, "wb") as buffer:
            shutil.copyfileobj(video_file.file, buffer)
        
        # Save Excel file  
        with open(excel_path, "wb") as buffer:
            shutil.copyfileobj(excel_file.file, buffer)

        # Parse Excel and extract detections
        import pandas as pd
        import re
        
        logger.info(f"📊 Parsing Excel file...")
        
        # Shared function to generate consistent 3-suggestion format
        def generate_model_suggestions(class_name: str, confidence: float) -> List[Dict]:
            """Generate 3 model suggestions consistently for both fresh and resume processing"""
            suggestions = [
                {
                    "type": class_name,
                    "confidence": confidence
                }
            ]
            
            # Add alternative suggestions based on class similarity
            similar_classes = {
                'bicycle': ['motorcycle', 'electric_scooter'],
                'motorcycle': ['bicycle', 'electric_motorcycle'], 
                'car': ['truck', 'van'],
                'truck': ['car', 'bus'],
                'bus': ['truck', 'van']
            }
            
            alternatives = similar_classes.get(class_name, ['car', 'motorcycle'])
            for alt_class in alternatives[:2]:  # Top 2 alternatives
                suggestions.append({
                    "type": alt_class,
                    "confidence": confidence * 0.8  # Lower confidence for alternatives
                })
            
            # Ensure we always have exactly 3 suggestions
            while len(suggestions) < 3:
                suggestions.append({
                    "type": "unknown",
                    "confidence": confidence * 0.6
                })
            
            return suggestions[:3]  # Return exactly 3
        
        # Helper function to extract frame from video
        def extract_frame_images(video_path: str, frame_number: int, bbox: dict) -> tuple[str, str]:
            """Extract full frame with bbox overlay and crop image"""
            try:
                logger.info(f"🖼️ Resume: Extracting frame {frame_number} with bbox {bbox}")
                
                cap = cv2.VideoCapture(video_path)
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
                ret, frame = cap.read()
                cap.release()
                
                if not ret:
                    logger.warning(f"⚠️ Could not read frame {frame_number}")
                    return "", ""
                
                # Create full frame with bounding box overlay
                full_frame = frame.copy()
                x1, y1 = int(bbox['x']), int(bbox['y'])
                x2, y2 = x1 + int(bbox['width']), y1 + int(bbox['height'])
                
                # Draw green bounding box
                cv2.rectangle(full_frame, (x1, y1), (x2, y2), (0, 255, 0), 3)
                
                # Add label
                label = f"Detection: Frame {frame_number}"
                label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)[0]
                cv2.rectangle(full_frame, 
                             (x1, y1 - label_size[1] - 10), 
                             (x1 + label_size[0], y1), 
                             (0, 255, 0), -1)
                cv2.putText(full_frame, label, 
                           (x1, y1 - 5), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
                
                # Resize full frame if too large
                h, w = full_frame.shape[:2]
                if max(h, w) > 800:
                    scale = 800 / max(h, w)
                    new_w, new_h = int(w * scale), int(h * scale)
                    full_frame = cv2.resize(full_frame, (new_w, new_h))
                
                # Convert full frame to base64
                _, buffer = cv2.imencode('.jpg', full_frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
                full_frame_b64 = base64.b64encode(buffer).decode('utf-8')
                full_frame_data = f"data:image/jpeg;base64,{full_frame_b64}"
                
                # Create crop with padding
                height, width = frame.shape[:2]
                bbox_area = bbox['width'] * bbox['height']
                padding_ratio = max(0.2, min(0.5, 5000 / bbox_area))
                
                pad_w = bbox['width'] * padding_ratio
                pad_h = bbox['height'] * padding_ratio
                
                crop_x1 = max(0, int(bbox['x'] - pad_w))
                crop_y1 = max(0, int(bbox['y'] - pad_h))
                crop_x2 = min(width, int(bbox['x'] + bbox['width'] + pad_w))
                crop_y2 = min(height, int(bbox['y'] + bbox['height'] + pad_h))
                
                # Extract and resize crop to 224x224
                crop = frame[crop_y1:crop_y2, crop_x1:crop_x2]
                if crop.size > 0:
                    # Resize maintaining aspect ratio
                    crop_h, crop_w = crop.shape[:2]
                    target_size = 224
                    
                    if crop_h > crop_w:
                        new_h, new_w = target_size, int(crop_w * target_size / crop_h)
                    else:
                        new_h, new_w = int(crop_h * target_size / crop_w), target_size
                    
                    resized_crop = cv2.resize(crop, (new_w, new_h))
                    
                    # Center in 224x224 canvas
                    final_crop = np.zeros((target_size, target_size, 3), dtype=np.uint8)
                    y_offset = (target_size - new_h) // 2
                    x_offset = (target_size - new_w) // 2
                    final_crop[y_offset:y_offset + new_h, x_offset:x_offset + new_w] = resized_crop
                else:
                    final_crop = np.zeros((224, 224, 3), dtype=np.uint8)
                
                # Convert crop to base64
                _, buffer = cv2.imencode('.jpg', final_crop, [cv2.IMWRITE_JPEG_QUALITY, 90])
                crop_b64 = base64.b64encode(buffer).decode('utf-8')
                crop_data = f"data:image/jpeg;base64,{crop_b64}"
                
                logger.info(f"✅ Resume: Generated images - Full frame: {len(full_frame_data)} chars, Crop: {len(crop_data)} chars")
                
                return full_frame_data, crop_data
                
            except Exception as e:
                logger.warning(f"❌ Resume: Failed to extract frame {frame_number}: {str(e)}")
                return "", ""
        
        try:
            # Read the Excel file - try specific sheet name first
            try:
                df = pd.read_excel(excel_path, sheet_name='Detection Data')
                logger.info(f"✅ Found 'Detection Data' sheet")
            except:
                try:
                    df = pd.read_excel(excel_path, sheet_name='Detections')
                    logger.info(f"✅ Found 'Detections' sheet")
                except:
                    # Fall back to first sheet
                    df = pd.read_excel(excel_path, sheet_name=0)
                    logger.info(f"✅ Using first sheet")
            
            logger.info(f"📋 Found {len(df)} rows in Excel")
            logger.info(f"Columns: {list(df.columns)}")
            
            # Helper function to convert timestamp to seconds
            def parse_timestamp(timestamp_str):
                if isinstance(timestamp_str, (int, float)):
                    return float(timestamp_str)
                if isinstance(timestamp_str, str):
                    # Handle "00:00:05.000" format
                    match = re.match(r'(\d{2}):(\d{2}):(\d{2})\.(\d{3})', timestamp_str)
                    if match:
                        hours, minutes, seconds, milliseconds = match.groups()
                        total_seconds = int(hours) * 3600 + int(minutes) * 60 + int(seconds) + int(milliseconds) / 1000
                        return total_seconds
                    # Handle other numeric string formats
                    try:
                        return float(timestamp_str)
                    except:
                        return 0.0
                return 0.0
            
            # Open video for frame extraction
            logger.info(f"🎬 Opening video for frame extraction...")
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise Exception("Could not open video file")
            
            # Get video metadata
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            duration = frame_count / fps if fps > 0 else 0
            cap.release()
            
            logger.info(f"🎬 Video: {width}x{height}, {frame_count} frames, {fps:.1f} FPS")
            
            # Convert Excel data back to detection format with frame extraction
            detections = []
            logger.info(f"🖼️ Extracting frames for {len(df)} detections...")
            
            for idx, row in df.iterrows():
                try:
                    # Map columns with flexible names (handle spaces and underscores)
                    detection_id = (
                        row.get('Detection ID') or 
                        row.get('Detection_ID') or 
                        row.get('detection_id') or 
                        f"det_{idx}"
                    )
                    
                    frame_number = (
                        row.get('Frame Number') or 
                        row.get('Frame_Number') or 
                        row.get('frame_number') or 
                        0
                    )
                    
                    timestamp_raw = (
                        row.get('Timestamp') or 
                        row.get('Timestamp_Seconds') or 
                        row.get('timestamp') or 
                        0
                    )
                    
                    object_type = (
                        row.get('Model Prediction') or 
                        row.get('AI_Prediction') or 
                        row.get('object_type') or 
                        'car'
                    )
                    
                    confidence = (
                        row.get('Model Confidence') or 
                        row.get('AI_Confidence') or 
                        row.get('confidence') or 
                        0.5
                    )
                    
                    user_choice = (
                        row.get('User Choice') or 
                        row.get('User_Choice') or 
                        row.get('user_choice')
                    )
                    
                    bbox_x = (
                        row.get('Bbox X') or 
                        row.get('Bbox_X') or 
                        row.get('bbox_x') or 
                        0
                    )
                    
                    bbox_y = (
                        row.get('Bbox Y') or 
                        row.get('Bbox_Y') or 
                        row.get('bbox_y') or 
                        0
                    )
                    
                    bbox_width = (
                        row.get('Bbox Width') or 
                        row.get('Bbox_Width') or 
                        row.get('bbox_width') or 
                        100
                    )
                    
                    bbox_height = (
                        row.get('Bbox Height') or 
                        row.get('Bbox_Height') or 
                        row.get('bbox_height') or 
                        100
                    )
                    
                    manual_correction = (
                        row.get('Manual Correction') or 
                        row.get('Manual_Correction') or 
                        'No'
                    )
                    
                    manual_label = (
                        row.get('Manual Label') or 
                        row.get('Manual_Label') or 
                        'No'
                    )
                    
                    # Create bounding box for frame extraction
                    bbox = {
                        'x': float(bbox_x),
                        'y': float(bbox_y),
                        'width': float(bbox_width),
                        'height': float(bbox_height)
                    }
                    
                    # Extract both full frame and crop images for this detection
                    full_frame_data, crop_data = extract_frame_images(video_path, int(frame_number), bbox)
                    
                    # Create detection with proper frontend structure
                    detection = {
                        "id": str(detection_id),
                        "frameNumber": int(frame_number),
                        "timestamp": parse_timestamp(timestamp_raw),
                        "fullFrameImageData": full_frame_data,  # Full frame with bbox
                        "frameImageData": crop_data,  # 224x224 crop
                        "boundingBox": bbox,
                        "modelSuggestions": generate_model_suggestions(str(object_type), float(confidence)),
                        "userChoice": str(user_choice) if pd.notna(user_choice) and str(user_choice).lower() not in ['', 'none', 'nan', 'not reviewed'] else None,
                        "isManualLabel": str(manual_label).lower() == 'yes',
                        "isManualCorrection": str(manual_correction).lower() == 'yes',
                        "processedAt": datetime.now().isoformat()
                    }
                    detections.append(detection)
                    
                    # Log progress every 10 detections
                    if (idx + 1) % 10 == 0:
                        logger.info(f"📷 Processed {idx + 1}/{len(df)} detections")
                    
                except Exception as e:
                    logger.warning(f"⚠️ Skipped row {idx}: {str(e)}")
                    continue
            
            logger.info(f"✅ Parsed {len(detections)} detections with full frame and crop images")
            
            # Create video metadata with proper frontend structure
            video_metadata = {
                "filename": video_filename,
                "duration": duration,
                "width": width,
                "height": height,
                "fps": fps,
                "frameCount": frame_count,
                "fileSize": os.path.getsize(video_path),
                "uploadedAt": datetime.now().isoformat()
            }
            
            # Clean up Excel file
            try:
                os.remove(excel_path)
                logger.info(f"🗑️ Cleaned up Excel file")
            except:
                pass
            
            logger.info(f"✅ Resume completed successfully with frame extraction!")
            
            return {
                "status": "success",
                "message": f"Resumed analysis from Excel with {len(detections)} detections (full frames + crops)",
                "video": video_metadata,
                "detections": detections,
                "detection_mode": detection_mode,
                "model_confidence": model_confidence
            }
            
        except Exception as parse_error:
            logger.error(f"❌ Excel parsing failed: {str(parse_error)}")
            # Clean up files if parsing fails
            try:
                if os.path.exists(video_path):
                    os.remove(video_path)
                if os.path.exists(excel_path):
                    os.remove(excel_path)
            except:
                pass
            raise HTTPException(status_code=400, detail=f"Failed to parse Excel file: {str(parse_error)}")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Resume analysis failed: {str(e)}")
        import traceback
        logger.error(f"Stack trace: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Resume analysis failed: {str(e)}")

# Run the application
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

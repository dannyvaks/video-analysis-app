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
from services.file_manager_service import FileManagerService

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
file_manager: Optional[FileManagerService] = None

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
    global yolo_service, video_processor, export_service, file_manager
    
    try:
        yolo_service = YOLOv8mService()
        video_processor = VideoProcessorService()
        export_service = ExportService()
        file_manager = FileManagerService()
        
        # Load YOLOv8m model
        logger.info("Loading YOLOv8m model...")
        success = await yolo_service.load_model()
        
        if success:
            logger.info("✅ YOLOv8m model loaded successfully")
        else:
            logger.error("❌ Failed to load YOLOv8m model")
        
        logger.info("✅ File manager service initialized")
        
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

# File Management Endpoints

@app.get("/files/videos")
async def list_video_files():
    """List all available video files in uploads directory."""
    if not file_manager:
        raise HTTPException(status_code=503, detail="File manager not initialized")
    
    try:
        video_files = file_manager.list_video_files()
        return {
            "videos": [video.to_dict() for video in video_files],
            "count": len(video_files)
        }
    except Exception as e:
        logger.error(f"Failed to list video files: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/files/excel")
async def list_excel_files():
    """List all available Excel files in exports directory."""
    if not file_manager:
        raise HTTPException(status_code=503, detail="File manager not initialized")
    
    try:
        excel_files = file_manager.list_excel_files()
        return {
            "excel_files": [excel.to_dict() for excel in excel_files],
            "count": len(excel_files)
        }
    except Exception as e:
        logger.error(f"Failed to list Excel files: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/files/pairs")
async def list_file_pairs():
    """List video-excel pairs available for resume."""
    if not file_manager:
        raise HTTPException(status_code=503, detail="File manager not initialized")
    
    try:
        pairs = file_manager.find_matching_pairs()
        return {
            "pairs": [pair.to_dict() for pair in pairs],
            "count": len(pairs),
            "complete_pairs": len([p for p in pairs if p.is_complete])
        }
    except Exception as e:
        logger.error(f"Failed to list file pairs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/files/stats")
async def get_storage_stats():
    """Get storage usage statistics."""
    if not file_manager:
        raise HTTPException(status_code=503, detail="File manager not initialized")
    
    try:
        stats = file_manager.get_storage_stats()
        return stats
    except Exception as e:
        logger.error(f"Failed to get storage stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/files/cleanup")
async def cleanup_old_files(dry_run: bool = True):
    """Clean up old files based on retention policy."""
    if not file_manager:
        raise HTTPException(status_code=503, detail="File manager not initialized")
    
    try:
        result = file_manager.clean_old_files(dry_run=dry_run)
        return result
    except Exception as e:
        logger.error(f"Failed to cleanup files: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/files/{file_path:path}")
async def delete_file(file_path: str):
    """Delete a specific file."""
    if not file_manager:
        raise HTTPException(status_code=503, detail="File manager not initialized")
    
    try:
        success = file_manager.delete_file(file_path)
        if success:
            return {"message": "File deleted successfully", "file_path": file_path}
        else:
            raise HTTPException(status_code=404, detail="File not found or could not be deleted")
    except Exception as e:
        logger.error(f"Failed to delete file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/video/resume-existing")
async def resume_analysis_from_existing(
    video_filename: str = Form(...),
    excel_filename: str = Form(...),
    detection_mode: str = Form(...),
    model_confidence: float = Form(...)
):
    """Resume analysis from existing files on server"""
    try:
        logger.info(f"🔄 Starting resume from existing files...")
        logger.info(f"Video: {video_filename}")
        logger.info(f"Excel: {excel_filename}")
        
        # Build file paths
        video_path = os.path.join("uploads", video_filename)
        excel_path = os.path.join("exports", excel_filename)
        
        # Validate files exist
        if not os.path.exists(video_path):
            raise HTTPException(status_code=404, detail="Video file not found")
        if not os.path.exists(excel_path):
            raise HTTPException(status_code=404, detail="Excel file not found")
            
        # Use the same logic as regular resume but with existing files
        import pandas as pd
        
        # Read Excel file
        try:
            df = pd.read_excel(excel_path, sheet_name='Detection Data', engine='openpyxl')
        except:
            try:
                df = pd.read_excel(excel_path, sheet_name='Detections', engine='openpyxl')
            except:
                df = pd.read_excel(excel_path, sheet_name=0, engine='openpyxl')
        
        logger.info(f"📋 Found {len(df)} rows in Excel file")
        
        # Same helper functions as regular resume
        def generate_model_suggestions(class_name: str, confidence: float) -> List[Dict]:
            suggestions = [{"type": class_name, "confidence": confidence}]
            similar_classes = {
                'bicycle': ['motorcycle', 'electric_scooter'],
                'motorcycle': ['bicycle', 'electric_motorcycle'], 
                'car': ['truck', 'van'],
                'truck': ['car', 'bus'],
                'bus': ['truck', 'van']
            }
            alternatives = similar_classes.get(class_name, ['car', 'motorcycle'])
            for alt_class in alternatives[:2]:
                suggestions.append({"type": alt_class, "confidence": confidence * 0.8})
            while len(suggestions) < 3:
                suggestions.append({"type": "unknown", "confidence": confidence * 0.6})
            return suggestions[:3]
        
        def extract_frame_images(video_path: str, frame_number: int, bbox: dict) -> tuple[str, str]:
            try:
                cap = cv2.VideoCapture(video_path)
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
                ret, frame = cap.read()
                cap.release()
                
                if not ret:
                    return "", ""
                
                # Full frame with bbox
                full_frame = frame.copy()
                x1, y1 = int(bbox['x']), int(bbox['y'])
                x2, y2 = x1 + int(bbox['width']), y1 + int(bbox['height'])
                cv2.rectangle(full_frame, (x1, y1), (x2, y2), (0, 255, 0), 3)
                
                h, w = full_frame.shape[:2]
                if max(h, w) > 800:
                    scale = 800 / max(h, w)
                    new_w, new_h = int(w * scale), int(h * scale)
                    full_frame = cv2.resize(full_frame, (new_w, new_h))
                
                _, buffer = cv2.imencode('.jpg', full_frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
                full_frame_b64 = base64.b64encode(buffer).decode('utf-8')
                full_frame_data = f"data:image/jpeg;base64,{full_frame_b64}"
                
                # Crop
                height, width = frame.shape[:2]
                bbox_area = bbox['width'] * bbox['height']
                padding_ratio = max(0.2, min(0.5, 5000 / bbox_area))
                
                pad_w = bbox['width'] * padding_ratio
                pad_h = bbox['height'] * padding_ratio
                
                crop_x1 = max(0, int(bbox['x'] - pad_w))
                crop_y1 = max(0, int(bbox['y'] - pad_h))
                crop_x2 = min(width, int(bbox['x'] + bbox['width'] + pad_w))
                crop_y2 = min(height, int(bbox['y'] + bbox['height'] + pad_h))
                
                crop = frame[crop_y1:crop_y2, crop_x1:crop_x2]
                if crop.size > 0:
                    crop = cv2.resize(crop, (224, 224))
                else:
                    crop = np.zeros((224, 224, 3), dtype=np.uint8)
                
                _, buffer = cv2.imencode('.jpg', crop, [cv2.IMWRITE_JPEG_QUALITY, 90])
                crop_b64 = base64.b64encode(buffer).decode('utf-8')
                crop_data = f"data:image/jpeg;base64,{crop_b64}"
                
                return full_frame_data, crop_data
            except Exception as e:
                logger.warning(f"Failed to extract frame {frame_number}: {str(e)}")
                return "", ""
        
        # Get video metadata
        cap = cv2.VideoCapture(video_path)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        duration = frame_count / fps if fps > 0 else 0
        cap.release()
        
        # Process Excel data (same as regular resume)
        detections = []
        for idx, row in df.iterrows():
            try:
                detection_id = row.get('Detection ID') or f"det_{idx}"
                frame_number = row.get('Frame Number') or 0
                object_type = row.get('Model Prediction') or 'car'
                confidence = row.get('Model Confidence') or 0.5
                user_choice = row.get('User Choice')
                
                bbox = {
                    'x': float(row.get('Bbox X') or 0),
                    'y': float(row.get('Bbox Y') or 0),
                    'width': float(row.get('Bbox Width') or 100),
                    'height': float(row.get('Bbox Height') or 100)
                }
                
                full_frame_data, crop_data = extract_frame_images(video_path, int(frame_number), bbox)
                
                detection = {
                    "id": str(detection_id),
                    "frameNumber": int(frame_number),
                    "timestamp": float(frame_number) / fps if fps > 0 else 0,
                    "fullFrameImageData": full_frame_data,
                    "frameImageData": crop_data,
                    "boundingBox": bbox,
                    "modelSuggestions": generate_model_suggestions(str(object_type), float(confidence)),
                    "userChoice": str(user_choice) if pd.notna(user_choice) and str(user_choice).lower() not in ['', 'none', 'nan', 'not reviewed'] else None,
                    "isManualLabel": False,
                    "isManualCorrection": False,
                    "processedAt": datetime.now().isoformat()
                }
                detections.append(detection)
                
                if (idx + 1) % 10 == 0:
                    logger.info(f"📷 Processed {idx + 1}/{len(df)} detections")
                    
            except Exception as e:
                logger.warning(f"⚠️ Skipped row {idx}: {str(e)}")
                continue
        
        # Create video metadata
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
        
        logger.info(f"✅ Resume from existing completed: {len(detections)} detections")
        
        return {
            "status": "success",
            "message": f"Resumed analysis with {len(detections)} detections",
            "video": video_metadata,
            "detections": detections,
            "detection_mode": detection_mode,
            "model_confidence": model_confidence
        }
        
    except Exception as e:
        logger.error(f"❌ Resume from existing failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

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
        
        logger.info(f"📊 Parsing data file: {excel_filename}")
        
        # Read Excel file
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
        
        logger.info(f"📋 Found {len(df)} rows in data file")
        
        # Helper functions for consistent processing
        def generate_model_suggestions(class_name: str, confidence: float) -> List[Dict]:
            """Generate 3 model suggestions consistently"""
            suggestions = [{"type": class_name, "confidence": confidence}]
            
            # Add alternative suggestions
            similar_classes = {
                'bicycle': ['motorcycle', 'electric_scooter'],
                'motorcycle': ['bicycle', 'electric_motorcycle'], 
                'car': ['truck', 'van'],
                'truck': ['car', 'bus'],
                'bus': ['truck', 'van']
            }
            
            alternatives = similar_classes.get(class_name, ['car', 'motorcycle'])
            for alt_class in alternatives[:2]:
                suggestions.append({
                    "type": alt_class,
                    "confidence": confidence * 0.8
                })
            
            # Ensure exactly 3 suggestions
            while len(suggestions) < 3:
                suggestions.append({
                    "type": "unknown",
                    "confidence": confidence * 0.6
                })
            
            return suggestions[:3]
        
        def extract_frame_images(video_path: str, frame_number: int, bbox: dict) -> tuple[str, str]:
            """Extract full frame with bbox overlay and crop image"""
            try:
                cap = cv2.VideoCapture(video_path)
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
                ret, frame = cap.read()
                cap.release()
                
                if not ret:
                    return "", ""
                
                # Create full frame with bounding box
                full_frame = frame.copy()
                x1, y1 = int(bbox['x']), int(bbox['y'])
                x2, y2 = x1 + int(bbox['width']), y1 + int(bbox['height'])
                
                cv2.rectangle(full_frame, (x1, y1), (x2, y2), (0, 255, 0), 3)
                
                # Resize if too large
                h, w = full_frame.shape[:2]
                if max(h, w) > 800:
                    scale = 800 / max(h, w)
                    new_w, new_h = int(w * scale), int(h * scale)
                    full_frame = cv2.resize(full_frame, (new_w, new_h))
                
                # Convert to base64
                _, buffer = cv2.imencode('.jpg', full_frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
                full_frame_b64 = base64.b64encode(buffer).decode('utf-8')
                full_frame_data = f"data:image/jpeg;base64,{full_frame_b64}"
                
                # Create crop
                height, width = frame.shape[:2]
                bbox_area = bbox['width'] * bbox['height']
                padding_ratio = max(0.2, min(0.5, 5000 / bbox_area))
                
                pad_w = bbox['width'] * padding_ratio
                pad_h = bbox['height'] * padding_ratio
                
                crop_x1 = max(0, int(bbox['x'] - pad_w))
                crop_y1 = max(0, int(bbox['y'] - pad_h))
                crop_x2 = min(width, int(bbox['x'] + bbox['width'] + pad_w))
                crop_y2 = min(height, int(bbox['y'] + bbox['height'] + pad_h))
                
                crop = frame[crop_y1:crop_y2, crop_x1:crop_x2]
                if crop.size > 0:
                    crop = cv2.resize(crop, (224, 224))
                else:
                    crop = np.zeros((224, 224, 3), dtype=np.uint8)
                
                _, buffer = cv2.imencode('.jpg', crop, [cv2.IMWRITE_JPEG_QUALITY, 90])
                crop_b64 = base64.b64encode(buffer).decode('utf-8')
                crop_data = f"data:image/jpeg;base64,{crop_b64}"
                
                return full_frame_data, crop_data
                
            except Exception as e:
                logger.warning(f"Failed to extract frame {frame_number}: {str(e)}")
                return "", ""
        
        # Get video metadata
        cap = cv2.VideoCapture(video_path)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        duration = frame_count / fps if fps > 0 else 0
        cap.release()
        
        # Process Excel data
        detections = []
        for idx, row in df.iterrows():
            try:
                # Map columns flexibly
                detection_id = row.get('Detection ID') or f"det_{idx}"
                frame_number = row.get('Frame Number') or 0
                object_type = row.get('Model Prediction') or 'car'
                confidence = row.get('Model Confidence') or 0.5
                user_choice = row.get('User Choice')
                
                bbox = {
                    'x': float(row.get('Bbox X') or 0),
                    'y': float(row.get('Bbox Y') or 0),
                    'width': float(row.get('Bbox Width') or 100),
                    'height': float(row.get('Bbox Height') or 100)
                }
                
                # Extract frame images
                full_frame_data, crop_data = extract_frame_images(video_path, int(frame_number), bbox)
                
                detection = {
                    "id": str(detection_id),
                    "frameNumber": int(frame_number),
                    "timestamp": float(frame_number) / fps if fps > 0 else 0,
                    "fullFrameImageData": full_frame_data,
                    "frameImageData": crop_data,
                    "boundingBox": bbox,
                    "modelSuggestions": generate_model_suggestions(str(object_type), float(confidence)),
                    "userChoice": str(user_choice) if pd.notna(user_choice) and str(user_choice).lower() not in ['', 'none', 'nan', 'not reviewed'] else None,
                    "isManualLabel": False,
                    "isManualCorrection": False,
                    "processedAt": datetime.now().isoformat()
                }
                detections.append(detection)
                
                if (idx + 1) % 10 == 0:
                    logger.info(f"📷 Processed {idx + 1}/{len(df)} detections")
                    
            except Exception as e:
                logger.warning(f"⚠️ Skipped row {idx}: {str(e)}")
                continue
        
        # Create video metadata
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
        except:
            pass
        
        logger.info(f"✅ Resume completed: {len(detections)} detections")
        
        return {
            "status": "success",
            "message": f"Resumed analysis with {len(detections)} detections",
            "video": video_metadata,
            "detections": detections,
            "detection_mode": detection_mode,
            "model_confidence": model_confidence
        }
        
    except Exception as e:
        logger.error(f"❌ Resume analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Run the application
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

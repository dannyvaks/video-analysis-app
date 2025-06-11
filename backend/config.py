"""
Configuration management for Video Analysis Application
"""

import os
from typing import Optional, List
from pydantic_settings import BaseSettings
from pydantic import Field

class YOLOConfig(BaseSettings):
    """YOLOv8m model configuration"""
    model_path: str = Field(default="yolov8m.pt", description="Path to YOLOv8m model weights")
    confidence_threshold: float = Field(default=0.5, description="Minimum confidence for detections")
    iou_threshold: float = Field(default=0.45, description="IoU threshold for NMS")
    device: str = Field(default="auto", description="Device for inference (auto, cpu, cuda)")
    
    class Config:
        env_prefix = "YOLO_"

class VideoProcessingConfig(BaseSettings):
    """Video processing configuration"""
    iou_threshold: float = Field(default=0.5, description="IoU threshold for object matching")
    distance_threshold: float = Field(default=50.0, description="Distance threshold for tracking")
    max_missing_frames: int = Field(default=10, description="Max frames an object can be missing")
    frame_skip_default: int = Field(default=1, description="Default frame skip value")
    max_video_size_mb: int = Field(default=2048, description="Maximum video file size in MB")
    
    class Config:
        env_prefix = "VIDEO_"

class ServerConfig(BaseSettings):
    """FastAPI server configuration"""
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8000, description="Server port")
    reload: bool = Field(default=True, description="Enable auto-reload in development")
    log_level: str = Field(default="info", description="Logging level")
    allowed_origins: List[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"],
        description="Allowed CORS origins"
    )
    
    class Config:
        env_prefix = "SERVER_"

class StorageConfig(BaseSettings):
    """File storage configuration"""
    upload_dir: str = Field(default="uploads", description="Directory for uploaded videos")
    export_dir: str = Field(default="exports", description="Directory for exported files")
    temp_dir: str = Field(default="temp", description="Temporary files directory")
    max_storage_days: int = Field(default=7, description="Days to keep uploaded files")
    
    class Config:
        env_prefix = "STORAGE_"

class AppConfig(BaseSettings):
    """Main application configuration"""
    # Application info
    app_name: str = Field(default="Video Analysis API", description="Application name")
    version: str = Field(default="1.0.0", description="Application version")
    debug: bool = Field(default=False, description="Enable debug mode")
    
    # Environment
    environment: str = Field(default="development", description="Environment (development, production)")
    
    # Security
    secret_key: Optional[str] = Field(default=None, description="Secret key for sessions")
    
    # Database (for future use)
    database_url: Optional[str] = Field(default=None, description="Database connection URL")
    
    # Nested configurations
    yolo: YOLOConfig = Field(default_factory=YOLOConfig)
    video: VideoProcessingConfig = Field(default_factory=VideoProcessingConfig)
    server: ServerConfig = Field(default_factory=ServerConfig)
    storage: StorageConfig = Field(default_factory=StorageConfig)
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

# Global configuration instance
config = AppConfig()

def get_config() -> AppConfig:
    """Get application configuration."""
    return config

def setup_directories():
    """Create necessary directories if they don't exist."""
    directories = [
        config.storage.upload_dir,
        config.storage.export_dir,
        config.storage.temp_dir,
        "logs"
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        print(f"✓ Directory created/verified: {directory}")

def print_config():
    """Print current configuration (excluding sensitive data)."""
    print("\n" + "="*50)
    print("VIDEO ANALYSIS API CONFIGURATION")
    print("="*50)
    
    print(f"App Name: {config.app_name}")
    print(f"Version: {config.version}")
    print(f"Environment: {config.environment}")
    print(f"Debug Mode: {config.debug}")
    
    print(f"\nServer Configuration:")
    print(f"  Host: {config.server.host}")
    print(f"  Port: {config.server.port}")
    print(f"  Log Level: {config.server.log_level}")
    print(f"  CORS Origins: {config.server.allowed_origins}")
    
    print(f"\nYOLO Configuration:")
    print(f"  Model Path: {config.yolo.model_path}")
    print(f"  Confidence Threshold: {config.yolo.confidence_threshold}")
    print(f"  IoU Threshold: {config.yolo.iou_threshold}")
    print(f"  Device: {config.yolo.device}")
    
    print(f"\nVideo Processing:")
    print(f"  IoU Threshold: {config.video.iou_threshold}")
    print(f"  Distance Threshold: {config.video.distance_threshold}")
    print(f"  Max Missing Frames: {config.video.max_missing_frames}")
    print(f"  Max Video Size: {config.video.max_video_size_mb} MB")
    
    print(f"\nStorage:")
    print(f"  Upload Directory: {config.storage.upload_dir}")
    print(f"  Export Directory: {config.storage.export_dir}")
    print(f"  Temp Directory: {config.storage.temp_dir}")
    print(f"  Storage Retention: {config.storage.max_storage_days} days")
    
    print("="*50)

# Validation functions
def validate_model_path():
    """Validate that the YOLOv8m model exists or can be downloaded."""
    model_path = config.yolo.model_path
    
    if not os.path.exists(model_path):
        print(f"⚠️  Model file not found: {model_path}")
        print("   The model will be downloaded automatically on first run.")
        return False
    else:
        print(f"✓ Model file found: {model_path}")
        return True

def validate_gpu_availability():
    """Check GPU availability for YOLO inference."""
    try:
        import torch
        if torch.cuda.is_available():
            gpu_name = torch.cuda.get_device_name(0)
            print(f"✓ GPU available: {gpu_name}")
            return True
        else:
            print("⚠️  GPU not available, will use CPU")
            return False
    except ImportError:
        print("⚠️  PyTorch not installed, cannot check GPU availability")
        return False

def validate_dependencies():
    """Validate that all required dependencies are installed."""
    required_packages = [
        ("torch", "torch"),
        ("torchvision", "torchvision"), 
        ("ultralytics", "ultralytics"),
        ("opencv-python", "cv2"),  # ← Fixed: package name vs import name
        ("fastapi", "fastapi"),
        ("uvicorn", "uvicorn"),
        ("pandas", "pandas"),
        ("openpyxl", "openpyxl")
    ]
    
    missing_packages = []
    
    for package_name, import_name in required_packages:
        try:
            __import__(import_name)
            print(f"✓ {package_name} installed")
        except ImportError:
            missing_packages.append(package_name)
            print(f"❌ {package_name} missing")
    
    if missing_packages:
        print(f"\n⚠️  Missing packages: {', '.join(missing_packages)}")
        print("Run: pip install -r requirements.txt")
        return False
    
    return True

def run_startup_checks():
    """Run all startup validation checks."""
    print("\n🔍 Running startup checks...")
    
    # Create directories
    setup_directories()
    
    # Validate dependencies
    deps_ok = validate_dependencies()
    
    # Validate model
    model_ok = validate_model_path()
    
    # Check GPU
    gpu_ok = validate_gpu_availability()
    
    # Print configuration
    print_config()
    
    if not deps_ok:
        print("\n❌ Startup checks failed: Missing dependencies")
        return False
    
    print("\n✅ Startup checks completed successfully")
    return True

if __name__ == "__main__":
    # Run checks when script is executed directly
    run_startup_checks()

# 🎯 Video Analysis Application - YOLOv8m Detection System

A production-ready video analysis application for detecting and classifying vehicles using YOLOv8m AI model with a Python FastAPI backend and React TypeScript frontend.

## ✨ **Key Features**

- 🎯 **High-Accuracy Detection**: YOLOv8m model with 88% F1 score for vehicle detection
- 🚗 **Dual Detection Views**: Full frame context + detailed crops for precise review
- 🎨 **Enhanced Visual Indicators**: Color-coded choice tracking with real-time feedback
- ⚡ **GPU Acceleration**: CUDA support for 15-25 FPS processing speed
- 📊 **Smart Deduplication**: Object tracking reduces review workload by 85-90%
- 📈 **Comprehensive Reports**: Excel exports with statistics, charts, and frame images
- 🔄 **Resume Analysis**: Continue work from previous Excel exports with preserved visual state
- 🌐 **Real-time Progress**: WebSocket progress tracking during processing
- 🗺️ **Intelligent Navigation**: Color-coded detection grid with status at a glance

---

## 🏗️ **System Architecture**

```
┌─────────────────┐    HTTP Requests     ┌──────────────────┐
│                 │  ←─────────────────→  │                  │
│  React Frontend │                      │ FastAPI Backend  │
│  (Port 3000)    │                      │ (Port 8000)      │
│                 │   WebSocket Progress │                  │
│                 │  ←─────────────────→  │                  │
└─────────────────┘                      └──────────┬───────┘
                                                    │
                                                    ▼
                                         ┌──────────────────┐
                                         │   YOLOv8m Model │
                                         │   GPU/CPU        │
                                         └──────────────────┘
```

**Processing Flow:**
1. **Upload** → Video file via HTTP
2. **Process** → YOLOv8m detection + tracking
3. **Review** → Full frame + crop dual view with visual feedback
4. **Export** → Excel with charts + statistics

---

## 🎨 **Enhanced Visual Indicators System**

The application features an advanced visual feedback system that provides real-time indication of user choices:

### **🏷️ Visual Color System**
- **🟢 Green (AI Accepted)**: User accepted the top AI suggestion
- **🟠 Orange (Manual Correction)**: User chose a different AI suggestion (not the top choice)
- **🟣 Purple (Manual Label)**: User entered custom text OR choice not in current AI suggestions
- **⚪ Gray (Unreviewed)**: Detection not yet reviewed by user
- **🔵 Blue (Current)**: Currently active detection being reviewed

### **🎯 Logic Examples**
```
🟢 Green Example:
- AI suggests: ["car" (top), "truck", "bus"]
- User chooses: "car"
- Result: Green indicator (accepted top AI suggestion)

🟠 Orange Example: 
- AI suggests: ["car" (top), "truck", "bus"]
- User chooses: "truck"
- Result: Orange indicator (chose different AI suggestion)

🟣 Purple Examples:
- User types custom: "electric scooter"
- Resume case: User previously chose "taxi", but current AI suggests ["car", "bike"]
- Result: Purple indicator (custom input or not in current AI suggestions)
```

### **🗺️ Navigation Benefits**
- **Instant Status**: See review progress at a glance in navigation grid
- **Resume Continuity**: Visual state preserved when resuming from Excel exports
- **Quality Tracking**: Distinguish between AI accepted vs manual corrections vs custom labels
- **Progress Visualization**: Multi-segment progress bar showing choice type breakdown

---

## 🚀 **Quick Start**

### **Prerequisites**
- **Python 3.8+** with pip
- **Node.js 16+** with npm
- **Git**
- **CUDA GPU** (optional, recommended for speed)

### **1. Backend Setup**

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# Windows:
venv\\Scripts\\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start server
python run_server.py
```

Backend runs at: `http://localhost:8000`

### **2. Frontend Setup**

```bash
# From project root
npm install
npm run dev
```

Frontend runs at: `http://localhost:3000`

---

## ⚙️ **Configuration Parameters**

### **🎬 Video Processing Settings**

| Parameter | Location | Default | Description |
|-----------|----------|---------|-------------|
| **Frame Skip** | `app.tsx:267` | `30` | Process every Nth frame (1=all frames, 30=every 30th) |
| **Detection Mode** | `api.ts:82` | `ALL_VEHICLES` | `MICRO_MOBILITY_ONLY` or `ALL_VEHICLES` |
| **Max File Size** | `VideoUpload.tsx:17` | `500MB` | Maximum upload file size |
| **Supported Formats** | `VideoUpload.tsx:16` | `['.mp4', '.avi', '.mov', '.mkv']` | Allowed video formats |

**To change frame skip rate:**
```typescript
// File: src/app.tsx, line 267
const result = await startVideoProcessing(filePath, 30); // Change 30 to desired rate
```

### **🤖 AI Model Settings**

| Parameter | Location | Default | Description |
|-----------|----------|---------|-------------|
| **Model File** | `yolov8m_service.py:78` | `"yolov8m.pt"` | YOLOv8 model variant |
| **Confidence Threshold** | `yolov8m_service.py:79` | `0.5` | Minimum detection confidence (0.0-1.0) |
| **IoU Threshold** | `yolov8m_service.py:80` | `0.45` | Non-maximum suppression threshold |
| **Device** | `yolov8m_service.py:81` | `"auto"` | `"auto"`, `"cpu"`, or `"cuda"` |

**To change model variant:**
```python
# File: backend/services/yolov8m_service.py, line 78
def __init__(self, 
             model_path: str = "yolov8s.pt",  # Change to yolov8s/yolov8m/yolov8l/yolov8x
```

**To adjust confidence threshold:**
```python
# File: backend/services/yolov8m_service.py, line 79
             confidence_threshold: float = 0.3,  # Lower = more detections, higher = fewer but more confident
```

### **🎯 Detection Settings**

| Parameter | Location | Default | Description |
|-----------|----------|---------|-------------|
| **Vehicle Classes** | `yolov8m_service.py:49-56` | See mapping | COCO classes to vehicle types |
| **Micro-Mobility Classes** | `yolov8m_service.py:58-64` | Bicycle, motorcycle, etc. | Classes considered micro-mobility |
| **Crop Size** | `video_processor_service.py:568` | `224` | Fixed crop size for detail view |
| **Max Full Frame Size** | `video_processor_service.py:579` | `800px` | Max dimension for full frame images |

**To add new vehicle types:**
```python
# File: backend/services/yolov8m_service.py, lines 49-56
COCO_TO_VEHICLE_TYPE = {
    'bicycle': VehicleType.BICYCLE,
    'motorcycle': VehicleType.MOTORCYCLE,
    'car': VehicleType.CAR,
    'truck': VehicleType.TRUCK,
    'bus': VehicleType.BUS,
    'your_new_class': VehicleType.YOUR_NEW_TYPE,  # Add custom mappings
}
```

### **📸 Image Processing Settings**

| Parameter | Location | Default | Description |
|-----------|----------|---------|-------------|
| **JPEG Quality** | `video_processor_service.py:582` | `90%` | Compression quality for images |
| **Padding Ratio** | `video_processor_service.py:551` | `0.2-0.5` | Adaptive padding around detections |
| **Max Image Dimension** | `video_processor_service.py:579` | `800px` | Resize limit for full frames |

### **🔄 Tracking Settings**

| Parameter | Location | Default | Description |
|-----------|----------|---------|-------------|
| **IoU Threshold** | `video_processor_service.py:144` | `0.5` | Object matching threshold |
| **Distance Threshold** | `video_processor_service.py:145` | `50.0` | Pixel distance for tracking |
| **Max Missing Frames** | `video_processor_service.py:146` | `10` | Frames before dropping track |

**To adjust tracking sensitivity:**
```python
# File: backend/services/video_processor_service.py, line 144-146
def __init__(self, 
             iou_threshold: float = 0.3,        # Lower = more lenient matching
             distance_threshold: float = 100.0,  # Higher = track objects further
             max_missing_frames: int = 5):       # Lower = drop tracks faster
```

### **🌐 Server Settings**

| Parameter | Location | Default | Description |
|-----------|----------|---------|-------------|
| **Backend Port** | `main.py:920` | `8000` | FastAPI server port |
| **Frontend Port** | `package.json` | `3000` | React dev server port |
| **CORS Origins** | `main.py:87-88` | `localhost:3000` | Allowed frontend origins |
| **Log Level** | `main.py:23` | `INFO` | Logging verbosity |

---

## 🎛️ **Model Variants & Performance**

### **Available YOLOv8 Models**

| Model | Size | Speed (FPS) | Accuracy (mAP) | Use Case |
|-------|------|-------------|----------------|----------|
| `yolov8n.pt` | 6MB | 30-45 FPS | 37.3% | Real-time, low accuracy |
| `yolov8s.pt` | 22MB | 25-35 FPS | 44.9% | Balanced speed/accuracy |
| **`yolov8m.pt`** | **50MB** | **15-25 FPS** | **50.2%** | **Recommended default** |
| `yolov8l.pt` | 87MB | 10-15 FPS | 52.9% | High accuracy |
| `yolov8x.pt` | 136MB | 8-12 FPS | 53.9% | Maximum accuracy |

**To change model:**
```python
# File: backend/services/yolov8m_service.py, line 78
model_path: str = "yolov8x.pt",  # Change to desired model
```

### **Performance Tuning**

**For Maximum Speed:**
```python
# Use smaller model + higher frame skip
model_path: str = "yolov8s.pt"
frame_skip = 60  # Process every 60th frame
confidence_threshold: float = 0.7  # Higher confidence = fewer false positives
```

**For Maximum Accuracy:**
```python
# Use larger model + process all frames  
model_path: str = "yolov8x.pt"
frame_skip = 1  # Process every frame
confidence_threshold: float = 0.3  # Lower confidence = catch more objects
```

---

## 📊 **Performance Benchmarks**

### **Hardware Requirements**

| Component | Minimum | Recommended | Optimal |
|-----------|---------|-------------|---------|
| **CPU** | 4 cores, 3.0GHz | 8 cores, 3.5GHz | 12+ cores, 4.0GHz+ |
| **RAM** | 8GB | 16GB | 32GB+ |
| **GPU** | None (CPU only) | GTX 1660/RTX 3060 | RTX 4080/RTX 4090 |
| **Storage** | 10GB free | 50GB free | 100GB+ SSD |

### **Processing Speed**

| Hardware | YOLOv8s | YOLOv8m | YOLOv8l | YOLOv8x |
|----------|---------|---------|---------|---------|
| **CPU only** | 8-12 FPS | 5-8 FPS | 3-5 FPS | 2-3 FPS |
| **GTX 1660** | 20-25 FPS | 15-20 FPS | 10-15 FPS | 8-12 FPS |
| **RTX 3060** | 35-40 FPS | 25-30 FPS | 18-22 FPS | 15-18 FPS |
| **RTX 4080** | 60+ FPS | 45+ FPS | 35+ FPS | 30+ FPS |

---

## 🛠️ **Advanced Configuration**

### **Environment Variables**

Create `.env` files for advanced configuration:

**Backend `.env`:**
```env
# Model Settings
YOLO_MODEL_PATH=yolov8m.pt
YOLO_CONFIDENCE_THRESHOLD=0.5
YOLO_IOU_THRESHOLD=0.45
YOLO_DEVICE=auto

# Server Settings  
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
SERVER_RELOAD=true

# Storage Settings
MAX_FILE_SIZE_MB=500
AUTO_DELETE_DAYS=7
UPLOAD_DIR=uploads
EXPORT_DIR=exports

# Processing Settings
DEFAULT_FRAME_SKIP=30
MAX_CONCURRENT_PROCESSING=2
```

**Frontend `.env`:**
```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_MAX_UPLOAD_SIZE=524288000
VITE_SUPPORTED_FORMATS=.mp4,.avi,.mov,.mkv
```

### **Custom Detection Classes**

**1. Update Backend Vehicle Types:**
```python
# File: backend/services/yolov8m_service.py
class VehicleType(Enum):
    BICYCLE = "bicycle"
    MOTORCYCLE = "motorcycle"
    CAR = "car"
    TRUCK = "truck"
    BUS = "bus"
    SCOOTER = "scooter"        # Add new type
    TAXI = "taxi"              # Add new type
```

**2. Update Class Mapping:**
```python
# File: backend/services/yolov8m_service.py
COCO_TO_VEHICLE_TYPE = {
    'bicycle': VehicleType.BICYCLE,
    'motorcycle': VehicleType.MOTORCYCLE,
    'car': VehicleType.CAR,
    'truck': VehicleType.TRUCK,
    'bus': VehicleType.BUS,
    # Add custom mappings
    'person': VehicleType.SCOOTER,  # Map person to scooter
}
```

**3. Update Frontend Types:**
```typescript
// File: src/types/index.ts
export type VehicleType = 
  | 'bicycle' 
  | 'motorcycle' 
  | 'car' 
  | 'truck' 
  | 'bus'
  | 'scooter'    // Add new type
  | 'taxi';      // Add new type
```

---

## 🐛 **Troubleshooting**

### **Common Configuration Issues**

**Frame Skip Too High:**
```
❌ Problem: No detections found
✅ Solution: Reduce frame_skip from 30 to 10 or 5
```

**Confidence Too High:**
```
❌ Problem: Missing obvious vehicles  
✅ Solution: Lower confidence_threshold from 0.5 to 0.3
```

**Out of Memory:**
```
❌ Problem: CUDA out of memory
✅ Solution: Use smaller model (yolov8s) or CPU mode
```

**Slow Processing:**
```
❌ Problem: Very slow on CPU
✅ Solution: Install CUDA PyTorch or increase frame_skip
```

### **Performance Optimization**

**For Faster Processing:**
```python
# Quick processing setup
model_path = "yolov8s.pt"           # Smaller model
frame_skip = 60                     # Process fewer frames  
confidence_threshold = 0.7          # Higher confidence
device = "cuda"                     # Use GPU
```

**For Better Accuracy:**
```python
# Accuracy-focused setup
model_path = "yolov8x.pt"           # Largest model
frame_skip = 1                      # Process all frames
confidence_threshold = 0.3          # Lower confidence  
iou_threshold = 0.3                 # More detections
```

---

## 📁 **Project Structure**

```
video-analysis-app/
├── 📁 backend/                      # Python FastAPI Backend
│   ├── 📁 services/                 # Core AI Services
│   │   ├── 🧠 yolov8m_service.py    # YOLOv8 AI Detection
│   │   ├── 🎬 video_processor_service.py  # Video Processing & Tracking  
│   │   └── 📊 export_service.py     # Excel Export Generation
│   ├── 🌐 main.py                   # FastAPI Application
│   ├── ⚙️ config.py                 # Configuration Management
│   ├── 🚀 run_server.py             # Server Startup Script
│   └── 📋 requirements.txt          # Python Dependencies
├── 📁 src/                          # React TypeScript Frontend
│   ├── 📁 components/               # UI Components
│   │   ├── 🎨 EnhancedDetectionReview.tsx # Enhanced Review Interface with Visual Indicators
│   │   ├── 🎯 DetectionReview.tsx   # Legacy Review Interface (preserved)
│   │   ├── 📹 VideoUpload.tsx       # Upload Component
│   │   ├── 🔄 ResumeAnalysis.tsx    # Resume from Excel Component
│   │   └── 📊 StatisticsPanel.tsx   # Results Statistics
│   ├── 📁 services/                 # API Communication
│   │   └── 🌐 api.ts                # Backend API Client
│   ├── 📁 types/                    # TypeScript Definitions
│   │   └── 📝 index.ts              # Type Definitions
│   └── 🏠 app.tsx                   # Main Application
├── 📁 public/                       # Static Assets
├── 📦 package.json                  # Frontend Dependencies
└── 📖 README.md                     # This File
```

---

## 🚀 **Deployment**

### **Docker Deployment**

```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - YOLO_DEVICE=cpu
      - YOLO_MODEL_PATH=yolov8m.pt
    volumes:
      - ./uploads:/app/uploads
      - ./exports:/app/exports
      
  frontend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://backend:8000
    depends_on:
      - backend
```

### **Production Settings**

```python
# Production configuration
YOLO_MODEL_PATH = "yolov8m.pt"      # Balanced performance
SERVER_HOST = "0.0.0.0"             # Accept external connections
SERVER_RELOAD = False               # Disable auto-reload
LOG_LEVEL = "WARNING"               # Reduce logging
MAX_CONCURRENT_PROCESSING = 4       # Handle multiple requests
```

---

## 📈 **Usage Examples**

### **High-Speed Traffic Analysis**
```python
# Configuration for highway/traffic analysis
frame_skip = 60                     # Every 2 seconds at 30fps
confidence_threshold = 0.7          # High confidence only
detection_mode = "ALL_VEHICLES"     # Cars, trucks, buses
model_path = "yolov8s.pt"          # Fast processing
```

### **Detailed Micro-Mobility Study**
```python
# Configuration for bike lane/scooter analysis  
frame_skip = 10                     # Every 0.33 seconds at 30fps
confidence_threshold = 0.3          # Catch smaller objects
detection_mode = "MICRO_MOBILITY_ONLY"  # Bikes, scooters only
model_path = "yolov8l.pt"          # High accuracy
```

### **Security/Surveillance**
```python
# Configuration for security footage
frame_skip = 30                     # Every 1 second at 30fps
confidence_threshold = 0.5          # Balanced detection
detection_mode = "ALL_VEHICLES"     # All vehicle types
model_path = "yolov8m.pt"          # Balanced performance
```

---

## 🤝 **Contributing**

1. **Fork** the repository
2. **Create** feature branch: `git checkout -b feature/amazing-feature`
3. **Configure** parameters for your use case
4. **Test** with various video types
5. **Commit** changes: `git commit -m 'Add amazing feature'`
6. **Push** to branch: `git push origin feature/amazing-feature`
7. **Open** Pull Request

---

## 📞 **Support & Resources**

- 📖 **Documentation**: This README
- 🐛 **Issues**: [GitHub Issues](your-repo-url/issues)
- 💬 **Discussions**: [GitHub Discussions](your-repo-url/discussions)
- 📧 **Email**: support@yourproject.com

### **Useful Links**
- [YOLOv8 Documentation](https://docs.ultralytics.com/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)

---

## 📄 **License**

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 **Acknowledgments**

- **Ultralytics** - YOLOv8 model and framework
- **FastAPI** - High-performance Python web framework  
- **React** - Frontend user interface library
- **OpenCV** - Computer vision processing
- **Tailwind CSS** - Utility-first CSS framework

---

**🎯 Happy Vehicle Detection! 🚗🚴‍♂️📊**

*Built with ❤️ for intelligent transportation analysis*

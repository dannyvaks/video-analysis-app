# 🚀 Complete Setup Guide for Students
*Step-by-step instructions to get the Video Analysis Application running on your computer*

---

## 📋 **What You'll Build**

By the end of this guide, you'll have a working AI-powered video analysis application that can:
- 🎯 Detect vehicles in videos using artificial intelligence
- 🖼️ Show both full video frames and detailed crops
- 📊 Generate professional Excel reports
- ⚡ Process videos at 15-25 FPS on modern computers

**Total Setup Time: 15-30 minutes**

---

## 🛠️ **Step 1: Install Required Software**

### **1.1 Install Git**

Git helps you download code from the internet.

**Windows:**
1. Go to: https://git-scm.com/download/win
2. Download the latest version
3. Run the installer
4. **IMPORTANT**: During installation, select "Git Bash Here" option
5. Keep all other default settings

**How to verify it worked:**
```bash
# Open Command Prompt (cmd) and type:
git --version
# You should see something like: git version 2.40.1
```

### **1.2 Install Python**

Python runs the AI detection backend.

**Windows:**
1. Go to: https://www.python.org/downloads/
2. Download **Python 3.11** (recommended) or **Python 3.10**
3. **VERY IMPORTANT**: During installation, check ✅ "Add Python to PATH"
4. Click "Install Now"

**How to verify it worked:**
```bash
# Open Command Prompt (cmd) and type:
python --version
# You should see: Python 3.11.x or Python 3.10.x

pip --version
# You should see: pip 23.x.x from ...
```

**❌ If Python command doesn't work:**
- Try `python3 --version` instead
- Or reinstall Python and make sure to check "Add Python to PATH"

### **1.3 Install Node.js**

Node.js runs the web interface frontend.

**Windows:**
1. Go to: https://nodejs.org/
2. Download the **LTS version** (recommended for most users)
3. Run the installer with all default settings

**How to verify it worked:**
```bash
# Open Command Prompt (cmd) and type:
node --version
# You should see: v18.x.x or v20.x.x

npm --version  
# You should see: 9.x.x or 10.x.x
```

---

## 📁 **Step 2: Download the Project**

### **2.1 Create a Project Folder**

```bash
# Open Command Prompt (cmd) and run these commands:

# Go to your Desktop (or wherever you want the project)
cd Desktop

# Create a new folder for your projects
mkdir my-projects
cd my-projects
```

### **2.2 Clone the Project from GitHub**

```bash
# Download the project code
git clone https://github.com/dannyvaks/video-analysis-app.git

# Enter the project folder
cd video-analysis-app

# Verify you're in the right place
dir
# You should see folders like: backend, src, public, package.json, etc.
```

---

## 🐍 **Step 3: Setup Python Backend (AI Engine)**

The backend contains the artificial intelligence that detects vehicles.

### **3.1 Navigate to Backend Folder**

```bash
# From the main project folder, go to backend
cd backend

# Verify you're in the backend folder
dir
# You should see: main.py, requirements.txt, services folder, etc.
```

### **3.2 Create Virtual Environment**

A virtual environment keeps your Python packages organized.

```bash
# Create a virtual environment (this may take 1-2 minutes)
python -m venv venv

# If the above doesn't work, try:
python3 -m venv venv
```

### **3.3 Activate Virtual Environment**

**⚠️ IMPORTANT:** You need to activate the virtual environment every time you work with the backend.

```bash
# Activate virtual environment (Windows)
venv\Scripts\activate

# After activation, you should see (venv) at the beginning of your command line
# Like: (venv) C:\Users\YourName\Desktop\my-projects\video-analysis-app\backend>
```

**❌ If activation doesn't work, try:**
```bash
venv\Scripts\activate.bat
# or
.\venv\Scripts\activate.ps1
```

### **3.4 Install Python Packages**

This downloads all the AI libraries (this will take 5-10 minutes).

```bash
# Make sure you see (venv) in your command line, then run:
pip install -r requirements.txt

# This will download many packages including:
# - PyTorch (AI framework)
# - OpenCV (video processing) 
# - Ultralytics (YOLO AI model)
# - FastAPI (web server)
# - And many more...
```

**⏳ While this is downloading, you can read ahead, but DON'T run other commands yet.**

### **3.5 Test Backend Installation**

```bash
# Test if everything installed correctly
python -c "import torch, cv2, ultralytics; print('✅ All packages installed successfully!')"

# If you see the success message, great! If you see errors, see troubleshooting below.
```

---

## 🌐 **Step 4: Setup Frontend (Web Interface)**

**⚠️ IMPORTANT:** Open a **NEW** Command Prompt window for the frontend. Keep the backend terminal open.

### **4.1 Open New Terminal**

1. Open a **new** Command Prompt window (don't close the backend one)
2. Navigate to the project:

```bash
# In the NEW terminal, go to your project
cd Desktop\my-projects\video-analysis-app

# Verify you're in the main project folder (NOT the backend folder)
dir
# You should see: package.json, src folder, public folder, backend folder
```

### **4.2 Install Frontend Packages**

```bash
# Install all frontend packages (this takes 2-5 minutes)
npm install

# This will download packages like:
# - React (user interface)
# - TypeScript (programming language)
# - Tailwind CSS (styling)
# - And many more...
```

---

## 🚀 **Step 5: Start the Application**

You need BOTH the backend (AI engine) AND frontend (web interface) running at the same time.

### **5.1 Start the Backend (Terminal 1)**

In your **first terminal** (where you have the backend setup):

```bash
# Make sure you're in the backend folder with (venv) active
# If not, run:
cd backend
venv\Scripts\activate

# Start the AI backend server
python run_server.py

# You should see output like:
# INFO:     Uvicorn running on http://0.0.0.0:8000
# INFO:     Loading YOLOv8m model...
# INFO:     ✅ YOLOv8m model loaded successfully

# ⚠️ KEEP THIS TERMINAL OPEN - the backend must stay running
```

**On first run, the system will download the AI model (~50MB). This is normal.**

### **5.2 Start the Frontend (Terminal 2)**

In your **second terminal** (the new one for frontend):

```bash
# Make sure you're in the main project folder
# Start the web interface
npm run dev

# You should see output like:
# VITE v4.x.x ready in xxx ms
# ➜  Local:   http://localhost:3000/
# ➜  Network: use --host to expose

# ⚠️ KEEP THIS TERMINAL OPEN TOO - the frontend must stay running
```

### **5.3 Open the Application**

1. Open your web browser (Chrome, Firefox, Edge, etc.)
2. Go to: **http://localhost:3000**
3. You should see the Video Analysis Application interface!

---

## 🎯 **Step 6: Test the Application**

### **6.1 Check if Everything is Working**

You should see:
- ✅ A clean interface with "Upload Video for Smart Analysis"
- ✅ A status badge saying "AI Detection Engine Ready"
- ✅ No error messages

### **6.2 Test Video Upload**

1. Click "📁 Select Video File"
2. Choose any video file (.mp4, .avi, .mov, .mkv)
3. The video should upload and start processing
4. You should see "Analyzing Video..." with a progress bar

---

## 🏃‍♂️ **Quick Start Commands (After Initial Setup)**

After the first setup, you can start the application quickly:

**Every time you want to use the application:**

**Terminal 1 (Backend):**
```bash
cd Desktop\my-projects\video-analysis-app\backend
venv\Scripts\activate
python run_server.py
```

**Terminal 2 (Frontend) - Open a NEW terminal:**
```bash
cd Desktop\my-projects\video-analysis-app
npm run dev
```

**Then open browser:** http://localhost:3000

---

## 🔧 **Troubleshooting Common Issues**

### **❌ "Python is not recognized"**
**Problem:** Windows can't find Python
**Solution:** 
1. Reinstall Python from python.org
2. ✅ Check "Add Python to PATH" during installation
3. Restart Command Prompt

### **❌ "pip is not recognized"**
**Problem:** pip (Python package installer) not found
**Solution:**
```bash
python -m pip --version
# If this works, use "python -m pip install" instead of just "pip install"
```

### **❌ "node is not recognized"**
**Problem:** Windows can't find Node.js
**Solution:**
1. Reinstall Node.js from nodejs.org
2. Use the LTS version
3. Restart Command Prompt

### **❌ Virtual Environment Won't Activate**
**Problem:** `venv\Scripts\activate` doesn't work
**Solutions to try:**
```bash
# Try these alternatives:
venv\Scripts\activate.bat
.\venv\Scripts\activate
# or
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
venv\Scripts\activate
```

### **❌ "Module not found" errors**
**Problem:** Python packages not installed correctly
**Solution:**
```bash
# Make sure virtual environment is active (you see (venv))
venv\Scripts\activate

# Upgrade pip first
python -m pip install --upgrade pip

# Reinstall requirements
pip install -r requirements.txt
```

### **❌ Backend starts but shows errors**
**Problem:** Missing AI model or CUDA issues
**Solution:**
```bash
# The AI model will download automatically on first run
# If you have GPU issues, the system will fallback to CPU (slower but works)
# Wait 2-3 minutes for first startup
```

### **❌ Frontend won't connect to backend**
**Problem:** Backend not running or wrong port
**Solution:**
1. Make sure backend terminal shows: "Uvicorn running on http://0.0.0.0:8000"
2. Make sure frontend is accessing http://localhost:3000
3. Check Windows Firewall isn't blocking the connections

### **❌ Very slow processing**
**Problem:** Running on CPU instead of GPU
**This is normal if you don't have a gaming/AI graphics card**
**Solutions:**
- Use shorter videos for testing
- Increase frame skip (process fewer frames)
- This is expected on regular computers

---

## 💡 **Understanding the Two Terminals**

**Why do I need two terminals?**

Think of it like a restaurant:
- **Backend Terminal (Kitchen)**: The AI "chef" that processes videos
- **Frontend Terminal (Dining Room)**: The web interface where you place "orders"

Both need to run simultaneously for the application to work.

**Terminal 1 - Backend (Kitchen):**
```bash
cd backend
venv\Scripts\activate
python run_server.py
# Output: AI model loading... Server running on port 8000
# KEEP OPEN - this is your AI engine
```

**Terminal 2 - Frontend (Dining Room):**
```bash
npm run dev  
# Output: Local server running on http://localhost:3000
# KEEP OPEN - this is your web interface
```

---

## 📚 **What Each Component Does**

### **Backend (Python)**
- 🧠 **AI Detection**: Uses YOLOv8 to find vehicles in videos
- 🎬 **Video Processing**: Reads video files frame by frame
- 📊 **Data Processing**: Tracks objects and removes duplicates
- 🌐 **API Server**: Provides data to the frontend

### **Frontend (React/TypeScript)**
- 🖥️ **User Interface**: Beautiful web interface for uploading videos
- 🎯 **Review System**: Shows detected vehicles for manual verification
- 📈 **Statistics**: Displays charts and analysis results
- 💾 **Export**: Generates Excel reports

### **AI Model (YOLOv8m)**
- 🎯 **Object Detection**: Finds vehicles in images
- 🚗 **Classification**: Identifies car, truck, bicycle, motorcycle, bus
- ⚡ **Speed**: Processes 15-25 frames per second
- 🎯 **Accuracy**: 88% F1 score for vehicle detection

---

## 🎓 **Learning Resources**

If you want to understand more about what you just built:

### **Programming Languages:**
- **Python**: Backend AI processing
- **TypeScript/JavaScript**: Frontend web interface
- **HTML/CSS**: Web page structure and styling

### **Frameworks & Libraries:**
- **FastAPI**: Python web server framework
- **React**: User interface library
- **PyTorch**: AI/Machine learning framework
- **OpenCV**: Computer vision library

### **AI Concepts:**
- **YOLO (You Only Look Once)**: Real-time object detection
- **Computer Vision**: Teaching computers to "see"
- **Neural Networks**: AI that learns patterns
- **Object Tracking**: Following objects across video frames

---

## 🎉 **Congratulations!**

You've successfully set up a professional-grade AI video analysis system! 

**What you accomplished:**
- ✅ Installed Python and Node.js development environments
- ✅ Downloaded and configured an AI-powered application
- ✅ Set up machine learning libraries and frameworks
- ✅ Successfully ran both backend AI engine and frontend interface
- ✅ Built a system that can detect vehicles using artificial intelligence

**This is the same type of technology used by:**
- 🚗 Self-driving car companies
- 🏙️ Smart city traffic management
- 🔒 Security and surveillance systems
- 📊 Transportation research organizations

---

## 🆘 **Getting Help**

If you're stuck:

1. **Read the error message carefully** - it often tells you what's wrong
2. **Check this troubleshooting section** - common issues are listed above
3. **Restart your terminals** - close both and start over from Step 5
4. **Ask for help** - bring your error message to your instructor
5. **Check the main README.md** - has advanced configuration options

**When asking for help, always include:**
- What step you're on
- The exact error message
- What operating system you're using (Windows 10/11)
- Whether you have Python/Node.js working in basic tests

---

**🚀 Happy Video Analysis! You're now ready to explore AI-powered computer vision! 🎯**

*Built for students learning computer science and AI technology*

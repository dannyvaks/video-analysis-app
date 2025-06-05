# 🚀 Video Analysis App - Automated Installer & Launcher

## 📋 **What This Creates:**

```
installer/
├── 🔧 setup.ps1                 # Main installation script  
├── 🚀 launcher.ps1              # Application launcher script
├── 🔍 check-dependencies.ps1    # Dependency checker
├── 🌐 launcher.html             # HTML control dashboard
├── 📁 launcher.bat              # Simple batch wrapper
└── 🔗 create-shortcuts.ps1      # Desktop shortcut creator
```

## 🎯 **Installation Process:**

1. **Run setup.ps1** → Checks & installs Python, Node.js, Git
2. **Auto-setup project** → Installs all dependencies  
3. **Creates desktop shortcut** → "Video Analysis App"
4. **HTML Dashboard** → Start/Stop application with one click

## 🖥️ **Final Result:**

- **Desktop Shortcut** → Opens HTML control panel
- **One-Click Start** → Launches both backend + frontend
- **Status Monitoring** → See if services are running
- **One-Click Stop** → Cleanly shuts down everything

## ⚡ **Usage:**

```powershell
# 1. Run installer (one time only)
.\installer\setup.ps1

# 2. Use desktop shortcut or open launcher.html  
# 3. Click "Start Application" button
# 4. Application opens automatically in browser
```

**Simple, clean, and user-friendly!** 🎉
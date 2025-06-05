# Video Analysis App - Automated Setup Script
# Run this script as Administrator for best results

param(
    [switch]$SkipDependencies = $false
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Video Analysis App - Automated Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir

function Test-Command($Command) {
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Install-Winget {
    Write-Host "📦 Installing winget (Windows Package Manager)..." -ForegroundColor Yellow
    try {
        # Check if winget is already available
        if (Test-Command "winget") {
            Write-Host "✅ winget already installed" -ForegroundColor Green
            return
        }
        
        # Install winget via Microsoft Store or GitHub
        Write-Host "⬇️ Downloading winget installer..." -ForegroundColor Yellow
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri "https://github.com/microsoft/winget-cli/releases/latest/download/Microsoft.DesktopAppInstaller_8wekyb3d8bbwe.msixbundle" -OutFile "$env:TEMP\winget.msixbundle"
        Add-AppxPackage "$env:TEMP\winget.msixbundle"
        Write-Host "✅ winget installed successfully" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Could not install winget automatically. Please install manually." -ForegroundColor Red
        Write-Host "   Download from: https://github.com/microsoft/winget-cli/releases" -ForegroundColor Yellow
    }
}

function Install-Python {
    Write-Host "🐍 Installing Python 3.11..." -ForegroundColor Yellow
    try {
        if (Test-Command "winget") {
            winget install Python.Python.3.11 --silent --accept-source-agreements --accept-package-agreements
        } else {
            Write-Host "⬇️ Downloading Python installer..." -ForegroundColor Yellow
            $PythonUrl = "https://www.python.org/ftp/python/3.11.7/python-3.11.7-amd64.exe"
            Invoke-WebRequest -Uri $PythonUrl -OutFile "$env:TEMP\python-installer.exe"
            Start-Process "$env:TEMP\python-installer.exe" -ArgumentList "/quiet", "InstallAllUsers=1", "PrependPath=1" -Wait
        }
        Write-Host "✅ Python installed successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to install Python" -ForegroundColor Red
        throw
    }
}

function Install-NodeJS {
    Write-Host "📦 Installing Node.js..." -ForegroundColor Yellow
    try {
        if (Test-Command "winget") {
            winget install OpenJS.NodeJS --silent --accept-source-agreements --accept-package-agreements
        } else {
            Write-Host "⬇️ Downloading Node.js installer..." -ForegroundColor Yellow
            $NodeUrl = "https://nodejs.org/dist/v20.10.0/node-v20.10.0-x64.msi"
            Invoke-WebRequest -Uri $NodeUrl -OutFile "$env:TEMP\nodejs-installer.msi"
            Start-Process "msiexec.exe" -ArgumentList "/i", "$env:TEMP\nodejs-installer.msi", "/quiet" -Wait
        }
        Write-Host "✅ Node.js installed successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to install Node.js" -ForegroundColor Red
        throw
    }
}

function Install-Git {
    Write-Host "🔧 Installing Git..." -ForegroundColor Yellow
    try {
        if (Test-Command "winget") {
            winget install Git.Git --silent --accept-source-agreements --accept-package-agreements
        } else {
            Write-Host "⬇️ Downloading Git installer..." -ForegroundColor Yellow
            $GitUrl = "https://github.com/git-scm/git/releases/download/v2.43.0.windows.1/Git-2.43.0-64-bit.exe"
            Invoke-WebRequest -Uri $GitUrl -OutFile "$env:TEMP\git-installer.exe"
            Start-Process "$env:TEMP\git-installer.exe" -ArgumentList "/VERYSILENT", "/NORESTART" -Wait
        }
        Write-Host "✅ Git installed successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to install Git" -ForegroundColor Red
        throw
    }
}

function Refresh-Environment {
    Write-Host "🔄 Refreshing environment variables..." -ForegroundColor Yellow
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

function Setup-Backend {
    Write-Host "🐍 Setting up Python backend..." -ForegroundColor Yellow
    
    Set-Location "$ProjectDir\backend"
    
    # Create virtual environment
    Write-Host "   Creating Python virtual environment..." -ForegroundColor Cyan
    python -m venv venv
    
    # Activate virtual environment and install requirements
    Write-Host "   Installing Python dependencies..." -ForegroundColor Cyan
    & ".\venv\Scripts\Activate.ps1"
    pip install -r requirements.txt
    
    Write-Host "✅ Backend setup complete" -ForegroundColor Green
}

function Setup-Frontend {
    Write-Host "📦 Setting up React frontend..." -ForegroundColor Yellow
    
    Set-Location $ProjectDir
    
    # Install Node.js dependencies
    Write-Host "   Installing Node.js dependencies..." -ForegroundColor Cyan
    npm install
    
    Write-Host "✅ Frontend setup complete" -ForegroundColor Green
}

function Create-Shortcuts {
    Write-Host "🔗 Creating desktop shortcuts..." -ForegroundColor Yellow
    
    # Run the shortcut creation script
    & "$ScriptDir\create-shortcuts.ps1"
    
    Write-Host "✅ Shortcuts created" -ForegroundColor Green
}

# Main installation process
try {
    if (-not $SkipDependencies) {
        Write-Host "🔍 Checking dependencies..." -ForegroundColor Yellow
        
        # Check and install winget first
        if (-not (Test-Command "winget")) {
            Install-Winget
            Refresh-Environment
        }
        
        # Check and install Python
        if (-not (Test-Command "python")) {
            Install-Python
            Refresh-Environment
        } else {
            Write-Host "✅ Python already installed" -ForegroundColor Green
        }
        
        # Check and install Node.js
        if (-not (Test-Command "node")) {
            Install-NodeJS
            Refresh-Environment
        } else {
            Write-Host "✅ Node.js already installed" -ForegroundColor Green
        }
        
        # Check and install Git
        if (-not (Test-Command "git")) {
            Install-Git
            Refresh-Environment
        } else {
            Write-Host "✅ Git already installed" -ForegroundColor Green
        }
    }
    
    # Setup project components
    Write-Host ""
    Write-Host "🔧 Setting up project components..." -ForegroundColor Yellow
    
    Setup-Backend
    Setup-Frontend
    Create-Shortcuts
    
    Write-Host ""
    Write-Host "🎉 Setup completed successfully!" -ForegroundColor Green
    Write-Host "📱 Desktop shortcut created: 'Video Analysis App'" -ForegroundColor Cyan
    Write-Host "🚀 You can now launch the application from the desktop shortcut" -ForegroundColor Cyan
    Write-Host ""
    
    # Ask if user wants to launch now
    $Launch = Read-Host "Would you like to launch the application now? (y/n)"
    if ($Launch -eq "y" -or $Launch -eq "Y" -or $Launch -eq "yes") {
        & "$ScriptDir\launcher.ps1" -Start
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ Setup failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Try running as Administrator or check internet connection" -ForegroundColor Yellow
    exit 1
}
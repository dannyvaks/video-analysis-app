# Video Analysis App - Dependency Checker
# Verifies all required dependencies are installed and working

$ErrorActionPreference = "SilentlyContinue"

Write-Host "🔍 Video Analysis App - Dependency Checker" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

$AllGood = $true

function Test-Command($Command) {
    try {
        $null = Get-Command $Command -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

function Test-PythonVersion {
    try {
        $Version = python --version 2>&1
        if ($Version -match "Python (\d+)\.(\d+)\.(\d+)") {
            $Major = [int]$Matches[1]
            $Minor = [int]$Matches[2]
            
            if ($Major -eq 3 -and $Minor -ge 8) {
                return @{ Success = $true; Version = $Version.Replace("Python ", "") }
            }
        }
        return @{ Success = $false; Version = $Version }
    } catch {
        return @{ Success = $false; Version = "Not found" }
    }
}

function Test-NodeVersion {
    try {
        $Version = node --version 2>&1
        if ($Version -match "v(\d+)\.(\d+)\.(\d+)") {
            $Major = [int]$Matches[1]
            
            if ($Major -ge 16) {
                return @{ Success = $true; Version = $Version.Replace("v", "") }
            }
        }
        return @{ Success = $false; Version = $Version }
    } catch {
        return @{ Success = $false; Version = "Not found" }
    }
}

function Test-ProjectSetup {
    $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $ProjectDir = Split-Path -Parent $ScriptDir
    
    $BackendVenv = Test-Path "$ProjectDir\backend\venv"
    $NodeModules = Test-Path "$ProjectDir\node_modules"
    $Requirements = Test-Path "$ProjectDir\backend\requirements.txt"
    $PackageJson = Test-Path "$ProjectDir\package.json"
    
    return @{
        BackendVenv = $BackendVenv
        NodeModules = $NodeModules  
        Requirements = $Requirements
        PackageJson = $PackageJson
        ProjectDir = $ProjectDir
    }
}

function Show-Result($Name, $Status, $Details = "") {
    if ($Status) {
        Write-Host "✅ $Name" -ForegroundColor Green -NoNewline
        if ($Details) {
            Write-Host " ($Details)" -ForegroundColor Gray
        } else {
            Write-Host ""
        }
    } else {
        Write-Host "❌ $Name" -ForegroundColor Red -NoNewline
        if ($Details) {
            Write-Host " ($Details)" -ForegroundColor Gray
        } else {
            Write-Host ""
        }
        $script:AllGood = $false
    }
}

# Check Core Dependencies
Write-Host "🔧 Core Dependencies:" -ForegroundColor Yellow

# Python
$PythonTest = Test-PythonVersion
Show-Result "Python 3.8+" $PythonTest.Success $PythonTest.Version

# Node.js
$NodeTest = Test-NodeVersion  
Show-Result "Node.js 16+" $NodeTest.Success $NodeTest.Version

# Git
$GitTest = Test-Command "git"
if ($GitTest) {
    $GitVersion = git --version 2>&1
    Show-Result "Git" $GitTest $GitVersion.Replace("git version ", "")
} else {
    Show-Result "Git" $GitTest "Not found"
}

# NPM (should come with Node.js)
$NpmTest = Test-Command "npm"
if ($NpmTest) {
    $NpmVersion = npm --version 2>&1
    Show-Result "NPM" $NpmTest $NpmVersion
} else {
    Show-Result "NPM" $NpmTest "Not found"
}

Write-Host ""

# Check Project Setup
Write-Host "📁 Project Setup:" -ForegroundColor Yellow

$ProjectTest = Test-ProjectSetup

Show-Result "Project Directory" (Test-Path $ProjectTest.ProjectDir) $ProjectTest.ProjectDir
Show-Result "Backend Requirements" $ProjectTest.Requirements
Show-Result "Frontend Package.json" $ProjectTest.PackageJson  
Show-Result "Python Virtual Environment" $ProjectTest.BackendVenv
Show-Result "Node.js Dependencies" $ProjectTest.NodeModules

Write-Host ""

# Check Python Packages (if venv exists)
if ($ProjectTest.BackendVenv) {
    Write-Host "🐍 Python Packages:" -ForegroundColor Yellow
    
    try {
        $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
        $ProjectDir = Split-Path -Parent $ScriptDir
        
        Set-Location "$ProjectDir\backend"
        & ".\venv\Scripts\Activate.ps1"
        
        $Packages = @("fastapi", "uvicorn", "opencv-python", "ultralytics", "pandas", "openpyxl")
        
        foreach ($Package in $Packages) {
            $PackageTest = pip show $Package 2>&1
            if ($PackageTest -and $PackageTest -notmatch "not found") {
                $Version = ($PackageTest | Select-String "Version:").ToString().Replace("Version: ", "")
                Show-Result $Package $true $Version
            } else {
                Show-Result $Package $false "Not installed"
            }
        }
    } catch {
        Write-Host "⚠️ Could not check Python packages" -ForegroundColor Yellow
    }
    
    Write-Host ""
}

# Check Services Availability
Write-Host "🌐 Service Availability:" -ForegroundColor Yellow

# Test Backend
try {
    $BackendResponse = Invoke-WebRequest -Uri "http://localhost:8000/health" -TimeoutSec 5 -UseBasicParsing
    Show-Result "Backend (Port 8000)" ($BackendResponse.StatusCode -eq 200) "Running"
} catch {
    Show-Result "Backend (Port 8000)" $false "Not running"
}

# Test Frontend
try {
    $FrontendResponse = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -UseBasicParsing
    Show-Result "Frontend (Port 3000)" ($FrontendResponse.StatusCode -eq 200) "Running"
} catch {
    Show-Result "Frontend (Port 3000)" $false "Not running"
}

Write-Host ""

# Final Summary
Write-Host "📊 Summary:" -ForegroundColor Cyan

if ($AllGood) {
    Write-Host "🎉 All dependencies and setup are correct!" -ForegroundColor Green
    Write-Host "✅ Your Video Analysis App is ready to run!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 To start the application:" -ForegroundColor Cyan
    Write-Host "   • Use the desktop shortcut 'Video Analysis App'" -ForegroundColor Gray
    Write-Host "   • Or run: .\installer\launcher.ps1 -Start" -ForegroundColor Gray
    Write-Host "   • Or open: .\installer\launcher.html" -ForegroundColor Gray
} else {
    Write-Host "⚠️ Some issues were found with your setup" -ForegroundColor Yellow
    Write-Host "🔧 To fix issues:" -ForegroundColor Cyan
    Write-Host "   • Run: .\installer\setup.ps1" -ForegroundColor Gray
    Write-Host "   • This will install missing dependencies" -ForegroundColor Gray
    Write-Host ""
    Write-Host "💡 If problems persist:" -ForegroundColor Cyan
    Write-Host "   • Check README.md for manual setup instructions" -ForegroundColor Gray
    Write-Host "   • Ensure you have internet connection" -ForegroundColor Gray
    Write-Host "   • Try running PowerShell as Administrator" -ForegroundColor Gray
}

Write-Host ""

# Offer to run setup if issues found
if (-not $AllGood) {
    $RunSetup = Read-Host "Would you like to run the automated setup now? (y/n)"
    if ($RunSetup -eq "y" -or $RunSetup -eq "Y" -or $RunSetup -eq "yes") {
        $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
        & "$ScriptDir\setup.ps1"
    }
}
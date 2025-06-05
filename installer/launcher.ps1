# Video Analysis App - Launcher Script
# Manages backend and frontend processes

param(
    [switch]$Start = $false,
    [switch]$Stop = $false,
    [switch]$Status = $false,
    [switch]$Restart = $false
)

$ErrorActionPreference = "SilentlyContinue"

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir

$BackendProcess = $null
$FrontendProcess = $null

function Get-ProcessStatus {
    $Backend = Get-Process -Name "python" | Where-Object { $_.CommandLine -like "*run_server.py*" } | Select-Object -First 1
    $Frontend = Get-Process -Name "node" | Where-Object { $_.CommandLine -like "*vite*" } | Select-Object -First 1
    
    return @{
        Backend = $Backend
        Frontend = $Frontend
        BackendRunning = $null -ne $Backend
        FrontendRunning = $null -ne $Frontend
        BothRunning = ($null -ne $Backend) -and ($null -ne $Frontend)
    }
}

function Start-Application {
    Write-Host "🚀 Starting Video Analysis Application..." -ForegroundColor Cyan
    
    $Status = Get-ProcessStatus
    
    if ($Status.BothRunning) {
        Write-Host "✅ Application is already running!" -ForegroundColor Green
        Write-Host "   Backend (Python): Running (PID: $($Status.Backend.Id))" -ForegroundColor Green  
        Write-Host "   Frontend (React): Running (PID: $($Status.Frontend.Id))" -ForegroundColor Green
        return
    }
    
    # Start Backend
    if (-not $Status.BackendRunning) {
        Write-Host "🐍 Starting Python backend..." -ForegroundColor Yellow
        
        Set-Location "$ProjectDir\backend"
        
        # Start backend in new window
        $BackendProcess = Start-Process powershell -ArgumentList @(
            "-NoExit",
            "-Command", 
            "& '.\venv\Scripts\Activate.ps1'; python run_server.py"
        ) -PassThru -WindowStyle Minimized
        
        Write-Host "   Backend started (PID: $($BackendProcess.Id))" -ForegroundColor Green
        
        # Wait for backend to be ready
        Write-Host "   Waiting for backend to start..." -ForegroundColor Cyan
        Start-Sleep -Seconds 5
        
        # Test backend connection
        try {
            $Response = Invoke-WebRequest -Uri "http://localhost:8000/health" -TimeoutSec 10
            if ($Response.StatusCode -eq 200) {
                Write-Host "   ✅ Backend is ready!" -ForegroundColor Green
            }
        } catch {
            Write-Host "   ⚠️ Backend may still be starting..." -ForegroundColor Yellow
        }
    } else {
        Write-Host "✅ Backend already running" -ForegroundColor Green
    }
    
    # Start Frontend
    if (-not $Status.FrontendRunning) {
        Write-Host "📦 Starting React frontend..." -ForegroundColor Yellow
        
        Set-Location $ProjectDir
        
        # Start frontend in new window
        $FrontendProcess = Start-Process powershell -ArgumentList @(
            "-NoExit",
            "-Command",
            "npm run dev"
        ) -PassThru -WindowStyle Minimized
        
        Write-Host "   Frontend started (PID: $($FrontendProcess.Id))" -ForegroundColor Green
        
        # Wait for frontend to be ready
        Write-Host "   Waiting for frontend to start..." -ForegroundColor Cyan
        Start-Sleep -Seconds 8
        
        # Test frontend connection and open browser
        try {
            $Response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 15
            if ($Response.StatusCode -eq 200) {
                Write-Host "   ✅ Frontend is ready!" -ForegroundColor Green
                Write-Host "🌐 Opening application in browser..." -ForegroundColor Cyan
                Start-Process "http://localhost:3000"
            }
        } catch {
            Write-Host "   ⚠️ Frontend may still be starting..." -ForegroundColor Yellow
            Write-Host "   Manual URL: http://localhost:3000" -ForegroundColor Cyan
        }
    } else {
        Write-Host "✅ Frontend already running" -ForegroundColor Green
        Write-Host "🌐 Opening application in browser..." -ForegroundColor Cyan
        Start-Process "http://localhost:3000"
    }
    
    Write-Host ""
    Write-Host "🎉 Application started successfully!" -ForegroundColor Green
    Write-Host "📱 Frontend: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "⚙️ Backend:  http://localhost:8000" -ForegroundColor Cyan
}

function Stop-Application {
    Write-Host "🛑 Stopping Video Analysis Application..." -ForegroundColor Yellow
    
    $Status = Get-ProcessStatus
    
    if (-not $Status.BackendRunning -and -not $Status.FrontendRunning) {
        Write-Host "✅ Application is not running" -ForegroundColor Green
        return
    }
    
    # Stop processes
    $Stopped = 0
    
    if ($Status.BackendRunning) {
        Write-Host "   Stopping backend..." -ForegroundColor Cyan
        Stop-Process -Id $Status.Backend.Id -Force
        $Stopped++
    }
    
    if ($Status.FrontendRunning) {
        Write-Host "   Stopping frontend..." -ForegroundColor Cyan  
        Stop-Process -Id $Status.Frontend.Id -Force
        $Stopped++
    }
    
    # Also kill any remaining node/python processes related to our app
    Get-Process -Name "python" | Where-Object { $_.CommandLine -like "*run_server*" } | Stop-Process -Force
    Get-Process -Name "node" | Where-Object { $_.CommandLine -like "*vite*" } | Stop-Process -Force
    
    Write-Host "✅ Application stopped ($Stopped processes terminated)" -ForegroundColor Green
}

function Show-Status {
    Write-Host "📊 Video Analysis Application Status" -ForegroundColor Cyan
    Write-Host "=====================================" -ForegroundColor Cyan
    
    $Status = Get-ProcessStatus
    
    if ($Status.BackendRunning) {
        Write-Host "🐍 Backend:  ✅ Running (PID: $($Status.Backend.Id))" -ForegroundColor Green
        Write-Host "   URL: http://localhost:8000" -ForegroundColor Cyan
    } else {
        Write-Host "🐍 Backend:  ❌ Not running" -ForegroundColor Red
    }
    
    if ($Status.FrontendRunning) {
        Write-Host "📦 Frontend: ✅ Running (PID: $($Status.Frontend.Id))" -ForegroundColor Green
        Write-Host "   URL: http://localhost:3000" -ForegroundColor Cyan
    } else {
        Write-Host "📦 Frontend: ❌ Not running" -ForegroundColor Red
    }
    
    Write-Host ""
    if ($Status.BothRunning) {
        Write-Host "🎉 Application is fully operational!" -ForegroundColor Green
    } elseif ($Status.BackendRunning -or $Status.FrontendRunning) {
        Write-Host "⚠️ Application is partially running" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Application is not running" -ForegroundColor Red
    }
}

# Main execution logic
if ($Start) {
    Start-Application
} elseif ($Stop) {
    Stop-Application  
} elseif ($Status) {
    Show-Status
} elseif ($Restart) {
    Stop-Application
    Start-Sleep -Seconds 2
    Start-Application
} else {
    # Interactive mode
    Write-Host "🎯 Video Analysis App Launcher" -ForegroundColor Cyan
    Write-Host "==============================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Start Application" -ForegroundColor Green
    Write-Host "2. Stop Application" -ForegroundColor Red  
    Write-Host "3. Restart Application" -ForegroundColor Yellow
    Write-Host "4. Show Status" -ForegroundColor Cyan
    Write-Host "5. Exit" -ForegroundColor Gray
    Write-Host ""
    
    do {
        $Choice = Read-Host "Select option (1-5)"
        
        switch ($Choice) {
            "1" { Start-Application; break }
            "2" { Stop-Application; break }
            "3" { Stop-Application; Start-Sleep 2; Start-Application; break }
            "4" { Show-Status; break }
            "5" { exit 0 }
            default { Write-Host "Invalid choice. Please select 1-5." -ForegroundColor Red }
        }
    } while ($Choice -notin @("1","2","3","4","5"))
}
@echo off
title Video Analysis App Launcher

:: Video Analysis App - Simple Batch Launcher
:: This is a simplified launcher for users who prefer batch files

echo.
echo ========================================
echo    Video Analysis App - Quick Launcher
echo ========================================
echo.

:: Get the directory where this batch file is located
set SCRIPT_DIR=%~dp0
set PROJECT_DIR=%SCRIPT_DIR%..

echo Choose an option:
echo.
echo 1. Start Application (Full Setup)
echo 2. Start Application (Quick Launch)  
echo 3. Stop Application
echo 4. Open Control Panel (HTML)
echo 5. Open Project Folder
echo 6. Exit
echo.

set /p choice="Enter your choice (1-6): "

if "%choice%"=="1" goto :start_full
if "%choice%"=="2" goto :start_quick
if "%choice%"=="3" goto :stop_app
if "%choice%"=="4" goto :open_html
if "%choice%"=="5" goto :open_folder
if "%choice%"=="6" goto :exit
goto :invalid_choice

:start_full
echo.
echo Starting application with full setup...
powershell -ExecutionPolicy Bypass -File "%SCRIPT_DIR%launcher.ps1" -Start
goto :end

:start_quick
echo.
echo Quick starting application...
echo Starting backend...
cd /d "%PROJECT_DIR%\backend"
start "Backend" cmd /k "venv\Scripts\activate && python run_server.py"

echo Waiting for backend to start...
timeout /t 5 /nobreak > nul

echo Starting frontend...
cd /d "%PROJECT_DIR%"
start "Frontend" cmd /k "npm run dev"

echo.
echo Application is starting...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo Opening application in browser...
timeout /t 8 /nobreak > nul
start http://localhost:3000
goto :end

:stop_app
echo.
echo Stopping application...
powershell -ExecutionPolicy Bypass -File "%SCRIPT_DIR%launcher.ps1" -Stop
goto :end

:open_html
echo.
echo Opening HTML Control Panel...
start "" "%SCRIPT_DIR%launcher.html"
goto :end

:open_folder
echo.
echo Opening project folder...
start "" "%PROJECT_DIR%"
goto :end

:invalid_choice
echo.
echo Invalid choice. Please select 1-6.
echo.
pause
goto :start

:end
echo.
echo Done!
pause

:exit
exit /b 0
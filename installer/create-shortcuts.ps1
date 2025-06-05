# Create Desktop Shortcuts for Video Analysis App

$ErrorActionPreference = "Stop"

# Get script directory and project directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir

function Create-DesktopShortcut {
    param(
        [string]$ShortcutName,
        [string]$TargetPath,
        [string]$Arguments = "",
        [string]$WorkingDirectory = "",
        [string]$IconLocation = "",
        [string]$Description = ""
    )
    
    $WshShell = New-Object -ComObject WScript.Shell
    $Desktop = $WshShell.SpecialFolders("Desktop")
    $ShortcutPath = Join-Path $Desktop "$ShortcutName.lnk"
    
    $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
    $Shortcut.TargetPath = $TargetPath
    $Shortcut.Arguments = $Arguments
    $Shortcut.WorkingDirectory = $WorkingDirectory
    $Shortcut.Description = $Description
    
    if ($IconLocation) {
        $Shortcut.IconLocation = $IconLocation
    }
    
    $Shortcut.Save()
    
    Write-Host "✅ Created shortcut: $ShortcutName" -ForegroundColor Green
}

Write-Host "🔗 Creating desktop shortcuts..." -ForegroundColor Cyan

try {
    # Create main launcher shortcut (HTML Dashboard)
    Create-DesktopShortcut -ShortcutName "Video Analysis App" -TargetPath "$ScriptDir\launcher.html" -Description "Video Analysis App Control Panel - Start, stop, and monitor the application"
    
    # Create direct PowerShell launcher shortcut
    Create-DesktopShortcut -ShortcutName "Video Analysis App (PowerShell)" -TargetPath "powershell.exe" -Arguments "-ExecutionPolicy Bypass -File `"$ScriptDir\launcher.ps1`"" -WorkingDirectory $ScriptDir -Description "Video Analysis App PowerShell Launcher"
    
    # Create application folder shortcut
    Create-DesktopShortcut -ShortcutName "Video Analysis App Folder" -TargetPath $ProjectDir -Description "Open Video Analysis App project folder"
    
    Write-Host ""
    Write-Host "🎉 Desktop shortcuts created successfully!" -ForegroundColor Green
    Write-Host "📱 Main shortcut: 'Video Analysis App' (HTML Dashboard)" -ForegroundColor Cyan
    Write-Host "⚙️ Alt shortcut: 'Video Analysis App (PowerShell)' (Direct launcher)" -ForegroundColor Cyan
    Write-Host "📁 Folder shortcut: 'Video Analysis App Folder' (Project directory)" -ForegroundColor Cyan

} catch {
    Write-Host "❌ Failed to create shortcuts: $($_.Exception.Message)" -ForegroundColor Red
    throw
}
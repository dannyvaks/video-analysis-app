# Test Data Generator for Enhanced Resume System
# Creates sample files to test the new file selection interface

param(
    [switch]$CreateSamples = $false,
    [switch]$Clean = $false
)

$ProjectDir = Split-Path -Parent $PSScriptRoot
$UploadsDir = Join-Path $ProjectDir "backend\uploads"
$ExportsDir = Join-Path $ProjectDir "backend\exports"

# Test Data Generator for Enhanced Resume System
# Creates proper Excel files that match the real export format

param(
    [switch]$CreateSamples = $false,
    [switch]$Clean = $false
)

$ProjectDir = Split-Path -Parent $PSScriptRoot
$UploadsDir = Join-Path $ProjectDir "backend\uploads"
$ExportsDir = Join-Path $ProjectDir "backend\exports"

function Create-SampleFiles {
    Write-Host "🧪 Creating sample files for testing..." -ForegroundColor Yellow
    Write-Host ""
    
    # Ensure directories exist
    New-Item -ItemType Directory -Path $UploadsDir -Force | Out-Null
    New-Item -ItemType Directory -Path $ExportsDir -Force | Out-Null
    
    # Create sample video files (empty files with video extensions)
    $VideoFiles = @(
        "20241201_143022_traffic_analysis.mp4",
        "20241203_091530_bike_lane_study.mov",
        "20241205_160815_intersection_monitoring.avi",
        "20241207_120045_highway_vehicles.mkv"
    )
    
    Write-Host "🎥 Creating sample video files:" -ForegroundColor Cyan
    foreach ($video in $VideoFiles) {
        $videoPath = Join-Path $UploadsDir $video
        # Create a larger sample file to simulate real video
        $content = "Sample video file for testing - " + "A" * 1000  # Make it larger
        $content | Out-File -FilePath $videoPath -Encoding UTF8
        
        # Set different creation times to simulate real usage
        $daysOld = Get-Random -Minimum 1 -Maximum 6
        $creationTime = (Get-Date).AddDays(-$daysOld)
        (Get-Item $videoPath).CreationTime = $creationTime
        (Get-Item $videoPath).LastWriteTime = $creationTime
        
        Write-Host "   ✅ $video ($daysOld days old)" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "📊 Creating sample Excel files using Python..." -ForegroundColor Cyan
    
    # Create a Python script to generate proper Excel files
    $pythonScript = @"
import pandas as pd
import os
from datetime import datetime

exports_dir = r'$ExportsDir'

# Sample data that matches real export format
sample_data = [
    {
        'filename': 'video_analysis_20241201_traffic.xlsx',
        'data': {
            'Detection ID': ['det_001', 'det_002', 'det_003', 'det_004'],
            'Frame Number': [150, 300, 450, 600],
            'Timestamp': [5.0, 10.0, 15.0, 20.0],
            'Model Prediction': ['car', 'bicycle', 'truck', 'motorcycle'],
            'Model Confidence': [0.85, 0.72, 0.91, 0.78],
            'User Choice': ['car', 'bicycle', 'truck', 'motorcycle'],
            'Manual Correction': ['No', 'No', 'No', 'No'],
            'Manual Label': ['No', 'No', 'No', 'No'],
            'Bbox X': [100, 200, 300, 150],
            'Bbox Y': [50, 100, 150, 75],
            'Bbox Width': [80, 50, 120, 60],
            'Bbox Height': [60, 80, 90, 70]
        }
    },
    {
        'filename': 'video_analysis_20241203_bikes.xlsx',
        'data': {
            'Detection ID': ['det_001', 'det_002', 'det_003'],
            'Frame Number': [120, 240, 360],
            'Timestamp': [4.0, 8.0, 12.0],
            'Model Prediction': ['bicycle', 'bicycle', 'electric_scooter'],
            'Model Confidence': [0.89, 0.83, 0.76],
            'User Choice': ['bicycle', 'bicycle', 'electric_scooter'],
            'Manual Correction': ['No', 'No', 'No'],
            'Manual Label': ['No', 'No', 'No'],
            'Bbox X': [80, 180, 250],
            'Bbox Y': [40, 90, 120],
            'Bbox Width': [45, 50, 40],
            'Bbox Height': [75, 80, 65]
        }
    },
    {
        'filename': 'video_analysis_20241205_intersection.xlsx',
        'data': {
            'Detection ID': ['det_001', 'det_002', 'det_003', 'det_004', 'det_005'],
            'Frame Number': [90, 180, 270, 360, 450],
            'Timestamp': [3.0, 6.0, 9.0, 12.0, 15.0],
            'Model Prediction': ['car', 'truck', 'bus', 'car', 'motorcycle'],
            'Model Confidence': [0.92, 0.88, 0.94, 0.81, 0.73],
            'User Choice': ['car', 'truck', 'bus', 'car', 'motorcycle'],
            'Manual Correction': ['No', 'No', 'No', 'No', 'No'],
            'Manual Label': ['No', 'No', 'No', 'No', 'No'],
            'Bbox X': [120, 220, 50, 320, 180],
            'Bbox Y': [60, 110, 25, 160, 90],
            'Bbox Width': [85, 140, 160, 75, 55],
            'Bbox Height': [65, 100, 120, 55, 70]
        }
    },
    {
        'filename': 'video_analysis_20241207_highway.xlsx',
        'data': {
            'Detection ID': ['det_001', 'det_002', 'det_003', 'det_004', 'det_005', 'det_006'],
            'Frame Number': [60, 120, 180, 240, 300, 360],
            'Timestamp': [2.0, 4.0, 6.0, 8.0, 10.0, 12.0],
            'Model Prediction': ['car', 'truck', 'car', 'car', 'truck', 'bus'],
            'Model Confidence': [0.87, 0.93, 0.84, 0.89, 0.91, 0.96],
            'User Choice': ['car', 'truck', 'car', 'car', 'truck', 'bus'],
            'Manual Correction': ['No', 'No', 'No', 'No', 'No', 'No'],
            'Manual Label': ['No', 'No', 'No', 'No', 'No', 'No'],
            'Bbox X': [110, 210, 310, 90, 190, 70],
            'Bbox Y': [55, 105, 155, 45, 95, 35],
            'Bbox Width': [80, 130, 75, 80, 135, 150],
            'Bbox Height': [60, 95, 55, 60, 100, 115]
        }
    }
]

for item in sample_data:
    df = pd.DataFrame(item['data'])
    filepath = os.path.join(exports_dir, item['filename'])
    
    # Create Excel file with Detection Data sheet (matches real export format)
    with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Detection Data', index=False)
    
    print(f"Created: {item['filename']} with {len(df)} detections")

print("\nAll Excel files created successfully!")
"@
    
    # Save and run the Python script
    $scriptPath = Join-Path $env:TEMP "create_excel_samples.py"
    $pythonScript | Out-File -FilePath $scriptPath -Encoding UTF8
    
    try {
        # Try to run Python script
        $result = python $scriptPath 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   $result" -ForegroundColor Green
            
            # Set creation times for Excel files to match videos
            $ExcelFiles = Get-ChildItem $ExportsDir -Filter "*.xlsx"
            for ($i = 0; $i -lt [Math]::Min($VideoFiles.Count, $ExcelFiles.Count); $i++) {
                $videoPath = Join-Path $UploadsDir $VideoFiles[$i]
                $excelFile = $ExcelFiles[$i]
                
                if ((Test-Path $videoPath) -and $excelFile) {
                    $videoTime = (Get-Item $videoPath).CreationTime
                    $excelFile.CreationTime = $videoTime.AddMinutes(30) # Excel created 30 min after video
                    $excelFile.LastWriteTime = $videoTime.AddMinutes(30)
                    
                    $ageInDays = ((Get-Date) - $excelFile.CreationTime).Days
                    Write-Host "   ✅ $($excelFile.Name) ($ageInDays days old)" -ForegroundColor Green
                }
            }
        } else {
            Write-Host "   ❌ Python script failed: $result" -ForegroundColor Red
            Write-Host "   ⚠️ Falling back to basic file creation..." -ForegroundColor Yellow
            Create-BasicExcelFiles
        }
    } catch {
        Write-Host "   ❌ Python not available or pandas missing" -ForegroundColor Red
        Write-Host "   ⚠️ Falling back to basic file creation..." -ForegroundColor Yellow
        Create-BasicExcelFiles
    }
    
    # Clean up temp script
    if (Test-Path $scriptPath) {
        Remove-Item $scriptPath -Force
    }
    
    Write-Host ""
    Write-Host "✅ Sample files created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Files created:" -ForegroundColor Yellow
    Write-Host "   Videos: $($VideoFiles.Count) files in uploads/" -ForegroundColor Gray
    Write-Host "   Excel: 4 XLSX files in exports/" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Test the interface:" -ForegroundColor Yellow
    Write-Host "1. Start the backend: cd backend && python run_server.py" -ForegroundColor Gray
    Write-Host "2. Start the frontend: npm run dev" -ForegroundColor Gray
    Write-Host "3. Click 'Resume Analysis' -> 'Browse Existing Files'" -ForegroundColor Gray
    Write-Host "4. Select any video and any Excel file manually" -ForegroundColor Gray
    Write-Host ""
}

function Create-BasicExcelFiles {
    # Fallback: Create basic CSV files with .xlsx extension (pandas can read these)
    $ExcelData = @(
        @{ Name = "video_analysis_20241201_traffic.xlsx"; Content = "Detection ID,Frame Number,Timestamp,Model Prediction,Model Confidence,User Choice,Manual Correction,Manual Label,Bbox X,Bbox Y,Bbox Width,Bbox Height`ndet_001,150,5.0,car,0.85,car,No,No,100,50,80,60`ndet_002,300,10.0,bicycle,0.72,bicycle,No,No,200,100,50,80" },
        @{ Name = "video_analysis_20241203_bikes.xlsx"; Content = "Detection ID,Frame Number,Timestamp,Model Prediction,Model Confidence,User Choice,Manual Correction,Manual Label,Bbox X,Bbox Y,Bbox Width,Bbox Height`ndet_001,120,4.0,bicycle,0.89,bicycle,No,No,80,40,45,75`ndet_002,240,8.0,bicycle,0.83,bicycle,No,No,180,90,50,80" },
        @{ Name = "video_analysis_20241205_intersection.xlsx"; Content = "Detection ID,Frame Number,Timestamp,Model Prediction,Model Confidence,User Choice,Manual Correction,Manual Label,Bbox X,Bbox Y,Bbox Width,Bbox Height`ndet_001,90,3.0,car,0.92,car,No,No,120,60,85,65`ndet_002,180,6.0,truck,0.88,truck,No,No,220,110,140,100" },
        @{ Name = "video_analysis_20241207_highway.xlsx"; Content = "Detection ID,Frame Number,Timestamp,Model Prediction,Model Confidence,User Choice,Manual Correction,Manual Label,Bbox X,Bbox Y,Bbox Width,Bbox Height`ndet_001,60,2.0,car,0.87,car,No,No,110,55,80,60`ndet_002,120,4.0,truck,0.93,truck,No,No,210,105,130,95" }
    )
    
    foreach ($excel in $ExcelData) {
        $excelPath = Join-Path $ExportsDir $excel.Name
        $excel.Content | Out-File -FilePath $excelPath -Encoding UTF8
        Write-Host "   ✅ $($excel.Name) (basic format)" -ForegroundColor Yellow
    }
}

function Clean-SampleFiles {
    Write-Host "🧹 Cleaning sample files..." -ForegroundColor Yellow
    
    $cleaned = 0
    
    if (Test-Path $UploadsDir) {
        $files = Get-ChildItem $UploadsDir -File
        foreach ($file in $files) {
            Remove-Item $file.FullName -Force
            $cleaned++
            Write-Host "   Removed: $($file.Name)" -ForegroundColor Gray
        }
    }
    
    if (Test-Path $ExportsDir) {
        $files = Get-ChildItem $ExportsDir -File
        foreach ($file in $files) {
            Remove-Item $file.FullName -Force
            $cleaned++
            Write-Host "   Removed: $($file.Name)" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "✅ Cleaned $cleaned sample files" -ForegroundColor Green
}

# Main execution
Write-Host "🧪 Enhanced Resume System - Test Data Generator" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

if ($CreateSamples) {
    Create-SampleFiles
} elseif ($Clean) {
    Clean-SampleFiles
} else {
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\test-enhanced-resume.ps1 -CreateSamples    # Create sample video and Excel files" -ForegroundColor Gray
    Write-Host "  .\test-enhanced-resume.ps1 -Clean            # Remove all sample files" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Purpose:" -ForegroundColor Yellow
    Write-Host "  Creates sample files to test the enhanced resume system" -ForegroundColor Gray
    Write-Host "  where users can manually select video and analysis files" -ForegroundColor Gray
    Write-Host "  instead of relying on automatic filename matching." -ForegroundColor Gray
    Write-Host ""
}
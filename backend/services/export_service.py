"""
Excel Export Service
Generates comprehensive Excel reports with detection data and statistics.
"""

import os
import logging
import tempfile
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from datetime import datetime
import pandas as pd
import numpy as np
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.chart import BarChart, PieChart, LineChart, Reference
from openpyxl.drawing.image import Image as ExcelImage
from openpyxl.utils.dataframe import dataframe_to_rows
import xlsxwriter
from io import BytesIO
import base64

from .video_processor_service import VideoMetadata, UniqueDetection

# Configure logging
logger = logging.getLogger(__name__)

@dataclass
class DetectionStatistics:
    """Statistics calculated from detection data"""
    total_detections: int
    detections_by_type: Dict[str, int]
    detections_by_confidence: Dict[str, int]
    manual_corrections: int
    manually_added: int
    processing_time: float
    average_confidence: float
    frames_covered: int
    detection_density: float  # detections per minute
    
    def to_dict(self) -> Dict:
        return {
            "totalDetections": self.total_detections,
            "detectionsByType": self.detections_by_type,
            "detectionsByConfidence": self.detections_by_confidence,
            "manualCorrections": self.manual_corrections,
            "manuallyAdded": self.manually_added,
            "processingTime": self.processing_time,
            "averageConfidence": self.average_confidence,
            "framesCovered": self.frames_covered,
            "detectionDensity": self.detection_density
        }

@dataclass
class ExportConfig:
    """Configuration for export generation"""
    include_frame_images: bool = False
    include_charts: bool = True
    include_summary: bool = True
    include_raw_data: bool = True
    file_format: str = "xlsx"  # xlsx or csv
    
class ExportService:
    """
    Excel export service for video analysis results.
    
    Features:
    - Comprehensive detection data export
    - Statistical analysis and charts
    - Multiple sheet organization
    - Customizable export options
    - Professional formatting
    """
    
    def __init__(self):
        """Initialize export service."""
        self.temp_dir = tempfile.gettempdir()
        logger.info("Export Service initialized")
    
    async def export_to_excel(self, 
                             video_metadata: VideoMetadata,
                             detections: List[UniqueDetection],
                             config: Optional[ExportConfig] = None) -> bytes:
        """
        Export analysis results to Excel format.
        
        Args:
            video_metadata: Video file metadata
            detections: List of unique detections
            config: Export configuration options
            
        Returns:
            Excel file as bytes
        """
        if config is None:
            config = ExportConfig()
        
        try:
            logger.info(f"Exporting {len(detections)} detections to Excel")
            
            # Calculate statistics
            statistics = self._calculate_statistics(video_metadata, detections)
            
            # Create Excel workbook
            if config.file_format == "xlsx":
                return await self._create_xlsx_export(
                    video_metadata, detections, statistics, config
                )
            else:
                return await self._create_csv_export(
                    video_metadata, detections, statistics
                )
                
        except Exception as e:
            logger.error(f"Export failed: {str(e)}")
            raise
    
    async def _create_xlsx_export(self, 
                                 video_metadata: VideoMetadata,
                                 detections: List[UniqueDetection],
                                 statistics: DetectionStatistics,
                                 config: ExportConfig) -> bytes:
        """Create comprehensive XLSX export with multiple sheets."""
        
        # Create workbook in memory
        output = BytesIO()
        
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            workbook = writer.book
            
            # Define formats
            header_format = workbook.add_format({
                'bold': True,
                'font_size': 12,
                'bg_color': '#4472C4',
                'font_color': 'white',
                'align': 'center',
                'valign': 'vcenter',
                'border': 1
            })
            
            cell_format = workbook.add_format({
                'align': 'center',
                'valign': 'vcenter',
                'border': 1
            })
            
            number_format = workbook.add_format({
                'num_format': '0.000',
                'align': 'center',
                'border': 1
            })
            
            # Sheet 1: Summary
            if config.include_summary:
                self._create_summary_sheet(
                    writer, video_metadata, statistics, header_format, cell_format
                )
            
            # Sheet 2: Detection Data
            if config.include_raw_data:
                self._create_detection_data_sheet(
                    writer, detections, header_format, cell_format, number_format
                )
            
            # Sheet 3: Statistics
            self._create_statistics_sheet(
                writer, statistics, header_format, cell_format, number_format
            )
            
            # Sheet 4: Charts (if enabled)
            if config.include_charts:
                self._create_charts_sheet(
                    writer, statistics, detections
                )
        
        output.seek(0)
        return output.getvalue()
    
    def _create_summary_sheet(self, 
                             writer: pd.ExcelWriter,
                             video_metadata: VideoMetadata,
                             statistics: DetectionStatistics,
                             header_format: Any,
                             cell_format: Any):
        """Create summary sheet with video info and key metrics."""
        
        # Video metadata section
        video_data = [
            ['Video Information', ''],
            ['Filename', video_metadata.filename],
            ['Duration (seconds)', f"{video_metadata.duration:.2f}"],
            ['Resolution', f"{video_metadata.width}x{video_metadata.height}"],
            ['Frame Rate (FPS)', f"{video_metadata.fps:.2f}"],
            ['Total Frames', video_metadata.frame_count],
            ['File Size (MB)', f"{video_metadata.file_size / (1024*1024):.2f}"],
            ['Upload Date', video_metadata.uploaded_at],
            ['', ''],
            ['Detection Summary', ''],
            ['Total Unique Detections', statistics.total_detections],
            ['Manual Corrections', statistics.manual_corrections],
            ['Manually Added', statistics.manually_added],
            ['Average Confidence', f"{statistics.average_confidence:.3f}"],
            ['Detection Density (per minute)', f"{statistics.detection_density:.2f}"],
            ['Processing Time (seconds)', f"{statistics.processing_time:.2f}"]
        ]
        
        df_summary = pd.DataFrame(video_data, columns=['Property', 'Value'])
        df_summary.to_excel(writer, sheet_name='Summary', index=False)
        
        # Format the summary sheet
        worksheet = writer.sheets['Summary']
        worksheet.set_column('A:A', 25)
        worksheet.set_column('B:B', 30)
        
        # Apply header formatting to section headers
        for row_num in [0, 9]:
            worksheet.write(row_num, 0, df_summary.iloc[row_num, 0], header_format)
            worksheet.write(row_num, 1, df_summary.iloc[row_num, 1], header_format)
    
    def _create_detection_data_sheet(self, 
                                   writer: pd.ExcelWriter,
                                   detections: List[UniqueDetection],
                                   header_format: Any,
                                   cell_format: Any,
                                   number_format: Any):
        """Create detailed detection data sheet."""
        
        # Prepare detection data
        detection_data = []
        for detection in detections:
            # Get primary model suggestion
            primary_suggestion = detection.model_suggestions[0] if detection.model_suggestions else {}
            
            row = {
                'Detection ID': detection.id,
                'Timestamp': detection.timestamp,
                'Frame Number': detection.frame_number,
                'Model Prediction': primary_suggestion.get('type', 'Unknown'),
                'Model Confidence': primary_suggestion.get('confidence', 0),
                'User Choice': detection.user_choice or 'Not Reviewed',
                'Manual Correction': 'Yes' if detection.is_manual_correction else 'No',
                'Manual Label': 'Yes' if detection.is_manual_label else 'No',
                'Bbox X': detection.bbox['x'],
                'Bbox Y': detection.bbox['y'],
                'Bbox Width': detection.bbox['width'],
                'Bbox Height': detection.bbox['height'],
                'Processed At': detection.processed_at
            }
            detection_data.append(row)
        
        # Create DataFrame and export
        df_detections = pd.DataFrame(detection_data)
        df_detections.to_excel(writer, sheet_name='Detection Data', index=False)
        
        # Format the detection data sheet
        worksheet = writer.sheets['Detection Data']
        
        # Set column widths
        column_widths = {
            'A': 15,  # Detection ID
            'B': 12,  # Timestamp
            'C': 12,  # Frame Number
            'D': 18,  # Model Prediction
            'E': 15,  # Model Confidence
            'F': 15,  # User Choice
            'G': 15,  # Manual Correction
            'H': 12,  # Manual Label
            'I': 10,  # Bbox X
            'J': 10,  # Bbox Y
            'K': 12,  # Bbox Width
            'L': 12,  # Bbox Height
            'M': 18   # Processed At
        }
        
        for col, width in column_widths.items():
            worksheet.set_column(f'{col}:{col}', width)
        
        # Apply number formatting to numeric columns
        for row in range(1, len(detection_data) + 1):
            worksheet.write(row, 4, df_detections.iloc[row-1]['Model Confidence'], number_format)
            worksheet.write(row, 8, df_detections.iloc[row-1]['Bbox X'], number_format)
            worksheet.write(row, 9, df_detections.iloc[row-1]['Bbox Y'], number_format)
            worksheet.write(row, 10, df_detections.iloc[row-1]['Bbox Width'], number_format)
            worksheet.write(row, 11, df_detections.iloc[row-1]['Bbox Height'], number_format)
    
    def _create_statistics_sheet(self, 
                               writer: pd.ExcelWriter,
                               statistics: DetectionStatistics,
                               header_format: Any,
                               cell_format: Any,
                               number_format: Any):
        """Create statistics sheet with detailed analysis."""
        
        # Detection by type statistics
        type_data = []
        for vehicle_type, count in statistics.detections_by_type.items():
            percentage = (count / statistics.total_detections) * 100 if statistics.total_detections > 0 else 0
            type_data.append({
                'Vehicle Type': vehicle_type.replace('_', ' ').title(),
                'Count': count,
                'Percentage': f"{percentage:.1f}%"
            })
        
        df_types = pd.DataFrame(type_data)
        df_types.to_excel(writer, sheet_name='Statistics', index=False, startrow=0)
        
        # Confidence distribution statistics
        conf_data = []
        for conf_range, count in statistics.detections_by_confidence.items():
            percentage = (count / statistics.total_detections) * 100 if statistics.total_detections > 0 else 0
            conf_data.append({
                'Confidence Range': conf_range,
                'Count': count,
                'Percentage': f"{percentage:.1f}%"
            })
        
        df_confidence = pd.DataFrame(conf_data)
        start_row = len(type_data) + 3
        df_confidence.to_excel(writer, sheet_name='Statistics', index=False, startrow=start_row)
        
        # Overall statistics
        overall_stats = [
            ['Overall Statistics', '', ''],
            ['Total Detections', statistics.total_detections, ''],
            ['Average Confidence', f"{statistics.average_confidence:.3f}", ''],
            ['Manual Corrections', statistics.manual_corrections, f"{(statistics.manual_corrections/statistics.total_detections)*100:.1f}%" if statistics.total_detections > 0 else "0%"],
            ['Manually Added', statistics.manually_added, ''],
            ['Detection Density (per minute)', f"{statistics.detection_density:.2f}", ''],
            ['Processing Time (seconds)', f"{statistics.processing_time:.2f}", '']
        ]
        
        df_overall = pd.DataFrame(overall_stats, columns=['Metric', 'Value', 'Percentage'])
        start_row = len(type_data) + len(conf_data) + 6
        df_overall.to_excel(writer, sheet_name='Statistics', index=False, startrow=start_row)
        
        # Format the statistics sheet
        worksheet = writer.sheets['Statistics']
        worksheet.set_column('A:A', 25)
        worksheet.set_column('B:B', 15)
        worksheet.set_column('C:C', 15)
    
    def _create_charts_sheet(self, 
                           writer: pd.ExcelWriter,
                           statistics: DetectionStatistics,
                           detections: List[UniqueDetection]):
        """Create charts sheet with visual analysis."""
        
        # Create a simple data table for charts
        chart_data = []
        for vehicle_type, count in statistics.detections_by_type.items():
            chart_data.append({
                'Vehicle Type': vehicle_type.replace('_', ' ').title(),
                'Count': count
            })
        
        df_chart = pd.DataFrame(chart_data)
        df_chart.to_excel(writer, sheet_name='Charts', index=False)
        
        # Note: xlsxwriter charts would require more complex setup
        # For now, we'll just provide the data for manual chart creation
        worksheet = writer.sheets['Charts']
        worksheet.write('D1', 'Charts can be created from the data in column A-B', 
                       writer.book.add_format({'italic': True}))
    
    async def _create_csv_export(self, 
                                video_metadata: VideoMetadata,
                                detections: List[UniqueDetection],
                                statistics: DetectionStatistics) -> bytes:
        """Create CSV export as fallback option."""
        
        # Prepare detection data
        detection_data = []
        for detection in detections:
            primary_suggestion = detection.model_suggestions[0] if detection.model_suggestions else {}
            
            row = {
                'detection_id': detection.id,
                'timestamp': detection.timestamp,
                'frame_number': detection.frame_number,
                'model_prediction': primary_suggestion.get('type', 'Unknown'),
                'model_confidence': primary_suggestion.get('confidence', 0),
                'user_choice': detection.user_choice or 'Not Reviewed',
                'manual_correction': detection.is_manual_correction,
                'manual_label': detection.is_manual_label,
                'bbox_x': detection.bbox['x'],
                'bbox_y': detection.bbox['y'],
                'bbox_width': detection.bbox['width'],
                'bbox_height': detection.bbox['height'],
                'processed_at': detection.processed_at
            }
            detection_data.append(row)
        
        # Create DataFrame and convert to CSV
        df = pd.DataFrame(detection_data)
        csv_buffer = BytesIO()
        df.to_csv(csv_buffer, index=False, encoding='utf-8')
        
        return csv_buffer.getvalue()
    
    def _calculate_statistics(self, 
                             video_metadata: VideoMetadata,
                             detections: List[UniqueDetection]) -> DetectionStatistics:
        """Calculate comprehensive statistics from detection data."""
        
        if not detections:
            return DetectionStatistics(
                total_detections=0,
                detections_by_type={},
                detections_by_confidence={'High (>0.8)': 0, 'Medium (0.5-0.8)': 0, 'Low (<0.5)': 0},
                manual_corrections=0,
                manually_added=0,
                processing_time=0,
                average_confidence=0,
                frames_covered=0,
                detection_density=0
            )
        
        total_detections = len(detections)
        
        # Count by vehicle type
        detections_by_type = {}
        confidence_sum = 0
        high_conf = medium_conf = low_conf = 0
        manual_corrections = 0
        manually_added = 0
        
        for detection in detections:
            # Count by type (use user choice if available, otherwise model prediction)
            vehicle_type = detection.user_choice
            if not vehicle_type and detection.model_suggestions:
                vehicle_type = detection.model_suggestions[0].get('type', 'unknown')
            if not vehicle_type:
                vehicle_type = 'unknown'
            
            detections_by_type[vehicle_type] = detections_by_type.get(vehicle_type, 0) + 1
            
            # Confidence statistics
            if detection.model_suggestions:
                confidence = detection.model_suggestions[0].get('confidence', 0)
                confidence_sum += confidence
                
                if confidence > 0.8:
                    high_conf += 1
                elif confidence >= 0.5:
                    medium_conf += 1
                else:
                    low_conf += 1
            
            # Manual intervention tracking
            if detection.is_manual_correction:
                manual_corrections += 1
            if detection.is_manual_label:
                manually_added += 1
        
        # Calculate derived statistics
        average_confidence = confidence_sum / total_detections if total_detections > 0 else 0
        
        # Get unique frames covered
        frames_covered = len(set(d.frame_number for d in detections))
        
        # Calculate detection density (detections per minute)
        duration_minutes = video_metadata.duration / 60 if video_metadata.duration > 0 else 1
        detection_density = total_detections / duration_minutes
        
        detections_by_confidence = {
            'High (>0.8)': high_conf,
            'Medium (0.5-0.8)': medium_conf,
            'Low (<0.5)': low_conf
        }
        
        return DetectionStatistics(
            total_detections=total_detections,
            detections_by_type=detections_by_type,
            detections_by_confidence=detections_by_confidence,
            manual_corrections=manual_corrections,
            manually_added=manually_added,
            processing_time=0,  # This would be tracked during processing
            average_confidence=average_confidence,
            frames_covered=frames_covered,
            detection_density=detection_density
        )
    
    async def export_detection_images(self, 
                                     detections: List[UniqueDetection],
                                     output_dir: str) -> List[str]:
        """Export individual detection frame images."""
        exported_files = []
        
        for i, detection in enumerate(detections):
            if detection.frame_image_data:
                try:
                    # Decode base64 image
                    image_data = detection.frame_image_data.split(',')[1]  # Remove data:image/jpeg;base64,
                    image_bytes = base64.b64decode(image_data)
                    
                    # Save image file
                    filename = f"detection_{i+1:03d}_{detection.id[:8]}.jpg"
                    filepath = os.path.join(output_dir, filename)
                    
                    with open(filepath, 'wb') as f:
                        f.write(image_bytes)
                    
                    exported_files.append(filepath)
                    
                except Exception as e:
                    logger.error(f"Failed to export detection image {i}: {str(e)}")
        
        logger.info(f"Exported {len(exported_files)} detection images")
        return exported_files

# Example usage
if __name__ == "__main__":
    import asyncio
    from .video_processor_service import VideoMetadata, UniqueDetection
    
    async def test_export():
        """Test the export service."""
        export_service = ExportService()
        
        # Create dummy data for testing
        video_metadata = VideoMetadata(
            filename="test_video.mp4",
            duration=120.0,
            width=1920,
            height=1080,
            fps=30.0,
            frame_count=3600,
            file_size=50000000,
            uploaded_at="2024-01-01 12:00:00"
        )
        
        # Create dummy detections
        detections = [
            UniqueDetection(
                id=f"det_{i}",
                timestamp=f"00:0{i//10}:{i%10:02d}.000",
                frame_number=i*30,
                frame_image_data="",
                bbox={"x": 100, "y": 100, "width": 50, "height": 50},
                model_suggestions=[{"type": "bicycle", "confidence": 0.85}],
                user_choice="bicycle",
                is_manual_label=False,
                is_manual_correction=False,
                processed_at="2024-01-01 12:00:00"
            )
            for i in range(10)
        ]
        
        # Export to Excel
        excel_data = await export_service.export_to_excel(video_metadata, detections)
        
        # Save to file for testing
        with open('test_export.xlsx', 'wb') as f:
            f.write(excel_data)
        
        print(f"Exported {len(detections)} detections to test_export.xlsx")
    
    # Run test
    asyncio.run(test_export())
import React, { useState } from 'react';
import { VideoMetadata, Detection } from '../types';
import { exportAnalysisResults, downloadFile } from '../services/api';

interface ExportInterfaceProps {
  video: VideoMetadata | null;
  detections: Detection[];
  onExport: () => void;
  onStartOver: () => void;
}

const ExportInterface: React.FC<ExportInterfaceProps> = ({
  video,
  detections,
  onExport,
  onStartOver
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    include_frame_images: false,
    include_charts: true,
    file_format: 'xlsx' as 'xlsx' | 'csv'
  });
  const [lastExport, setLastExport] = useState<{
    filename: string;
    downloadUrl: string;
    timestamp: string;
  } | null>(null);

  const handleExport = async () => {
    if (!video || !detections.length) return;

    try {
      setIsExporting(true);
      console.log('🚀 Starting export...', { video, detections: detections.length, exportOptions });

      // Export to backend with correct format
      const result = await exportAnalysisResults(video, detections, {
        include_frame_images: exportOptions.include_frame_images,
        include_charts: exportOptions.include_charts,
        file_format: exportOptions.file_format
      });
      
      console.log('✅ Export completed:', result);
      
      // Automatically download the file
      await downloadFile(result.filename);
      
      // Store export info
      setLastExport({
        filename: result.filename,
        downloadUrl: result.download_url,
        timestamp: new Date().toLocaleString()
      });

      // Notify parent component
      onExport();
      
    } catch (error) {
      console.error('❌ Export failed:', error);
      alert(`Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const getExportStats = () => {
    const reviewedCount = detections.filter(d => d.userChoice).length;
    const totalCount = detections.length;
    const reviewProgress = totalCount > 0 ? (reviewedCount / totalCount) * 100 : 0;
    
    return {
      total: totalCount,
      reviewed: reviewedCount,
      unreviewed: totalCount - reviewedCount,
      progress: reviewProgress
    };
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const stats = getExportStats();

  if (!video || !detections.length) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          📤 Export Results
        </h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-2">📋</div>
          <p className="text-gray-500 mb-4">
            Complete the video analysis to export results.
          </p>
          <button
            onClick={onStartOver}
            className="btn btn-primary"
          >
            Start New Analysis
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
      
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          📤 Export Analysis Results
        </h3>
        <p className="text-sm text-gray-600">
          Generate comprehensive reports with detection data and statistics.
        </p>
      </div>

      {/* Export Readiness Status */}
      <div className={`p-4 rounded-lg border-2 ${
        stats.progress === 100 
          ? 'border-green-200 bg-green-50' 
          : 'border-amber-200 bg-amber-50'
      }`}>
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-lg">
            {stats.progress === 100 ? '✅' : '⏳'}
          </span>
          <span className={`font-medium ${
            stats.progress === 100 ? 'text-green-800' : 'text-amber-800'
          }`}>
            {stats.progress === 100 ? 'Ready to Export' : 'Review in Progress'}
          </span>
        </div>
        
        <div className="text-sm space-y-1">
          <div className={stats.progress === 100 ? 'text-green-700' : 'text-amber-700'}>
            <strong>{stats.reviewed}</strong> of <strong>{stats.total}</strong> detections reviewed
          </div>
          
          {stats.progress < 100 && (
            <div className="text-amber-700">
              <strong>{stats.unreviewed}</strong> detections still need review
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="progress-bar">
            <div 
              className={`progress-fill ${
                stats.progress === 100 ? 'bg-green-500' : 'bg-amber-500'
              }`}
              style={{ width: `${stats.progress}%` }}
            />
          </div>
          <div className="text-xs text-gray-600 mt-1 text-right">
            {Math.round(stats.progress)}% Complete
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Export Options</h4>
        
        {/* Include Charts Option */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="include_charts"
            checked={exportOptions.include_charts}
            onChange={(e) => setExportOptions(prev => ({ 
              ...prev, 
              include_charts: e.target.checked 
            }))}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="include_charts" className="text-sm font-medium text-gray-700">
            Include Charts & Visualizations
          </label>
        </div>
        
        {/* Include Frame Images Option */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="include_images"
            checked={exportOptions.include_frame_images}
            onChange={(e) => setExportOptions(prev => ({ 
              ...prev, 
              include_frame_images: e.target.checked 
            }))}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="include_images" className="text-sm font-medium text-gray-700">
            Include Detection Images
          </label>
        </div>
      </div>

      {/* Export Contents Preview */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h5 className="text-sm font-medium text-gray-900 mb-2">
          Export will include:
        </h5>
        <ul className="text-sm text-gray-700 space-y-1">
          <li className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>Video metadata and information</span>
          </li>
          <li className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>All {stats.total} unique detections with timestamps</span>
          </li>
          <li className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>User choices and manual corrections</span>
          </li>
          <li className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>Bounding box coordinates</span>
          </li>
          <li className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>Statistical analysis and summaries</span>
          </li>
          {exportOptions.include_charts && (
            <li className="flex items-center space-x-2">
              <span className="text-blue-500">✓</span>
              <span>Charts and visualizations</span>
            </li>
          )}
          {exportOptions.include_frame_images && (
            <li className="flex items-center space-x-2">
              <span className="text-blue-500">✓</span>
              <span>Detection frame images</span>
            </li>
          )}
        </ul>
      </div>

      {/* Export Button */}
      <div className="space-y-3">
        <button
          onClick={handleExport}
          disabled={isExporting}
          className={`w-full btn btn-lg ${
            !isExporting
              ? 'btn-primary'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isExporting ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span>Generating Export...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span>📊</span>
              <span>Export Excel Report</span>
              {stats.progress < 100 && (
                <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs">
                  {stats.reviewed}/{stats.total} reviewed
                </span>
              )}
            </div>
          )}
        </button>

        {stats.progress < 100 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <span className="text-amber-500 mt-0.5">⚠️</span>
              <div className="text-sm text-amber-800">
                <div className="font-medium">Partial Export Notice</div>
                <div className="text-xs mt-1">
                  Only {stats.reviewed} of {stats.total} detections have been manually reviewed. 
                  Unreviewed detections will use AI predictions only.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Last Export Info */}
      {lastExport && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <span className="text-green-500 mt-0.5">✅</span>
            <div className="flex-1">
              <div className="text-sm font-medium text-green-800">
                Export completed successfully!
              </div>
              <div className="text-xs text-green-700 mt-1">
                <div>File: {lastExport.filename}</div>
                <div>Generated: {lastExport.timestamp}</div>
              </div>
              <button
                onClick={() => downloadFile(lastExport.filename)}
                className="mt-2 text-xs text-green-800 hover:text-green-900 underline"
              >
                Download again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Additional Actions */}
      <div className="pt-4 border-t border-gray-200 space-y-3">
        <button
          onClick={onStartOver}
          className="w-full btn btn-outline"
        >
          <div className="flex items-center justify-center space-x-2">
            <span>🔄</span>
            <span>Analyze Another Video</span>
          </div>
        </button>
        
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Having issues? Try exporting as CSV format for better compatibility.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExportInterface;
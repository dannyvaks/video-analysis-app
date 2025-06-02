import React, { useState } from 'react';
import { DetectionMode } from '../types';
import { apiService } from '../services/api';

interface ResumeAnalysisProps {
  onResumeSuccess: (data: any) => void;
  isVisible: boolean;
  onClose: () => void;
}

const ResumeAnalysis: React.FC<ResumeAnalysisProps> = ({
  onResumeSuccess,
  isVisible,
  onClose
}) => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [detectionMode, setDetectionMode] = useState<DetectionMode>(DetectionMode.VEHICLES);
  const [modelConfidence, setModelConfidence] = useState(0.25);
  const [isUploading, setIsUploading] = useState(false);

  const handleResume = async () => {
    if (!videoFile || !excelFile) {
      alert('Please select both video and Excel files');
      return;
    }

    setIsUploading(true);
    try {
      const result = await apiService.resumeAnalysis(
        videoFile,
        excelFile,
        detectionMode,
        modelConfidence
      );
      
      onResumeSuccess(result);
      onClose();
      
    } catch (error) {
      console.error('❌ Resume failed:', error);
      alert(`Resume failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            🔄 Resume Previous Analysis
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-2">
            <span className="text-blue-500 mt-0.5">💡</span>
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-1">How to Resume:</div>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Upload the same video file you analyzed before</li>
                <li>Upload the Excel file you exported previously</li>
                <li>Continue reviewing from where you left off</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          
          {/* Video File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Original Video File
            </label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {videoFile && (
              <div className="mt-1 text-sm text-gray-600">
                Selected: {videoFile.name}
              </div>
            )}
          </div>

          {/* Excel File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Previous Excel Export
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {excelFile && (
              <div className="mt-1 text-sm text-gray-600">
                Selected: {excelFile.name}
              </div>
            )}
          </div>

          {/* Detection Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Detection Mode
            </label>
            <select
              value={detectionMode}
              onChange={(e) => setDetectionMode(e.target.value as DetectionMode)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={DetectionMode.VEHICLES}>🚗 Vehicles Only</option>
              <option value={DetectionMode.PEOPLE}>👥 People Only</option>
              <option value={DetectionMode.ALL}>🔍 All Objects</option>
            </select>
          </div>

          {/* Model Confidence */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model Confidence: {Math.round(modelConfidence * 100)}%
            </label>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={modelConfidence}
              onChange={(e) => setModelConfidence(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 btn btn-outline"
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            onClick={handleResume}
            disabled={!videoFile || !excelFile || isUploading}
            className="flex-1 btn btn-primary"
          >
            {isUploading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Loading...</span>
              </div>
            ) : (
              '🔄 Resume Analysis'
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ResumeAnalysis; 
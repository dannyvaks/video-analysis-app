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
  const [detectionMode, setDetectionMode] = useState<DetectionMode>(DetectionMode.ALL_VEHICLES);
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
      
    } catch (error: any) {
      console.error('❌ Resume failed:', error);
      alert(`Resume failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="card max-w-lg w-full">
        
        {/* Header */}
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <span className="mr-2">🔄</span>
              Resume Previous Analysis
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="card-body space-y-6">
          
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <span className="text-blue-500 text-xl">💡</span>
              <div className="text-sm text-blue-800">
                <div className="font-medium mb-2">How to Resume:</div>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Upload the same video file you analyzed before</li>
                  <li>Upload the Excel file you exported previously</li>
                  <li>Continue reviewing from where you left off</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Video File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Original Video File
            </label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              className="form-input w-full"
            />
            {videoFile && (
              <div className="mt-2 text-sm text-gray-600 flex items-center">
                <span className="mr-2">📹</span>
                {videoFile.name}
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
              className="form-input w-full"
            />
            {excelFile && (
              <div className="mt-2 text-sm text-gray-600 flex items-center">
                <span className="mr-2">📊</span>
                {excelFile.name}
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
              className="form-select w-full"
            >
              <option value={DetectionMode.ALL_VEHICLES}>🚗 All Vehicles</option>
              <option value={DetectionMode.MICRO_MOBILITY}>🛴 Micro-mobility</option>
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
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>10%</span>
              <span>50%</span>
              <span>90%</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 btn btn-secondary"
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
                  <div className="loading-spinner"></div>
                  <span>Loading...</span>
                </div>
              ) : (
                <>
                  <span className="mr-2">🔄</span>
                  Resume Analysis
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeAnalysis;
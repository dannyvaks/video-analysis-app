import React, { useState } from 'react';
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
    // FIXED: Better centering with flex utilities
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-4xl mx-auto">
        <div className="card max-h-[90vh] overflow-y-auto">
          
          {/* Header */}
          <div className="card-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 text-xl">🔄</span>
                </div>
                <h3 className="text-2xl font-semibold text-gray-900">
                  Resume Previous Analysis
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="card-body space-y-8">
            
            {/* Instructions */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
              <div className="flex items-start space-x-4">
                <span className="text-blue-500 text-3xl">💡</span>
                <div className="text-blue-800">
                  <div className="font-semibold text-lg mb-3">How to Resume Analysis:</div>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Upload the same video file you analyzed before</li>
                    <li>Upload the Excel file you exported previously</li>
                    <li>Configure detection settings</li>
                    <li>Continue reviewing from where you left off</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* File Upload Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Video File Upload */}
              <div className="space-y-4">
                <label className="block text-lg font-semibold text-gray-700">
                  Original Video File
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 hover:border-blue-300 hover:bg-blue-25 transition-all">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    className="w-full text-sm file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer"
                  />
                </div>
                {videoFile && (
                  <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                    <div className="flex items-center space-x-3">
                      <span className="text-green-600 text-2xl">📹</span>
                      <div>
                        <div className="font-semibold text-gray-900">{videoFile.name}</div>
                        <div className="text-sm text-gray-600">
                          {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Excel File Upload */}
              <div className="space-y-4">
                <label className="block text-lg font-semibold text-gray-700">
                  Previous Excel Export
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 hover:border-green-300 hover:bg-green-25 transition-all">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                    className="w-full text-sm file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 file:cursor-pointer"
                  />
                </div>
                {excelFile && (
                  <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                    <div className="flex items-center space-x-3">
                      <span className="text-green-600 text-2xl">📊</span>
                      <div>
                        <div className="font-semibold text-gray-900">{excelFile.name}</div>
                        <div className="text-sm text-gray-600">
                          {(excelFile.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Configuration Section */}
            <div className="space-y-6 pt-6 border-t border-gray-200">
              <h4 className="text-xl font-semibold text-gray-900">Model Configuration</h4>
              
              <div className="max-w-lg mx-auto">
                {/* Model Confidence */}
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700">
                    YOLO Confidence Threshold: {Math.round(modelConfidence * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.05"
                    value={modelConfidence}
                    onChange={(e) => setModelConfidence(parseFloat(e.target.value))}
                    className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>10%</span>
                    <span>50%</span>
                    <span>90%</span>
                  </div>
                  
                  {/* Explanation */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                    <div className="flex items-start space-x-3">
                      <span className="text-blue-500 text-lg">🤖</span>
                      <div className="text-blue-800 text-sm">
                        <div className="font-semibold mb-1">What does this do?</div>
                        <div className="space-y-1">
                          <p><strong>BACKEND Effect:</strong> Filters YOLO detections - only shows objects where YOLO confidence ≥ {Math.round(modelConfidence * 100)}%</p>
                          <p><strong>Higher values:</strong> Fewer, more confident detections</p>
                          <p><strong>Lower values:</strong> More detections, but some may be false positives</p>
                          <p><strong>Recommended:</strong> 25% for balanced results</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* File Requirements */}
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
              <div className="flex items-start space-x-4">
                <span className="text-yellow-600 text-2xl">⚠️</span>
                <div className="text-yellow-800">
                  <div className="font-semibold text-lg mb-2">Requirements:</div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Video file must be the same one you analyzed before</li>
                    <li>Excel file must contain detection data from previous analysis</li>
                    <li>Both files are required to resume analysis</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Progress during upload */}
            {isUploading && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                <div className="flex items-center space-x-4">
                  <div className="loading-spinner text-blue-600 w-6 h-6"></div>
                  <div className="text-blue-800">
                    <div className="font-semibold text-lg">Processing files...</div>
                    <div className="text-sm">This may take a moment while we extract and process your data.</div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-4 pt-6 border-t border-gray-200">
              <button
                onClick={onClose}
                className="btn btn-secondary flex-1 btn-lg"
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                onClick={handleResume}
                disabled={!videoFile || !excelFile || isUploading}
                className="btn btn-primary flex-1 btn-lg disabled:opacity-50"
              >
                {isUploading ? (
                  <div className="flex items-center space-x-2">
                    <div className="loading-spinner"></div>
                    <span>Resuming...</span>
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
    </div>
  );
};

export default ResumeAnalysis;

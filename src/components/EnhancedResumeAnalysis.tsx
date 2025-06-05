import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface ResumeAnalysisProps {
  onResumeSuccess: (data: any) => void;
  isVisible: boolean;
  onClose: () => void;
}

interface FileInfo {
  name: string;
  path: string;
  size: number;
  size_mb: number;
  age_days: number;
  created: string;
  file_type: string;
}

interface VideoFilesResponse {
  videos: FileInfo[];
  count: number;
}

interface ExcelFilesResponse {
  excel_files: FileInfo[];
  count: number;
}

interface StorageStats {
  upload_dir: { size_mb: number; file_count: number };
  export_dir: { size_mb: number; file_count: number };
  total: { size_mb: number; file_count: number };
  retention_days: number;
}

const EnhancedResumeAnalysis: React.FC<ResumeAnalysisProps> = ({
  onResumeSuccess,
  isVisible,
  onClose
}) => {
  const [mode, setMode] = useState<'upload' | 'browse'>('browse');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<FileInfo | null>(null);
  const [selectedExcel, setSelectedExcel] = useState<FileInfo | null>(null);
  const [modelConfidence, setModelConfidence] = useState(0.25);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // File browsing state
  const [videoFiles, setVideoFiles] = useState<FileInfo[]>([]);
  const [excelFiles, setExcelFiles] = useState<FileInfo[]>([]);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load existing files when modal opens
  useEffect(() => {
    if (isVisible) {
      loadExistingFiles();
    }
  }, [isVisible]);

  const loadExistingFiles = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [videosResponse, excelsResponse, statsResponse] = await Promise.all([
        apiService.listVideoFiles(),
        apiService.listExcelFiles(),
        apiService.getStorageStats()
      ]);
      
      setVideoFiles(videosResponse.videos || []);
      setExcelFiles(excelsResponse.excel_files || []);
      setStorageStats(statsResponse);
    } catch (err: any) {
      setError(`Failed to load files: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeFromUpload = async () => {
    if (!videoFile || !excelFile) {
      alert('Please select both video and analysis files (Excel/CSV)');
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

  const handleResumeFromExisting = async () => {
    if (!selectedVideo || !selectedExcel) {
      alert('Please select both a video file and an analysis file (Excel/CSV)');
      return;
    }

    console.log('🔄 Using resumeAnalysisFromExisting method');
    console.log('Selected video:', selectedVideo.name);
    console.log('Selected excel:', selectedExcel.name);

    setIsUploading(true);
    try {
      // Use the new API endpoint that works with existing files directly
      const result = await apiService.resumeAnalysisFromExisting(
        selectedVideo.name,
        selectedExcel.name,
        modelConfidence
      );
      
      onResumeSuccess(result);
      onClose();
      
    } catch (error: any) {
      console.error('❌ Resume from existing failed:', error);
      alert(`Resume failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (mb: number): string => {
    if (mb < 1) return `${Math.round(mb * 1024)} KB`;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-6xl mx-auto">
        <div className="card max-h-[90vh] overflow-y-auto">
          
          {/* Header */}
          <div className="card-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 text-xl">🔄</span>
                </div>
                <h3 className="text-2xl font-semibold text-gray-900">
                  Resume Analysis
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
            
            {/* Mode Selection */}
            <div className="flex space-x-4">
              <button
                onClick={() => setMode('browse')}
                className={`btn ${
                  mode === 'browse' ? 'btn-primary' : 'btn-outline'
                } flex-1`}
              >
                <span className="mr-2">📁</span>
                Browse Existing Files
              </button>
              <button
                onClick={() => setMode('upload')}
                className={`btn ${
                  mode === 'upload' ? 'btn-primary' : 'btn-outline'
                } flex-1`}
              >
                <span className="mr-2">⬆️</span>
                Upload New Files
              </button>
            </div>

            {/* Storage Stats */}
            {storageStats && (
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {storageStats.upload_dir.file_count}
                    </div>
                    <div className="text-sm text-gray-600">Video Files</div>
                    <div className="text-xs text-gray-500">
                      {formatFileSize(storageStats.upload_dir.size_mb)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {storageStats.export_dir.file_count}
                    </div>
                    <div className="text-sm text-gray-600">Excel Files</div>
                    <div className="text-xs text-gray-500">
                      {formatFileSize(storageStats.export_dir.size_mb)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {storageStats.retention_days}
                    </div>
                    <div className="text-sm text-gray-600">Retention Days</div>
                    <div className="text-xs text-gray-500">
                      Auto-cleanup enabled
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <span className="text-red-600 text-xl">⚠️</span>
                  <span className="text-red-800 font-medium">Error</span>
                </div>
                <p className="text-red-700 text-sm mt-1">{error}</p>
                <button
                  onClick={loadExistingFiles}
                  className="text-red-600 hover:text-red-800 text-sm underline mt-2"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Browse Mode */}
            {mode === 'browse' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-gray-900">
                    Select Video and Excel Files
                  </h4>
                  <button
                    onClick={loadExistingFiles}
                    disabled={isLoading}
                    className="btn btn-outline btn-sm"
                  >
                    {isLoading ? (
                      <div className="loading-spinner"></div>
                    ) : (
                      <span>🔄 Refresh</span>
                    )}
                  </button>
                </div>

                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="loading-spinner mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading files...</p>
                  </div>
                ) : videoFiles.length === 0 && excelFiles.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📁</div>
                    <h4 className="text-xl font-semibold text-gray-900 mb-2">
                      No Files Found
                    </h4>
                    <p className="text-gray-600 mb-4">
                      No video files or analysis exports found.
                    </p>
                    <button
                      onClick={() => setMode('upload')}
                      className="btn btn-primary"
                    >
                      Upload Files Instead
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Video Files List */}
                    <div className="space-y-4">
                      <h5 className="text-lg font-semibold text-gray-900 flex items-center">
                        <span className="mr-2">🎥</span>
                        Video Files ({videoFiles.length})
                      </h5>
                      
                      {videoFiles.length === 0 ? (
                        <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
                          <div className="text-gray-400 text-4xl mb-2">📹</div>
                          <p className="text-gray-500">No video files found</p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {videoFiles.map((video, index) => (
                            <div
                              key={index}
                              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                                selectedVideo === video
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-25'
                              }`}
                              onClick={() => setSelectedVideo(video)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3">
                                    <span className="text-2xl">
                                      {selectedVideo === video ? '✅' : '📹'}
                                    </span>
                                    <div>
                                      <h6 className="font-semibold text-gray-900 text-sm">
                                        {video.name}
                                      </h6>
                                      <p className="text-xs text-gray-600">
                                        {formatDate(video.created)} • {formatFileSize(video.size_mb)} • {video.age_days} days old
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Excel Files List */}
                    <div className="space-y-4">
                      <h5 className="text-lg font-semibold text-gray-900 flex items-center">
                        <span className="mr-2">📊</span>
                        Analysis Files ({excelFiles.length})
                      </h5>
                      <p className="text-xs text-gray-600 -mt-2">
                        Excel files (.xlsx, .xls) and CSV files (.csv)
                      </p>
                      
                      {excelFiles.length === 0 ? (
                        <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
                          <div className="text-gray-400 text-4xl mb-2">📊</div>
                          <p className="text-gray-500">No Excel files found</p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {excelFiles.map((excel, index) => (
                            <div
                              key={index}
                              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                                selectedExcel === excel
                                  ? 'border-green-500 bg-green-50'
                                  : 'border-gray-200 hover:border-green-300 hover:bg-green-25'
                              }`}
                              onClick={() => setSelectedExcel(excel)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3">
                                    <span className="text-2xl">
                                      {selectedExcel === excel ? '✅' : '📊'}
                                    </span>
                                    <div>
                                      <h6 className="font-semibold text-gray-900 text-sm">
                                        {excel.name}
                                      </h6>
                                      <p className="text-xs text-gray-600">
                                        {formatDate(excel.created)} • {formatFileSize(excel.size_mb)} • {excel.age_days} days old
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Selected Files Summary */}
                {(selectedVideo || selectedExcel) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h6 className="font-semibold text-blue-900 mb-3">Selected Files:</h6>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <span className="text-blue-600 text-lg">🎥</span>
                        <span className="text-blue-800">
                          {selectedVideo ? selectedVideo.name : 'No video selected'}
                        </span>
                        {selectedVideo && (
                          <span className="text-xs text-blue-600">
                            ({formatFileSize(selectedVideo.size_mb)})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-green-600 text-lg">📊</span>
                        <span className="text-blue-800">
                          {selectedExcel ? selectedExcel.name : 'No analysis file selected'}
                        </span>
                        {selectedExcel && (
                          <span className="text-xs text-blue-600">
                            ({formatFileSize(selectedExcel.size_mb)})
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {selectedVideo && selectedExcel && (
                      <div className="mt-3 p-3 bg-green-100 border border-green-300 rounded">
                        <div className="flex items-center space-x-2">
                          <span className="text-green-600 text-lg">✅</span>
                          <span className="text-green-800 font-medium">Ready to resume analysis!</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Upload Mode */}
            {mode === 'upload' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                  <div className="flex items-start space-x-4">
                    <span className="text-blue-500 text-3xl">💡</span>
                    <div className="text-blue-800">
                      <div className="font-semibold text-lg mb-3">Upload Files for Resume:</div>
                      <ol className="list-decimal list-inside space-y-2 text-sm">
                        <li>Upload the same video file you analyzed before</li>
                        <li>Upload the analysis file you exported previously (Excel or CSV)</li>
                        <li>Configure detection settings</li>
                        <li>Continue reviewing from where you left off</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

                  <div className="space-y-4">
                    <label className="block text-lg font-semibold text-gray-700">
                      Previous Analysis Export
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 hover:border-green-300 hover:bg-green-25 transition-all">
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
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
              </div>
            )}

            {/* Configuration Section */}
            <div className="space-y-6 pt-6 border-t border-gray-200">
              <h4 className="text-xl font-semibold text-gray-900">Model Configuration</h4>
              
              <div className="max-w-lg mx-auto">
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
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                    <div className="flex items-start space-x-3">
                      <span className="text-blue-500 text-lg">🤖</span>
                      <div className="text-blue-800 text-sm">
                        <div className="font-semibold mb-1">Confidence Threshold</div>
                        <div className="space-y-1">
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

            {/* Progress during upload */}
            {isUploading && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                <div className="flex items-center space-x-4">
                  <div className="loading-spinner text-blue-600 w-6 h-6"></div>
                  <div className="text-blue-800">
                    <div className="font-semibold text-lg">Processing...</div>
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
              
              {mode === 'browse' ? (
                <button
                  onClick={handleResumeFromExisting}
                  disabled={!selectedVideo || !selectedExcel || isUploading}
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
              ) : (
                <button
                  onClick={handleResumeFromUpload}
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
                      <span className="mr-2">⬆️</span>
                      Resume Analysis
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedResumeAnalysis;
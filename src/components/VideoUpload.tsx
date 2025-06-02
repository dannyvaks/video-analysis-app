import React, { useState, useRef, useCallback } from 'react';
import { DetectionMode } from '../types';

interface VideoUploadProps {
  onVideoUpload: (file: File) => void;
  detectionMode: DetectionMode;
}

const VideoUpload: React.FC<VideoUploadProps> = ({ onVideoUpload, detectionMode }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const supportedFormats = ['.mp4', '.avi', '.mov', '.mkv'];
  const maxFileSize = 500 * 1024 * 1024; // 500MB

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const validateFile = (file: File): string | null => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!supportedFormats.includes(extension)) {
      return `Unsupported format. Use: ${supportedFormats.join(', ')}`;
    }
    if (file.size > maxFileSize) {
      return `File too large. Max: ${formatFileSize(maxFileSize)}`;
    }
    return null;
  };

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 20;
        });
      }, 200);

      // Actual upload happens in parent component
      onVideoUpload(file);
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Upload failed');
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [onVideoUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8 fade-in">
      
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
          <span>🎯</span>
          <span>AI-Powered Detection Ready</span>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
          Upload Video for
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            Smart Analysis
          </span>
        </h1>
        
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Our YOLOv8m AI will analyze your video to detect and classify {
            detectionMode === 'micro_mobility_only' ? 'micro-mobility vehicles' : 'all vehicle types'
          } with professional accuracy.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stat-card text-center">
          <div className="text-3xl mb-3">⚡</div>
          <h3 className="font-semibold text-gray-900 mb-2">Fast Processing</h3>
          <p className="text-sm text-gray-600">GPU-accelerated inference for quick results</p>
        </div>
        <div className="stat-card text-center">
          <div className="text-3xl mb-3">🎯</div>
          <h3 className="font-semibold text-gray-900 mb-2">High Accuracy</h3>
          <p className="text-sm text-gray-600">88% F1 score on micro-mobility detection</p>
        </div>
        <div className="stat-card text-center">
          <div className="text-3xl mb-3">📊</div>
          <h3 className="font-semibold text-gray-900 mb-2">Detailed Reports</h3>
          <p className="text-sm text-gray-600">Comprehensive Excel exports with charts</p>
        </div>
      </div>

      {/* Upload Area */}
      <div className="card">
        <div className="card-body">
          <div
            ref={dropZoneRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`upload-zone min-h-[300px] flex flex-col items-center justify-center p-8 ${
              isDragOver ? 'active' : isUploading ? 'uploading' : ''
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={supportedFormats.join(',')}
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                  handleFileSelect(files[0]);
                }
              }}
              className="hidden"
            />

            {!isUploading ? (
              <div className="text-center space-y-6">
                <div className="text-6xl">{isDragOver ? '🎯' : '📹'}</div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-semibold text-gray-900">
                    {isDragOver ? 'Drop your video here' : 'Choose your video'}
                  </h3>
                  <p className="text-gray-600">
                    Drag and drop your video file, or click to browse
                  </p>
                </div>

                <button
                  onClick={openFileDialog}
                  className="btn btn-primary btn-xl"
                >
                  <span className="mr-2">📁</span>
                  Select Video File
                </button>

                <div className="text-sm text-gray-500 space-y-1">
                  <p>Supported formats: {supportedFormats.join(', ')}</p>
                  <p>Maximum file size: {formatFileSize(maxFileSize)}</p>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-6 w-full max-w-md">
                <div className="text-5xl">⏳</div>
                <h3 className="text-xl font-semibold text-gray-900">Uploading your video...</h3>
                
                <div className="progress-container">
                  <div 
                    className="progress-bar"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                
                <p className="text-sm text-gray-600">
                  {Math.round(uploadProgress)}% complete
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2 text-red-700">
                <span>❌</span>
                <span className="font-medium">Upload Error</span>
              </div>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoUpload;
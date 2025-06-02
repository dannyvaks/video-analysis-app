import React, { useState, useRef, useCallback } from 'react';
import { DetectionMode } from '../types';

interface VideoUploadProps {
  onVideoUpload: (file: File) => void;
  detectionMode: DetectionMode;
}

const VideoUpload: React.FC<VideoUploadProps> = ({ 
  onVideoUpload, 
  detectionMode
}) => {
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

      // Realistic progress simulation
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 85) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 15 + 5;
        });
      }, 300);

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

  const getDetectionModeDescription = () => {
    switch (detectionMode) {
      case DetectionMode.MICRO_MOBILITY:
        return {
          emoji: '🛴',
          title: 'Micro-Mobility Detection',
          description: 'Bicycles, e-scooters, motorcycles, and motorcycle cabs'
        };
      case DetectionMode.ALL_VEHICLES:
        return {
          emoji: '🚗',
          title: 'All Vehicle Detection', 
          description: 'Cars, trucks, buses + micro-mobility vehicles'
        };
      default:
        return {
          emoji: '🔍',
          title: 'Smart Detection',
          description: 'AI-powered vehicle detection and classification'
        };
    }
  };

  const modeInfo = getDetectionModeDescription();

  return (
    <div className="max-w-4xl mx-auto">
      
      {/* Detection Mode Info */}
      <div className="card mb-8">
        <div className="card-body text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <span className="text-3xl">{modeInfo.emoji}</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{modeInfo.title}</h3>
              <p className="text-sm text-gray-600">{modeInfo.description}</p>
            </div>
          </div>
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
            className={`upload-zone flex flex-col items-center justify-center p-12 ${
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
                <div className={`text-6xl transition-all duration-300 ${
                  isDragOver ? 'scale-110' : 'scale-100'
                }`}>
                  {isDragOver ? '🎯' : '📹'}
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-2xl font-semibold text-gray-900">
                    {isDragOver ? 'Drop your video here' : 'Choose Your Video'}
                  </h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    {isDragOver 
                      ? 'Release to start the analysis' 
                      : 'Drag and drop your video file, or click below to browse'
                    }
                  </p>
                </div>

                <div className="space-y-4">
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
              </div>
            ) : (
              <div className="text-center space-y-6 w-full max-w-md">
                <div className="text-5xl">⏳</div>
                
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Uploading Your Video
                  </h3>
                  <p className="text-gray-600">
                    Preparing for AI analysis...
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="progress-container">
                    <div 
                      className="progress-bar"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>{Math.round(uploadProgress)}% complete</span>
                    <div className="flex items-center space-x-2">
                      <div className="loading-spinner"></div>
                      <span>Processing...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="text-xl">⚠️</div>
                <div className="flex-1">
                  <div className="font-medium text-red-800 mb-1">Upload Error</div>
                  <p className="text-red-700 text-sm">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security & Privacy Info */}
      <div className="mt-8 text-center">
        <div className="card card-compact inline-block">
          <div className="p-4">
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span>Secure upload</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                <span>Auto-delete after 7 days</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                <span>GDPR compliant</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoUpload;
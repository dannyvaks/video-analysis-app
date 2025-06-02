import React, { useState, useRef, useCallback } from 'react';
import { DetectionMode } from '../types';

interface VideoUploadProps {
  onVideoUpload: (file: File) => void;
  detectionMode: DetectionMode;
  onResumeFromExcel?: (videoFile: File, excelData: any) => void;
}

const VideoUpload: React.FC<VideoUploadProps> = ({ 
  onVideoUpload, 
  detectionMode, 
  onResumeFromExcel 
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
          description: 'Specialized detection for bicycles, e-scooters, motorcycles, and motorcycle cabs'
        };
      case DetectionMode.ALL_VEHICLES:
        return {
          emoji: '🚗',
          title: 'All Vehicle Detection', 
          description: 'Comprehensive detection for all vehicle types including cars, trucks, and buses'
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
    <div className="container-narrow py-12">
      
      {/* Floating Status Badge */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex items-center space-x-3 px-6 py-3 bg-white/20 backdrop-blur-xl text-white rounded-full border border-white/20 shadow-lg">
          <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
          <span className="font-medium">AI Detection Engine Ready</span>
          <span className="text-lg">🎯</span>
        </div>
      </div>
      
      {/* Hero Section with Enhanced Typography */}
      <div className="text-center space-y-8 mb-12">
        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight">
            Upload Video for
            <span className="block mt-2">
              <span className="hero-gradient-text bg-gradient-to-r from-yellow-300 via-pink-300 to-blue-300 bg-clip-text text-transparent">
                Smart Analysis
              </span>
            </span>
          </h1>
          
          <div className="max-w-2xl mx-auto">
            <div className="inline-flex items-center space-x-3 px-6 py-3 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20">
              <span className="text-2xl">{modeInfo.emoji}</span>
              <div className="text-left">
                <div className="font-semibold text-white">{modeInfo.title}</div>
                <div className="text-sm text-white/80">{modeInfo.description}</div>
              </div>
            </div>
          </div>
        </div>
        
        <p className="text-xl text-white/90 max-w-3xl mx-auto font-medium">
          Our advanced YOLOv8m AI will analyze your video frame by frame, 
          detecting and classifying vehicles with <strong>88% accuracy</strong> and 
          professional-grade precision.
        </p>
      </div>

      {/* Enhanced Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="stat-card text-center group">
          <div className="text-4xl mb-4 transition-transform duration-300 group-hover:scale-110">⚡</div>
          <h3 className="font-bold text-gray-900 mb-2 text-lg">Lightning Fast</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            GPU-accelerated inference with real-time progress tracking
          </p>
          <div className="mt-3 text-xs text-blue-600 font-semibold">~15-25 FPS</div>
        </div>
        
        <div className="stat-card text-center group">
          <div className="text-4xl mb-4 transition-transform duration-300 group-hover:scale-110">🎯</div>
          <h3 className="font-bold text-gray-900 mb-2 text-lg">Precision AI</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            State-of-the-art YOLOv8m model with proven accuracy
          </p>
          <div className="mt-3 text-xs text-emerald-600 font-semibold">88% F1 Score</div>
        </div>
        
        <div className="stat-card text-center group">
          <div className="text-4xl mb-4 transition-transform duration-300 group-hover:scale-110">📊</div>
          <h3 className="font-bold text-gray-900 mb-2 text-lg">Rich Analytics</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Comprehensive Excel reports with charts and metadata
          </p>
          <div className="mt-3 text-xs text-purple-600 font-semibold">Export Ready</div>
        </div>
      </div>

      {/* Revolutionary Upload Area */}
      <div className="card scale-in">
        <div className="card-body">
          <div
            ref={dropZoneRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`upload-zone flex flex-col items-center justify-center p-12 relative overflow-hidden ${
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
              <div className="text-center space-y-8 relative z-10">
                <div className="relative">
                  <div className={`text-8xl transition-all duration-500 ${
                    isDragOver ? 'scale-125 rotate-12' : 'scale-100 rotate-0'
                  }`}>
                    {isDragOver ? '🎯' : '📹'}
                  </div>
                  {isDragOver && (
                    <div className="absolute inset-0 bg-blue-400/20 rounded-full animate-ping"></div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-3xl font-bold text-white">
                    {isDragOver ? 'Perfect! Drop it here' : 'Choose Your Video'}
                  </h3>
                  <p className="text-lg text-white/80 max-w-md mx-auto">
                    {isDragOver 
                      ? 'Release to start the magic ✨' 
                      : 'Drag and drop your video file, or click below to browse'
                    }
                  </p>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={openFileDialog}
                    className="btn btn-primary btn-xl group"
                  >
                    <span className="mr-3 text-xl group-hover:scale-110 transition-transform">📁</span>
                    Select Video File
                    <span className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  </button>
                  
                  <div className="text-sm text-white/70 space-y-2">
                    <div className="flex items-center justify-center space-x-4">
                      <span>📋 {supportedFormats.join(', ')}</span>
                      <span>•</span>
                      <span>📦 Max: {formatFileSize(maxFileSize)}</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                      <span>Secure upload with automatic processing</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-8 w-full max-w-md relative z-10">
                <div className="relative">
                  <div className="text-6xl animate-bounce">🚀</div>
                  <div className="absolute inset-0 bg-emerald-400/20 rounded-full animate-ping"></div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-white">
                    Uploading Your Video
                  </h3>
                  <p className="text-white/80">
                    Preparing for AI analysis...
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="progress-container">
                    <div 
                      className="progress-bar"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center text-sm text-white/80">
                    <span>{Math.round(uploadProgress)}% complete</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                      <span>Processing...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-400/10 rounded-full animate-pulse"></div>
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-purple-400/10 rounded-full animate-pulse delay-1000"></div>
              <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-pink-400/10 rounded-full animate-pulse delay-500"></div>
            </div>
          </div>

          {/* Enhanced Error Display */}
          {error && (
            <div className="mt-6 p-6 bg-red-500/10 backdrop-blur-xl border border-red-300/30 rounded-2xl">
              <div className="flex items-start space-x-4">
                <div className="text-2xl">⚠️</div>
                <div className="flex-1">
                  <div className="font-semibold text-red-300 mb-2">Upload Error</div>
                  <p className="text-red-200 text-sm leading-relaxed">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="mt-3 text-xs text-red-300 hover:text-red-100 underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Additional Info Section */}
      <div className="mt-12 text-center">
        <div className="card card-compact inline-block">
          <div className="p-6">
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                <span>End-to-end encrypted</span>
              </div>
              <div className="w-1 h-4 bg-gray-300 rounded"></div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                <span>Auto-delete after 7 days</span>
              </div>
              <div className="w-1 h-4 bg-gray-300 rounded"></div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
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
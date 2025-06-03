import React, { useState, useCallback, useEffect } from 'react';
import { 
  AppState, 
  VideoMetadata, 
  Detection, 
  ProcessingProgress,
  ModelLoadingProgress,
  AppError 
} from './types';

// Import components
import Header from './components/Header';
import VideoUpload from './components/VideoUpload';
import VideoPlayer from './components/VideoPlayer';
import DetectionReview from './components/DetectionReview';
import StatisticsPanel from './components/StatisticsPanel';
import ExportInterface from './components/ExportInterface';
import ErrorBoundary from './components/ErrorBoundary';
import ModelLoader from './components/ModelLoader';
import ResumeAnalysis from './components/ResumeAnalysis';

// Import API service
import { apiService, uploadVideoFile, startVideoProcessing } from './services/api';

const App: React.FC = () => {
  // Main application state
  const [appState, setAppState] = useState<AppState>({
    currentStep: 'upload',
    video: null,
    detections: [],
    currentDetectionIndex: 0,
    modelLoaded: false,
    isProcessing: false,
    processingProgress: null,
    modelLoadingProgress: null
  });

  // Error state
  const [error, setError] = useState<AppError | null>(null);
  
  // Current uploaded file path (for processing)
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);

  // Add state for resume modal
  const [showResumeModal, setShowResumeModal] = useState(false);

  // Define steps array for the progress indicator
  const steps = [
    { 
      key: 'upload', 
      label: 'Upload', 
      icon: '📁',
      description: 'Select video file'
    },
    { 
      key: 'processing', 
      label: 'Processing', 
      icon: '🔄',
      description: 'AI analysis in progress'
    },
    { 
      key: 'review', 
      label: 'Review', 
      icon: '✅',
      description: 'Verify detections'
    },
  ];

  const currentStepIndex = steps.findIndex(step => step.key === appState.currentStep);

  // Initialize backend connection and check model status
  useEffect(() => {
    initializeApplication();
  }, []);

  const initializeApplication = useCallback(async () => {
    try {
      setError(null);
      
      // Try health check first
      try {
        const healthCheck = await apiService.checkHealth();
        console.log('Backend health check passed:', healthCheck);
      } catch (healthError) {
        console.warn('Backend health check failed, but continuing...', healthError);
      }

      // Re-enable WebSocket connection
      try {
        await apiService.connectWebSocket();
        
        // Set up WebSocket event handlers
        apiService.onProgressUpdate('processing_progress', (data: ProcessingProgress) => {
          console.log('🔄 Processing progress:', data);
          setAppState(prev => ({
            ...prev,
            processingProgress: data
          }));
        });

        apiService.onProgressUpdate('processing_complete', (data: any) => {
          console.log('✅ Processing complete:', data);
          setAppState(prev => ({
            ...prev,
            detections: data.detections.map((d: any) => ({
              id: d.id,
              timestamp: d.timestamp,
              frameNumber: d.frameNumber,
              frameImageData: d.frameImageData,
              boundingBox: d.boundingBox,
              modelSuggestions: d.modelSuggestions,
              userChoice: d.userChoice,
              isManualLabel: d.isManualLabel,
              isManualCorrection: d.isManualCorrection,
              processedAt: d.processedAt
            })),
            currentStep: 'review',
            isProcessing: false,
            processingProgress: null
          }));
        });

        apiService.onProgressUpdate('processing_error', (data: any) => {
          console.log('❌ Processing error:', data);
          const error: AppError = {
            code: 'VIDEO_PROCESSING_FAILED',
            message: data.error || 'Video processing failed',
            details: data,
            timestamp: new Date().toISOString(),
            recoverable: true
          };
          setError(error);
          setAppState(prev => ({
            ...prev,
            isProcessing: false,
            processingProgress: null
          }));
        });

        console.log('✅ WebSocket events configured');
        
      } catch (wsError) {
        console.warn('WebSocket connection failed:', wsError);
      }

      // Check model status
      try {
        const modelStatus = await apiService.getModelStatus();
        if (modelStatus.success && modelStatus.data) {
          setAppState(prev => ({
            ...prev,
            modelLoaded: modelStatus.data!.loaded
          }));
        }
      } catch (modelError) {
        console.warn('Model status check failed:', modelError);
        setAppState(prev => ({ ...prev, modelLoaded: true }));
      }

      console.log('✅ Application initialized successfully');
      
    } catch (err) {
      const error: AppError = {
        code: 'INITIALIZATION_FAILED',
        message: 'Failed to initialize application',
        details: err,
        timestamp: new Date().toISOString(),
        recoverable: true
      };
      setError(error);
      console.error('❌ Application initialization failed:', err);
    }
  }, []);

  const handleVideoUpload = useCallback(async (file: File) => {
    try {
      setError(null);
      
      // Upload video to backend
      const uploadResult = await uploadVideoFile(file);
      
      // Convert to our VideoMetadata format
      const metadata: VideoMetadata = {
        filename: uploadResult.filename,
        duration: uploadResult.duration,
        width: uploadResult.width,
        height: uploadResult.height,
        fps: uploadResult.fps,
        frameCount: uploadResult.frameCount,
        fileSize: uploadResult.fileSize,
        uploadedAt: uploadResult.uploadedAt
      };
      
      setAppState(prev => ({
        ...prev,
        video: metadata,
        currentStep: 'processing',
        detections: [],
        currentDetectionIndex: 0
      }));

      // Store file path for processing
      setUploadedFilePath(uploadResult.file_path);

      // Start video processing
      await processVideo(uploadResult.file_path);
      
    } catch (err) {
      const error: AppError = {
        code: 'VIDEO_UPLOAD_FAILED',
        message: 'Failed to upload video',
        details: err,
        timestamp: new Date().toISOString(),
        recoverable: true
      };
      setError(error);
    }
  }, []);

  const processVideo = useCallback(async (filePath: string) => {
    try {
      setAppState(prev => ({
        ...prev,
        isProcessing: true,
        processingProgress: {
          currentFrame: 0,
          totalFrames: prev.video?.frameCount || 0,
          percentage: 0,
          status: 'initializing',
          message: 'Starting video analysis...'
        }
      }));

      // Process video and get results directly (like resume)
      console.log('🚀 Starting video processing...');
      const result = await startVideoProcessing(filePath, 30);
      console.log('🎉 Processing complete, got results:', result);
      
      // Handle results directly like resume does
      setAppState(prev => ({
        ...prev,
        detections: result.detections || [],
        currentStep: 'review',
        isProcessing: false,
        processingProgress: null
      }));
      
      console.log(`✅ Fresh processing complete with ${result.detections?.length || 0} detections`);
      
    } catch (err) {
      console.error('❌ Video processing failed:', err);
      
      const error: AppError = {
        code: 'VIDEO_PROCESSING_FAILED',
        message: 'Failed to process video',
        details: err,
        timestamp: new Date().toISOString(),
        recoverable: true
      };
      setError(error);
      
      setAppState(prev => ({
        ...prev,
        isProcessing: false,
        processingProgress: null
      }));
    }
  }, []);

  const handleDetectionChoice = useCallback((detectionId: string, choice: any) => {
    setAppState(prev => {
      const updatedDetections = prev.detections.map(detection => 
        detection.id === detectionId 
          ? { 
              ...detection, 
              userChoice: choice.selectedType, 
              isManualCorrection: choice.isManual 
            }
          : detection
      );

      // Auto-advance to next unreviewed detection
      const nextUnreviewedIndex = updatedDetections.findIndex(
        (detection, index) => index > prev.currentDetectionIndex && !detection.userChoice
      );

      const nextIndex = nextUnreviewedIndex !== -1 
        ? nextUnreviewedIndex 
        : Math.min(prev.currentDetectionIndex + 1, updatedDetections.length - 1);

      return {
        ...prev,
        detections: updatedDetections,
        currentDetectionIndex: nextIndex
      };
    });
  }, []);

  const handleExport = useCallback(() => {
    console.log('✅ Export completed');
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
    
    if (error?.code === 'INITIALIZATION_FAILED') {
      initializeApplication();
    } else if (error?.code === 'VIDEO_PROCESSING_FAILED' && uploadedFilePath) {
      processVideo(uploadedFilePath);
    } else {
      setAppState(prev => ({
        ...prev,
        currentStep: 'upload',
        video: null,
        detections: [],
        currentDetectionIndex: 0,
        isProcessing: false,
        processingProgress: null
      }));
      setUploadedFilePath(null);
    }
  }, [error, initializeApplication, uploadedFilePath, processVideo]);

  const handleStartOver = useCallback(() => {
    setAppState({
      currentStep: 'upload',
      video: null,
      detections: [],
      currentDetectionIndex: 0,
      modelLoaded: appState.modelLoaded,
      isProcessing: false,
      processingProgress: null,
      modelLoadingProgress: null
    });
    setError(null);
    setUploadedFilePath(null);
  }, [appState.modelLoaded]);

  // Fix the resume handler
  const handleResumeSuccess = (data: any) => {
    console.log('📥 Resume data received:', data);
    
    try {
      if (!data.video || !data.detections) {
        throw new Error('Invalid resume data structure');
      }

      setAppState(prev => ({
        ...prev,
        video: data.video,
        detections: data.detections || [],
        currentStep: 'review',
        currentDetectionIndex: 0,
        isProcessing: false,
        processingProgress: null,
        modelLoaded: true
      }));
      
      setShowResumeModal(false);
      
      console.log(`✅ Resumed analysis with ${data.detections?.length || 0} detections`);
      
    } catch (error) {
      console.error('❌ Resume data processing failed:', error);
      
      const appError: AppError = {
        code: 'RESUME_DATA_FAILED',
        message: 'Failed to process resume data',
        details: error,
        timestamp: new Date().toISOString(),
        recoverable: true
      };
      setError(appError);
    }
  };

  // Cleanup WebSocket connection on unmount
  useEffect(() => {
    return () => {
      apiService.disconnectWebSocket();
    };
  }, []);

  // Show model loading screen if model is not ready
  if (!appState.modelLoaded && !error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header 
          currentStep={appState.currentStep}
          onStartOver={handleStartOver}
        />
        
        <div className="container-center py-12">
          <div className="card max-w-md mx-auto">
            <div className="card-body">
              <ModelLoader progress={appState.modelLoadingProgress} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error screen
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header 
          currentStep={appState.currentStep}
          onStartOver={handleStartOver}
        />
        
        <div className="container-center py-12">
          <div className="card max-w-md mx-auto">
            <div className="card-body">
              <ErrorBoundary 
                error={error} 
                onRetry={handleRetry}
                onStartOver={handleStartOver}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Clean Header */}
      <Header 
        currentStep={appState.currentStep}
        onStartOver={handleStartOver}
      />

      {/* Main Content */}
      <main>
        
        {/* Upload Step */}
        {appState.currentStep === 'upload' && (
          <div className="container-center py-12">
            <div className="fade-in">
              {/* Page Header */}
              <div className="text-center mb-12">
                <div className="status-badge success mx-auto mb-6">
                  <span className="mr-2">🎯</span>
                  AI Detection Engine Ready
                </div>
                
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                  Upload Video for Smart Analysis
                </h1>
                
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Our advanced YOLOv8m AI will analyze your video frame by frame, 
                  detecting and classifying vehicles with <strong>88% accuracy</strong>.
                </p>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="stat-card text-center">
                  <div className="text-3xl mb-3">⚡</div>
                  <h3 className="font-semibold text-gray-900 mb-2">Lightning Fast</h3>
                  <p className="text-sm text-gray-600">GPU-accelerated inference</p>
                  <div className="mt-2 text-xs text-blue-600 font-medium">~15-25 FPS</div>
                </div>
                
                <div className="stat-card text-center">
                  <div className="text-3xl mb-3">🎯</div>
                  <h3 className="font-semibold text-gray-900 mb-2">High Accuracy</h3>
                  <p className="text-sm text-gray-600">YOLOv8m model precision</p>
                  <div className="mt-2 text-xs text-emerald-600 font-medium">88% F1 Score</div>
                </div>
                
                <div className="stat-card text-center">
                  <div className="text-3xl mb-3">📊</div>
                  <h3 className="font-semibold text-gray-900 mb-2">Rich Reports</h3>
                  <p className="text-sm text-gray-600">Comprehensive Excel exports</p>
                  <div className="mt-2 text-xs text-purple-600 font-medium">Charts & Stats</div>
                </div>
              </div>

              {/* Upload Component */}
              <VideoUpload 
                onVideoUpload={handleVideoUpload}
              />
              
              {/* Resume Section */}
              <div className="text-center mt-8">
                <div className="card card-compact inline-block">
                  <div className="p-4">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl">📁</div>
                      <div className="text-left">
                        <div className="font-medium text-gray-900">Continue Previous Work?</div>
                        <div className="text-sm text-gray-600">Resume from Excel export</div>
                      </div>
                      <button
                        onClick={() => setShowResumeModal(true)}
                        className="btn btn-outline btn-sm"
                      >
                        Resume Analysis
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Processing Step */}
        {appState.currentStep === 'processing' && (
          <div className="container-center py-12">
            <div className="fade-in">
              <div className="text-center mb-12">
                <div className="status-badge info mx-auto mb-6">
                  <span className="mr-2">🔄</span>
                  AI Processing Active
                </div>
                
                <h2 className="text-4xl font-bold text-gray-900 mb-6">
                  Analyzing Your Video
                </h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  Our AI is processing your video frame by frame, detecting and classifying vehicles
                </p>
              </div>
              
              <div className="card max-w-4xl mx-auto">
                <div className="card-body">
                  <VideoPlayer 
                    video={appState.video}
                    isProcessing={true}
                    processingProgress={appState.processingProgress}
                  />
                  
                  {/* Progress Display */}
                  {appState.processingProgress && (
                    <div className="mt-8 space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-900">
                          {appState.processingProgress.status}
                        </span>
                        <span className="text-gray-600">
                          {appState.processingProgress.currentFrame} / {appState.processingProgress.totalFrames} frames
                        </span>
                      </div>
                      
                      <div className="progress-container">
                        <div 
                          className="progress-bar"
                          style={{ width: `${appState.processingProgress.percentage}%` }}
                        />
                      </div>
                      
                      <div className="text-center">
                        <p className="text-gray-600">{appState.processingProgress.message}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Review Step - FIXED: Full width layout with integrated sidebar */}
        {appState.currentStep === 'review' && (
          <div className="container-wide py-12">
            <div className="fade-in">
              <div className="text-center mb-12">
                <div className="status-badge success mx-auto mb-6">
                  <span className="mr-2">✅</span>
                  Analysis Complete
                </div>
                
                <h2 className="text-4xl font-bold text-gray-900 mb-6">
                  Review Detections
                </h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Verify and refine the AI detections to ensure maximum accuracy
                </p>
              </div>

              {/* Main Detection Review - FIXED: Full width layout */}
              <DetectionReview
                detections={appState.detections}
                currentIndex={appState.currentDetectionIndex}
                onDetectionChoice={handleDetectionChoice}
                onIndexChange={(index) => setAppState(prev => ({ ...prev, currentDetectionIndex: index }))}
              />

              {/* Statistics and Export - FIXED: Below main content */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12 max-w-6xl mx-auto">
                {/* Statistics Panel */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                      <span className="mr-2">📊</span>
                      Statistics
                    </h3>
                  </div>
                  <div className="card-body">
                    <StatisticsPanel 
                      video={appState.video}
                      detections={appState.detections}
                    />
                  </div>
                </div>
                
                {/* Export Panel */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                      <span className="mr-2">📤</span>
                      Export
                    </h3>
                  </div>
                  <div className="card-body">
                    <ExportInterface
                      video={appState.video}
                      detections={appState.detections}
                      onExport={handleExport}
                      onStartOver={handleStartOver}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Resume Modal */}
      <ResumeAnalysis
        isVisible={showResumeModal}
        onClose={() => setShowResumeModal(false)}
        onResumeSuccess={handleResumeSuccess}
      />
    </div>
  );
};

export default App;

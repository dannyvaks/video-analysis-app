import React, { useState, useCallback, useEffect } from 'react';
import { 
  AppState, 
  VideoMetadata, 
  Detection, 
  DetectionMode, 
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
    detectionMode: DetectionMode.ALL_VEHICLES, // Default to ALL_VEHICLES
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
            currentStep: 'review', // This is crucial - transitions to review phase
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
        // Don't fail initialization if WebSocket fails
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
        // Assume model is loaded for now
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

      // Start processing with backend
      await startVideoProcessing(filePath, appState.detectionMode, 30);

      console.log('✅ Video processing started');
      
    } catch (err) {
      const error: AppError = {
        code: 'VIDEO_PROCESSING_FAILED',
        message: 'Failed to start video processing',
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
  }, [appState.detectionMode]);

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
    // Export is handled by the ExportInterface component
    console.log('✅ Export completed');
  }, []);

  const handleDetectionModeChange = useCallback((mode: DetectionMode) => {
    setAppState(prev => ({
      ...prev,
      detectionMode: mode
    }));
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
    
    if (error?.code === 'INITIALIZATION_FAILED') {
      initializeApplication();
    } else if (error?.code === 'VIDEO_PROCESSING_FAILED' && uploadedFilePath) {
      processVideo(uploadedFilePath);
    } else {
      // Reset to upload step for other errors
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
      detectionMode: appState.detectionMode, // Keep the detection mode preference
      modelLoaded: appState.modelLoaded, // Keep model loaded
      isProcessing: false,
      processingProgress: null,
      modelLoadingProgress: null
    });
    setError(null);
    setUploadedFilePath(null);
  }, [appState.detectionMode, appState.modelLoaded]);

  const handleResumeFromExcel = useCallback(async (videoFile: File, excelData: any) => {
    try {
      setError(null);
      
      // Upload the video file first
      const uploadResult = await uploadVideoFile(videoFile);
      
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

      // Parse the Excel data back to detections
      const detections: Detection[] = excelData.detections.map((row: any, index: number) => ({
        id: row.ID || `detection_${index}`,
        timestamp: row.Timestamp || '00:00:00',
        frameNumber: row['Frame Number'] || 0,
        frameImageData: '', // We don't store images in Excel, will need to re-extract
        boundingBox: {
          x: row['Bounding Box X'] || 0,
          y: row['Bounding Box Y'] || 0,
          width: row['Bounding Box Width'] || 0,
          height: row['Bounding Box Height'] || 0
        },
        modelSuggestions: [{
          type: row['Detected Class'] || 'unknown',
          confidence: row.Confidence || 0
        }],
        userChoice: row['User Choice'] || null,
        isManualLabel: row['Manual Label'] === 'Yes',
        isManualCorrection: row['Manual Correction'] === 'Yes',
        processedAt: row['Processed At'] || new Date().toISOString()
      }));

      // Set the app state to review mode with the loaded data
      setAppState(prev => ({
        ...prev,
        video: metadata,
        detections: detections,
        currentStep: 'review',
        currentDetectionIndex: 0,
        isProcessing: false,
        processingProgress: null
      }));

      // Store file path for potential re-processing
      setUploadedFilePath(uploadResult.file_path);

      console.log(`✅ Resumed analysis with ${detections.length} detections`);
      
    } catch (err) {
      const error: AppError = {
        code: 'RESUME_FAILED',
        message: 'Failed to resume from Excel file',
        details: err,
        timestamp: new Date().toISOString(),
        recoverable: true
      };
      setError(error);
    }
  }, []);

  // Fix the resume handler
  const handleResumeSuccess = (data: any) => {
    console.log('📥 Resume data received:', data);
    
    try {
      // Ensure we have the expected data structure
      if (!data.video || !data.detections) {
        throw new Error('Invalid resume data structure');
      }

      setAppState(prev => ({
        ...prev,
        video: data.video,
        detections: data.detections || [],
        detectionMode: data.detection_mode || DetectionMode.ALL_VEHICLES,
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
      <div className="min-h-screen relative overflow-hidden">
        {/* Background */}
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900"></div>
        </div>
        
        <Header 
          currentStep={appState.currentStep}
          onStartOver={handleStartOver}
          detectionMode={appState.detectionMode}
          onDetectionModeChange={handleDetectionModeChange}
        />
        
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="card">
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
      <div className="min-h-screen relative overflow-hidden">
        {/* Background */}
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900"></div>
        </div>
        
        <Header 
          currentStep={appState.currentStep}
          onStartOver={handleStartOver}
          detectionMode={appState.detectionMode}
          onDetectionModeChange={handleDetectionModeChange}
        />
        
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="card max-w-md w-full">
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
    <div className="min-h-screen relative overflow-hidden">
      {/* Enhanced Background with Particles */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 via-transparent to-emerald-400/20"></div>
        
        {/* Floating Particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white/10 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 4}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* Enhanced Header */}
      <Header 
        currentStep={appState.currentStep}
        onStartOver={handleStartOver}
        detectionMode={appState.detectionMode}
        onDetectionModeChange={handleDetectionModeChange}
      />

      {/* Enhanced Main Content */}
      <main className="relative z-10">
        
        {/* Upload Step - Enhanced */}
        {appState.currentStep === 'upload' && (
          <div className="fade-in">
            <VideoUpload 
              onVideoUpload={handleVideoUpload}
              detectionMode={appState.detectionMode}
              onResumeFromExcel={handleResumeFromExcel}
            />
            
            {/* Enhanced Resume Section */}
            <div className="container-narrow py-8">
              <div className="text-center">
                <div className="card card-compact inline-block">
                  <div className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="text-3xl">📁</div>
                      <div className="text-left">
                        <div className="font-semibold text-gray-900">Continue Previous Work?</div>
                        <div className="text-sm text-gray-600">Resume from a previous Excel export</div>
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

        {/* Processing Step - Enhanced */}
        {appState.currentStep === 'processing' && (
          <div className="container-narrow py-12 fade-in">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-3 px-6 py-3 bg-white/10 backdrop-blur-xl text-white rounded-full border border-white/20 mb-8">
                <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="font-medium">AI Processing Active</span>
              </div>
              
              <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
                🔍 Analyzing Your Video
              </h2>
              <p className="text-xl text-white/80 max-w-2xl mx-auto">
                Our advanced AI is processing your video frame by frame, 
                detecting and classifying vehicles with precision
              </p>
            </div>
            
            <div className="card scale-in">
              <div className="card-body">
                <VideoPlayer 
                  video={appState.video}
                  isProcessing={true}
                  processingProgress={appState.processingProgress}
                />
                
                {/* Enhanced Progress Display */}
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
        )}

        {/* Review Step - Enhanced Layout */}
        {appState.currentStep === 'review' && (
          <div className="container-wide py-12 fade-in">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-3 px-6 py-3 bg-white/10 backdrop-blur-xl text-white rounded-full border border-white/20 mb-8">
                <span className="text-emerald-400">✓</span>
                <span className="font-medium">Analysis Complete</span>
              </div>
              
              <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
                ✅ Review Detections
              </h2>
              <p className="text-xl text-white/80 max-w-3xl mx-auto">
                Verify and refine the AI detections to ensure maximum accuracy. 
                Your expertise helps perfect the results.
              </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
              {/* Main Detection Review - Enhanced */}
              <div className="xl:col-span-3">
                <div className="card">
                  <div className="card-body">
                    <DetectionReview
                      detections={appState.detections}
                      currentIndex={appState.currentDetectionIndex}
                      onDetectionChoice={handleDetectionChoice}
                      onIndexChange={(index) => setAppState(prev => ({ ...prev, currentDetectionIndex: index }))}
                    />
                  </div>
                </div>
              </div>
              
              {/* Enhanced Sidebar */}
              <div className="xl:col-span-1 space-y-6">
                {/* Statistics Panel - Enhanced */}
                <div className="card">
                  <div className="card-header">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">📊</span>
                      <div>
                        <h3 className="font-bold text-gray-900">Live Statistics</h3>
                        <p className="text-xs text-gray-600">Real-time analysis metrics</p>
                      </div>
                    </div>
                  </div>
                  <div className="card-body">
                    <StatisticsPanel 
                      video={appState.video}
                      detections={appState.detections}
                    />
                  </div>
                </div>
                
                {/* Export Panel - Enhanced */}
                <div className="card">
                  <div className="card-header">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">📤</span>
                      <div>
                        <h3 className="font-bold text-gray-900">Export Results</h3>
                        <p className="text-xs text-gray-600">Download comprehensive reports</p>
                      </div>
                    </div>
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

      {/* Enhanced Resume Modal */}
      <ResumeAnalysis
        isVisible={showResumeModal}
        onClose={() => setShowResumeModal(false)}
        onResumeSuccess={handleResumeSuccess}
      />
    </div>
  );
};

export default App;
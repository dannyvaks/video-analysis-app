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
    detectionMode: DetectionMode.ALL_VEHICLES,
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
        detectionMode: data.detection_mode || DetectionMode.VEHICLES,
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
          detectionMode={appState.detectionMode}
          onDetectionModeChange={handleDetectionModeChange}
        />
        <ModelLoader progress={appState.modelLoadingProgress} />
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
          detectionMode={appState.detectionMode}
          onDetectionModeChange={handleDetectionModeChange}
        />
        <ErrorBoundary 
          error={error} 
          onRetry={handleRetry}
          onStartOver={handleStartOver}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      <Header 
        currentStep={appState.currentStep}
        onStartOver={handleStartOver}
        detectionMode={appState.detectionMode}
        onDetectionModeChange={handleDetectionModeChange}
      />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Upload Step */}
        {appState.currentStep === 'upload' && (
          <>
            <VideoUpload 
              onVideoUpload={handleVideoUpload}
              onResumeFromExcel={handleResumeFromExcel}
              detectionMode={appState.detectionMode}
            />
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowResumeModal(true)}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                📁 Resume Previous Analysis
              </button>
            </div>
          </>
        )}

        {/* Processing Step */}
        {appState.currentStep === 'processing' && (
          <div className="max-w-4xl mx-auto fade-in">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                🔍 Analyzing Your Video
              </h2>
              <p className="text-lg text-gray-600">
                Our AI is processing your video frame by frame
              </p>
            </div>
            
            <div className="card">
              <div className="card-body">
                <VideoPlayer 
                  video={appState.video}
                  isProcessing={true}
                  processingProgress={appState.processingProgress}
                />
              </div>
            </div>
          </div>
        )}

        {/* Review Step */}
        {appState.currentStep === 'review' && (
          <div className="fade-in">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                ✅ Review Detections
              </h2>
              <p className="text-lg text-gray-600">
                Verify detected vehicles to ensure accuracy
              </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
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
              
              <div className="xl:col-span-1 space-y-6">
                <div className="card">
                  <div className="card-header">
                    <h3 className="font-semibold text-gray-900">📊 Statistics</h3>
                  </div>
                  <div className="card-body">
                    <StatisticsPanel 
                      video={appState.video}
                      detections={appState.detections}
                    />
                  </div>
                </div>
                
                <div className="card">
                  <div className="card-header">
                    <h3 className="font-semibold text-gray-900">📤 Export</h3>
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

      {/* Add the Resume Modal */}
      <ResumeAnalysis
        isVisible={showResumeModal}
        onClose={() => setShowResumeModal(false)}
        onResumeSuccess={handleResumeSuccess}
      />
    </div>
  );
};

export default App;
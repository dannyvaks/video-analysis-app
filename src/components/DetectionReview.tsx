import React, { useState, useCallback } from 'react';
import { Detection, VehicleType } from '../types';
import { submitUserChoice } from '../services/api';

interface DetectionReviewProps {
  detections: Detection[];
  currentIndex: number;
  onDetectionChoice: (detectionId: string, choice: any) => void;
  onIndexChange: (index: number) => void;
}

const DetectionReview: React.FC<DetectionReviewProps> = ({
  detections,
  currentIndex,
  onDetectionChoice,
  onIndexChange
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const currentDetection = detections[currentIndex];

  // Debug: Log detection data to help identify backend issues
  React.useEffect(() => {
    if (currentDetection) {
      console.log('🔍 Detection Debug Info:', {
        detectionId: currentDetection.id,
        frameNumber: currentDetection.frameNumber,
        modelSuggestions: currentDetection.modelSuggestions,
        suggestionsCount: currentDetection.modelSuggestions?.length || 0,
        userChoice: currentDetection.userChoice,
        isManualLabel: currentDetection.isManualLabel,
        boundingBox: currentDetection.boundingBox,
        processedAt: currentDetection.processedAt,
        // NEW: Check for image data fields
        hasFullFrameImageData: !!currentDetection.fullFrameImageData,
        hasFrameImageData: !!currentDetection.frameImageData,
        fullFrameDataLength: currentDetection.fullFrameImageData?.length || 0,
        frameDataLength: currentDetection.frameImageData?.length || 0,
        // Show all available fields
        allFields: Object.keys(currentDetection)
      });
      
      // Log first 100 chars of image data if present
      if (currentDetection.fullFrameImageData) {
        console.log('✅ Full frame data exists:', currentDetection.fullFrameImageData.substring(0, 100) + '...');
      } else {
        console.error('❌ No fullFrameImageData in detection object');
      }
      
      if (currentDetection.frameImageData) {
        console.log('✅ Crop data exists:', currentDetection.frameImageData.substring(0, 100) + '...');
      } else {
        console.error('❌ No frameImageData in detection object');
      }
      
      // Specific warning for resume mode with limited suggestions
      if (currentDetection.modelSuggestions && currentDetection.modelSuggestions.length === 1) {
        console.warn('⚠️ RESUME ISSUE: Only 1 YOLO suggestion found. This indicates backend resume process is not preserving original YOLO predictions.');
      }
      
      if (!currentDetection.modelSuggestions || currentDetection.modelSuggestions.length === 0) {
        console.error('❌ BACKEND ISSUE: No YOLO suggestions in detection data. Backend should provide modelSuggestions array.');
      }
    }
  }, [currentDetection]);

  const handleChoiceSelection = useCallback(async (
    selectedType: VehicleType, 
    confidence: number, 
    isManual: boolean = false
  ) => {
    if (!currentDetection || isSubmitting) return;

    try {
      setIsSubmitting(true);

      await submitUserChoice(currentDetection.id, selectedType, confidence, isManual);

      // Update the detection with the user choice
      onDetectionChoice(currentDetection.id, {
        selectedType,
        confidence,
        isManual,
        userChoice: selectedType // Ensure userChoice is set for navigation
      });

      const nextUnreviewedIndex = detections.findIndex(
        (detection, index) => index > currentIndex && !detection.userChoice
      );

      if (nextUnreviewedIndex !== -1) {
        onIndexChange(nextUnreviewedIndex);
      } else if (currentIndex < detections.length - 1) {
        onIndexChange(currentIndex + 1);
      }

    } catch (error) {
      console.error('Failed to submit choice:', error);
    } finally {
      setIsSubmitting(false);
      setShowCustomInput(false);
      setCustomLabel('');
    }
  }, [currentDetection, currentIndex, detections, onDetectionChoice, onIndexChange, isSubmitting]);

  // === PURE YOLO SYSTEM ===
  // BACKEND (from YOLO model & API):
  // - currentDetection.modelSuggestions (actual AI predictions)
  // - confidence scores from YOLO inference
  // - No mode filtering - YOLO decides what to detect
  //
  // FRONTEND (our UI logic):
  // - Always shows exactly 3 buttons
  // - Unused slots show "No suggestion" (unclickable)
  // - No fallback suggestions - pure YOLO only
  
  const getDisplaySuggestions = () => {
    // Get YOLO suggestions (0-N from backend)
    const yoloSuggestions = currentDetection.modelSuggestions || [];
    
    // Always return exactly 3 slots
    const slots = [];
    
    // Fill first N slots with YOLO suggestions
    for (let i = 0; i < 3; i++) {
      if (i < yoloSuggestions.length) {
        slots.push({
          ...yoloSuggestions[i],
          isYoloSuggestion: true,
          slotIndex: i + 1
        });
      } else {
        slots.push({
          type: 'no_suggestion',
          confidence: 0,
          isYoloSuggestion: false,
          slotIndex: i + 1
        });
      }
    }
    
    return slots;
  };

  const handleCustomSubmit = useCallback(() => {
    if (customLabel.trim()) {
      handleChoiceSelection(customLabel.trim() as VehicleType, 0.9, true);
    }
  }, [customLabel, handleChoiceSelection]);

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-700 bg-green-100 border-green-200';
    if (confidence >= 0.6) return 'text-yellow-700 bg-yellow-100 border-yellow-200';
    return 'text-red-700 bg-red-100 border-red-200';
  };

  const formatConfidence = (confidence: number): string => {
    return `${(confidence * 100).toFixed(1)}%`;
  };

  const formatTimestamp = (timestamp: string | number): string => {
    if (typeof timestamp === 'number') {
      const hours = Math.floor(timestamp / 3600);
      const minutes = Math.floor((timestamp % 3600) / 60);
      const seconds = timestamp % 60;
      const wholeSeconds = Math.floor(seconds);
      const milliseconds = Math.round((seconds - wholeSeconds) * 1000);
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${wholeSeconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    }
    
    if (typeof timestamp === 'string') {
      return timestamp.split('.')[0];
    }
    
    return '00:00:00';
  };

  const getReviewStats = () => {
    const reviewed = detections.filter(d => d.userChoice || d.isManualLabel).length;
    const total = detections.length;
    return { reviewed, total, remaining: total - reviewed };
  };

  const isDetectionReviewed = (detection: Detection): boolean => {
    return !!(detection.userChoice || detection.isManualLabel);
  };

  const handleNavigationClick = useCallback((targetIndex: number) => {
    if (targetIndex >= 0 && targetIndex < detections.length && targetIndex !== currentIndex) {
      console.log(`Navigating from ${currentIndex} to ${targetIndex}`);
      onIndexChange(targetIndex);
    }
  }, [currentIndex, detections.length, onIndexChange]);

  const reviewStats = getReviewStats();

  if (!currentDetection) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card p-12 text-center">
          <div className="text-8xl mb-6">🎉</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Review Complete!</h2>
          <p className="text-xl text-gray-600 mb-6">
            You have reviewed all {detections.length} unique detections.
          </p>
          <div className="bg-green-50 rounded-xl p-6 max-w-md mx-auto">
            <div className="text-lg text-green-800 space-y-2">
              <p><strong>Total:</strong> {reviewStats.total}</p>
              <p><strong>Reviewed:</strong> {reviewStats.reviewed}</p>
              <p><strong>Manual Corrections:</strong> {detections.filter(d => d.isManualCorrection).length}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      
      {/* Progress Header */}
      <div className="card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Detection Review</h2>
            <div className="flex items-center space-x-6 text-lg text-gray-600">
              <span className="font-medium">Detection {currentIndex + 1} of {detections.length}</span>
              <span>•</span>
              <span className="text-green-600 font-medium">{reviewStats.reviewed} reviewed</span>
              <span>•</span>
              <span className="text-blue-600 font-medium">{reviewStats.remaining} remaining</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                const prevIndex = Math.max(0, currentIndex - 1);
                console.log(`Previous button: ${currentIndex} -> ${prevIndex}`);
                handleNavigationClick(prevIndex);
              }}
              disabled={currentIndex === 0 || isSubmitting}
              className="btn btn-secondary btn-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <button
              onClick={() => {
                const nextIndex = Math.min(detections.length - 1, currentIndex + 1);
                console.log(`Next button: ${currentIndex} -> ${nextIndex}`);
                handleNavigationClick(nextIndex);
              }}
              disabled={currentIndex === detections.length - 1 || isSubmitting}
              className="btn btn-secondary btn-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>

        <div className="mt-6">
          <div className="progress-container h-3">
            <div 
              className="progress-bar bg-green-500"
              style={{ width: `${(reviewStats.reviewed / reviewStats.total) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-500 mt-2">
            <span>0%</span>
            <span className="font-medium">{Math.round((reviewStats.reviewed / reviewStats.total) * 100)}% Complete</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Main Detection Interface - Much bigger and fully centered */}
      <div className="w-full max-w-7xl mx-auto">
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-center">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 text-2xl">🎯</span>
                </div>
                <h3 className="text-3xl font-bold text-gray-900">
                  Detection Review - Frame {currentDetection.frameNumber}
                </h3>
              </div>
            </div>
          </div>

          <div className="card-body space-y-10 p-12">
            
            {/* Detection Images - Full frame + Fixed size crop */}
            <div className="space-y-8">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-6 mb-8">
                  <span className="bg-blue-100 text-blue-800 px-6 py-3 rounded-full font-bold text-xl">
                    Frame {currentDetection.frameNumber}
                  </span>
                  <span className="bg-gray-100 text-gray-700 px-6 py-3 rounded-full font-bold text-xl">
                    {formatTimestamp(currentDetection.timestamp)}
                  </span>
                  {/* Debug info for YOLO suggestions */}
                  <span className="bg-red-100 text-red-800 px-6 py-3 rounded-full font-bold text-xl">
                    YOLO: {currentDetection.modelSuggestions?.length || 0} suggestions
                  </span>
                </div>
              </div>
              
              {/* Full Frame + Crop Layout */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* Full Frame with Bounding Box (when available) */}
                <div className="xl:col-span-2">
                  <div className="space-y-4">
                    <h4 className="text-xl font-bold text-gray-900 text-center">🎬 Full Frame Context</h4>
                    
                    {/* Full frame with bounding box */}
                    <div className="relative bg-gray-900 rounded-xl border-3 border-gray-200 overflow-hidden">
                      <div className="relative">
                        {currentDetection.fullFrameImageData ? (
                          <>
                            {/* Full frame with bounding box overlay */}
                            <img
                              src={currentDetection.fullFrameImageData}
                              alt="Full frame with detection"
                              className="w-full h-[600px] object-contain bg-gray-900"
                            />
                            
                            {/* Full frame info overlay */}
                            <div className="absolute top-3 left-3 bg-black bg-opacity-90 text-white px-3 py-2 rounded text-sm font-bold flex items-center space-x-2">
                              <span className="text-green-400">🎬</span>
                              <span>Full Frame</span>
                            </div>
                            
                            {/* Frame dimensions overlay */}
                            <div className="absolute bottom-3 left-3 bg-green-500 bg-opacity-90 text-white px-3 py-2 rounded text-xs font-bold">
                              Frame {currentDetection.frameNumber}
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-[600px] bg-gray-800 rounded-xl flex items-center justify-center border-3 border-dashed border-gray-600">
                            <div className="text-center text-gray-400">
                              <div className="text-6xl mb-4">🎬</div>
                              <div className="text-xl mb-2">Full Frame Not Available</div>
                              <div className="text-sm">Backend needs to provide fullFrameImageData</div>
                              <div className="text-xs mt-2 bg-gray-700 px-3 py-1 rounded">Currently only crop is available</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Fixed Size Crop */}
                <div className="xl:col-span-1">
                  <div className="space-y-4">
                    <h4 className="text-xl font-bold text-gray-900 text-center">🔍 Detection Crop</h4>
                    
                    {currentDetection.frameImageData ? (
                      <div className="relative bg-gray-900 rounded-xl border-3 border-gray-200 overflow-hidden">
                        <div className="relative">
                          {/* Fixed size crop - always same dimensions */}
                          <img
                            src={currentDetection.frameImageData}
                            alt="Detection crop"
                            className="w-full h-[400px] object-contain bg-gray-900"
                            style={{ aspectRatio: '1/1' }}
                          />
                          
                          {/* Crop info overlay */}
                          <div className="absolute top-3 left-3 bg-black bg-opacity-90 text-white px-3 py-2 rounded text-sm font-bold flex items-center space-x-2">
                            <span className="text-yellow-400">🎯</span>
                            <span>Crop</span>
                          </div>
                          
                          {/* Crop dimensions overlay */}
                          <div className="absolute bottom-3 left-3 bg-blue-500 bg-opacity-90 text-white px-3 py-2 rounded text-xs font-bold">
                            {Math.round(currentDetection.boundingBox.width)}×{Math.round(currentDetection.boundingBox.height)}px
                          </div>
                          
                          {/* Resume warning for crop */}
                          {currentDetection.modelSuggestions && currentDetection.modelSuggestions.length === 1 && (
                            <div className="absolute top-3 right-3 bg-orange-500 bg-opacity-90 text-white px-2 py-1 rounded text-xs font-bold">
                              ⚠️ Limited
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-[400px] bg-gray-100 rounded-xl flex items-center justify-center border-3 border-dashed border-gray-300">
                        <div className="text-center text-gray-500">
                          <div className="text-4xl mb-2">📷</div>
                          <div className="text-sm">No crop available</div>
                        </div>
                      </div>
                    )}
                    
                    {/* Crop metadata */}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-600">Crop Position:</span>
                        <span className="font-mono">({Math.round(currentDetection.boundingBox.x)}, {Math.round(currentDetection.boundingBox.y)})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-600">Crop Size:</span>
                        <span className="font-mono">{Math.round(currentDetection.boundingBox.width)}×{Math.round(currentDetection.boundingBox.height)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-600">Detection ID:</span>
                        <span className="font-mono text-xs">{currentDetection.id.slice(-8)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="max-w-4xl mx-auto bg-gray-50 rounded-xl p-8 space-y-4 text-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-bold">Bounding Box:</span>
                      <span className="font-mono text-base bg-white px-4 py-3 rounded-lg border">
                        ({Math.round(currentDetection.boundingBox.x)}, {Math.round(currentDetection.boundingBox.y)}) 
                        {Math.round(currentDetection.boundingBox.width)}×{Math.round(currentDetection.boundingBox.height)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-bold">Processed:</span>
                      <span className="text-base bg-white px-4 py-3 rounded-lg border">{currentDetection.processedAt}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-bold">YOLO Suggestions:</span>
                      <span className={`text-base px-4 py-3 rounded-lg border font-bold ${
                        (currentDetection.modelSuggestions?.length || 0) >= 3 
                          ? 'bg-green-100 text-green-800 border-green-200' 
                          : (currentDetection.modelSuggestions?.length || 0) >= 1
                            ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                            : 'bg-red-100 text-red-800 border-red-200'
                      }`}>
                        {currentDetection.modelSuggestions?.length || 0} found
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-bold">Detection ID:</span>
                      <span className="text-base bg-white px-4 py-3 rounded-lg border font-mono text-xs">
                        {currentDetection.id.slice(-8)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Debug: Show all YOLO suggestions */}
                {currentDetection.modelSuggestions && currentDetection.modelSuggestions.length > 0 ? (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="font-bold text-blue-900 mb-2">🔧 Debug: All YOLO Suggestions</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                      {currentDetection.modelSuggestions.map((suggestion, index) => (
                        <div key={index} className="bg-white p-3 rounded border">
                          <div className="font-semibold">{index + 1}. {suggestion.type}</div>
                          <div className="text-gray-600">{(suggestion.confidence * 100).toFixed(1)}% confidence</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="font-bold text-red-900 mb-2">⚠️ Backend Issue: No YOLO Suggestions</div>
                    <div className="text-red-700 text-sm space-y-1">
                      <p><strong>Possible causes:</strong></p>
                      <ul className="list-disc ml-4 space-y-1">
                        <li>Resume process not preserving original YOLO predictions</li>
                        <li>Excel file only contains user choices, not full YOLO output</li>
                        <li>Backend needs to re-run YOLO inference during resume</li>
                        <li>Confidence threshold filtering out all suggestions</li>
                      </ul>
                      <p className="mt-2 font-semibold">Backend team should check: Resume API response data structure</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Vehicle Choice Interface - Much larger buttons */}
            <div className="space-y-10 pt-8 border-t-2 border-gray-200">
              <div>
                <h3 className="text-4xl font-bold text-gray-900 mb-12 text-center">What type of vehicle is this?</h3>
                
                {/* Vehicle Choice Buttons - YOLO only, no icons */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                  {getDisplaySuggestions().map((suggestion, index) => {
                    const isNoSuggestion = suggestion.type === 'no_suggestion';
                    const isSelected = !isNoSuggestion && currentDetection.userChoice === suggestion.type;
                    
                    return (
                      <button
                        key={`suggestion-${index}`}
                        className={`relative p-8 rounded-xl border-3 transition-all duration-200 text-center ${
                          isNoSuggestion
                            ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                            : isSelected
                              ? 'border-blue-500 bg-blue-50 shadow-xl transform scale-105' 
                              : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-25 hover:shadow-lg hover:transform hover:scale-102'
                        }`}
                        onClick={() => {
                          if (!isNoSuggestion && !isSubmitting) {
                            handleChoiceSelection(
                              suggestion.type as VehicleType,
                              suggestion.confidence,
                              false
                            );
                          }
                        }}
                        disabled={isNoSuggestion || isSubmitting}
                      >
                        <div className="space-y-4">
                          {/* Vehicle Type */}
                          <div className={`text-3xl font-bold capitalize ${
                            isNoSuggestion ? 'text-gray-400' : 'text-gray-900'
                          }`}>
                            {isNoSuggestion ? 'No Suggestion' : suggestion.type.replace('_', ' ')}
                          </div>
                          
                          {/* Suggestion Type Label */}
                          <div className={`text-lg ${
                            isNoSuggestion ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {isNoSuggestion 
                              ? `Slot ${suggestion.slotIndex}` 
                              : `🤖 YOLO Suggestion #${suggestion.slotIndex}`
                            }
                          </div>
                          
                          {/* Confidence Score */}
                          <div className={`px-4 py-2 rounded-lg text-lg font-bold border-2 ${
                            isNoSuggestion 
                              ? 'bg-gray-100 text-gray-400 border-gray-200'
                              : getConfidenceColor(suggestion.confidence)
                          }`}>
                            {isNoSuggestion ? '--' : formatConfidence(suggestion.confidence)}
                          </div>
                        </div>
                        
                        {/* Selected indicator */}
                        {isSelected && (
                          <div className="absolute top-4 right-4">
                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Label Section - Much larger and prominent */}
              <div className="border-t-3 border-gray-200 pt-10">
                {!showCustomInput ? (
                  <div className="max-w-4xl mx-auto">
                    <button
                      onClick={() => setShowCustomInput(true)}
                      className="w-full p-12 rounded-xl border-3 border-dashed border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-25 transition-all duration-200 text-center group"
                      disabled={isSubmitting}
                    >
                      <div className="flex items-center justify-center space-x-6">
                        <span className="text-6xl">✏️</span>
                        <span className="font-bold text-3xl text-gray-700 group-hover:text-blue-700">Enter Custom Vehicle Type</span>
                      </div>
                    </button>
                  </div>
                ) : (
                  <div className="max-w-4xl mx-auto space-y-8 p-12 bg-gray-50 rounded-xl border-3 border-gray-200">
                    <div>
                      <label className="block text-2xl font-bold text-gray-700 mb-6 text-center">
                        Custom Vehicle Type:
                      </label>
                      <input
                        type="text"
                        value={customLabel}
                        onChange={(e) => setCustomLabel(e.target.value)}
                        placeholder="e.g., electric bike, scooter, taxi..."
                        className="form-input w-full text-2xl p-6 border-3"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleCustomSubmit();
                          }
                        }}
                        autoFocus
                      />
                    </div>
                    <div className="flex space-x-6">
                      <button
                        onClick={handleCustomSubmit}
                        disabled={!customLabel.trim() || isSubmitting}
                        className="btn btn-primary flex-1 text-xl py-4 px-8 disabled:opacity-50"
                      >
                        Submit Custom
                      </button>
                      <button
                        onClick={() => {
                          setShowCustomInput(false);
                          setCustomLabel('');
                        }}
                        className="btn btn-secondary flex-1 text-xl py-4 px-8"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Current Choice Display - Much larger and centered */}
              {currentDetection.userChoice && (
                <div className="max-w-4xl mx-auto bg-green-50 border-3 border-green-200 rounded-xl p-8">
                  <div className="flex items-center justify-center space-x-6">
                    <span className="text-green-600 text-5xl">✓</span>
                    <span className="font-bold text-green-800 text-3xl">
                      Selected: {currentDetection.userChoice.replace('_', ' ')}
                    </span>
                    {currentDetection.isManualCorrection && (
                      <span className="text-lg bg-green-200 text-green-800 px-4 py-3 rounded-full font-bold">
                        Manual
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Loading State - Larger */}
              {isSubmitting && (
                <div className="flex items-center justify-center space-x-4 text-blue-600 py-8">
                  <div className="loading-spinner w-8 h-8"></div>
                  <span className="text-2xl font-medium">Submitting choice...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Navigation - Enhanced and more reliable */}
      <div className="card p-8">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-2xl font-bold text-gray-900">Quick Navigation</h4>
          <div className="text-lg text-gray-600">
            <span className="font-semibold">Total:</span> {detections.length} detections
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4 max-h-96 overflow-y-auto">
          {detections.map((detection, index) => {
            const isCurrentIndex = index === currentIndex;
            const isReviewed = isDetectionReviewed(detection);
            
            return (
              <button
                key={`nav-${detection.id}-${index}`}
                onClick={() => handleNavigationClick(index)}
                className={`relative w-16 h-16 rounded-xl text-lg font-bold transition-all duration-200 transform hover:scale-105 ${
                  isCurrentIndex
                    ? 'bg-blue-500 text-white shadow-lg scale-110 ring-4 ring-blue-200'
                    : isReviewed
                      ? 'bg-green-100 text-green-800 hover:bg-green-200 border-3 border-green-300 hover:shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-3 border-gray-300 hover:shadow-md'
                }`}
                title={`Detection ${index + 1} - ${isReviewed ? (detection.userChoice || 'Reviewed') : 'Unreviewed'} - Frame ${detection.frameNumber}`}
                disabled={isSubmitting}
              >
                {index + 1}
                
                {/* Current indicator */}
                {isCurrentIndex && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-yellow-900">→</span>
                  </div>
                )}
                
                {/* Reviewed indicator */}
                {isReviewed && !isCurrentIndex && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        
        {/* Navigation help */}
        <div className="mt-6 flex items-center justify-center space-x-8 text-sm text-gray-500">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>Current</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
            <span>Reviewed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-100 border-2 border-gray-300 rounded"></div>
            <span>Unreviewed</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetectionReview;

import React, { useState, useCallback } from 'react';
import { Detection, VehicleType } from '../types';
import { submitUserChoice } from '../services/api';

interface DetectionReviewProps {
  detections: Detection[];
  currentIndex: number;
  onDetectionChoice: (detectionId: string, choice: any) => void;
  onIndexChange: (index: number) => void;
}

const EnhancedDetectionReview: React.FC<DetectionReviewProps> = ({
  detections,
  currentIndex,
  onDetectionChoice,
  onIndexChange
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const currentDetection = detections[currentIndex];

  const handleChoiceSelection = useCallback(async (
    selectedType: VehicleType, 
    confidence: number, 
    isManual: boolean = false
  ) => {
    if (!currentDetection || isSubmitting) return;

    try {
      setIsSubmitting(true);

      await submitUserChoice(currentDetection.id, selectedType, confidence, isManual);

      // ✅ CORRECT LOGIC: Use same logic as getChoiceIndicatorInfo
      const aiSuggested = currentDetection.modelSuggestions?.some(s => s.type === selectedType);
      const topAiChoice = currentDetection.modelSuggestions?.[0]?.type;
      
      // Determine correct flags
      const isManualLabel = isManual || !aiSuggested;
      const isManualCorrection = !isManual && aiSuggested && selectedType !== topAiChoice;

      onDetectionChoice(currentDetection.id, {
        selectedType,
        confidence,
        isManual: isManualLabel,
        isManualCorrection,
        userChoice: selectedType
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

  const getChoiceIndicatorInfo = (detection: Detection) => {
    if (!detection.userChoice) {
      return { type: 'unreviewed', color: 'gray', icon: '⚪', label: 'Unreviewed' };
    }

    // First check if choice exists in current AI suggestions
    const aiSuggested = detection.modelSuggestions?.some(s => s.type === detection.userChoice);
    
    if (detection.isManualLabel || !aiSuggested) {
      // If explicitly marked as manual label OR choice not in current AI suggestions
      // (This covers resume case where "taxi" isn't in current AI suggestions)
      return { type: 'manual_label', color: 'purple', icon: '✏️', label: 'Manual Label' };
    }

    // If choice exists in AI suggestions, check if it was top choice
    const topAiChoice = detection.modelSuggestions?.[0]?.type;
    if (detection.userChoice !== topAiChoice) {
      // User chose different AI suggestion (not the top one)
      return { type: 'manual_correction', color: 'orange', icon: '✋', label: 'Manual Correction' };
    }

    // User accepted top AI suggestion
    return { type: 'ai_accepted', color: 'green', icon: '✅', label: 'AI Accepted' };
  };

  const getDisplaySuggestions = () => {
    const yoloSuggestions = currentDetection.modelSuggestions || [];
    const slots = [];
    
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
    
    // Use consistent logic with getChoiceIndicatorInfo
    const manualLabels = detections.filter(d => {
      if (!d.userChoice) return false;
      const aiSuggested = d.modelSuggestions?.some(s => s.type === d.userChoice);
      return d.isManualLabel || !aiSuggested;
    }).length;
    
    const manualCorrections = detections.filter(d => {
      if (!d.userChoice || d.isManualLabel) return false;
      const aiSuggested = d.modelSuggestions?.some(s => s.type === d.userChoice);
      if (!aiSuggested) return false; // This would be manual label, not correction
      const topAiChoice = d.modelSuggestions?.[0]?.type;
      return d.userChoice !== topAiChoice;
    }).length;
    
    const aiAccepted = detections.filter(d => {
      if (!d.userChoice || d.isManualLabel) return false;
      const aiSuggested = d.modelSuggestions?.some(s => s.type === d.userChoice);
      if (!aiSuggested) return false; // This would be manual label
      const topAiChoice = d.modelSuggestions?.[0]?.type;
      return d.userChoice === topAiChoice;
    }).length;
    
    const total = detections.length;
    
    return { 
      reviewed, 
      total, 
      remaining: total - reviewed,
      manualLabels,
      manualCorrections,
      aiAccepted
    };
  };

  const isDetectionReviewed = (detection: Detection): boolean => {
    return !!(detection.userChoice || detection.isManualLabel);
  };

  const handleNavigationClick = useCallback((targetIndex: number) => {
    if (targetIndex >= 0 && targetIndex < detections.length && targetIndex !== currentIndex) {
      onIndexChange(targetIndex);
    }
  }, [currentIndex, detections.length, onIndexChange]);

  const reviewStats = getReviewStats();
  const currentChoiceInfo = currentDetection ? getChoiceIndicatorInfo(currentDetection) : null;

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
              <p><strong>AI Accepted:</strong> {reviewStats.aiAccepted}</p>
              <p><strong>Manual Corrections:</strong> {reviewStats.manualCorrections}</p>
              <p><strong>Manual Labels:</strong> {reviewStats.manualLabels}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      
      {/* Enhanced Progress Header with Choice Indicators */}
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
            
            {/* Current Detection Choice Status */}
            {currentChoiceInfo && (
              <div className="mt-3">
                <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full border-2 ${
                  currentChoiceInfo.type === 'unreviewed' ? 'bg-gray-50 border-gray-200 text-gray-600' :
                  currentChoiceInfo.type === 'manual_label' ? 'bg-purple-50 border-purple-200 text-purple-700' :
                  currentChoiceInfo.type === 'manual_correction' ? 'bg-orange-50 border-orange-200 text-orange-700' :
                  'bg-green-50 border-green-200 text-green-700'
                }`}>
                  <span className="text-xl">{currentChoiceInfo.icon}</span>
                  <span className="font-bold">{currentChoiceInfo.label}</span>
                  {currentDetection.userChoice && (
                    <span className="text-sm">({currentDetection.userChoice})</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleNavigationClick(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0 || isSubmitting}
              className="btn btn-secondary btn-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <button
              onClick={() => handleNavigationClick(Math.min(detections.length - 1, currentIndex + 1))}
              disabled={currentIndex === detections.length - 1 || isSubmitting}
              className="btn btn-secondary btn-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>

        {/* Enhanced Progress Bar with Breakdown */}
        <div className="mt-6 space-y-4">
          <div className="progress-container h-4 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full flex">
              <div 
                className="bg-green-500"
                style={{ width: `${(reviewStats.aiAccepted / reviewStats.total) * 100}%` }}
                title={`AI Accepted: ${reviewStats.aiAccepted}`}
              />
              <div 
                className="bg-orange-500"
                style={{ width: `${(reviewStats.manualCorrections / reviewStats.total) * 100}%` }}
                title={`Manual Corrections: ${reviewStats.manualCorrections}`}
              />
              <div 
                className="bg-purple-500"
                style={{ width: `${(reviewStats.manualLabels / reviewStats.total) * 100}%` }}
                title={`Manual Labels: ${reviewStats.manualLabels}`}
              />
            </div>
          </div>
          
          <div className="flex flex-wrap items-center justify-between text-sm">
            <div className="flex flex-wrap items-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>AI Accepted: {reviewStats.aiAccepted}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span>Manual Corrections: {reviewStats.manualCorrections}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span>Manual Labels: {reviewStats.manualLabels}</span>
              </div>
            </div>
            <span className="font-medium">{Math.round((reviewStats.reviewed / reviewStats.total) * 100)}% Complete</span>
          </div>
        </div>
      </div>

      {/* Main Detection Interface */}
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
                {/* Enhanced Choice Indicator in Header */}
                {currentChoiceInfo && currentChoiceInfo.type !== 'unreviewed' && (
                  <div className={`flex items-center space-x-2 px-4 py-2 rounded-full text-lg font-bold ${
                    currentChoiceInfo.type === 'manual_label' ? 'bg-purple-100 text-purple-800' :
                    currentChoiceInfo.type === 'manual_correction' ? 'bg-orange-100 text-orange-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    <span className="text-2xl">{currentChoiceInfo.icon}</span>
                    <span>{currentChoiceInfo.label}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card-body space-y-10 p-12">
            
            {/* Detection Images */}
            <div className="space-y-8">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-6 mb-8">
                  <span className="bg-blue-100 text-blue-800 px-6 py-3 rounded-full font-bold text-xl">
                    Frame {currentDetection.frameNumber}
                  </span>
                  <span className="bg-gray-100 text-gray-700 px-6 py-3 rounded-full font-bold text-xl">
                    {formatTimestamp(currentDetection.timestamp)}
                  </span>
                  <span className="bg-red-100 text-red-800 px-6 py-3 rounded-full font-bold text-xl">
                    YOLO: {currentDetection.modelSuggestions?.length || 0} suggestions
                  </span>
                </div>
              </div>
              
              {/* Full Frame + Crop Layout */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* Full Frame */}
                <div className="xl:col-span-2">
                  <div className="space-y-4">
                    <h4 className="text-xl font-bold text-gray-900 text-center">🎬 Full Frame Context</h4>
                    
                    <div className="relative bg-gray-900 rounded-xl border-3 border-gray-200 overflow-hidden">
                      <div className="relative">
                        {currentDetection.fullFrameImageData ? (
                          <>
                            <img
                              src={currentDetection.fullFrameImageData}
                              alt="Full frame with detection"
                              className="w-full h-[600px] object-contain bg-gray-900"
                            />
                            
                            <div className="absolute top-3 left-3 bg-black bg-opacity-90 text-white px-3 py-2 rounded text-sm font-bold flex items-center space-x-2">
                              <span className="text-green-400">🎬</span>
                              <span>Full Frame</span>
                            </div>
                            
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
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Detection Crop */}
                <div className="xl:col-span-1">
                  <div className="space-y-4">
                    <h4 className="text-xl font-bold text-gray-900 text-center">🔍 Detection Crop</h4>
                    
                    {currentDetection.frameImageData ? (
                      <div className={`relative bg-gray-900 rounded-xl border-3 overflow-hidden ${
                        currentChoiceInfo?.type === 'manual_label' ? 'border-purple-400 shadow-purple-200 shadow-lg' :
                        currentChoiceInfo?.type === 'manual_correction' ? 'border-orange-400 shadow-orange-200 shadow-lg' :
                        currentChoiceInfo?.type === 'ai_accepted' ? 'border-green-400 shadow-green-200 shadow-lg' :
                        'border-gray-200'
                      }`}>
                        <div className="relative">
                          <img
                            src={currentDetection.frameImageData}
                            alt="Detection crop"
                            className="w-full h-[400px] object-contain bg-gray-900"
                            style={{ aspectRatio: '1/1' }}
                          />
                          
                          <div className="absolute top-3 left-3 bg-black bg-opacity-90 text-white px-3 py-2 rounded text-sm font-bold flex items-center space-x-2">
                            <span className="text-yellow-400">🎯</span>
                            <span>Crop</span>
                          </div>
                          
                          {/* Enhanced Choice Overlay */}
                          {currentChoiceInfo && currentChoiceInfo.type !== 'unreviewed' && (
                            <div className={`absolute top-3 right-3 px-3 py-2 rounded-lg text-sm font-bold ${
                              currentChoiceInfo.type === 'manual_label' ? 'bg-purple-500 text-white' :
                              currentChoiceInfo.type === 'manual_correction' ? 'bg-orange-500 text-white' :
                              'bg-green-500 text-white'
                            }`}>
                              <div className="flex items-center space-x-1">
                                <span>{currentChoiceInfo.icon}</span>
                                <span className="text-xs">{currentChoiceInfo.label}</span>
                              </div>
                            </div>
                          )}
                          
                          <div className="absolute bottom-3 left-3 bg-blue-500 bg-opacity-90 text-white px-3 py-2 rounded text-xs font-bold">
                            {Math.round(currentDetection.boundingBox.width)}×{Math.round(currentDetection.boundingBox.height)}px
                          </div>
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
                    
                    {/* Enhanced Metadata with Choice Info */}
                    <div className={`rounded-lg p-4 space-y-2 text-sm border-2 ${
                      currentChoiceInfo?.type === 'manual_label' ? 'bg-purple-50 border-purple-200' :
                      currentChoiceInfo?.type === 'manual_correction' ? 'bg-orange-50 border-orange-200' :
                      currentChoiceInfo?.type === 'ai_accepted' ? 'bg-green-50 border-green-200' :
                      'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-600">Status:</span>
                        <span className={`font-bold ${
                          currentChoiceInfo?.type === 'manual_label' ? 'text-purple-700' :
                          currentChoiceInfo?.type === 'manual_correction' ? 'text-orange-700' :
                          currentChoiceInfo?.type === 'ai_accepted' ? 'text-green-700' :
                          'text-gray-500'
                        }`}>
                          {currentChoiceInfo?.label || 'Unreviewed'}
                        </span>
                      </div>
                      {currentDetection.userChoice && (
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-600">Choice:</span>
                          <span className="font-bold">{currentDetection.userChoice}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-600">Position:</span>
                        <span className="font-mono">({Math.round(currentDetection.boundingBox.x)}, {Math.round(currentDetection.boundingBox.y)})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-600">Size:</span>
                        <span className="font-mono">{Math.round(currentDetection.boundingBox.width)}×{Math.round(currentDetection.boundingBox.height)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Vehicle Choice Interface */}
            <div className="space-y-10 pt-8 border-t-2 border-gray-200">
              <div>
                <h3 className="text-4xl font-bold text-gray-900 mb-12 text-center">What type of vehicle is this?</h3>
                
                {/* Enhanced Vehicle Choice Buttons */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                  {getDisplaySuggestions().map((suggestion, index) => {
                    const isNoSuggestion = suggestion.type === 'no_suggestion';
                    const isSelected = !isNoSuggestion && currentDetection.userChoice === suggestion.type;
                    const wasAiSuggestion = !isNoSuggestion && isSelected;
                    
                    return (
                      <button
                        key={`suggestion-${index}`}
                        className={`relative p-8 rounded-xl border-3 transition-all duration-200 text-center ${
                          isNoSuggestion
                            ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                            : isSelected
                              ? wasAiSuggestion
                                ? 'border-green-500 bg-green-50 shadow-xl transform scale-105 shadow-green-200' 
                                : 'border-orange-500 bg-orange-50 shadow-xl transform scale-105 shadow-orange-200'
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
                          <div className={`text-3xl font-bold capitalize ${
                            isNoSuggestion ? 'text-gray-400' : 'text-gray-900'
                          }`}>
                            {isNoSuggestion ? 'No Suggestion' : suggestion.type.replace('_', ' ')}
                          </div>
                          
                          <div className={`text-lg ${
                            isNoSuggestion ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {isNoSuggestion 
                              ? `Slot ${suggestion.slotIndex}` 
                              : `🤖 YOLO Suggestion #${suggestion.slotIndex}`
                            }
                          </div>
                          
                          <div className={`px-4 py-2 rounded-lg text-lg font-bold border-2 ${
                            isNoSuggestion 
                              ? 'bg-gray-100 text-gray-400 border-gray-200'
                              : getConfidenceColor(suggestion.confidence)
                          }`}>
                            {isNoSuggestion ? '--' : formatConfidence(suggestion.confidence)}
                          </div>
                        </div>
                        
                        {/* Enhanced Selected Indicator */}
                        {isSelected && (
                          <div className="absolute top-4 right-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
                              wasAiSuggestion ? 'bg-green-500' : 'bg-orange-500'
                            }`}>
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

              {/* Custom Label Section */}
              <div className="border-t-3 border-gray-200 pt-10">
                {!showCustomInput ? (
                  <div className="max-w-4xl mx-auto">
                    <button
                      onClick={() => setShowCustomInput(true)}
                      className="w-full p-12 rounded-xl border-3 border-dashed border-purple-300 bg-purple-50 hover:border-purple-400 hover:bg-purple-100 transition-all duration-200 text-center group"
                      disabled={isSubmitting}
                    >
                      <div className="flex items-center justify-center space-x-6">
                        <span className="text-6xl">✏️</span>
                        <span className="font-bold text-3xl text-purple-700 group-hover:text-purple-800">Enter Custom Vehicle Type</span>
                      </div>
                    </button>
                  </div>
                ) : (
                  <div className="max-w-4xl mx-auto space-y-8 p-12 bg-purple-50 rounded-xl border-3 border-purple-200">
                    <div>
                      <label className="block text-2xl font-bold text-purple-700 mb-6 text-center">
                        Custom Vehicle Type:
                      </label>
                      <input
                        type="text"
                        value={customLabel}
                        onChange={(e) => setCustomLabel(e.target.value)}
                        placeholder="e.g., electric bike, scooter, taxi..."
                        className="form-input w-full text-2xl p-6 border-3 border-purple-300 focus:border-purple-500"
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
                        className="btn flex-1 text-xl py-4 px-8 bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
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

              {/* Enhanced Current Choice Display */}
              {currentDetection.userChoice && (
                <div className={`max-w-4xl mx-auto rounded-xl p-8 border-3 ${
                  currentChoiceInfo?.type === 'manual_label' ? 'bg-purple-50 border-purple-200' :
                  currentChoiceInfo?.type === 'manual_correction' ? 'bg-orange-50 border-orange-200' :
                  'bg-green-50 border-green-200'
                }`}>
                  <div className="flex items-center justify-center space-x-6">
                    <span className={`text-5xl ${
                      currentChoiceInfo?.type === 'manual_label' ? 'text-purple-600' :
                      currentChoiceInfo?.type === 'manual_correction' ? 'text-orange-600' :
                      'text-green-600'
                    }`}>
                      {currentChoiceInfo?.icon}
                    </span>
                    <span className={`font-bold text-3xl ${
                      currentChoiceInfo?.type === 'manual_label' ? 'text-purple-800' :
                      currentChoiceInfo?.type === 'manual_correction' ? 'text-orange-800' :
                      'text-green-800'
                    }`}>
                      Selected: {currentDetection.userChoice.replace('_', ' ')}
                    </span>
                    <span className={`text-lg px-4 py-3 rounded-full font-bold ${
                      currentChoiceInfo?.type === 'manual_label' ? 'bg-purple-200 text-purple-800' :
                      currentChoiceInfo?.type === 'manual_correction' ? 'bg-orange-200 text-orange-800' :
                      'bg-green-200 text-green-800'
                    }`}>
                      {currentChoiceInfo?.label}
                    </span>
                  </div>
                </div>
              )}

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

      {/* Enhanced Navigation Panel */}
      <div className="card p-8">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-2xl font-bold text-gray-900">Quick Navigation</h4>
          <div className="text-lg text-gray-600">
            <span className="font-semibold">Total:</span> {detections.length} detections
          </div>
        </div>
        
        {/* Navigation Legend */}
        <div className="mb-6 flex flex-wrap items-center justify-center space-x-8 text-sm bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-blue-500 rounded-xl border-2 border-blue-300 flex items-center justify-center">
              <span className="text-white text-xs">→</span>
            </div>
            <span>Current</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-green-100 border-2 border-green-300 rounded-xl flex items-center justify-center">
              <span className="text-green-600 text-xs">✓</span>
            </div>
            <span>AI Accepted</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-orange-100 border-2 border-orange-300 rounded-xl flex items-center justify-center">
              <span className="text-orange-600 text-xs">✋</span>
            </div>
            <span>Manual Correction</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-purple-100 border-2 border-purple-300 rounded-xl flex items-center justify-center">
              <span className="text-purple-600 text-xs">✏</span>
            </div>
            <span>Manual Label</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-gray-100 border-2 border-gray-300 rounded-xl"></div>
            <span>Unreviewed</span>
          </div>
        </div>
        
        {/* Enhanced Navigation Grid */}
        <div className="flex flex-wrap gap-4 max-h-96 overflow-y-auto">
          {detections.map((detection, index) => {
            const isCurrentIndex = index === currentIndex;
            const choiceInfo = getChoiceIndicatorInfo(detection);
            
            return (
              <button
                key={`nav-${detection.id}-${index}`}
                onClick={() => handleNavigationClick(index)}
                className={`relative w-16 h-16 rounded-xl text-lg font-bold transition-all duration-200 transform hover:scale-105 border-3 ${
                  isCurrentIndex
                    ? 'bg-blue-500 text-white shadow-lg scale-110 ring-4 ring-blue-200 border-blue-300'
                    : choiceInfo.type === 'manual_label'
                      ? 'bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-300 hover:shadow-md'
                      : choiceInfo.type === 'manual_correction'
                        ? 'bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-300 hover:shadow-md'
                        : choiceInfo.type === 'ai_accepted'
                          ? 'bg-green-100 text-green-800 hover:bg-green-200 border-green-300 hover:shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-300 hover:shadow-md'
                }`}
                title={`Detection ${index + 1} - ${choiceInfo.label} - Frame ${detection.frameNumber}${detection.userChoice ? ` (${detection.userChoice})` : ''}`}
                disabled={isSubmitting}
              >
                {index + 1}
                
                {/* Current indicator */}
                {isCurrentIndex && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-xs font-bold text-yellow-900">→</span>
                  </div>
                )}
                
                {/* Enhanced Status Indicators */}
                {!isCurrentIndex && choiceInfo.type !== 'unreviewed' && (
                  <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-lg text-white text-xs ${
                    choiceInfo.type === 'manual_label' ? 'bg-purple-500' :
                    choiceInfo.type === 'manual_correction' ? 'bg-orange-500' :
                    'bg-green-500'
                  }`}>
                    {choiceInfo.type === 'manual_label' ? '✏' :
                     choiceInfo.type === 'manual_correction' ? '✋' : '✓'}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EnhancedDetectionReview;
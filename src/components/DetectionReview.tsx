import React, { useState, useCallback, useEffect } from 'react';
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
  const [reviewMode, setReviewMode] = useState<'all' | 'unreviewed' | 'reviewed'>('unreviewed');

  const currentDetection = detections[currentIndex];

  // Filter detections based on review mode
  const filteredDetections = detections.filter(detection => {
    switch (reviewMode) {
      case 'unreviewed':
        return !detection.userChoice;
      case 'reviewed':
        return detection.userChoice;
      case 'all':
      default:
        return true;
    }
  });

  // Get current filtered index
  const filteredIndex = filteredDetections.findIndex(
    detection => detection.id === currentDetection?.id
  );

  const handleChoiceSelection = useCallback(async (
    selectedType: VehicleType, 
    confidence: number, 
    isManual: boolean = false
  ) => {
    if (!currentDetection || isSubmitting) return;

    try {
      setIsSubmitting(true);

      // Submit to backend
      await submitUserChoice(
        currentDetection.id,
        selectedType,
        confidence,
        isManual
      );

      // Update local state
      onDetectionChoice(currentDetection.id, {
        selectedType,
        confidence,
        isManual
      });

      // Auto-advance to next unreviewed detection
      const nextUnreviewedIndex = detections.findIndex(
        (detection, index) => index > currentIndex && !detection.userChoice
      );

      if (nextUnreviewedIndex !== -1) {
        onIndexChange(nextUnreviewedIndex);
      } else {
        // If no more unreviewed, go to next detection
        if (currentIndex < detections.length - 1) {
          onIndexChange(currentIndex + 1);
        }
      }

    } catch (error) {
      console.error('Failed to submit choice:', error);
      // You might want to show an error toast here
    } finally {
      setIsSubmitting(false);
      setShowCustomInput(false);
      setCustomLabel('');
    }
  }, [currentDetection, currentIndex, detections, onDetectionChoice, onIndexChange, isSubmitting]);

  const handleCustomSubmit = useCallback(() => {
    if (customLabel.trim()) {
      handleChoiceSelection(customLabel.trim() as VehicleType, 0.9, true);
    }
  }, [customLabel, handleChoiceSelection]);

  const getVehicleTypeIcon = (type: string): string => {
    const iconMap: Record<string, string> = {
      'bicycle': '🚲',
      'motorcycle': '🏍️',
      'electric_motorcycle': '⚡🏍️',
      'electric_scooter': '🛵',
      'motorcycle_cab': '🚖',
      'car': '🚗',
      'truck': '🚛',
      'bus': '🚌',
      'van': '🚐',
      'unknown': '❓'
    };
    return iconMap[type] || '🚗';
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const formatConfidence = (confidence: number): string => {
    return `${(confidence * 100).toFixed(1)}%`;
  };

  const formatTimestamp = (timestamp: string): string => {
    return timestamp.split('.')[0]; // Remove milliseconds for cleaner display
  };

  const getReviewStats = () => {
    const reviewed = detections.filter(d => d.userChoice).length;
    const total = detections.length;
    return { reviewed, total, remaining: total - reviewed };
  };

  const reviewStats = getReviewStats();

  if (!currentDetection) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Review Complete!
        </h2>
        <p className="text-gray-600 mb-4">
          You have reviewed all {detections.length} unique detections.
        </p>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-green-800">
            <p><strong>Total Detections:</strong> {reviewStats.total}</p>
            <p><strong>Reviewed:</strong> {reviewStats.reviewed}</p>
            <p><strong>Manual Corrections:</strong> {detections.filter(d => d.isManualCorrection).length}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header with Navigation and Stats */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          
          {/* Progress Info */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">
              Detection Review
            </h2>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>
                Detection {currentIndex + 1} of {detections.length}
              </span>
              <span>•</span>
              <span className="text-green-600">
                {reviewStats.reviewed} reviewed
              </span>
              <span>•</span>
              <span className="text-blue-600">
                {reviewStats.remaining} remaining
              </span>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-gray-700">View:</label>
            <select
              value={reviewMode}
              onChange={(e) => setReviewMode(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="unreviewed">Unreviewed Only</option>
              <option value="all">All Detections</option>
              <option value="reviewed">Reviewed Only</option>
            </select>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onIndexChange(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="btn btn-outline btn-sm disabled:opacity-50"
            >
              ← Previous
            </button>
            <button
              onClick={() => onIndexChange(Math.min(detections.length - 1, currentIndex + 1))}
              disabled={currentIndex === detections.length - 1}
              className="btn btn-outline btn-sm disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="progress-bar">
            <div 
              className="progress-fill bg-green-500"
              style={{ width: `${(reviewStats.reviewed / reviewStats.total) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span>{Math.round((reviewStats.reviewed / reviewStats.total) * 100)}% Complete</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Detection Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Detection Frame */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Detection Frame</h3>
            <div className="text-sm text-gray-600">
              Frame {currentDetection.frameNumber} • {formatTimestamp(currentDetection.timestamp)}
            </div>
          </div>
          
          {currentDetection.frameImageData ? (
            <div className="relative">
              <img
                src={currentDetection.frameImageData}
                alt="Detection frame"
                className="w-full h-64 object-contain bg-gray-100 rounded-lg"
              />
              
              {/* Bounding box overlay indicator */}
              <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
                Detected Object
              </div>
            </div>
          ) : (
            <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-gray-400">No image available</span>
            </div>
          )}

          {/* Detection Metadata */}
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Bounding Box:</span>
              <span className="font-mono text-xs">
                ({Math.round(currentDetection.boundingBox.x)}, {Math.round(currentDetection.boundingBox.y)}) 
                {Math.round(currentDetection.boundingBox.width)}×{Math.round(currentDetection.boundingBox.height)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Processed:</span>
              <span>{currentDetection.processedAt}</span>
            </div>
          </div>
        </div>

        {/* Choice Interface */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-4">
            What type of vehicle is this?
          </h3>

          {/* Model Suggestions */}
          <div className="space-y-3 mb-6">
            {currentDetection.modelSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className={`relative border rounded-lg p-3 cursor-pointer transition-all duration-200 hover:border-blue-300 hover:shadow-md ${
                  currentDetection.userChoice === suggestion.type 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200'
                }`}
                onClick={() => handleChoiceSelection(
                  suggestion.type as VehicleType,
                  suggestion.confidence,
                  false
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">
                      {getVehicleTypeIcon(suggestion.type)}
                    </span>
                    <div>
                      <div className="font-medium text-gray-900 capitalize">
                        {suggestion.type.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-gray-600">
                        Model Suggestion #{index + 1}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      getConfidenceColor(suggestion.confidence)
                    }`}>
                      {formatConfidence(suggestion.confidence)}
                    </div>
                  </div>
                </div>

                {currentDetection.userChoice === suggestion.type && (
                  <div className="absolute top-2 right-2">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Custom Label Option */}
          <div className="border-t border-gray-200 pt-4">
            {!showCustomInput ? (
              <button
                onClick={() => setShowCustomInput(true)}
                className="w-full btn btn-outline text-left flex items-center justify-center space-x-2"
              >
                <span>✏️</span>
                <span>Enter Custom Label</span>
              </button>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custom Vehicle Type:
                  </label>
                  <input
                    type="text"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    placeholder="e.g., electric bike, scooter, taxi..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleCustomSubmit();
                      }
                    }}
                    autoFocus
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleCustomSubmit}
                    disabled={!customLabel.trim() || isSubmitting}
                    className="flex-1 btn btn-primary btn-sm disabled:opacity-50"
                  >
                    Submit Custom
                  </button>
                  <button
                    onClick={() => {
                      setShowCustomInput(false);
                      setCustomLabel('');
                    }}
                    className="flex-1 btn btn-outline btn-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Current Choice Display */}
          {currentDetection.userChoice && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-green-600">✓</span>
                <span className="font-medium text-green-800">
                  Selected: {currentDetection.userChoice.replace('_', ' ')}
                </span>
                {currentDetection.isManualCorrection && (
                  <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                    Manual
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Loading State */}
          {isSubmitting && (
            <div className="mt-4 flex items-center justify-center space-x-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm">Submitting choice...</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h4 className="font-medium text-gray-900 mb-3">Quick Navigation</h4>
        <div className="flex flex-wrap gap-2">
          {detections.slice(0, 20).map((detection, index) => (
            <button
              key={detection.id}
              onClick={() => onIndexChange(index)}
              className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                index === currentIndex
                  ? 'bg-blue-500 text-white'
                  : detection.userChoice
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={`Detection ${index + 1} - ${detection.userChoice || 'Unreviewed'}`}
            >
              {index + 1}
            </button>
          ))}
          {detections.length > 20 && (
            <span className="flex items-center text-sm text-gray-500">
              +{detections.length - 20} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default DetectionReview;
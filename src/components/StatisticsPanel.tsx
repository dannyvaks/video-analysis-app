import React, { useMemo } from 'react';
import { VideoMetadata, Detection } from '../types';

interface StatisticsPanelProps {
  video: VideoMetadata | null;
  detections: Detection[];
}

const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ video, detections }) => {
  // FIXED: Calculate statistics with proper null/undefined checks
  const statistics = useMemo(() => {
    if (!detections || detections.length === 0) {
      return {
        totalDetections: 0,
        reviewedDetections: 0,
        uniqueFrames: 0,
        detectionsByType: {},
        averageConfidence: 0,
        manualCorrections: 0,
        detectionDensity: 0,
        reviewProgress: 0
      };
    }

    // Basic counts
    const totalDetections = detections.length;
    const reviewedDetections = detections.filter(d => d.userChoice).length;
    const manualCorrections = detections.filter(d => d.isManualCorrection).length;

    // Get unique frames
    const uniqueFrames = new Set(detections.map(d => d.frameNumber)).size;

    // Group by vehicle type (from user choice or model prediction)
    const detectionsByType: Record<string, number> = {};
    detections.forEach(detection => {
      let vehicleType = detection.userChoice;
      
      // FIXED: Safely access model suggestions
      if (!vehicleType && detection.modelSuggestions && detection.modelSuggestions.length > 0) {
        vehicleType = detection.modelSuggestions[0]?.type || 'unknown';
      }
      
      if (!vehicleType) {
        vehicleType = 'unknown';
      }

      vehicleType = vehicleType.replace(/_/g, ' ').toLowerCase();
      detectionsByType[vehicleType] = (detectionsByType[vehicleType] || 0) + 1;
    });

    // Calculate average confidence
    let totalConfidence = 0;
    let confidenceCount = 0;
    
    detections.forEach(detection => {
      // FIXED: Safely access model suggestions for confidence
      if (detection.modelSuggestions && detection.modelSuggestions.length > 0) {
        const confidence = detection.modelSuggestions[0]?.confidence;
        if (typeof confidence === 'number' && !isNaN(confidence)) {
          totalConfidence += confidence;
          confidenceCount++;
        }
      }
    });

    const averageConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;

    // Calculate detection density (detections per minute)
    const detectionDensity = video && video.duration > 0 
      ? (totalDetections / (video.duration / 60)) 
      : 0;

    // Review progress
    const reviewProgress = totalDetections > 0 ? (reviewedDetections / totalDetections) * 100 : 0;

    return {
      totalDetections,
      reviewedDetections,
      uniqueFrames,
      detectionsByType,
      averageConfidence,
      manualCorrections,
      detectionDensity,
      reviewProgress
    };
  }, [detections, video]);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatConfidence = (confidence: number): string => {
    return `${(confidence * 100).toFixed(1)}%`;
  };

  if (!video) {
    return (
      <div className="space-y-4">
        <div className="text-center text-gray-500 py-8">
          <div className="text-4xl mb-2">📊</div>
          <p>No video data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Video Information */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
          <span className="mr-2">🎬</span>
          Video Information
        </h4>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Duration:</span>
            <span className="font-medium">{formatDuration(video.duration)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Resolution:</span>
            <span className="font-medium">{video.width}×{video.height}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Frame Rate:</span>
            <span className="font-medium">{video.fps.toFixed(1)} FPS</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total Frames:</span>
            <span className="font-medium">{video.frameCount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Frames with Detections:</span>
            <span className="font-medium">{statistics.uniqueFrames}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Detection Density:</span>
            <span className="font-medium">{statistics.detectionDensity.toFixed(1)} per minute</span>
          </div>
        </div>
      </div>

      {/* Detection Summary */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
          <span className="mr-2">🎯</span>
          Detection Summary
        </h4>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Detections:</span>
            <span className="font-medium text-blue-600">{statistics.totalDetections}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Reviewed:</span>
            <span className="font-medium text-green-600">{statistics.reviewedDetections}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Remaining:</span>
            <span className="font-medium text-orange-600">{statistics.totalDetections - statistics.reviewedDetections}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Manual Corrections:</span>
            <span className="font-medium text-purple-600">{statistics.manualCorrections}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Average Confidence:</span>
            <span className="font-medium">{formatConfidence(statistics.averageConfidence)}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Review Progress</span>
            <span>{Math.round(statistics.reviewProgress)}%</span>
          </div>
          <div className="progress-container h-2">
            <div 
              className="progress-bar bg-blue-500"
              style={{ width: `${statistics.reviewProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Vehicle Types Breakdown */}
      {Object.keys(statistics.detectionsByType).length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <span className="mr-2">🚗</span>
            Vehicle Types
          </h4>
          
          <div className="space-y-2">
            {Object.entries(statistics.detectionsByType)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => {
                const percentage = statistics.totalDetections > 0 
                  ? (count / statistics.totalDetections) * 100 
                  : 0;
                
                const getVehicleIcon = (vehicleType: string): string => {
                  const iconMap: Record<string, string> = {
                    'car': '🚗',
                    'truck': '🚛',
                    'bus': '🚌',
                    'motorcycle': '🏍️',
                    'bicycle': '🚲',
                    'electric bike': '⚡🚲',
                    'electric scooter': '🛵',
                    'van': '🚐',
                    'unknown': '❓'
                  };
                  return iconMap[vehicleType] || '🚗';
                };

                return (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span>{getVehicleIcon(type)}</span>
                      <span className="text-sm capitalize">{type}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{count}</span>
                      <span className="text-xs text-gray-500">({percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
          <span className="mr-2">⚡</span>
          Performance
        </h4>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-lg font-bold text-blue-600">{statistics.uniqueFrames}</div>
            <div className="text-xs text-blue-700">Active Frames</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-600">{statistics.detectionDensity.toFixed(1)}</div>
            <div className="text-xs text-green-700">Per Minute</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-lg font-bold text-purple-600">{formatConfidence(statistics.averageConfidence)}</div>
            <div className="text-xs text-purple-700">Avg Confidence</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-lg font-bold text-orange-600">{Math.round(statistics.reviewProgress)}%</div>
            <div className="text-xs text-orange-700">Complete</div>
          </div>
        </div>
      </div>

      {/* Quality Indicators */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
          <span className="mr-2">🏆</span>
          Quality Metrics
        </h4>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Frame Coverage:</span>
            <span className="font-medium">
              {video.frameCount > 0 ? ((statistics.uniqueFrames / video.frameCount) * 100).toFixed(1) : 0}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Manual Intervention:</span>
            <span className="font-medium">
              {statistics.totalDetections > 0 ? ((statistics.manualCorrections / statistics.totalDetections) * 100).toFixed(1) : 0}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Avg Objects per Frame:</span>
            <span className="font-medium">
              {statistics.uniqueFrames > 0 ? (statistics.totalDetections / statistics.uniqueFrames).toFixed(1) : 0}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default StatisticsPanel;
import React, { useMemo } from 'react';
import { VideoMetadata, Detection } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface StatisticsPanelProps {
  video: VideoMetadata | null;
  detections: Detection[];
}

const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ video, detections }) => {
  // Calculate statistics
  const statistics = useMemo(() => {
    if (!detections.length || !video) {
      return {
        totalDetections: 0,
        detectionsByType: {},
        detectionsByConfidence: { high: 0, medium: 0, low: 0 },
        manualCorrections: 0,
        manuallyAdded: 0,
        averageConfidence: 0,
        detectionDensity: 0,
        reviewProgress: 0,
        framesCovered: 0
      };
    }

    const detectionsByType: Record<string, number> = {};
    let totalConfidence = 0;
    let confidenceCount = 0;
    let highConf = 0, mediumConf = 0, lowConf = 0;
    let manualCorrections = 0;
    let manuallyAdded = 0;
    const reviewedCount = detections.filter(d => d.userChoice).length;
    const frameNumbers = new Set(detections.map(d => d.frameNumber));

    detections.forEach(detection => {
      // Count by type (use user choice if available, otherwise primary model suggestion)
      const vehicleType = detection.userChoice || 
        (detection.modelSuggestions[0]?.type) || 'unknown';
      
      detectionsByType[vehicleType] = (detectionsByType[vehicleType] || 0) + 1;

      // Confidence statistics
      if (detection.modelSuggestions[0]?.confidence) {
        const confidence = detection.modelSuggestions[0].confidence;
        totalConfidence += confidence;
        confidenceCount++;

        if (confidence >= 0.8) highConf++;
        else if (confidence >= 0.5) mediumConf++;
        else lowConf++;
      }

      // Manual intervention tracking
      if (detection.isManualCorrection) manualCorrections++;
      if (detection.isManualLabel) manuallyAdded++;
    });

    const averageConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;
    const detectionDensity = video.duration > 0 ? (detections.length / (video.duration / 60)) : 0;
    const reviewProgress = (reviewedCount / detections.length) * 100;

    return {
      totalDetections: detections.length,
      detectionsByType,
      detectionsByConfidence: { high: highConf, medium: mediumConf, low: lowConf },
      manualCorrections,
      manuallyAdded,
      averageConfidence,
      detectionDensity,
      reviewProgress,
      framesCovered: frameNumbers.size
    };
  }, [detections, video]);

  // Prepare chart data
  const chartData = useMemo(() => {
    const typeData = Object.entries(statistics.detectionsByType)
      .map(([type, count]) => ({
        name: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        count,
        percentage: ((count / statistics.totalDetections) * 100).toFixed(1)
      }))
      .sort((a, b) => b.count - a.count);

    const confidenceData = [
      { name: 'High (≥80%)', count: statistics.detectionsByConfidence.high, color: '#10B981' },
      { name: 'Medium (50-79%)', count: statistics.detectionsByConfidence.medium, color: '#F59E0B' },
      { name: 'Low (<50%)', count: statistics.detectionsByConfidence.low, color: '#EF4444' }
    ];

    return { typeData, confidenceData };
  }, [statistics]);

  const getVehicleIcon = (type: string): string => {
    const iconMap: Record<string, string> = {
      'Bicycle': '🚲',
      'Motorcycle': '🏍️',
      'Electric Motorcycle': '⚡🏍️',
      'Electric Scooter': '🛵',
      'Motorcycle Cab': '🚖',
      'Car': '🚗',
      'Truck': '🚛',
      'Bus': '🚌',
      'Van': '🚐',
      'Unknown': '❓'
    };
    return iconMap[type] || '🚗';
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (!video || !detections.length) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          📊 Analysis Statistics
        </h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-2">📈</div>
          <p className="text-gray-500">
            Statistics will appear here after video processing is complete.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="stat-card">
          <div className="stat-value text-blue-600">
            {statistics.totalDetections}
          </div>
          <div className="stat-label">Total Detections</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value text-green-600">
            {Math.round(statistics.reviewProgress)}%
          </div>
          <div className="stat-label">Review Progress</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value text-purple-600">
            {(statistics.averageConfidence * 100).toFixed(1)}%
          </div>
          <div className="stat-label">Avg Confidence</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value text-orange-600">
            {statistics.detectionDensity.toFixed(1)}
          </div>
          <div className="stat-label">Per Minute</div>
        </div>
      </div>

      {/* Review Progress */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Review Progress</h4>
        <div className="space-y-3">
          <div className="progress-bar">
            <div 
              className="progress-fill bg-green-500"
              style={{ width: `${statistics.reviewProgress}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium text-gray-900">
                {detections.filter(d => d.userChoice).length}
              </div>
              <div className="text-gray-600">Reviewed</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-900">
                {statistics.manualCorrections}
              </div>
              <div className="text-gray-600">Manual Corrections</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-900">
                {detections.filter(d => !d.userChoice).length}
              </div>
              <div className="text-gray-600">Remaining</div>
            </div>
          </div>
        </div>
      </div>

      {/* Detection Types Chart */}
      {chartData.typeData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h4 className="font-semibold text-gray-900 mb-4">
            Vehicle Types Detected
          </h4>
          
          {/* List View */}
          <div className="space-y-3 mb-4">
            {chartData.typeData.slice(0, 5).map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getVehicleIcon(item.name)}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">{item.count}</span>
                  <div className="w-16 h-2 bg-gray-200 rounded-full">
                    <div 
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Bar Chart */}
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.typeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value, name) => [value, 'Count']}
                  labelFormatter={(label) => `${getVehicleIcon(label)} ${label}`}
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Confidence Distribution */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h4 className="font-semibold text-gray-900 mb-4">
          Detection Confidence Distribution
        </h4>
        
        <div className="grid grid-cols-3 gap-4 mb-4">
          {chartData.confidenceData.map((item) => (
            <div key={item.name} className="text-center">
              <div className="text-2xl font-bold" style={{ color: item.color }}>
                {item.count}
              </div>
              <div className="text-xs text-gray-600">{item.name}</div>
              <div className="text-xs text-gray-500">
                {((item.count / statistics.totalDetections) * 100).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>

        {/* Pie Chart */}
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData.confidenceData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                dataKey="count"
                startAngle={90}
                endAngle={450}
              >
                {chartData.confidenceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name) => [value, 'Detections']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Video Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Video Information</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Duration:</span>
            <span className="font-medium">{formatTime(video.duration)}</span>
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
            <span className="font-medium">{statistics.framesCovered.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Detection Density:</span>
            <span className="font-medium">{statistics.detectionDensity.toFixed(1)} per minute</span>
          </div>
        </div>
      </div>

      {/* Quality Metrics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Quality Metrics</h4>
        <div className="space-y-3">
          
          {/* Model Accuracy */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Model Accuracy</span>
              <span className="font-medium">
                {(statistics.averageConfidence * 100).toFixed(1)}%
              </span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill bg-blue-500"
                style={{ width: `${statistics.averageConfidence * 100}%` }}
              />
            </div>
          </div>

          {/* Manual Intervention Rate */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Manual Corrections</span>
              <span className="font-medium">
                {statistics.totalDetections > 0 
                  ? ((statistics.manualCorrections / statistics.totalDetections) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill bg-yellow-500"
                style={{ 
                  width: `${statistics.totalDetections > 0 
                    ? (statistics.manualCorrections / statistics.totalDetections) * 100 
                    : 0}%` 
                }}
              />
            </div>
          </div>

          {/* Processing Efficiency */}
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {statistics.totalDetections > 0 
                  ? (100 - ((statistics.manualCorrections / statistics.totalDetections) * 100)).toFixed(1)
                  : 100}%
              </div>
              <div className="text-xs text-gray-600">Auto-Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {statistics.framesCovered > 0 
                  ? ((statistics.totalDetections / statistics.framesCovered) * 100).toFixed(1)
                  : 0}%
              </div>
              <div className="text-xs text-gray-600">Frame Efficiency</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsPanel;
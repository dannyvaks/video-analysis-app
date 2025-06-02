import React, { useEffect, useState } from 'react';
import { ModelLoadingProgress } from '../types';

interface ModelLoaderProps {
  progress: ModelLoadingProgress | null;
}

const ModelLoader: React.FC<ModelLoaderProps> = ({ progress }) => {
  const [dots, setDots] = useState('');
  const [estimatedTime, setEstimatedTime] = useState<string>('');

  // Animate dots for loading effect
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Calculate estimated time based on progress
  useEffect(() => {
    if (progress && progress.percentage > 0 && progress.percentage < 100) {
      // Rough estimation: YOLOv8m model is ~50MB, typical download is 5-15 seconds
      const remainingPercentage = 100 - progress.percentage;
      const estimatedSeconds = Math.round((remainingPercentage / progress.percentage) * 10);
      
      if (estimatedSeconds > 60) {
        setEstimatedTime(`~${Math.round(estimatedSeconds / 60)}m remaining`);
      } else if (estimatedSeconds > 0) {
        setEstimatedTime(`~${estimatedSeconds}s remaining`);
      } else {
        setEstimatedTime('Almost ready...');
      }
    } else {
      setEstimatedTime('');
    }
  }, [progress]);

  const getStatusInfo = () => {
    if (!progress) {
      return {
        title: 'Initializing AI Engine',
        message: 'Setting up YOLOv8m detection system...',
        icon: '🤖',
        color: 'blue'
      };
    }

    switch (progress.status) {
      case 'downloading':
        return {
          title: 'Downloading YOLOv8m Model',
          message: progress.message || 'Downloading model weights from Ultralytics...',
          icon: '📥',
          color: 'blue'
        };
      case 'loading':
        return {
          title: 'Loading Model',
          message: progress.message || 'Initializing neural network...',
          icon: '⚙️',
          color: 'blue'
        };
      case 'ready':
        return {
          title: 'Model Ready!',
          message: progress.message || 'YOLOv8m loaded successfully',
          icon: '✅',
          color: 'green'
        };
      case 'error':
        return {
          title: 'Loading Failed',
          message: progress.message || 'Failed to load model',
          icon: '❌',
          color: 'red'
        };
      default:
        return {
          title: 'Loading Model',
          message: 'Preparing detection engine...',
          icon: '⏳',
          color: 'blue'
        };
    }
  };

  const statusInfo = getStatusInfo();
  const progressPercentage = progress?.percentage || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        
        {/* Main Loading Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          
          {/* Icon and Status */}
          <div className="mb-6">
            <div className="text-6xl mb-4 animate-pulse">
              {statusInfo.icon}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {statusInfo.title}
            </h1>
            <p className="text-gray-600">
              {statusInfo.message}{statusInfo.status !== 'ready' && statusInfo.status !== 'error' ? dots : ''}
            </p>
          </div>

          {/* Progress Bar */}
          {progress && progress.status !== 'error' && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Progress
                </span>
                <span className="text-sm text-gray-600">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ease-out ${
                    statusInfo.color === 'green' 
                      ? 'bg-gradient-to-r from-green-400 to-green-600'
                      : 'bg-gradient-to-r from-blue-400 to-blue-600'
                  }`}
                  style={{ width: `${progressPercentage}%` }}
                >
                  <div className="h-full bg-white bg-opacity-20 animate-pulse"></div>
                </div>
              </div>
              
              {estimatedTime && (
                <p className="text-xs text-gray-500 mt-2">
                  {estimatedTime}
                </p>
              )}
            </div>
          )}

          {/* Status-specific content */}
          {progress?.status === 'error' && (
            <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-700">
                Please check your internet connection and try refreshing the page.
              </p>
            </div>
          )}

          {progress?.status === 'ready' && (
            <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-700">
                🎉 Ready to analyze videos with high accuracy detection!
              </p>
            </div>
          )}
        </div>

        {/* Model Information */}
        <div className="mt-6 bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 text-white">
          <h3 className="font-semibold mb-3 flex items-center">
            <span className="mr-2">🧠</span>
            YOLOv8m Model Information
          </h3>
          
          <div className="space-y-2 text-sm text-blue-100">
            <div className="flex justify-between">
              <span>Model Size:</span>
              <span>~50MB</span>
            </div>
            <div className="flex justify-between">
              <span>Accuracy (F1):</span>
              <span>88%</span>
            </div>
            <div className="flex justify-between">
              <span>Target Classes:</span>
              <span>Micro-mobility + Vehicles</span>
            </div>
            <div className="flex justify-between">
              <span>Inference Speed:</span>
              <span>Real-time</span>
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-blue-300 border-opacity-30">
            <p className="text-xs text-blue-200">
              The model will be cached locally after the first download for faster future loading.
            </p>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="text-center text-white">
            <div className="text-2xl mb-1">🎯</div>
            <p className="text-xs">High Accuracy</p>
          </div>
          <div className="text-center text-white">
            <div className="text-2xl mb-1">⚡</div>
            <p className="text-xs">Fast Processing</p>
          </div>
          <div className="text-center text-white">
            <div className="text-2xl mb-1">🛡️</div>
            <p className="text-xs">Local Processing</p>
          </div>
        </div>

        {/* Loading Animation */}
        {progress && progress.status !== 'ready' && progress.status !== 'error' && (
          <div className="mt-8 flex justify-center">
            <div className="flex space-x-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-white rounded-full animate-bounce"
                  style={{
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: '0.6s'
                  }}
                ></div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelLoader;
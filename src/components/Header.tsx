import React from 'react';
import { DetectionMode } from '../types';

interface HeaderProps {
  currentStep: 'upload' | 'processing' | 'review' | 'export';
  onStartOver: () => void;
  detectionMode: DetectionMode;
  onDetectionModeChange: (mode: DetectionMode) => void;
}

const Header: React.FC<HeaderProps> = ({
  currentStep,
  onStartOver,
  detectionMode,
  onDetectionModeChange
}) => {
  const steps = [
    { key: 'upload', label: 'Upload', icon: '📁' },
    { key: 'processing', label: 'Processing', icon: '🔄' },
    { key: 'review', label: 'Review', icon: '✅' },
  ];

  const currentStepIndex = steps.findIndex(step => step.key === currentStep);

  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-lg font-bold">🎯</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI Vehicle Detector</h1>
              <p className="text-xs text-gray-500">Powered by YOLOv8m</p>
            </div>
          </div>

          {/* Step Progress */}
          <div className="hidden md:flex items-center space-x-3">
            {steps.map((step, index) => {
              const isActive = index === currentStepIndex;
              const isCompleted = index < currentStepIndex;
              
              return (
                <div key={step.key} className="flex items-center">
                  <div className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${
                    isActive 
                      ? 'bg-blue-100 text-blue-700 shadow-sm' 
                      : isCompleted 
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                  }`}>
                    <span>{step.icon}</span>
                    <span className="font-medium">{step.label}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-8 h-1 mx-2 rounded-full transition-colors ${
                      isCompleted ? 'bg-green-300' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            {/* Mode Selector - Only show on upload step */}
            {currentStep === 'upload' && (
              <select
                value={detectionMode}
                onChange={(e) => onDetectionModeChange(e.target.value as DetectionMode)}
                className="form-select"
              >
                <option value="all_vehicles">🚗 All Vehicles</option>
                <option value="micro_mobility_only">🛴 Micro-mobility</option>
              </select>
            )}
            
            {/* Start Over Button */}
            {currentStep !== 'upload' && (
              <button onClick={onStartOver} className="btn btn-secondary btn-sm">
                🔄 Start Over
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
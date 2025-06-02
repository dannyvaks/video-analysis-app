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
      description: 'AI analysis'
    },
    { 
      key: 'review', 
      label: 'Review', 
      icon: '✅',
      description: 'Verify results'
    },
  ];

  const currentStepIndex = steps.findIndex(step => step.key === currentStep);

  const getDetectionModeInfo = () => {
    switch (detectionMode) {
      case DetectionMode.MICRO_MOBILITY:
        return {
          emoji: '🛴',
          label: 'Micro-mobility',
          description: 'Bicycles, scooters, motorcycles'
        };
      case DetectionMode.ALL_VEHICLES:
        return {
          emoji: '🚗',
          label: 'All Vehicles',
          description: 'Cars, trucks, buses + micro-mobility'
        };
      default:
        return {
          emoji: '🔍',
          label: 'Detection',
          description: 'Smart vehicle detection'
        };
    }
  };

  const modeInfo = getDetectionModeInfo();

  return (
    <header className="header-clean">
      <div className="container-center">
        <div className="flex items-center justify-between py-4">
          
          {/* Logo Section */}
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg font-bold">🎯</span>
            </div>
            
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                AI Vehicle Detector
              </h1>
              <div className="flex items-center space-x-3 text-xs">
                <span className="text-gray-500">Powered by YOLOv8m</span>
                <div className="status-badge success">
                  88% Accuracy
                </div>
              </div>
            </div>
          </div>

          {/* Step Progress - Desktop */}
          <div className="hidden lg:flex items-center space-x-4">
            {steps.map((step, index) => {
              const isActive = index === currentStepIndex;
              const isCompleted = index < currentStepIndex;
              
              return (
                <div key={step.key} className="flex items-center">
                  <div className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-all ${
                    isActive 
                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                      : isCompleted 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-gray-50 text-gray-500 border border-gray-200'
                  }`}>
                    
                    {/* Step Icon */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                      isActive
                        ? 'bg-blue-500 text-white'
                        : isCompleted
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-300 text-gray-600'
                    }`}>
                      {isCompleted ? '✓' : step.icon}
                    </div>
                    
                    {/* Step Info */}
                    <div className="text-left">
                      <div className="font-medium">{step.label}</div>
                      <div className="text-xs opacity-75">{step.description}</div>
                    </div>
                  </div>
                  
                  {/* Progress Line */}
                  {index < steps.length - 1 && (
                    <div className={`w-8 h-1 mx-2 rounded-full transition-all ${
                      isCompleted ? 'bg-emerald-300' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile Step Indicator */}
          <div className="lg:hidden flex items-center space-x-3">
            <div className="text-sm font-medium text-gray-700">
              Step {currentStepIndex + 1} of {steps.length}
            </div>
            <div className="flex space-x-1">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentStepIndex
                      ? 'bg-blue-500 w-4'
                      : index < currentStepIndex
                        ? 'bg-emerald-500'
                        : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Actions Section */}
          <div className="flex items-center space-x-4">
            
            {/* Detection Mode Selector */}
            {currentStep === 'upload' && (
              <div className="relative">
                <select
                  value={detectionMode}
                  onChange={(e) => onDetectionModeChange(e.target.value as DetectionMode)}
                  className="form-select pr-8 text-sm"
                >
                  <option value={DetectionMode.ALL_VEHICLES}>🚗 All Vehicles</option>
                  <option value={DetectionMode.MICRO_MOBILITY}>🛴 Micro-mobility</option>
                </select>
              </div>
            )}

            {/* Current Mode Display */}
            {currentStep !== 'upload' && (
              <div className="hidden md:flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg border">
                <span className="text-lg">{modeInfo.emoji}</span>
                <div className="text-sm">
                  <div className="font-medium text-gray-900">{modeInfo.label}</div>
                  <div className="text-gray-500 text-xs">{modeInfo.description}</div>
                </div>
              </div>
            )}
            
            {/* Start Over Button */}
            {currentStep !== 'upload' && (
              <button 
                onClick={onStartOver} 
                className="btn btn-secondary btn-sm"
              >
                <span className="mr-2">🔄</span>
                Start Over
              </button>
            )}
          </div>
        </div>

        {/* Mobile Step Progress */}
        <div className="lg:hidden pb-4 border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
            <span>{steps[currentStepIndex]?.label}</span>
            <span>{Math.round(((currentStepIndex + 1) / steps.length) * 100)}% Complete</span>
          </div>
          <div className="progress-container h-1">
            <div 
              className="progress-bar"
              style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
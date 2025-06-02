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
      description: 'AI analysis in progress'
    },
    { 
      key: 'review', 
      label: 'Review', 
      icon: '✅',
      description: 'Verify detections'
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
    <header className="header-glass">
      <div className="container-center">
        <div className="flex items-center justify-between py-6">
          
          {/* Enhanced Logo Section */}
          <div className="flex items-center space-x-4">
            <div className="relative group">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                <span className="text-white text-2xl font-bold">🎯</span>
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-white flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
            </div>
            
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                AI Vehicle Detector
              </h1>
              <div className="flex items-center space-x-3 text-xs">
                <div className="flex items-center space-x-2 text-gray-500">
                  <span>Powered by YOLOv8m</span>
                  <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                  <span className="text-emerald-600 font-semibold">88% Accuracy</span>
                </div>
                <div className="flex items-center space-x-1 px-2 py-1 bg-emerald-50 rounded-full">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span className="text-emerald-700 font-medium">Online</span>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Step Progress - Desktop */}
          <div className="hidden lg:flex items-center space-x-3">
            {steps.map((step, index) => {
              const isActive = index === currentStepIndex;
              const isCompleted = index < currentStepIndex;
              
              return (
                <div key={step.key} className="flex items-center">
                  <div className={`relative flex items-center space-x-4 px-6 py-4 rounded-2xl transition-all duration-300 ${
                    isActive 
                      ? 'bg-blue-500/10 text-blue-700 shadow-lg border border-blue-200 scale-105' 
                      : isCompleted 
                        ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-200 hover:scale-105'
                        : 'bg-gray-50 text-gray-500 border border-gray-200'
                  }`}>
                    
                    {/* Step Icon */}
                    <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                      isActive
                        ? 'bg-blue-500 text-white shadow-lg'
                        : isCompleted
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                    }`}>
                      {isCompleted ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span>{step.icon}</span>
                      )}
                      
                      {isActive && (
                        <div className="absolute inset-0 rounded-xl bg-blue-400 animate-ping opacity-30"></div>
                      )}
                    </div>
                    
                    {/* Step Info */}
                    <div className="text-left">
                      <div className="font-semibold">{step.label}</div>
                      <div className="text-xs opacity-75 max-w-24">
                        {step.description}
                      </div>
                    </div>
                    
                    {/* Active Indicator */}
                    {isActive && (
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                  
                  {/* Progress Line */}
                  {index < steps.length - 1 && (
                    <div className="flex items-center mx-4">
                      <div className={`w-16 h-1 rounded-full transition-all duration-500 ${
                        isCompleted ? 'bg-emerald-300' : 'bg-gray-200'
                      }`}>
                        {isCompleted && (
                          <div className="w-full h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile Step Indicator */}
          <div className="lg:hidden flex items-center space-x-2">
            <div className="text-sm font-medium text-gray-700">
              Step {currentStepIndex + 1} of {steps.length}
            </div>
            <div className="flex space-x-1">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentStepIndex
                      ? 'bg-blue-500 w-6'
                      : index < currentStepIndex
                        ? 'bg-emerald-400'
                        : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Enhanced Actions Section */}
          <div className="flex items-center space-x-4">
            
            {/* Detection Mode Selector - Enhanced */}
            {currentStep === 'upload' && (
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
                <div className="relative bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <select
                    value={detectionMode}
                    onChange={(e) => onDetectionModeChange(e.target.value as DetectionMode)}
                    className="appearance-none bg-transparent px-4 py-3 pr-10 text-sm font-medium text-gray-700 focus:outline-none cursor-pointer"
                  >
                    <option value={DetectionMode.ALL_VEHICLES}>🚗 All Vehicles</option>
                    <option value={DetectionMode.MICRO_MOBILITY}>🛴 Micro-mobility</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* Current Mode Display */}
            {currentStep !== 'upload' && (
              <div className="hidden md:flex items-center space-x-3 px-4 py-2 bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20">
                <span className="text-lg">{modeInfo.emoji}</span>
                <div className="text-sm">
                  <div className="font-semibold text-gray-900">{modeInfo.label}</div>
                  <div className="text-gray-600 text-xs">{modeInfo.description}</div>
                </div>
              </div>
            )}
            
            {/* Start Over Button - Enhanced */}
            {currentStep !== 'upload' && (
              <button 
                onClick={onStartOver} 
                className="btn btn-secondary btn-sm group"
              >
                <span className="mr-2 group-hover:rotate-180 transition-transform duration-300">🔄</span>
                Start Over
              </button>
            )}

            {/* Menu Button for Mobile */}
            <button className="lg:hidden p-2 rounded-xl bg-white/80 backdrop-blur-xl border border-white/20">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Step Progress */}
        <div className="lg:hidden pb-4">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
            <span>{steps[currentStepIndex]?.label}</span>
            <span>{Math.round(((currentStepIndex + 1) / steps.length) * 100)}% Complete</span>
          </div>
          <div className="progress-container h-2">
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
import React from 'react';

interface HeaderProps {
  currentStep: 'upload' | 'processing' | 'review' | 'export';
  onStartOver: () => void;
}

const Header: React.FC<HeaderProps> = ({
  currentStep,
  onStartOver
}) => {
  const steps = [
    { key: 'upload', label: 'Upload', icon: '📁' },
    { key: 'processing', label: 'Processing', icon: '🔄' },
    { key: 'review', label: 'Review', icon: '✅' }
  ];

  const currentStepIndex = steps.findIndex(step => step.key === currentStep);

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
              <h1 className="text-xl font-bold text-gray-900">AI Vehicle Detector</h1>
              <div className="flex items-center space-x-3 text-xs">
                <span className="text-gray-500">Powered by YOLOv8m</span>
                <div className="status-badge success">88% Accuracy</div>
              </div>
            </div>
          </div>

          {/* Progress Steps - Simplified */}
          <div className="hidden md:flex items-center space-x-2">
            {steps.map((step, index) => {
              const isActive = index === currentStepIndex;
              const isCompleted = index < currentStepIndex;
              
              return (
                <div key={step.key} className="flex items-center">
                  <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${
                    isActive 
                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                      : isCompleted 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-gray-50 text-gray-500 border border-gray-200'
                  }`}>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isActive
                        ? 'bg-blue-500 text-white'
                        : isCompleted
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-300 text-gray-600'
                    }`}>
                      {isCompleted ? '✓' : index + 1}
                    </span>
                    <span className="font-medium text-sm">{step.label}</span>
                  </div>
                  
                  {index < steps.length - 1 && (
                    <div className={`w-6 h-1 mx-1 rounded-full transition-all ${
                      isCompleted ? 'bg-emerald-300' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile Progress */}
          <div className="md:hidden flex items-center space-x-3">
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

          {/* Actions */}
          <div className="flex items-center space-x-4">
            
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

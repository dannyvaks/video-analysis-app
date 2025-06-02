import React from 'react';
import { AppError } from '../types';

interface ErrorBoundaryProps {
  error: AppError;
  onRetry: () => void;
  onStartOver: () => void;
}

const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({ 
  error, 
  onRetry, 
  onStartOver 
}) => {
  const getErrorInfo = () => {
    switch (error.code) {
      case 'MODEL_LOAD_FAILED':
        return {
          icon: '🤖',
          title: 'AI Model Loading Failed',
          description: 'Unable to load the YOLOv8m detection model. This might be due to network issues or browser compatibility.',
          suggestions: [
            'Check your internet connection',
            'Ensure your browser supports WebGL',
            'Try using Chrome or Firefox for best compatibility',
            'Clear browser cache and reload'
          ],
          severity: 'high' as const
        };
      
      case 'VIDEO_UPLOAD_FAILED':
        return {
          icon: '📁',
          title: 'Video Upload Failed',
          description: 'The video file could not be uploaded or processed.',
          suggestions: [
            'Check if the video format is supported (MP4, AVI, MOV, MKV, WMV)',
            'Ensure the file size is under 500MB',
            'Verify the video file is not corrupted',
            'Try a different video file'
          ],
          severity: 'medium' as const
        };
      
      case 'VIDEO_PROCESSING_FAILED':
        return {
          icon: '⚙️',
          title: 'Video Processing Failed',
          description: 'An error occurred while analyzing the video for object detection.',
          suggestions: [
            'The video might be corrupted or in an unsupported format',
            'Try with a different video file',
            'Ensure the video has clear visibility of vehicles',
            'Check if the video resolution is supported'
          ],
          severity: 'medium' as const
        };
      
      case 'EXPORT_FAILED':
        return {
          icon: '📊',
          title: 'Export Failed',
          description: 'Unable to generate the analysis report.',
          suggestions: [
            'Ensure you have completed the detection review',
            'Try exporting in a different format (CSV instead of Excel)',
            'Check if there are any detections to export',
            'Retry the export process'
          ],
          severity: 'low' as const
        };
      
      default:
        return {
          icon: '⚠️',
          title: 'Unexpected Error',
          description: 'An unexpected error occurred during processing.',
          suggestions: [
            'Try refreshing the page',
            'Clear browser cache and cookies',
            'Check your internet connection',
            'Contact support if the issue persists'
          ],
          severity: 'medium' as const
        };
    }
  };

  const errorInfo = getErrorInfo();

  const getSeverityStyles = () => {
    switch (errorInfo.severity) {
      case 'high':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          iconColor: 'text-red-500',
          titleColor: 'text-red-800',
          textColor: 'text-red-700'
        };
      case 'medium':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          iconColor: 'text-yellow-500',
          titleColor: 'text-yellow-800',
          textColor: 'text-yellow-700'
        };
      case 'low':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          iconColor: 'text-blue-500',
          titleColor: 'text-blue-800',
          textColor: 'text-blue-700'
        };
    }
  };

  const styles = getSeverityStyles();

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        
        {/* Main Error Card */}
        <div className={`${styles.bg} ${styles.border} border rounded-2xl shadow-lg p-8`}>
          
          {/* Error Header */}
          <div className="text-center mb-6">
            <div className={`text-6xl mb-4`}>
              {errorInfo.icon}
            </div>
            <h1 className={`text-2xl font-bold ${styles.titleColor} mb-2`}>
              {errorInfo.title}
            </h1>
            <p className={`${styles.textColor} text-lg`}>
              {errorInfo.description}
            </p>
          </div>

          {/* Error Details */}
          <div className="mb-6">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-start space-x-3">
                <div className={`${styles.iconColor} mt-1`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">Error Details</h3>
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Code:</strong> {error.code}
                  </p>
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Message:</strong> {error.message}
                  </p>
                  <p className="text-xs text-gray-500">
                    <strong>Time:</strong> {formatTimestamp(error.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Suggestions */}
          <div className="mb-8">
            <h3 className={`font-semibold ${styles.titleColor} mb-3`}>
              Suggested Solutions:
            </h3>
            <ul className="space-y-2">
              {errorInfo.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className={`${styles.iconColor} mt-1`}>•</span>
                  <span className={`${styles.textColor} text-sm`}>
                    {suggestion}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {error.recoverable && (
              <button
                onClick={onRetry}
                className="flex-1 btn btn-primary"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </button>
            )}
            
            <button
              onClick={onStartOver}
              className="flex-1 btn btn-outline"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Start Over
            </button>
          </div>
        </div>

        {/* Technical Details (Collapsible) */}
        <details className="mt-6 bg-white rounded-lg border border-gray-200 shadow-sm">
          <summary className="p-4 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors">
            <span className="font-medium text-gray-700">Technical Details</span>
            <span className="text-xs text-gray-500 ml-2">(Click to expand)</span>
          </summary>
          
          <div className="px-4 pb-4 border-t border-gray-200">
            <div className="mt-3 space-y-2 text-sm">
              <div>
                <strong className="text-gray-700">Error Code:</strong>
                <span className="ml-2 font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">
                  {error.code}
                </span>
              </div>
              
              <div>
                <strong className="text-gray-700">Recoverable:</strong>
                <span className={`ml-2 ${error.recoverable ? 'text-green-600' : 'text-red-600'}`}>
                  {error.recoverable ? 'Yes' : 'No'}
                </span>
              </div>
              
              <div>
                <strong className="text-gray-700">Timestamp:</strong>
                <span className="ml-2 text-gray-600">
                  {formatTimestamp(error.timestamp)}
                </span>
              </div>
              
              {error.details && (
                <div>
                  <strong className="text-gray-700">Additional Details:</strong>
                  <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto text-gray-600">
                    {JSON.stringify(error.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </details>

        {/* Help Links */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 mb-2">
            Need additional help?
          </p>
          <div className="space-x-4">
            <button 
              onClick={() => window.location.reload()}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Refresh Page
            </button>
            <button 
              onClick={() => {
                // Clear local storage
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
              }}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Clear Cache & Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorBoundary;
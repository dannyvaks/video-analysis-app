import React, { useRef, useEffect, useState } from 'react';
import { VideoMetadata, ProcessingProgress } from '../types';

interface VideoPlayerProps {
  video: VideoMetadata | null;
  isProcessing?: boolean;
  processingProgress?: ProcessingProgress | null;
  detections?: any[];
  currentFrame?: number;
  onFrameChange?: (frame: number) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  isProcessing = false,
  processingProgress,
  detections = [],
  currentFrame,
  onFrameChange
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Update video time when currentFrame prop changes
  useEffect(() => {
    if (videoRef.current && currentFrame !== undefined && video) {
      const timeFromFrame = currentFrame / video.fps;
      if (Math.abs(videoRef.current.currentTime - timeFromFrame) > 0.1) {
        videoRef.current.currentTime = timeFromFrame;
      }
    }
  }, [currentFrame, video]);

  // Video event handlers
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      
      // Notify parent component of frame change
      if (onFrameChange && video) {
        const frame = Math.floor(videoRef.current.currentTime * video.fps);
        onFrameChange(frame);
      }
    }
  };

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
    }
  };

  const handlePlaybackRateChange = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  };

  const stepFrame = (direction: 'forward' | 'backward') => {
    if (videoRef.current && video) {
      const frameTime = 1 / video.fps;
      const newTime = currentTime + (direction === 'forward' ? frameTime : -frameTime);
      const clampedTime = Math.max(0, Math.min(duration, newTime));
      handleSeek(clampedTime);
    }
  };

  const formatTime = (time: number): string => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  if (!video) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <p className="text-gray-500">No video loaded</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      
      {/* Video Info Header */}
      <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">
              {video.filename}
            </h2>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <span>📐 {video.width}×{video.height}</span>
              <span>⏱️ {formatTime(video.duration)}</span>
              <span>🎬 {video.fps.toFixed(1)} FPS</span>
              <span>📁 {formatFileSize(video.file_size)}</span>
            </div>
          </div>
          
          {isProcessing && processingProgress && (
            <div className="text-right">
              <div className="flex items-center space-x-2 mb-1">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm font-medium text-blue-600">
                  Processing...
                </span>
              </div>
              <div className="text-xs text-gray-500">
                Frame {processingProgress.currentFrame} of {processingProgress.totalFrames}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Video Container */}
      <div className="relative bg-black rounded-lg overflow-hidden shadow-lg">
        
        {/* Video Element */}
        <video
          ref={videoRef}
          className="w-full h-auto max-h-[600px] object-contain"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onPlay={handlePlay}
          onPause={handlePause}
          crossOrigin="anonymous"
        >
          <source src={`/uploads/${video.filename}`} type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {/* Detection Overlay Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ mixBlendMode: 'normal' }}
        />

        {/* Processing Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <h3 className="text-lg font-medium mb-2">
                Analyzing Video...
              </h3>
              {processingProgress && (
                <div className="space-y-2">
                  <p className="text-sm opacity-90">
                    {processingProgress.message}
                  </p>
                  <div className="w-64 mx-auto">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill bg-white"
                        style={{ width: `${processingProgress.percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs mt-1 opacity-75">
                      <span>{Math.round(processingProgress.percentage)}%</span>
                      {processingProgress.estimatedTimeRemaining && (
                        <span>~{Math.round(processingProgress.estimatedTimeRemaining)}s remaining</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Video Controls */}
      {!isProcessing && (
        <div className="mt-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          
          {/* Progress Bar */}
          <div className="mb-4">
            <input
              type="range"
              min="0"
              max={duration}
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            
            {/* Playback Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => stepFrame('backward')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Previous Frame"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
                </svg>
              </button>
              
              <button
                onClick={togglePlay}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {isPlaying ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              
              <button
                onClick={() => stepFrame('forward')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Next Frame"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798l-5.445-3.63z" />
                </svg>
              </button>
            </div>

            {/* Speed Control */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Speed:</span>
              <select
                value={playbackRate}
                onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value={0.25}>0.25x</option>
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>
            </div>

            {/* Volume Control */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleVolumeChange(volume > 0 ? 0 : 1)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                {volume > 0 ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.786L4.686 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.686l3.697-3.786a1 1 0 011.617-.138zM12 9a1 1 0 011.414 0L15 10.586l1.586-1.586a1 1 0 011.414 1.414L16.414 12l1.586 1.586a1 1 0 01-1.414 1.414L15 13.414l-1.586 1.586a1 1 0 01-1.414-1.414L13.414 12l-1.586-1.586A1 1 0 0112 9z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.786L4.686 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.686l3.697-3.786a1 1 0 011.617-.138z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-16 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
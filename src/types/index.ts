// Core detection types
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ModelSuggestion {
  type: VehicleType;
  confidence: number;
}

export interface Detection {
  id: string;
  timestamp: string;
  frameNumber: number;
  frameImageData: string; // Base64 encoded frame image
  boundingBox: BoundingBox;
  modelSuggestions: ModelSuggestion[];
  userChoice: VehicleType | null;
  isManualLabel: boolean;
  isManualCorrection: boolean;
  processedAt: string;
  correctedBy?: string;
}

// Vehicle and micro-mobility types
export type VehicleType = 
  | 'bicycle'
  | 'motorcycle' 
  | 'electric_motorcycle'
  | 'electric_scooter'
  | 'motorcycle_cab'
  | 'car'
  | 'truck'
  | 'bus'
  | 'van'
  | 'unknown';

export enum DetectionMode {
  MICRO_MOBILITY_ONLY = 'micro_mobility_only',
  ALL_VEHICLES = 'all_vehicles'
}

// Video processing types
export interface VideoMetadata {
  filename: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  frameCount: number;
  fileSize: number;
  uploadedAt: string;
}

export interface ProcessingProgress {
  currentFrame: number;
  totalFrames: number;
  percentage: number;
  estimatedTimeRemaining?: number;
  status: 'initializing' | 'processing' | 'completed' | 'error';
  message?: string;
}

// Model loading types
export interface ModelLoadingProgress {
  loaded: number;
  total: number;
  percentage: number;
  status: 'downloading' | 'loading' | 'ready' | 'error';
  message?: string;
}

// YOLOv8m specific types
export interface YOLODetection {
  class: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
  classId: number;
}

export interface YOLOModelConfig {
  modelUrl: string;
  inputSize: [number, number]; // [width, height]
  confidenceThreshold: number;
  iouThreshold: number;
  maxDetections: number;
  classNames: string[];
}

// Statistics and reporting types
export interface DetectionStatistics {
  totalDetections: number;
  detectionsByType: Record<VehicleType, number>;
  detectionsByConfidence: {
    high: number; // >0.8
    medium: number; // 0.5-0.8
    low: number; // <0.5
  };
  manualCorrections: number;
  manuallyAdded: number;
  processingTime: number;
  averageConfidence: number;
  framesCovered: number;
  detectionDensity: number; // detections per minute
}

export interface ExportData {
  videoMetadata: VideoMetadata;
  detections: Detection[];
  statistics: DetectionStatistics;
  exportedAt: string;
  exportVersion: string;
}

// UI state types
export interface AppState {
  currentStep: 'upload' | 'processing' | 'review' | 'export';
  video: VideoMetadata | null;
  detections: Detection[];
  currentDetectionIndex: number;
  detectionMode: DetectionMode.ALL_VEHICLES;
  modelLoaded: boolean;
  isProcessing: boolean;
  processingProgress: ProcessingProgress | null;
  modelLoadingProgress: ModelLoadingProgress | null;
}

// User interaction types
export interface UserChoice {
  detectionId: string;
  selectedType: VehicleType;
  confidence: number;
  isManual: boolean;
  timestamp: string;
}

// Error handling types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  recoverable: boolean;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Event types for tracking user actions
export interface UserActionEvent {
  type: 'detection_accepted' | 'detection_corrected' | 'detection_added' | 'detection_skipped';
  detectionId: string;
  timestamp: string;
  originalSuggestion?: VehicleType;
  userChoice: VehicleType;
  timeTaken: number; // milliseconds
}

// Configuration types
export interface AppConfig {
  model: YOLOModelConfig;
  ui: {
    autoAdvance: boolean;
    showConfidenceScores: boolean;
    defaultDetectionMode: DetectionMode;
    batchSize: number;
  };
  export: {
    includeFrameImages: boolean;
    compression: boolean;
    format: 'xlsx' | 'csv';
  };
}
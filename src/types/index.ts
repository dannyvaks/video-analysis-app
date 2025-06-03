// types/index.ts - Complete fixed version

// Detection Mode Enum
export enum DetectionMode {
  ALL_VEHICLES = 'all_vehicles',
  MICRO_MOBILITY = 'micro_mobility_only'
}

// Video metadata interface
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

// Model suggestion interface
export interface ModelSuggestion {
  type: string;
  confidence: number;
}

// Bounding box interface
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Detection interface
export interface Detection {
  id: string;
  timestamp: string;
  frameNumber: number;
  fullFrameImageData?: string;  // Full frame with bbox overlay
  frameImageData: string;       // 224x224 crop
  boundingBox: BoundingBox;
  modelSuggestions: ModelSuggestion[];
  userChoice?: string | null;
  isManualLabel: boolean;
  isManualCorrection: boolean;
  processedAt: string;
}

// Processing progress interface
export interface ProcessingProgress {
  currentFrame: number;
  totalFrames: number;
  percentage: number;
  status: string;
  message: string;
}

// Model loading progress interface
export interface ModelLoadingProgress {
  stage: string;
  percentage: number;
  message: string;
}

// Application error interface
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  recoverable: boolean;
}

// User choice interface
export interface UserChoice {
  detectionId: string;
  selectedType: VehicleType;
  confidence: number;
  isManual: boolean;
  timestamp: string;
}

// Vehicle type type
export type VehicleType = string;

// Main application state interface
export interface AppState {
  currentStep: 'upload' | 'processing' | 'review' | 'export';
  video: VideoMetadata | null;
  detections: Detection[];
  currentDetectionIndex: number;
  modelLoaded: boolean;
  isProcessing: boolean;
  processingProgress: ProcessingProgress | null;
  modelLoadingProgress: ModelLoadingProgress | null;
}

// Detection statistics interface
export interface DetectionStatistics {
  totalDetections: number;
  detectionsByType: Record<string, number>;
  detectionsByConfidence: Record<string, number>;
  manualCorrections: number;
  manuallyAdded: number;
  processingTime: number;
  averageConfidence: number;
  framesCovered: number;
  detectionDensity: number;
}

// Export data interface
export interface ExportData {
  video: VideoMetadata;
  detections: Detection[];
  statistics: DetectionStatistics;
  exportedAt: string;
}

// Type aliases for convenience
export type DetectionModeType = DetectionMode.ALL_VEHICLES | DetectionMode.MICRO_MOBILITY;
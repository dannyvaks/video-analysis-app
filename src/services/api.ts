/**
 * API Service for communicating with Python FastAPI backend
 * Handles all HTTP requests and WebSocket connections
 */

import { 
  VideoMetadata, 
  Detection, 
  DetectionMode, 
  VehicleType,
  ModelLoadingProgress,
  ProcessingProgress,
  ExportData,
  DetectionStatistics,
  UserChoice
} from '../types/index'; // Removed .js extension

// Use Vite environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_BASE_URL = API_BASE_URL.replace('http', 'ws');

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ModelStatus {
  loaded: boolean;
  model_info?: {
    model_path: string;
    device: string;
    confidence_threshold: number;
    iou_threshold: number;
    num_classes: number;
    class_names: string[];
    micro_mobility_classes: string[];
  };
}

class VideoAnalysisAPI {
  private ws: WebSocket | null = null;
  private wsUrl: string;
  private eventHandlers: Map<string, Function[]> = new Map();

  constructor() {
    this.wsUrl = API_BASE_URL.replace('http', 'ws') + '/ws';
  }

  // Health check
  async checkHealth(): Promise<{ status: string; model_loaded: boolean }> {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new Error('Health check failed');
    }
    return response.json();
  }

  // Upload video
  async uploadVideo(file: File): Promise<VideoMetadata & { file_path: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/video/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Upload failed');
    }

    return response.json();
  }

  // Start video processing
  async processVideo(
    filePath: string,
    mode: DetectionMode = 'micro_mobility_only',
    frameSkip: number = 1
  ): Promise<{ message: string; status: string }> {
    const response = await fetch(`${API_BASE_URL}/video/process?file_path=${encodeURIComponent(filePath)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        detection_mode: mode,
        frame_skip: frameSkip,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Processing failed');
    }

    return response.json();
  }

  // Submit user choice for detection
  async submitDetectionChoice(choice: UserChoice): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE_URL}/detection/choice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        detection_id: choice.detectionId,
        selected_type: choice.selectedType,
        confidence: choice.confidence,
        is_manual: choice.isManual,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to submit choice');
    }

    return response.json();
  }

  // Generate Excel export
  async generateExport(
    videoMetadata: VideoMetadata,
    detections: Detection[],
    options: { include_frame_images?: boolean; include_charts?: boolean; file_format?: string } = {}
  ): Promise<{ filename: string; download_url: string }> {
    const response = await fetch(`${API_BASE_URL}/export/excel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        include_frame_images: options.include_frame_images || false,
        include_charts: options.include_charts || true,
        file_format: options.file_format || 'xlsx',
        video_metadata: videoMetadata,
        detections: detections
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Export generation failed');
    }

    return response.json();
  }

  // Download exported file
  async downloadExport(filename: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/export/download/${filename}`);
    
    if (!response.ok) {
      throw new Error('Download failed');
    }

    return response.blob();
  }

  // Add missing getModelStatus method
  async getModelStatus(): Promise<APIResponse<ModelStatus>> {
    try {
      const response = await fetch(`${API_BASE_URL}/model/status`);
      if (!response.ok) {
        return { success: false, error: 'Failed to get model status' };
      }
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Network error getting model status' };
    }
  }

  // Add onProgressUpdate method for event handling
  onProgressUpdate(eventType: string, handler: Function): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  // Update connectWebSocket to work without parameters
  async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📨 WebSocket message:', data);
            
            // Trigger event handlers
            const handlers = this.eventHandlers.get(data.type);
            if (handlers) {
              handlers.forEach(handler => handler(data.data || data));
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
        };

        // Set a timeout in case connection takes too long
        setTimeout(() => {
          if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
            reject(new Error('WebSocket connection timeout'));
          }
        }, 5000);

      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        reject(error);
      }
    });
  }

  // Disconnect WebSocket
  disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
  }

  // Get current detections for review
  async getDetections(): Promise<Detection[]> {
    const response = await fetch(`${API_BASE_URL}/detections`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch detections');
    }

    return response.json();
  }

  // Get processing statistics
  async getStatistics(): Promise<DetectionStatistics> {
    const response = await fetch(`${API_BASE_URL}/statistics`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch statistics');
    }

    return response.json();
  }

  async resumeAnalysis(
    videoFile: File,
    excelFile: File,
    detectionMode: DetectionMode,
    modelConfidence: number
  ): Promise<any> {
    const formData = new FormData();
    formData.append('video_file', videoFile);
    formData.append('excel_file', excelFile);
    formData.append('detection_mode', detectionMode);
    formData.append('model_confidence', modelConfidence.toString());

    const response = await fetch(`${API_BASE_URL}/video/resume`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Resume analysis failed');
    }

    return response.json();
  }
}

// Create singleton instance
const apiService = new VideoAnalysisAPI();

// Helper functions for common operations
export const uploadVideoFile = async (file: File) => {
  const result = await apiService.uploadVideo(file);
  return result;
};

export const startVideoProcessing = async (
  filename: string, 
  detectionMode: DetectionMode = 'micro_mobility_only',
  frameSkip: number = 1
) => {
  const result = await apiService.processVideo(filename, detectionMode, frameSkip);
  return result;
};

export const submitUserChoice = async (
  detectionId: string,
  selectedType: VehicleType,
  confidence: number,
  isManual: boolean = false
) => {
  const choice: UserChoice = {
    detectionId,
    selectedType,
    confidence,
    isManual,
    timestamp: new Date().toISOString()
  };
  
  const result = await apiService.submitDetectionChoice(choice);
  return result;
};

export const exportAnalysisResults = async (
  videoMetadata: VideoMetadata,
  detections: Detection[],
  options: { include_frame_images?: boolean; include_charts?: boolean; file_format?: string } = {}
) => {
  const result = await apiService.generateExport(videoMetadata, detections, options);
  return result;
};

export const downloadFile = async (filename: string) => {
  const blob = await apiService.downloadExport(filename);

  // Create download link
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Export the singleton instance and default export
export { apiService };
export default apiService;
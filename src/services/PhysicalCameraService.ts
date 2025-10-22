export interface CameraConfig {
  id: string;
  name: string;
  type: 'ip' | 'rtsp' | 'usb' | 'ai-device';
  connectionUrl: string;
  username?: string;
  password?: string;
  capabilities: {
    qrScanning: boolean;
    aiDetection: boolean;
    recording: boolean;
    ptz: boolean; // Pan, Tilt, Zoom
  };
  status: 'connected' | 'disconnected' | 'error';
  lastSeen?: Date;
}

export interface CameraStream {
  cameraId: string;
  streamUrl: string;
  isLive: boolean;
  quality: 'low' | 'medium' | 'high';
}

export interface AIDetectionResult {
  cameraId: string;
  timestamp: Date;
  detections: Array<{
    type: 'material' | 'qr' | 'person' | 'vehicle';
    data: any;
    confidence: number;
    boundingBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
}

export class PhysicalCameraService {
  private cameras: Map<string, CameraConfig> = new Map();
  private streams: Map<string, CameraStream> = new Map();
  private eventCallbacks: Map<string, Function[]> = new Map();

  // Connect to a physical camera
  async connectCamera(config: Omit<CameraConfig, 'status' | 'lastSeen'>): Promise<boolean> {
    try {
      const cameraConfig: CameraConfig = {
        ...config,
        status: 'connected',
        lastSeen: new Date()
      };

      // Test connection based on camera type
      const isConnected = await this.testCameraConnection(cameraConfig);
      
      if (isConnected) {
        this.cameras.set(config.id, cameraConfig);
        this.emit('camera-connected', cameraConfig);
        
        // Start monitoring camera health
        this.startHealthMonitoring(config.id);
        
        return true;
      } else {
        cameraConfig.status = 'error';
        this.cameras.set(config.id, cameraConfig);
        return false;
      }
    } catch (error) {
      console.error('Failed to connect camera:', error);
      return false;
    }
  }

  // Test camera connection
  private async testCameraConnection(config: CameraConfig): Promise<boolean> {
    switch (config.type) {
      case 'ip':
        return this.testIPCamera(config);
      case 'rtsp':
        return this.testRTSPStream(config);
      case 'usb':
        return this.testUSBCamera(config);
      case 'ai-device':
        return this.testAIDevice(config);
      default:
        return false;
    }
  }

  private async testIPCamera(config: CameraConfig): Promise<boolean> {
    try {
      // Test HTTP endpoint
      const response = await fetch(config.connectionUrl, {
        method: 'GET',
        headers: this.getAuthHeaders(config),
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async testRTSPStream(config: CameraConfig): Promise<boolean> {
    // For RTSP, we'll use a simple validation
    // In production, you'd use an RTSP client library
    return config.connectionUrl.startsWith('rtsp://');
  }

  private async testUSBCamera(config: CameraConfig): Promise<boolean> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(device => 
        device.kind === 'videoinput' && 
        device.deviceId === config.connectionUrl
      );
    } catch {
      return false;
    }
  }

  private async testAIDevice(config: CameraConfig): Promise<boolean> {
    try {
      // Test AI device API endpoint
      const response = await fetch(`${config.connectionUrl}/api/status`, {
        headers: this.getAuthHeaders(config),
        signal: AbortSignal.timeout(3000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Get camera stream URL
  async getStreamUrl(cameraId: string, quality: 'low' | 'medium' | 'high' = 'medium'): Promise<string | null> {
    const camera = this.cameras.get(cameraId);
    if (!camera || camera.status !== 'connected') return null;

    switch (camera.type) {
      case 'ip':
        return `${camera.connectionUrl}/video?quality=${quality}`;
      case 'rtsp':
        // Convert RTSP to HLS or WebRTC for web playback
        return this.convertRTSPToWeb(camera.connectionUrl);
      case 'usb':
        return `usb://${camera.connectionUrl}`;
      case 'ai-device':
        return `${camera.connectionUrl}/stream?quality=${quality}`;
      default:
        return null;
    }
  }

  // Convert RTSP to web-compatible format
  private convertRTSPToWeb(rtspUrl: string): string {
    // This would typically involve a media server like FFmpeg
    // For now, return a placeholder that would be handled by your backend
    return `/api/stream/rtsp?url=${encodeURIComponent(rtspUrl)}`;
  }

  // Control camera (PTZ, etc.)
  async controlCamera(cameraId: string, command: string, params?: any): Promise<boolean> {
    const camera = this.cameras.get(cameraId);
    if (!camera || !camera.capabilities.ptz) return false;

    try {
      const response = await fetch(`${camera.connectionUrl}/api/control`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(camera),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ command, params })
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Request AI analysis from camera
  async requestAIAnalysis(cameraId: string, analysisType: 'qr' | 'material' | 'all'): Promise<AIDetectionResult | null> {
    const camera = this.cameras.get(cameraId);
    if (!camera || !camera.capabilities.aiDetection) return null;

    try {
      const response = await fetch(`${camera.connectionUrl}/api/analyze`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(camera),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type: analysisType })
      });

      if (response.ok) {
        const data = await response.json();
        return {
          cameraId,
          timestamp: new Date(),
          detections: data.detections || []
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  // Get all connected cameras
  getCameras(): CameraConfig[] {
    return Array.from(this.cameras.values());
  }

  // Get camera by ID
  getCamera(cameraId: string): CameraConfig | undefined {
    return this.cameras.get(cameraId);
  }

  // Disconnect camera
  async disconnectCamera(cameraId: string): Promise<void> {
    const camera = this.cameras.get(cameraId);
    if (camera) {
      camera.status = 'disconnected';
      this.cameras.set(cameraId, camera);
      this.streams.delete(cameraId);
      this.emit('camera-disconnected', camera);
    }
  }

  // Event system
  on(event: string, callback: Function): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)!.push(callback);
  }

  private emit(event: string, data: any): void {
    const callbacks = this.eventCallbacks.get(event) || [];
    callbacks.forEach(callback => callback(data));
  }

  // Health monitoring
  private startHealthMonitoring(cameraId: string): void {
    const checkHealth = async () => {
      const camera = this.cameras.get(cameraId);
      if (!camera) return;

      const isHealthy = await this.testCameraConnection(camera);
      const updatedCamera = {
        ...camera,
        status: isHealthy ? 'connected' : 'error',
        lastSeen: isHealthy ? new Date() : camera.lastSeen
      } as CameraConfig;

      this.cameras.set(cameraId, updatedCamera);
      
      if (!isHealthy) {
        this.emit('camera-error', updatedCamera);
      }
    };

    // Check every 30 seconds
    setInterval(checkHealth, 30000);
  }

  private getAuthHeaders(camera: CameraConfig): Record<string, string> {
    const headers: Record<string, string> = {};
    
    if (camera.username && camera.password) {
      const auth = btoa(`${camera.username}:${camera.password}`);
      headers['Authorization'] = `Basic ${auth}`;
    }
    
    return headers;
  }
}

// Singleton instance
export const physicalCameraService = new PhysicalCameraService();
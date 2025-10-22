import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Camera, Play, Square, RotateCcw, ZoomIn, ZoomOut, Move, Scan } from 'lucide-react';
import { physicalCameraService, CameraConfig } from '@/services/PhysicalCameraService';

interface PhysicalCameraViewerProps {
  onQRCodeScanned: (data: string) => void;
  onMaterialDetected: (material: { type: string; confidence: number }) => void;
}

const PhysicalCameraViewer: React.FC<PhysicalCameraViewerProps> = ({
  onQRCodeScanned,
  onMaterialDetected
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameras, setCameras] = useState<CameraConfig[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [streamQuality, setStreamQuality] = useState<'low' | 'medium' | 'high'>('medium');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    // Load connected cameras
    const connectedCameras = physicalCameraService.getCameras().filter(
      camera => camera.status === 'connected'
    );
    setCameras(connectedCameras);

    // Auto-select first camera if available
    if (connectedCameras.length > 0 && !selectedCamera) {
      setSelectedCamera(connectedCameras[0].id);
    }
  }, [selectedCamera]);

  useEffect(() => {
    if (selectedCamera && isStreaming) {
      startStream();
    }
  }, [selectedCamera, streamQuality]);

  const startStream = async () => {
    if (!selectedCamera) {
      toast.error('Please select a camera first');
      return;
    }

    try {
      const url = await physicalCameraService.getStreamUrl(selectedCamera, streamQuality);
      if (url && videoRef.current) {
        setStreamUrl(url);
        
        // Handle different stream types
        if (url.startsWith('usb://')) {
          // USB camera - use getUserMedia
          const deviceId = url.replace('usb://', '');
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: deviceId === 'default' ? undefined : deviceId }
          });
          videoRef.current.srcObject = stream;
        } else {
          // IP/RTSP camera - use video src
          videoRef.current.src = url;
        }
        
        setIsStreaming(true);
        toast.success('Camera stream started');
        
        // Start periodic AI analysis
        startAIAnalysis();
      } else {
        toast.error('Failed to get stream URL');
      }
    } catch (error) {
      toast.error('Failed to start camera stream');
      console.error('Stream error:', error);
    }
  };

  const stopStream = () => {
    if (videoRef.current) {
      if (videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      } else {
        videoRef.current.src = '';
      }
    }
    setIsStreaming(false);
    setStreamUrl('');
    toast.info('Camera stream stopped');
  };

  const startAIAnalysis = () => {
    if (!selectedCamera) return;

    const analyzeInterval = setInterval(async () => {
      if (!isStreaming) {
        clearInterval(analyzeInterval);
        return;
      }

      setIsAnalyzing(true);
      const result = await physicalCameraService.requestAIAnalysis(selectedCamera, 'all');
      
      if (result && result.detections.length > 0) {
        result.detections.forEach(detection => {
          if (detection.type === 'qr' && detection.data) {
            onQRCodeScanned(detection.data);
            toast.success(`QR Code detected: ${detection.data}`);
          } else if (detection.type === 'material' && detection.data) {
            onMaterialDetected({
              type: detection.data.materialType || 'Unknown Material',
              confidence: detection.confidence
            });
          }
        });
      }
      
      setIsAnalyzing(false);
    }, 3000); // Analyze every 3 seconds

    return () => clearInterval(analyzeInterval);
  };

  const controlCamera = async (command: string, params?: any) => {
    if (!selectedCamera) return;
    
    const success = await physicalCameraService.controlCamera(selectedCamera, command, params);
    if (success) {
      toast.success(`Camera ${command} executed`);
    } else {
      toast.error(`Failed to execute ${command}`);
    }
  };

  const selectedCameraData = cameras.find(c => c.id === selectedCamera);

  return (
    <div className="space-y-6">
      {/* Camera Selection and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Physical Camera Control
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Camera Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Select Camera</label>
                <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a camera" />
                  </SelectTrigger>
                  <SelectContent>
                    {cameras.map(camera => (
                      <SelectItem key={camera.id} value={camera.id}>
                        {camera.name} ({camera.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Stream Quality</label>
                <Select value={streamQuality} onValueChange={(value: any) => setStreamQuality(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low (480p)</SelectItem>
                    <SelectItem value="medium">Medium (720p)</SelectItem>
                    <SelectItem value="high">High (1080p)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                {!isStreaming ? (
                  <Button 
                    onClick={startStream} 
                    disabled={!selectedCamera}
                    className="w-full flex items-center gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Start Stream
                  </Button>
                ) : (
                  <Button 
                    onClick={stopStream}
                    variant="outline"
                    className="w-full flex items-center gap-2"
                  >
                    <Square className="h-4 w-4" />
                    Stop Stream
                  </Button>
                )}
              </div>
            </div>

            {/* Camera Information */}
            {selectedCameraData && (
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{selectedCameraData.type.toUpperCase()}</Badge>
                {selectedCameraData.capabilities.qrScanning && (
                  <Badge variant="secondary">QR Scanning</Badge>
                )}
                {selectedCameraData.capabilities.aiDetection && (
                  <Badge variant="secondary">AI Detection</Badge>
                )}
                {selectedCameraData.capabilities.ptz && (
                  <Badge variant="secondary">PTZ Control</Badge>
                )}
                {isAnalyzing && (
                  <Badge className="animate-pulse">
                    <Scan className="h-3 w-3 mr-1" />
                    Analyzing
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Video Stream */}
      <Card>
        <CardHeader>
          <CardTitle>Live Camera Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-96 object-cover"
              onError={() => toast.error('Video stream error')}
            />
            
            {/* Stream Status Overlay */}
            <div className="absolute top-4 left-4 flex gap-2">
              {isStreaming && (
                <Badge className="bg-red-500 text-white animate-pulse">
                  LIVE
                </Badge>
              )}
              {streamQuality && (
                <Badge variant="outline" className="bg-black/50 text-white">
                  {streamQuality.toUpperCase()}
                </Badge>
              )}
            </div>

            {/* No stream placeholder */}
            {!isStreaming && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No camera stream</p>
                  <p className="text-sm opacity-75">Select a camera and start streaming</p>
                </div>
              </div>
            )}
          </div>

          {/* Camera Controls */}
          {isStreaming && selectedCameraData?.capabilities.ptz && (
            <div className="mt-4 space-y-4">
              <h4 className="font-medium">Camera Controls</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => controlCamera('pan', { direction: 'left' })}
                >
                  ← Pan Left
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => controlCamera('pan', { direction: 'right' })}
                >
                  Pan Right →
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => controlCamera('tilt', { direction: 'up' })}
                >
                  ↑ Tilt Up
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => controlCamera('tilt', { direction: 'down' })}
                >
                  ↓ Tilt Down
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => controlCamera('zoom', { direction: 'in' })}
                >
                  <ZoomIn className="h-4 w-4" />
                  Zoom In
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => controlCamera('zoom', { direction: 'out' })}
                >
                  <ZoomOut className="h-4 w-4" />
                  Zoom Out
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => controlCamera('preset', { position: 'home' })}
                >
                  <RotateCcw className="h-4 w-4" />
                  Home
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => controlCamera('preset', { position: 'save' })}
                >
                  <Move className="h-4 w-4" />
                  Save Preset
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* No Cameras Message */}
      {cameras.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Physical Cameras Connected</h3>
            <p className="text-muted-foreground">
              Connect physical cameras in the Camera Setup tab to view live streams
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PhysicalCameraViewer;
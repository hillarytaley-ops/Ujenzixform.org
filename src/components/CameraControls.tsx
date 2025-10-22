import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Camera, Video, Square, Play, Pause, Scan, ZoomIn, ZoomOut } from 'lucide-react';

interface CameraControlsProps {
  onQRCodeScanned: (data: string) => void;
  onMaterialDetected: (material: { type: string; confidence: number }) => void;
}

interface CameraState {
  isStreaming: boolean;
  isRecording: boolean;
  isScanning: boolean;
  zoom: number;
  stream: MediaStream | null;
}

const CameraControls: React.FC<CameraControlsProps> = ({ 
  onQRCodeScanned, 
  onMaterialDetected 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraState, setCameraState] = useState<CameraState>({
    isStreaming: false,
    isRecording: false,
    isScanning: false,
    zoom: 1,
    stream: null
  });
  const [detectedMaterials, setDetectedMaterials] = useState<Array<{
    type: string;
    confidence: number;
    timestamp: Date;
  }>>([]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'environment' // Use back camera on mobile
        },
        audio: true
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraState(prev => ({ ...prev, isStreaming: true, stream }));
        toast.success('Camera started successfully');
      }
    } catch (error) {
      toast.error('Failed to access camera');
      console.error('Camera error:', error);
    }
  };

  const stopCamera = () => {
    if (cameraState.stream) {
      cameraState.stream.getTracks().forEach(track => track.stop());
      setCameraState(prev => ({ 
        ...prev, 
        isStreaming: false, 
        isRecording: false, 
        isScanning: false,
        stream: null 
      }));
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      toast.info('Camera stopped');
    }
  };

  const startRecording = async () => {
    if (!cameraState.stream) return;

    try {
      const mediaRecorder = new MediaRecorder(cameraState.stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `construction-recording-${Date.now()}.webm`;
        a.click();
        toast.success('Recording saved');
      };

      mediaRecorder.start();
      setCameraState(prev => ({ ...prev, isRecording: true }));
      toast.info('Recording started');
    } catch (error) {
      toast.error('Failed to start recording');
      console.error('Recording error:', error);
    }
  };

  const stopRecording = () => {
    setCameraState(prev => ({ ...prev, isRecording: false }));
    toast.info('Recording stopped');
  };

  const toggleQRScanning = () => {
    setCameraState(prev => ({ ...prev, isScanning: !prev.isScanning }));
    if (!cameraState.isScanning) {
      toast.info('QR code scanning enabled');
    } else {
      toast.info('QR code scanning disabled');
    }
  };

  const adjustZoom = (direction: 'in' | 'out') => {
    setCameraState(prev => {
      const newZoom = direction === 'in' 
        ? Math.min(prev.zoom + 0.1, 3) 
        : Math.max(prev.zoom - 0.1, 1);
      
      if (videoRef.current) {
        videoRef.current.style.transform = `scale(${newZoom})`;
      }
      
      return { ...prev, zoom: newZoom };
    });
  };

  // AI Material Detection simulation
  const detectMaterials = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);

    // Simulate AI detection (in real implementation, this would call an AI service)
    const materials = ['Cement Bags', 'Steel Rods', 'Bricks', 'Concrete Blocks'];
    const detectedMaterial = materials[Math.floor(Math.random() * materials.length)];
    const confidence = Math.random() * 0.4 + 0.6; // 60-100% confidence

    const newDetection = {
      type: detectedMaterial,
      confidence,
      timestamp: new Date()
    };

    setDetectedMaterials(prev => [newDetection, ...prev.slice(0, 4)]);
    onMaterialDetected(newDetection);
  };

  // QR Code detection simulation
  const scanForQR = () => {
    if (!cameraState.isScanning) return;

    // Simulate QR code detection (in real implementation, use @zxing/browser)
    const qrCodes = [
      'MATERIAL-CEMENT-001-2024',
      'STEEL-ROD-12MM-BATCH-455',
      'BRICK-RED-CLASS-A-LOT-789'
    ];

    if (Math.random() > 0.95) { // 5% chance of detection per scan
      const qrData = qrCodes[Math.floor(Math.random() * qrCodes.length)];
      onQRCodeScanned(qrData);
      toast.success(`QR Code detected: ${qrData}`);
    }
  };

  useEffect(() => {
    if (!cameraState.isStreaming) return;

    const interval = setInterval(() => {
      detectMaterials();
      scanForQR();
    }, 2000);

    return () => clearInterval(interval);
  }, [cameraState.isStreaming, cameraState.isScanning]);

  return (
    <div className="space-y-6">
      {/* Camera Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            AI Construction Camera
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative bg-muted rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-64 object-cover transition-transform duration-300"
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Status Indicators */}
            <div className="absolute top-4 left-4 flex gap-2">
              {cameraState.isStreaming && (
                <Badge variant="secondary" className="bg-primary text-primary-foreground">
                  LIVE
                </Badge>
              )}
              {cameraState.isRecording && (
                <Badge variant="destructive" className="animate-pulse">
                  REC
                </Badge>
              )}
              {cameraState.isScanning && (
                <Badge className="bg-accent text-accent-foreground">
                  QR SCAN
                </Badge>
              )}
            </div>

            {/* Zoom Level */}
            <div className="absolute top-4 right-4">
              <Badge variant="outline">
                {Math.round(cameraState.zoom * 100)}%
              </Badge>
            </div>
          </div>

          {/* Camera Controls */}
          <div className="flex flex-wrap gap-2 mt-4">
            {!cameraState.isStreaming ? (
              <Button onClick={startCamera} className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Start Camera
              </Button>
            ) : (
              <Button onClick={stopCamera} variant="outline" className="flex items-center gap-2">
                <Square className="h-4 w-4" />
                Stop Camera
              </Button>
            )}

            {cameraState.isStreaming && (
              <>
                {!cameraState.isRecording ? (
                  <Button onClick={startRecording} variant="destructive" className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Record
                  </Button>
                ) : (
                  <Button onClick={stopRecording} variant="outline" className="flex items-center gap-2">
                    <Pause className="h-4 w-4" />
                    Stop Recording
                  </Button>
                )}

                <Button
                  onClick={toggleQRScanning}
                  variant={cameraState.isScanning ? "default" : "outline"}
                  className="flex items-center gap-2"
                >
                  <Scan className="h-4 w-4" />
                  QR Scan
                </Button>

                <Button
                  onClick={() => adjustZoom('in')}
                  variant="outline"
                  size="sm"
                  disabled={cameraState.zoom >= 3}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>

                <Button
                  onClick={() => adjustZoom('out')}
                  variant="outline"
                  size="sm"
                  disabled={cameraState.zoom <= 1}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Material Detection Results */}
      {detectedMaterials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detected Materials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {detectedMaterials.map((material, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                  <span className="font-medium">{material.type}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {Math.round(material.confidence * 100)}% confidence
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {material.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CameraControls;
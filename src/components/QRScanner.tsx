import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Scan, Camera, CheckCircle, Package, Clock } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType } from '@zxing/library';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface QRScannerProps {
  onMaterialScanned: (material: ScannedMaterial) => void;
  mode?: 'dispatch' | 'receiving';
  onRawScan?: (qrText: string, scannerType: 'web_scanner' | 'physical_scanner') => void;
}

interface ScannedMaterial {
  qrCode: string;
  materialType: string;
  batchNumber: string;
  supplierInfo: string;
  timestamp: Date;
  verified: boolean;
}

const QRScanner: React.FC<QRScannerProps> = ({ onMaterialScanned }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [reader, setReader] = useState<BrowserMultiFormatReader | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [usePhysicalScanner, setUsePhysicalScanner] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [scannedMaterials, setScannedMaterials] = useState<ScannedMaterial[]>([]);
  const [lastScan, setLastScan] = useState<string>('');

  const loadCameras = async () => {
    try {
      const permission = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter(d => d.kind === 'videoinput');
      setVideoDevices(inputs);
      const preferred = inputs.find(d => /back|rear|environment/i.test(d.label)) || inputs[inputs.length - 1] || inputs[0];
      setSelectedDeviceId(preferred?.deviceId || '');
      permission.getTracks().forEach(t => t.stop());
    } catch {}
  };

  const startScanning = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Camera not supported on this device');
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.setAttribute('playsinline', 'true');
        setStream(mediaStream);
      }

      const hints = new Map();
      hints.set(DecodeHintType.TRY_HARDER, true);
      const r = new BrowserMultiFormatReader(hints);
      setReader(r);

      setIsScanning(true);
      toast.success('QR Scanner started');

      if (videoRef.current) {
        if (selectedDeviceId) {
          await r.decodeFromVideoDevice(selectedDeviceId, videoRef.current, (result) => {
            const text = result?.getText();
            if (text && text !== lastScan) {
              const material = parseQRCode(text);
              setScannedMaterials(prev => [material, ...prev.slice(0, 9)]);
              onMaterialScanned(material);
              onRawScan?.(text, 'web_scanner');
              setLastScan(text);
              setTimeout(() => setLastScan(''), 3000);
            }
          });
        } else {
          await r.decodeFromConstraints(
            { video: { facingMode: { ideal: 'environment' } } },
            videoRef.current,
            (result, err) => {
              if (result) {
                const text = result.getText();
                if (text && text !== lastScan) {
                  const material = parseQRCode(text);
                  setScannedMaterials(prev => [material, ...prev.slice(0, 9)]);
                  onMaterialScanned(material);
                  onRawScan?.(text, 'web_scanner');
                  setLastScan(text);
                  setTimeout(() => setLastScan(''), 3000);
                }
              }
            }
          );
        }
      }
    } catch (error) {
      toast.error('Failed to access camera for scanning');
      console.error('Camera access error:', error);
    }
  };

  const stopScanning = () => {
    if (reader) {
      try { reader.reset(); } catch {}
      setReader(null);
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    toast.info('QR Scanner stopped');
  };

  const parseQRCode = (qrData: string): ScannedMaterial => {
    try {
      // Enhanced input validation and sanitization
      if (!qrData || typeof qrData !== 'string') {
        throw new Error('Invalid QR code data');
      }

      // Sanitize input - remove potentially dangerous characters
      const sanitizedData = qrData.trim().replace(/[<>\"'&]/g, '');
      
      // Validate QR code format
      if (sanitizedData.length < 10 || sanitizedData.length > 100) {
        throw new Error('QR code length invalid');
      }

      // Parse different QR code formats with validation
      const parts = sanitizedData.split('-');
      
      if (parts.length < 3) {
        throw new Error('Invalid QR code format');
      }

      // Validate each part
      const supplierInfo = parts[0]?.replace(/[^a-zA-Z0-9\s]/g, '') || 'Unknown Supplier';
      const materialType = parts[1]?.replace(/[^a-zA-Z0-9\s]/g, '') || 'Unknown Material';
      const batchNumber = parts[2]?.replace(/[^a-zA-Z0-9]/g, '') || 'N/A';

      return {
        qrCode: sanitizedData,
        materialType,
        batchNumber,
        supplierInfo,
        timestamp: new Date(),
        verified: false // Will be verified server-side
      };
    } catch (error) {
      console.error('QR code parsing error:', error);
      // Return safe default values
      return {
        qrCode: 'INVALID',
        materialType: 'Invalid QR Code',
        batchNumber: 'N/A',
        supplierInfo: 'Unknown',
        timestamp: new Date(),
        verified: false
      };
    }
  };

  useEffect(() => {
    return () => {
      if (reader) {
        try { reader.reset(); } catch {}
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [reader, stream]);

  useEffect(() => {
    if (!isScanning && reader) {
      try { reader.reset(); } catch {}
      setReader(null);
    }
  }, [isScanning, reader]);

  const getMaterialIcon = (materialType: string) => {
    const type = materialType.toLowerCase();
    if (type.includes('cement') || type.includes('concrete')) {
      return <Package className="h-4 w-4 text-gray-600" />;
    } else if (type.includes('steel') || type.includes('iron')) {
      return <Package className="h-4 w-4 text-blue-600" />;
    } else if (type.includes('brick')) {
      return <Package className="h-4 w-4 text-red-600" />;
    }
    return <Package className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      {/* QR Scanner */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            QR Code Material Scanner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button variant={!usePhysicalScanner ? 'default' : 'outline'} onClick={() => setUsePhysicalScanner(false)}>Camera</Button>
            <Button variant={usePhysicalScanner ? 'default' : 'outline'} onClick={() => setUsePhysicalScanner(true)}>Physical Scanner</Button>
          </div>
          {!usePhysicalScanner && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="camera-source">Camera Source</Label>
                <Select value={selectedDeviceId ?? ''} onValueChange={setSelectedDeviceId}>
                  <SelectTrigger id="camera-source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {videoDevices.length === 0 ? (
                      <SelectItem value="">Default</SelectItem>
                    ) : (
                      videoDevices.map((d, i) => (
                        <SelectItem key={d.deviceId || i} value={d.deviceId || ''}>
                          {d.label || `Camera ${i + 1}`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={loadCameras} className="w-full">Refresh Cameras</Button>
              </div>
            </div>
          )}
          <div className="relative bg-black rounded-lg overflow-hidden mb-4">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-64 object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Scanner Overlay */}
            {isScanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="border-2 border-white rounded-lg w-48 h-48 relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
                  
                  {/* Scanning line animation */}
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full h-0.5 bg-primary animate-pulse"></div>
                  </div>
                </div>
              </div>
            )}

            {/* Status Badge */}
            {isScanning && (
              <div className="absolute top-4 left-4">
                <Badge className="bg-primary text-primary-foreground animate-pulse">
                  SCANNING
                </Badge>
              </div>
            )}
          </div>

          {/* Scanner Controls */}
          {!usePhysicalScanner ? (
            <div className="flex gap-2">
              {!isScanning ? (
                <Button onClick={startScanning} className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Start QR Scanner
                </Button>
              ) : (
                <Button onClick={stopScanning} variant="outline" className="flex items-center gap-2">
                  <Scan className="h-4 w-4" />
                  Stop Scanner
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="physical-input">Scan with physical scanner</Label>
              <input
                id="physical-input"
                className="w-full border rounded-md p-2"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && manualInput.trim()) {
                    const material = parseQRCode(manualInput);
                    setScannedMaterials(prev => [material, ...prev.slice(0, 9)]);
                    onMaterialScanned(material);
                    onRawScan?.(manualInput.trim(), 'physical_scanner');
                    toast.success(`Material scanned: ${material.materialType}`, { description: `Batch: ${material.batchNumber}` });
                    setManualInput('');
                  }
                }}
                placeholder="Focus here and scan"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    if (!manualInput.trim()) return;
                    const material = parseQRCode(manualInput);
                    setScannedMaterials(prev => [material, ...prev.slice(0, 9)]);
                    onMaterialScanned(material);
                    onRawScan?.(manualInput.trim(), 'physical_scanner');
                    toast.success(`Material scanned: ${material.materialType}`, { description: `Batch: ${material.batchNumber}` });
                    setManualInput('');
                  }}
                >
                  Process Scan
                </Button>
                <Button variant="outline" onClick={() => setManualInput('')}>Clear</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scanned Materials */}
      {scannedMaterials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Scanned Materials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scannedMaterials.map((material, index) => (
                <div key={index} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                  <div className="flex-shrink-0">
                    {getMaterialIcon(material.materialType)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{material.materialType}</p>
                        <p className="text-sm text-muted-foreground">
                          {material.supplierInfo} • Batch: {material.batchNumber}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          QR: {material.qrCode}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-1">
                          {material.verified ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-yellow-500" />
                          )}
                          <Badge variant={material.verified ? "default" : "secondary"}>
                            {material.verified ? "Verified" : "Pending"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {material.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Scanning Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            • Position the QR code within the scanning frame
          </p>
          <p className="text-sm text-muted-foreground">
            • Ensure good lighting and steady hands
          </p>
          <p className="text-sm text-muted-foreground">
            • QR codes will be automatically detected and processed
          </p>
          <p className="text-sm text-muted-foreground">
            • Scanned materials are automatically verified against our database
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default QRScanner;
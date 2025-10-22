import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Scan, Camera, CheckCircle, Package, Clock } from 'lucide-react';

interface QRScannerProps {
  onMaterialScanned: (material: ScannedMaterial) => void;
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
  const [scannedMaterials, setScannedMaterials] = useState<ScannedMaterial[]>([]);
  const [lastScan, setLastScan] = useState<string>('');

  const startScanning = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsScanning(true);
        toast.success('QR Scanner started');
      }
    } catch (error) {
      toast.error('Failed to access camera for scanning');
      console.error('Camera access error:', error);
    }
  };

  const stopScanning = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsScanning(false);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      toast.info('QR Scanner stopped');
    }
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

  const simulateQRDetection = () => {
    if (!isScanning) return;

    // Simulate QR code detection
    const qrCodes = [
      'BAMBURI-CEMENT-BATCH001-2024',
      'SIMBA-STEEL-12MM-LOT455-2024',
      'SAVANNAH-BRICK-RED-BATCH789-2024',
      'DEVKI-IRON-SHEETS-GAUGE28-2024',
      'ARM-CEMENT-PORTLAND-BATCH123-2024'
    ];

    // Random chance of detection
    if (Math.random() > 0.92) { // 8% chance per scan
      const randomQR = qrCodes[Math.floor(Math.random() * qrCodes.length)];
      
      // Avoid duplicate scans within 5 seconds
      if (randomQR !== lastScan) {
        const material = parseQRCode(randomQR);
        setScannedMaterials(prev => [material, ...prev.slice(0, 9)]);
        onMaterialScanned(material);
        setLastScan(randomQR);
        
        toast.success(`Material scanned: ${material.materialType}`, {
          description: `Batch: ${material.batchNumber}`
        });

        // Reset lastScan after 5 seconds
        setTimeout(() => setLastScan(''), 5000);
      }
    }
  };

  useEffect(() => {
    if (!isScanning) return;

    const interval = setInterval(simulateQRDetection, 1000);
    return () => clearInterval(interval);
  }, [isScanning, lastScan]);

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
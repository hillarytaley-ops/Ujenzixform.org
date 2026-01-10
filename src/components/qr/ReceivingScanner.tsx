import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PackageCheck, Scan, CheckCircle, Camera, Truck, MapPin, Lock, ArrowRight, RotateCcw, Smartphone, Flashlight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { BrowserMultiFormatReader, BrowserCodeReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat } from '@zxing/library';


interface ScanResult {
  qr_code: string;
  material_type: string;
  category: string;
  quantity: number;
  unit: string;
  status: string;
  timestamp: Date;
}

export const ReceivingScanner: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [manualQRCode, setManualQRCode] = useState('');
  const [materialCondition, setMaterialCondition] = useState('good');
  const [notes, setNotes] = useState('');
  const [codeReader, setCodeReader] = useState<BrowserMultiFormatReader | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [hasFlash, setHasFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<string>('');
  const CAMERA_CONSENT_KEY = 'scanner_camera_consent';

  // Detect device type
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);

  useEffect(() => {
    checkAuth();
    initializeScanner();
    detectDeviceInfo();
    
    return () => {
      cleanupCamera();
    };
  }, []);

  const detectDeviceInfo = () => {
    if (isIOS) {
      setDeviceInfo('iOS Device');
    } else if (isAndroid) {
      setDeviceInfo('Android Device');
    } else {
      setDeviceInfo('Desktop/Laptop');
    }
  };

  const initializeScanner = async () => {
    try {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      
      const reader = new BrowserMultiFormatReader(hints);
      setCodeReader(reader);

      await listAvailableCameras();
    } catch (error) {
      console.error('Scanner initialization error:', error);
    }
  };

  const listAvailableCameras = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      
      const devices = await BrowserCodeReader.listVideoInputDevices();
      setAvailableCameras(devices);
      
      const backCamera = devices.find(d => 
        d.label.toLowerCase().includes('back') || 
        d.label.toLowerCase().includes('rear') ||
        d.label.toLowerCase().includes('environment')
      );
      
      if (backCamera) {
        setSelectedCameraId(backCamera.deviceId);
      } else if (devices.length > 0) {
        setSelectedCameraId(isMobile && devices.length > 1 ? devices[devices.length - 1].deviceId : devices[0].deviceId);
      }
    } catch (error) {
      console.error('Error listing cameras:', error);
      setCameraError('Unable to access camera list. Please grant camera permissions.');
    }
  };

  const checkAuth = async () => {
    try {
      const localRole = localStorage.getItem('user_role');
      if (localRole) {
        setUserRole(localRole);
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      setUserRole(roleData?.role || localRole || null);
    } catch (err) {
      console.error('Auth check failed (non-fatal):', err);
      const localRole = localStorage.getItem('user_role');
      setUserRole(localRole || null);
    }
  };

  const cleanupCamera = useCallback(() => {
    try {
      codeReader?.reset();
    } catch {}
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [codeReader]);

  const startCameraScanning = async () => {
    if (!codeReader) {
      toast.error('Scanner not initialized. Please refresh the page.');
      return;
    }

    setCameraError(null);

    try {
      if (!window.isSecureContext && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
        setCameraError('Camera requires HTTPS connection.');
        toast.error('Camera requires HTTPS or localhost');
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Your browser does not support camera access.');
        toast.error('Camera not supported on this browser');
        return;
      }

      cleanupCamera();

      if (!videoRef.current) return;

      videoRef.current.setAttribute('playsinline', 'true');
      videoRef.current.setAttribute('webkit-playsinline', 'true');
      videoRef.current.setAttribute('muted', 'true');
      videoRef.current.muted = true;

      setIsScanning(true);

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: selectedCameraId ? {
          deviceId: { exact: selectedCameraId },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
          aspectRatio: { ideal: 16/9 },
          frameRate: { ideal: 30, min: 15 }
        } : {
          facingMode: { ideal: facing },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
          aspectRatio: { ideal: 16/9 },
          frameRate: { ideal: 30, min: 15 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities?.() as any;
        if (capabilities?.torch) {
          setHasFlash(true);
        }
      }

      await new Promise<void>((resolve) => {
        if (videoRef.current) {
          videoRef.current.onloadedmetadata = () => resolve();
        }
      });

      await videoRef.current.play();
      
      codeReader.decodeFromVideoElement(videoRef.current, (result) => {
        if (result) {
          if (navigator.vibrate) navigator.vibrate(200);
          processQRScan(result.getText(), 'mobile_camera');
        }
      });

      localStorage.setItem(CAMERA_CONSENT_KEY, 'true');
      toast.success('📷 Camera ready! Point at QR code to scan.');

    } catch (error: any) {
      console.error('Camera error:', error);
      setIsScanning(false);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setCameraError('Camera permission denied. Please allow camera access.');
        toast.error('Camera permission denied');
      } else if (error.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
        toast.error('No camera found');
      } else if (error.name === 'NotReadableError') {
        setCameraError('Camera is in use by another application.');
        toast.error('Camera is busy');
      } else if (error.name === 'OverconstrainedError') {
        try {
          const simpleStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false });
          streamRef.current = simpleStream;
          if (videoRef.current) {
            videoRef.current.srcObject = simpleStream;
            await videoRef.current.play();
            codeReader.decodeFromVideoElement(videoRef.current, (result) => {
              if (result) {
                if (navigator.vibrate) navigator.vibrate(200);
                processQRScan(result.getText(), 'mobile_camera');
              }
            });
            setIsScanning(true);
            toast.success('Camera started with basic settings');
          }
        } catch {
          setCameraError('Could not start camera.');
          toast.error('Camera settings not supported');
        }
      } else {
        setCameraError(`Camera error: ${error.message || 'Unknown error'}`);
        toast.error('Failed to access camera');
      }
    }
  };

  const stopScanning = () => {
    cleanupCamera();
    setIsScanning(false);
    setFlashOn(false);
    toast.info('Scanner stopped');
  };

  const toggleCamera = async () => {
    if (availableCameras.length <= 1) {
      const next = facing === 'environment' ? 'user' : 'environment';
      setFacing(next);
    } else {
      const currentIndex = availableCameras.findIndex(c => c.deviceId === selectedCameraId);
      const nextIndex = (currentIndex + 1) % availableCameras.length;
      setSelectedCameraId(availableCameras[nextIndex].deviceId);
    }
    
    if (isScanning) {
      stopScanning();
      setTimeout(() => startCameraScanning(), 300);
    }
  };

  const toggleFlash = async () => {
    if (!streamRef.current) return;
    
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      try {
        await videoTrack.applyConstraints({
          advanced: [{ torch: !flashOn } as any]
        });
        setFlashOn(!flashOn);
        toast.success(flashOn ? 'Flash off' : 'Flash on');
      } catch (error) {
        toast.error('Could not toggle flash');
      }
    }
  };

  const processQRScan = async (qrCode: string, scannerType: 'mobile_camera' | 'physical_scanner' | 'web_scanner') => {
    try {
      // Call the record_qr_scan function for receiving
      const { data, error } = await supabase.rpc('record_qr_scan', {
        _qr_code: qrCode,
        _scan_type: 'receiving',
        _scanner_device_id: navigator.userAgent,
        _scanner_type: scannerType,
        _material_condition: materialCondition,
        _notes: notes || null
      });

      if (error) {
        console.error('Receiving scan error:', error);
        toast.error('Failed to record receiving scan');
        return;
      }

      const scanData = data as any;

      if (scanData.success) {
        const scanResult: ScanResult = {
          qr_code: scanData.qr_code,
          material_type: scanData.material_type,
          category: scanData.category,
          quantity: scanData.quantity,
          unit: scanData.unit,
          status: scanData.new_status,
          timestamp: new Date()
        };

        setScanResults(prev => [scanResult, ...prev.slice(0, 9)]);
        
        toast.success('Item Received', {
          description: `${scanData.material_type} - ${scanData.quantity} ${scanData.unit}`
        });

        // Reset form
        setManualQRCode('');
        setNotes('');
      } else {
        toast.error('Scan Failed', {
          description: scanData.error || 'Invalid QR code'
        });
      }
    } catch (error) {
      console.error('Scan processing error:', error);
      toast.error('Failed to process scan');
    }
  };

  const handleManualScan = () => {
    if (!manualQRCode.trim()) {
      toast.error('Please enter a QR code');
      return;
    }
    processQRScan(manualQRCode, 'physical_scanner');
  };

  // Only delivery providers and admins can access the receiving scanner
  // Builders are completely blocked - no camera access at all
  const isBuilder = userRole === 'builder';
  const allowAccess = ['admin', 'delivery_provider', 'delivery'].includes(userRole || '');
  const canScan = allowAccess;

  // BLOCK builders from accessing any camera functionality
  if (isBuilder) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="py-8 text-center">
            <div className="bg-red-100 dark:bg-red-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
              Access Restricted
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mb-4 max-w-sm mx-auto">
              As a <strong>Builder</strong>, you cannot access the receiving scanner. 
              Only registered <strong>Delivery Providers</strong> can confirm deliveries.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <a 
                href="/tracking" 
                className="inline-flex items-center justify-center px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Truck className="h-4 w-4 mr-2" />
                Track My Deliveries
              </a>
              <a 
                href="/builder-dashboard" 
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Go to Dashboard
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Device Info Banner */}
      {isMobile && (
        <Alert className="bg-green-50 border-green-200">
          <Smartphone className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 text-sm">
            <strong>Mobile Device Detected:</strong> {deviceInfo}. 
            For best results, hold your phone steady and ensure good lighting.
          </AlertDescription>
        </Alert>
      )}

      {/* Delivery Info Banner */}
      <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Truck className="h-8 w-8 text-orange-600" />
            <div>
              <h3 className="font-semibold text-orange-800">Delivery Site Scanner</h3>
              <p className="text-sm text-orange-700">
                Scan materials upon delivery to confirm handover at construction site
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Camera Scanner */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-600" />
              Delivery Confirmation Scanner
            </div>
            {availableCameras.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {availableCameras.length} camera{availableCameras.length > 1 ? 's' : ''} available
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!allowAccess && (
            <div className="p-3 rounded-md bg-yellow-50 text-yellow-700 text-sm">
              <strong>Access restricted.</strong> Sign in as a delivery provider to confirm deliveries.
            </div>
          )}

          {/* Camera Error Display */}
          {cameraError && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 text-sm">
                {cameraError}
                <Button 
                  variant="link" 
                  className="text-red-700 p-0 h-auto ml-2"
                  onClick={() => {
                    setCameraError(null);
                    listAvailableCameras();
                  }}
                >
                  Try Again
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Camera View */}
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              webkit-playsinline="true"
              className="w-full h-72 md:h-80 object-cover"
              style={{ transform: facing === 'user' ? 'scaleX(-1)' : 'none' }}
            />
            
            {/* Scanning overlay */}
            {isScanning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-56 h-56 md:w-64 md:h-64">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-500 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-500 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-500 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-500 rounded-br-lg" />
                  <div className="absolute inset-x-4 h-0.5 bg-green-500 animate-pulse" />
                </div>
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <span className="bg-black/70 text-white text-sm px-3 py-1 rounded-full">
                    📱 Point camera at QR code
                  </span>
                </div>
              </div>
            )}

            {/* Not scanning overlay */}
            {!isScanning && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                <div className="text-center text-white">
                  <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm opacity-70">Camera not active</p>
                  <p className="text-xs opacity-50">Tap "Start Scanner" to begin</p>
                </div>
              </div>
            )}
          </div>

          {/* Camera Controls */}
          <div className="flex flex-wrap gap-2">
            {!isScanning ? (
              <Button onClick={startCameraScanning} className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700" size="lg">
                <Camera className="h-5 w-5 mr-2" />
                Start Scanner
              </Button>
            ) : (
              <Button onClick={stopScanning} variant="destructive" className="flex-1 sm:flex-none" size="lg">
                <RotateCcw className="h-5 w-5 mr-2" />
                Stop Scanner
              </Button>
            )}
            
            <Button 
              onClick={toggleCamera} 
              variant="outline" 
              size="lg"
              disabled={!isScanning && availableCameras.length <= 1}
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              {isMobile ? 'Flip' : 'Switch Camera'}
            </Button>

            {hasFlash && isScanning && (
              <Button 
                onClick={toggleFlash} 
                variant={flashOn ? 'default' : 'outline'}
                size="lg"
              >
                <Flashlight className={`h-5 w-5 ${flashOn ? 'text-yellow-300' : ''}`} />
              </Button>
            )}
          </div>

          {/* Camera Selection */}
          {availableCameras.length > 1 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Select Camera</Label>
              <Select value={selectedCameraId} onValueChange={(value) => {
                setSelectedCameraId(value);
                if (isScanning) {
                  stopScanning();
                  setTimeout(() => startCameraScanning(), 300);
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose camera" />
                </SelectTrigger>
                <SelectContent>
                  {availableCameras.map((camera, index) => (
                    <SelectItem key={camera.deviceId} value={camera.deviceId}>
                      {camera.label || `Camera ${index + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Mobile Tips */}
          {isMobile && isScanning && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              <p className="font-medium mb-1">📱 Mobile Scanning Tips:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Hold phone 6-12 inches from QR code</li>
                <li>Ensure QR code is well-lit</li>
                <li>Keep phone steady while scanning</li>
                <li>Use flash in low light conditions</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Entry / Physical Scanner */}
      {(
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5" />
              Physical Scanner Input
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="qr-code">QR Code (from physical scanner)</Label>
              <Input
                id="qr-code"
                value={manualQRCode}
                onChange={(e) => setManualQRCode(e.target.value)}
                placeholder="Scan or enter QR code"
                className="font-mono"
                onKeyDown={(e) => e.key === 'Enter' && handleManualScan()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition">Material Condition on Receipt</Label>
              <Select value={materialCondition} onValueChange={setMaterialCondition}>
                <SelectTrigger id="condition">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Good Condition</SelectItem>
                  <SelectItem value="minor_damage">Minor Damage</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                  <SelectItem value="excellent">Excellent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Receiving Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes about received material"
                rows={3}
              />
            </div>

            <Button onClick={handleManualScan} className="w-full bg-green-600 hover:bg-green-700" disabled={!canScan}>
              <PackageCheck className="h-4 w-4 mr-2" />
              Confirm Delivery
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Scan Results */}
      {scanResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Delivered Items ({scanResults.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scanResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">{result.material_type}</p>
                    <p className="text-sm text-muted-foreground">
                      {result.quantity} {result.unit} • {result.category}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {result.qr_code}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-green-500 text-white">
                      <PackageCheck className="h-3 w-3 mr-1" />
                      Delivered
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {result.timestamp.toLocaleTimeString()}
                    </p>
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

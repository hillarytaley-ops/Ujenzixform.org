import React, { useRef, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PackageCheck, Scan, CheckCircle, Camera, Truck, MapPin, Lock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { BrowserMultiFormatReader } from '@zxing/browser';


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
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [manualQRCode, setManualQRCode] = useState('');
  const [materialCondition, setMaterialCondition] = useState('good');
  const [notes, setNotes] = useState('');
  const [codeReader, setCodeReader] = useState<BrowserMultiFormatReader | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const CAMERA_CONSENT_KEY = 'scanner_camera_consent';
  

  useEffect(() => {
    checkAuth();
    const reader = new BrowserMultiFormatReader();
    setCodeReader(reader);
    try {
      const consent = localStorage.getItem(CAMERA_CONSENT_KEY);
      const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (consent && !isiOS) {
        setTimeout(() => { startCameraScanning().catch(() => {}); }, 300);
      }
    } catch {}
    

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      try { reader.reset(); } catch {}
    };
  }, []);

  const checkAuth = async () => {
    try {
      // Also check localStorage for role
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
      // Keep localStorage role if available
      const localRole = localStorage.getItem('user_role');
      setUserRole(localRole || null);
    }
  };

  const startCameraScanning = async () => {
    if (!codeReader) return;

    try {
      if (!window.isSecureContext && !/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) {
        toast.error('Camera requires HTTPS or localhost');
        return;
      }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Camera not supported');
        return;
      }
      if (videoRef.current) {
        videoRef.current.setAttribute('playsinline', 'true');
        setIsScanning(true);
        toast.success('Camera scanner started');
        codeReader.decodeFromConstraints({
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } }
        } as any, videoRef.current, (result, error) => {
          if (result) {
            processQRScan(result.getText(), 'mobile_camera');
          }
        });
        try {
          videoRef.current.muted = true;
          videoRef.current.onloadedmetadata = () => {
            try { videoRef.current?.play?.(); } catch {}
          };
          await videoRef.current.play?.();
          try { localStorage.setItem(CAMERA_CONSENT_KEY, 'true'); } catch {}
        } catch {}

        setTimeout(async () => {
          try {
            if (videoRef.current && (videoRef.current.readyState < 2 || videoRef.current.videoWidth === 0)) {
              const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
              videoRef.current.srcObject = stream;
              try { await videoRef.current.play?.(); } catch {}
            }
          } catch {}
        }, 1200);
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast.error('Failed to access camera');
    }
  };

  const stopScanning = () => {
    try { codeReader?.reset(); } catch {}
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    toast.info('Scanner stopped');
  };

  const toggleCamera = async () => {
    const next = facing === 'environment' ? 'user' : 'environment';
    setFacing(next);
    if (isScanning) {
      stopScanning();
      await startCameraScanning();
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
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-green-600" />
            Delivery Confirmation Scanner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!allowAccess && (
            <div className="p-3 rounded-md bg-yellow-50 text-yellow-700 text-sm">
              <strong>Access restricted.</strong> Sign in as a delivery provider to confirm deliveries.
            </div>
          )}
          
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-64 object-cover"
            />
            {isScanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="border-4 border-green-500 rounded-lg w-48 h-48 animate-pulse" />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {!isScanning ? (
              <Button onClick={startCameraScanning} className="bg-green-600 hover:bg-green-700">
                <Camera className="h-4 w-4 mr-2" />
                Start Camera Scanner
              </Button>
            ) : (
              <Button onClick={stopScanning} variant="outline">
                Stop Scanner
              </Button>
            )}
            <Button onClick={toggleCamera} variant="outline">Switch Camera</Button>
          </div>
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

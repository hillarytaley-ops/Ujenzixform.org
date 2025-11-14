import React, { useRef, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, Scan, CheckCircle, AlertCircle, Camera, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { QuickTooltip, TooltipGuide } from '@/components/ui/tooltip-guide';
import { qrSystemGuide } from '@/data/userGuides';
import { QRWorkflowDocumentation } from './QRWorkflowDocumentation';

interface ScanResult {
  qr_code: string;
  material_type: string;
  category: string;
  quantity: number;
  unit: string;
  status: string;
  timestamp: Date;
}

export const DispatchScanner: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [manualQRCode, setManualQRCode] = useState('');
  const [materialCondition, setMaterialCondition] = useState('good');
  const [notes, setNotes] = useState('');
  const [codeReader, setCodeReader] = useState<BrowserMultiFormatReader | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  useEffect(() => {
    checkAuth();
    const reader = new BrowserMultiFormatReader();
    setCodeReader(reader);
    
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    setUserRole(roleData?.role || null);
  };

  const startCameraScanning = async () => {
    if (!codeReader) return;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Camera not supported');
        return;
      }
      if (!window.isSecureContext) {
        toast.error('Camera requires a secure site');
        return;
      }
      if (!selectedDeviceId) {
        await loadCameras();
      }

      if (videoRef.current) {
        videoRef.current.setAttribute('playsinline', 'true');
        setIsScanning(true);
        toast.success('Camera scanner started');
        if (selectedDeviceId) {
          codeReader.decodeFromVideoDevice(selectedDeviceId, videoRef.current, (result, error) => {
            if (result) {
              processQRScan(result.getText(), 'mobile_camera');
            }
          });
        } else {
          codeReader.decodeFromConstraints({
            video: { facingMode: { ideal: 'environment' } }
          } as any, videoRef.current, (result, error) => {
            if (result) {
              processQRScan(result.getText(), 'mobile_camera');
            }
          });
        }
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast.error('Failed to access camera');
    }
  };

  const loadCameras = async () => {
    const permissionStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    });
    const devices = await navigator.mediaDevices.enumerateDevices();
    const inputs = devices.filter(d => d.kind === 'videoinput');
    setVideoDevices(inputs);
    const preferred =
      inputs.find(d => /back|rear|environment/i.test(d.label)) ||
      inputs[inputs.length - 1] ||
      inputs[0];
    setSelectedDeviceId(preferred?.deviceId);
    permissionStream.getTracks().forEach(t => t.stop());
  };

  const stopScanning = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    toast.info('Scanner stopped');
  };

  const processQRScan = async (qrCode: string, scannerType: 'mobile_camera' | 'physical_scanner' | 'web_scanner') => {
    try {
      // Call the record_qr_scan function
      const { data, error } = await supabase.rpc('record_qr_scan', {
        _qr_code: qrCode,
        _scan_type: 'dispatch',
        _scanner_device_id: navigator.userAgent,
        _scanner_type: scannerType,
        _material_condition: materialCondition,
        _notes: notes || null
      });

      if (error) throw error;

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
        
        toast.success('Item Dispatched', {
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

  const allowAccess = ['supplier', 'admin'].includes(userRole || '');

  return (
    <div className="space-y-6">
      {/* QR Workflow Documentation */}
      <QRWorkflowDocumentation embedded={true} />
      
      {/* Camera Scanner */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Dispatch Scanner - Supplier
            </div>
            <TooltipGuide 
              guide={qrSystemGuide}
              trigger={
                <Button variant="outline" size="sm">
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Help Guide
                </Button>
              }
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!allowAccess && (
            <div className="p-3 rounded-md bg-yellow-50 text-yellow-700 text-sm">
              Access restricted. Sign in as supplier or admin to record scans.
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="camera-source">Camera Source</Label>
              <Select value={selectedDeviceId ?? ''} onValueChange={setSelectedDeviceId}>
                <SelectTrigger id="camera-source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {videoDevices.length === 0 ? (
                    <SelectItem value="">No cameras</SelectItem>
                  ) : (
                    videoDevices.map((d, i) => (
                      <SelectItem key={d.deviceId || i} value={d.deviceId}>
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
                <div className="border-4 border-primary rounded-lg w-48 h-48 animate-pulse" />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {!isScanning ? (
              <Button onClick={startCameraScanning}>
                <Camera className="h-4 w-4 mr-2" />
                Start Camera Scanner
              </Button>
            ) : (
              <Button onClick={stopScanning} variant="outline">
                Stop Scanner
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Manual Entry / Physical Scanner */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            Physical Scanner Input
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <QuickTooltip 
              content="Use a physical USB or Bluetooth scanner to scan QR codes. The scanner will automatically input the code into this field."
              tips={[
                "Connect USB scanner and it works like a keyboard",
                "Pair Bluetooth scanners before use",
                "Press Enter after scanning to process the code"
              ]}
            >
              <Label htmlFor="qr-code">QR Code (from physical scanner)</Label>
            </QuickTooltip>
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
            <QuickTooltip 
              content="Record the condition of materials being dispatched. This information is tracked throughout the delivery process."
              tips={[
                "Select 'Damaged' if materials show any defects",
                "Use 'Minor Damage' for small issues that don't affect function",
                "Excellent condition for premium quality materials"
              ]}
            >
              <Label htmlFor="condition">Material Condition</Label>
            </QuickTooltip>
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
            <Label htmlFor="notes">Dispatch Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this dispatch"
              rows={3}
            />
          </div>

          <Button onClick={handleManualScan} className="w-full" disabled={!allowAccess}>
            <Scan className="h-4 w-4 mr-2" />
            Record Dispatch Scan
          </Button>
        </CardContent>
      </Card>

      {/* Scan Results */}
      {scanResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Dispatched Items ({scanResults.length})
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
                    <Badge className="bg-blue-500 text-white">
                      <Truck className="h-3 w-3 mr-1" />
                      Dispatched
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

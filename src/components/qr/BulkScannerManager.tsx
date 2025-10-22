import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Scan, 
  Package, 
  CheckCircle, 
  AlertTriangle,
  Camera,
  Upload,
  Download,
  Pause,
  Play,
  RotateCcw,
  FileText,
  BarChart3,
  Clock,
  Users,
  Shield,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BulkScanResult {
  id: string;
  qr_code: string;
  material_type: string;
  scan_status: 'success' | 'failed' | 'duplicate' | 'invalid';
  error_message?: string;
  scanned_at: Date;
  processing_time_ms: number;
}

interface BulkScanSession {
  id: string;
  session_name: string;
  scan_type: 'dispatch' | 'receiving' | 'verification';
  total_items: number;
  scanned_items: number;
  successful_scans: number;
  failed_scans: number;
  duplicate_scans: number;
  start_time: Date;
  end_time?: Date;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
}

interface BulkScannerManagerProps {
  scanType: 'dispatch' | 'receiving' | 'verification';
  userRole?: string;
  onScanComplete?: (results: BulkScanResult[]) => void;
}

export const BulkScannerManager: React.FC<BulkScannerManagerProps> = ({
  scanType,
  userRole = 'admin',
  onScanComplete
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [scanResults, setScanResults] = useState<BulkScanResult[]>([]);
  const [currentSession, setCurrentSession] = useState<BulkScanSession | null>(null);
  const [batchInput, setBatchInput] = useState('');
  const [autoScanMode, setAutoScanMode] = useState(false);
  const [scanInterval, setScanInterval] = useState(2000); // 2 seconds between scans
  const [maxBatchSize, setMaxBatchSize] = useState(100);
  const videoRef = useRef<HTMLVideoElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      stopCamera();
    };
  }, []);

  const startBulkScanSession = async () => {
    const session: BulkScanSession = {
      id: `session-${Date.now()}`,
      session_name: `${scanType} Bulk Scan - ${new Date().toLocaleString()}`,
      scan_type: scanType,
      total_items: 0,
      scanned_items: 0,
      successful_scans: 0,
      failed_scans: 0,
      duplicate_scans: 0,
      start_time: new Date(),
      status: 'active'
    };
    
    setCurrentSession(session);
    setScanResults([]);
    
    // Log session start
    await supabase.from('scanner_audit_log').insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      qr_code: 'BULK_SESSION_START',
      scan_type: scanType,
      scanner_type: 'bulk_scanner',
      scan_notes: `Bulk scan session started: ${session.session_name}`
    });
    
    toast({
      title: "Bulk Scan Session Started",
      description: `Ready to scan ${scanType} materials in bulk mode`,
    });
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsScanning(true);
        
        if (autoScanMode) {
          startAutoScanning();
        }
        
        toast({
          title: "Camera Started",
          description: "Bulk scanner camera is now active",
        });
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast({
        title: "Camera Error",
        description: "Failed to access camera for bulk scanning",
        variant: "destructive"
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startAutoScanning = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(() => {
      if (!isPaused && isScanning) {
        simulateBulkQRDetection();
      }
    }, scanInterval);
  };

  const simulateBulkQRDetection = async () => {
    // Simulate QR code detection for bulk scanning
    const qrCodes = [
      'UJP-CEMENT-PORTLAND-001-20241212-ABC123',
      'UJP-STEEL-REBAR-002-20241212-DEF456',
      'UJP-BRICK-RED-003-20241212-GHI789',
      'UJP-SAND-RIVER-004-20241212-JKL012',
      'UJP-GRAVEL-CRUSHED-005-20241212-MNO345'
    ];
    
    // Random detection with higher success rate for bulk scanning
    if (Math.random() > 0.3) { // 70% detection rate
      const randomQR = qrCodes[Math.floor(Math.random() * qrCodes.length)];
      await processBulkScan(randomQR);
    }
  };

  const processBulkScan = async (qrCode: string) => {
    const startTime = Date.now();
    
    try {
      // Check for duplicates
      const isDuplicate = scanResults.some(result => result.qr_code === qrCode);
      
      if (isDuplicate) {
        const duplicateResult: BulkScanResult = {
          id: `scan-${Date.now()}`,
          qr_code: qrCode,
          material_type: 'Duplicate',
          scan_status: 'duplicate',
          error_message: 'QR code already scanned in this session',
          scanned_at: new Date(),
          processing_time_ms: Date.now() - startTime
        };
        
        setScanResults(prev => [duplicateResult, ...prev.slice(0, 99)]);
        updateSessionStats('duplicate');
        return;
      }
      
      // Validate QR code format
      if (!qrCode.startsWith('UJP-') || qrCode.length < 10) {
        const invalidResult: BulkScanResult = {
          id: `scan-${Date.now()}`,
          qr_code: qrCode,
          material_type: 'Invalid',
          scan_status: 'invalid',
          error_message: 'Invalid QR code format',
          scanned_at: new Date(),
          processing_time_ms: Date.now() - startTime
        };
        
        setScanResults(prev => [invalidResult, ...prev.slice(0, 99)]);
        updateSessionStats('failed');
        return;
      }
      
      // Process successful scan
      const parts = qrCode.split('-');
      const materialType = parts[1] || 'Unknown';
      
      // Log secure scan
      const { data, error } = await supabase.rpc('log_secure_scan', {
        qr_code_param: qrCode,
        scan_type_param: scanType,
        scanner_type_param: 'bulk_scanner',
        scanner_device_id_param: navigator.userAgent,
        material_condition_param: 'good',
        scan_notes_param: `Bulk scan session: ${currentSession?.id}`
      });
      
      if (error) throw error;
      
      const successResult: BulkScanResult = {
        id: `scan-${Date.now()}`,
        qr_code: qrCode,
        material_type: materialType,
        scan_status: 'success',
        scanned_at: new Date(),
        processing_time_ms: Date.now() - startTime
      };
      
      setScanResults(prev => [successResult, ...prev.slice(0, 99)]);
      updateSessionStats('success');
      
    } catch (error) {
      console.error('Bulk scan processing error:', error);
      
      const errorResult: BulkScanResult = {
        id: `scan-${Date.now()}`,
        qr_code: qrCode,
        material_type: 'Error',
        scan_status: 'failed',
        error_message: error instanceof Error ? error.message : 'Processing failed',
        scanned_at: new Date(),
        processing_time_ms: Date.now() - startTime
      };
      
      setScanResults(prev => [errorResult, ...prev.slice(0, 99)]);
      updateSessionStats('failed');
    }
  };

  const updateSessionStats = (resultType: 'success' | 'failed' | 'duplicate') => {
    if (!currentSession) return;
    
    setCurrentSession(prev => {
      if (!prev) return null;
      
      const updated = { ...prev };
      updated.scanned_items += 1;
      
      switch (resultType) {
        case 'success':
          updated.successful_scans += 1;
          break;
        case 'failed':
          updated.failed_scans += 1;
          break;
        case 'duplicate':
          updated.duplicate_scans += 1;
          break;
      }
      
      return updated;
    });
  };

  const processBatchInput = async () => {
    if (!batchInput.trim()) {
      toast({
        title: "No Input",
        description: "Please enter QR codes to process",
        variant: "destructive"
      });
      return;
    }
    
    const qrCodes = batchInput
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (qrCodes.length > maxBatchSize) {
      toast({
        title: "Batch Too Large",
        description: `Maximum ${maxBatchSize} QR codes allowed per batch`,
        variant: "destructive"
      });
      return;
    }
    
    if (!currentSession) {
      await startBulkScanSession();
    }
    
    // Process each QR code
    for (const qrCode of qrCodes) {
      await processBulkScan(qrCode);
      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    toast({
      title: "Batch Processing Complete",
      description: `Processed ${qrCodes.length} QR codes`,
    });
    
    setBatchInput('');
  };

  const pauseResumeScanning = () => {
    setIsPaused(!isPaused);
    toast({
      title: isPaused ? "Scanning Resumed" : "Scanning Paused",
      description: isPaused ? "Bulk scanning has been resumed" : "Bulk scanning has been paused",
    });
  };

  const completeBulkSession = async () => {
    if (!currentSession) return;
    
    const completedSession = {
      ...currentSession,
      end_time: new Date(),
      status: 'completed' as const
    };
    
    setCurrentSession(completedSession);
    stopCamera();
    
    // Log session completion
    await supabase.from('scanner_audit_log').insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      qr_code: 'BULK_SESSION_END',
      scan_type: scanType,
      scanner_type: 'bulk_scanner',
      scan_notes: `Bulk scan session completed: ${completedSession.successful_scans} successful, ${completedSession.failed_scans} failed`
    });
    
    if (onScanComplete) {
      onScanComplete(scanResults);
    }
    
    toast({
      title: "Bulk Scan Session Completed",
      description: `Scanned ${completedSession.scanned_items} items with ${completedSession.successful_scans} successful`,
    });
  };

  const exportResults = () => {
    const csvContent = [
      'QR Code,Material Type,Status,Error Message,Scanned At,Processing Time (ms)',
      ...scanResults.map(result => 
        `${result.qr_code},${result.material_type},${result.scan_status},"${result.error_message || ''}",${result.scanned_at.toISOString()},${result.processing_time_ms}`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bulk_scan_results_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Results Exported",
      description: "Bulk scan results exported to CSV file",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      case 'duplicate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'invalid': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4" />;
      case 'failed': return <AlertTriangle className="h-4 w-4" />;
      case 'duplicate': return <Package className="h-4 w-4" />;
      case 'invalid': return <AlertTriangle className="h-4 w-4" />;
      default: return <Scan className="h-4 w-4" />;
    }
  };

  const calculateSuccessRate = () => {
    if (scanResults.length === 0) return 0;
    return Math.round((scanResults.filter(r => r.scan_status === 'success').length / scanResults.length) * 100);
  };

  const calculateAverageProcessingTime = () => {
    if (scanResults.length === 0) return 0;
    const totalTime = scanResults.reduce((sum, result) => sum + result.processing_time_ms, 0);
    return Math.round(totalTime / scanResults.length);
  };

  return (
    <div className="space-y-6">
      {/* Bulk Scan Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bulk Scanner Manager</h2>
          <p className="text-muted-foreground">
            Scan multiple QR codes efficiently for {scanType} operations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={currentSession?.status === 'active' ? 'default' : 'secondary'}>
            {currentSession?.status || 'No Session'}
          </Badge>
          {isScanning && (
            <Badge variant="default" className="animate-pulse">
              <Camera className="h-3 w-3 mr-1" />
              Scanning
            </Badge>
          )}
        </div>
      </div>

      {/* Session Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Bulk Scan Session
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!currentSession ? (
            <div className="text-center py-8">
              <Scan className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Start Bulk Scanning</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Begin a new bulk scanning session to process multiple QR codes
              </p>
              <Button onClick={startBulkScanSession}>
                <Play className="h-4 w-4 mr-2" />
                Start Bulk Session
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Session Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{currentSession.scanned_items}</div>
                  <div className="text-sm text-blue-700">Total Scanned</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{currentSession.successful_scans}</div>
                  <div className="text-sm text-green-700">Successful</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{currentSession.failed_scans}</div>
                  <div className="text-sm text-red-700">Failed</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{currentSession.duplicate_scans}</div>
                  <div className="text-sm text-yellow-700">Duplicates</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{calculateSuccessRate()}%</div>
                  <div className="text-sm text-purple-700">Success Rate</div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Session Progress</span>
                  <span>{currentSession.scanned_items} items</span>
                </div>
                <Progress value={Math.min(100, (currentSession.scanned_items / maxBatchSize) * 100)} />
              </div>
              
              {/* Session Controls */}
              <div className="flex items-center gap-2">
                {!isScanning ? (
                  <Button onClick={startCamera}>
                    <Camera className="h-4 w-4 mr-2" />
                    Start Camera
                  </Button>
                ) : (
                  <Button onClick={stopCamera} variant="destructive">
                    <Camera className="h-4 w-4 mr-2" />
                    Stop Camera
                  </Button>
                )}
                
                {isScanning && (
                  <Button onClick={pauseResumeScanning} variant="outline">
                    {isPaused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
                    {isPaused ? 'Resume' : 'Pause'}
                  </Button>
                )}
                
                <Button onClick={completeBulkSession} variant="outline">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Session
                </Button>
                
                {scanResults.length > 0 && (
                  <Button onClick={exportResults} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Results
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Camera View */}
      {isScanning && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Bulk Scanner Camera
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full max-w-2xl mx-auto rounded-lg bg-black"
                style={{ aspectRatio: '16/9' }}
              />
              
              {/* Scanning Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-2 border-green-500 bg-green-500/10 rounded-lg p-4">
                  <div className="w-48 h-48 border-2 border-green-500 border-dashed rounded-lg flex items-center justify-center">
                    <QrCode className="h-12 w-12 text-green-500" />
                  </div>
                </div>
              </div>
              
              {/* Status Overlay */}
              <div className="absolute top-4 left-4 right-4">
                <div className="flex items-center justify-between">
                  <Badge variant={isPaused ? 'secondary' : 'default'}>
                    {isPaused ? 'Paused' : 'Scanning'}
                  </Badge>
                  <Badge variant="outline">
                    {scanResults.length} scanned
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batch Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Batch QR Input
          </CardTitle>
          <CardDescription>
            Enter multiple QR codes (one per line) for batch processing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>QR Codes (one per line)</Label>
            <textarea
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              placeholder="UJP-CEMENT-001-20241212-ABC123&#10;UJP-STEEL-002-20241212-DEF456&#10;UJP-BRICK-003-20241212-GHI789"
              rows={6}
              className="w-full p-3 border rounded-md font-mono text-sm"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {batchInput.split('\n').filter(line => line.trim()).length} QR codes ready
            </div>
            <Button onClick={processBatchInput} disabled={!currentSession}>
              <Upload className="h-4 w-4 mr-2" />
              Process Batch
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scan Results */}
      {scanResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Scan Results ({scanResults.length})
            </CardTitle>
            <CardDescription>
              Success Rate: {calculateSuccessRate()}% | Avg Processing: {calculateAverageProcessingTime()}ms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {scanResults.map(result => (
                <div key={result.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(result.scan_status)}>
                      {getStatusIcon(result.scan_status)}
                      {result.scan_status}
                    </Badge>
                    <div>
                      <p className="font-medium">{result.material_type}</p>
                      <p className="text-sm text-muted-foreground font-mono">{result.qr_code}</p>
                      {result.error_message && (
                        <p className="text-xs text-red-600">{result.error_message}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div>{result.scanned_at.toLocaleTimeString()}</div>
                    <div>{result.processing_time_ms}ms</div>
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

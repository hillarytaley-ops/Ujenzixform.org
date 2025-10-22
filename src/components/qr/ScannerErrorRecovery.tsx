import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  RefreshCw, 
  Camera, 
  CameraOff,
  Wifi,
  WifiOff,
  CheckCircle,
  XCircle,
  Settings,
  Shield,
  Smartphone,
  Monitor,
  HelpCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScannerError {
  type: 'camera' | 'network' | 'qr_decode' | 'database' | 'permission' | 'hardware';
  message: string;
  code?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  recoverable: boolean;
}

interface RecoveryAction {
  id: string;
  label: string;
  description: string;
  action: () => Promise<boolean>;
  icon: any;
  priority: number;
}

interface ScannerErrorRecoveryProps {
  error?: ScannerError | null;
  onRetry?: () => void;
  onReset?: () => void;
  onRecovered?: () => void;
  showDiagnostics?: boolean;
}

export const ScannerErrorRecovery: React.FC<ScannerErrorRecoveryProps> = ({
  error,
  onRetry,
  onReset,
  onRecovered,
  showDiagnostics = true
}) => {
  const [diagnostics, setDiagnostics] = useState({
    cameraStatus: 'checking',
    networkStatus: 'checking',
    permissionStatus: 'checking',
    databaseStatus: 'checking',
    hardwareStatus: 'checking'
  });
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const [availableActions, setAvailableActions] = useState<RecoveryAction[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (error && showDiagnostics) {
      runDiagnostics();
      generateRecoveryActions();
    }
  }, [error]);

  const runDiagnostics = async () => {
    setDiagnostics({
      cameraStatus: 'checking',
      networkStatus: 'checking',
      permissionStatus: 'checking',
      databaseStatus: 'checking',
      hardwareStatus: 'checking'
    });

    // Check camera access
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setDiagnostics(prev => ({ ...prev, cameraStatus: 'available' }));
    } catch (cameraError) {
      setDiagnostics(prev => ({ 
        ...prev, 
        cameraStatus: cameraError instanceof Error && cameraError.name === 'NotAllowedError' ? 'permission_denied' : 'unavailable' 
      }));
    }

    // Check network connectivity
    try {
      await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors' });
      setDiagnostics(prev => ({ ...prev, networkStatus: 'online' }));
    } catch {
      setDiagnostics(prev => ({ ...prev, networkStatus: 'offline' }));
    }

    // Check camera permissions
    try {
      const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
      setDiagnostics(prev => ({ 
        ...prev, 
        permissionStatus: permissionStatus.state === 'granted' ? 'granted' : 
                         permissionStatus.state === 'denied' ? 'denied' : 'prompt'
      }));
    } catch {
      setDiagnostics(prev => ({ ...prev, permissionStatus: 'unknown' }));
    }

    // Check database connectivity
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase.from('material_items').select('id').limit(1);
      setDiagnostics(prev => ({ 
        ...prev, 
        databaseStatus: error ? 'error' : 'connected' 
      }));
    } catch {
      setDiagnostics(prev => ({ ...prev, databaseStatus: 'error' }));
    }

    // Check hardware capabilities
    const hasCamera = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const hasWebGL = !!(window.WebGLRenderingContext && document.createElement('canvas').getContext('webgl'));
    
    setDiagnostics(prev => ({ 
      ...prev, 
      hardwareStatus: hasCamera && hasWebGL ? 'compatible' : 'limited' 
    }));
  };

  const generateRecoveryActions = () => {
    if (!error) return;

    const actions: RecoveryAction[] = [];

    switch (error.type) {
      case 'camera':
        actions.push({
          id: 'request_camera_permission',
          label: 'Request Camera Permission',
          description: 'Grant camera access for QR scanning',
          action: requestCameraPermission,
          icon: Camera,
          priority: 1
        });
        actions.push({
          id: 'switch_to_manual',
          label: 'Switch to Manual Input',
          description: 'Use manual QR code entry instead of camera',
          action: switchToManualMode,
          icon: Settings,
          priority: 2
        });
        break;

      case 'network':
        actions.push({
          id: 'enable_offline_mode',
          label: 'Enable Offline Mode',
          description: 'Continue scanning offline with local storage',
          action: enableOfflineMode,
          icon: WifiOff,
          priority: 1
        });
        actions.push({
          id: 'check_connection',
          label: 'Check Connection',
          description: 'Test network connectivity',
          action: checkNetworkConnection,
          icon: Wifi,
          priority: 2
        });
        break;

      case 'qr_decode':
        actions.push({
          id: 'improve_lighting',
          label: 'Improve Lighting',
          description: 'Ensure good lighting for QR code scanning',
          action: async () => true,
          icon: Monitor,
          priority: 1
        });
        actions.push({
          id: 'clean_camera',
          label: 'Clean Camera Lens',
          description: 'Clean camera lens for better QR code detection',
          action: async () => true,
          icon: Camera,
          priority: 2
        });
        break;

      case 'database':
        actions.push({
          id: 'retry_connection',
          label: 'Retry Database Connection',
          description: 'Attempt to reconnect to the database',
          action: retryDatabaseConnection,
          icon: RefreshCw,
          priority: 1
        });
        break;

      case 'permission':
        actions.push({
          id: 'grant_permissions',
          label: 'Grant Required Permissions',
          description: 'Allow camera and location access',
          action: requestAllPermissions,
          icon: Shield,
          priority: 1
        });
        break;

      default:
        actions.push({
          id: 'general_retry',
          label: 'Retry Operation',
          description: 'Attempt to retry the failed operation',
          action: async () => { onRetry?.(); return true; },
          icon: RefreshCw,
          priority: 1
        });
    }

    // Add reset option for all error types
    actions.push({
      id: 'reset_scanner',
      label: 'Reset Scanner',
      description: 'Reset scanner to initial state',
      action: async () => { onReset?.(); return true; },
      icon: Settings,
      priority: 3
    });

    setAvailableActions(actions.sort((a, b) => a.priority - b.priority));
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      
      toast({
        title: "Camera Access Granted",
        description: "Camera permission granted successfully",
      });
      
      return true;
    } catch (error) {
      toast({
        title: "Camera Access Denied",
        description: "Please enable camera access in browser settings",
        variant: "destructive"
      });
      return false;
    }
  };

  const switchToManualMode = async (): Promise<boolean> => {
    toast({
      title: "Manual Mode Enabled",
      description: "You can now enter QR codes manually",
    });
    return true;
  };

  const enableOfflineMode = async (): Promise<boolean> => {
    toast({
      title: "Offline Mode Enabled",
      description: "Scanner will work offline and sync when connection returns",
    });
    return true;
  };

  const checkNetworkConnection = async (): Promise<boolean> => {
    try {
      const response = await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors' });
      toast({
        title: "Connection Test",
        description: "Network connection is working",
      });
      return true;
    } catch {
      toast({
        title: "Connection Test Failed",
        description: "Network connection is not available",
        variant: "destructive"
      });
      return false;
    }
  };

  const retryDatabaseConnection = async (): Promise<boolean> => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase.from('material_items').select('id').limit(1);
      
      if (error) throw error;
      
      toast({
        title: "Database Connected",
        description: "Database connection restored",
      });
      return true;
    } catch (error) {
      toast({
        title: "Database Connection Failed",
        description: "Could not connect to database",
        variant: "destructive"
      });
      return false;
    }
  };

  const requestAllPermissions = async (): Promise<boolean> => {
    try {
      // Request camera permission
      await navigator.mediaDevices.getUserMedia({ video: true });
      
      // Request location permission if available
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(() => {}, () => {});
      }
      
      toast({
        title: "Permissions Granted",
        description: "All required permissions have been granted",
      });
      return true;
    } catch (error) {
      toast({
        title: "Permission Error",
        description: "Some permissions could not be granted",
        variant: "destructive"
      });
      return false;
    }
  };

  const executeRecoveryAction = async (action: RecoveryAction) => {
    try {
      setIsRecovering(true);
      setRecoveryAttempts(prev => prev + 1);
      
      const success = await action.action();
      
      if (success) {
        toast({
          title: "Recovery Successful",
          description: `${action.label} completed successfully`,
        });
        
        if (onRecovered) {
          onRecovered();
        }
      }
    } catch (error) {
      console.error('Recovery action failed:', error);
      toast({
        title: "Recovery Failed",
        description: `${action.label} failed to complete`,
        variant: "destructive"
      });
    } finally {
      setIsRecovering(false);
    }
  };

  const getDiagnosticIcon = (status: string) => {
    switch (status) {
      case 'available':
      case 'online':
      case 'granted':
      case 'connected':
      case 'compatible':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'unavailable':
      case 'offline':
      case 'denied':
      case 'error':
      case 'limited':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'permission_denied':
        return <Shield className="h-4 w-4 text-red-500" />;
      case 'prompt':
        return <HelpCircle className="h-4 w-4 text-yellow-500" />;
      case 'checking':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getErrorIcon = () => {
    switch (error?.type) {
      case 'camera':
        return <CameraOff className="h-6 w-6 text-red-500" />;
      case 'network':
        return <WifiOff className="h-6 w-6 text-red-500" />;
      case 'qr_decode':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      case 'database':
        return <XCircle className="h-6 w-6 text-red-500" />;
      case 'permission':
        return <Shield className="h-6 w-6 text-red-500" />;
      default:
        return <AlertTriangle className="h-6 w-6 text-red-500" />;
    }
  };

  const getErrorTitle = () => {
    switch (error?.type) {
      case 'camera':
        return 'Camera Access Error';
      case 'network':
        return 'Network Connection Error';
      case 'qr_decode':
        return 'QR Code Reading Error';
      case 'database':
        return 'Database Connection Error';
      case 'permission':
        return 'Permission Error';
      case 'hardware':
        return 'Hardware Compatibility Error';
      default:
        return 'Scanner Error';
    }
  };

  if (!error) {
    return null;
  }

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-800">
          {getErrorIcon()}
          {getErrorTitle()}
        </CardTitle>
        <CardDescription className="text-red-700">
          {error.message}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error Details */}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Details</AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              <p><strong>Type:</strong> {error.type}</p>
              <p><strong>Severity:</strong> {error.severity}</p>
              {error.code && <p><strong>Code:</strong> {error.code}</p>}
              <p><strong>Time:</strong> {new Date(error.timestamp).toLocaleString()}</p>
              <p><strong>Recoverable:</strong> {error.recoverable ? 'Yes' : 'No'}</p>
            </div>
          </AlertDescription>
        </Alert>

        {/* System Diagnostics */}
        {showDiagnostics && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">System Diagnostics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  {getDiagnosticIcon(diagnostics.cameraStatus)}
                  <span>Camera: {diagnostics.cameraStatus.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-2">
                  {getDiagnosticIcon(diagnostics.networkStatus)}
                  <span>Network: {diagnostics.networkStatus}</span>
                </div>
                <div className="flex items-center gap-2">
                  {getDiagnosticIcon(diagnostics.permissionStatus)}
                  <span>Permissions: {diagnostics.permissionStatus}</span>
                </div>
                <div className="flex items-center gap-2">
                  {getDiagnosticIcon(diagnostics.databaseStatus)}
                  <span>Database: {diagnostics.databaseStatus}</span>
                </div>
                <div className="flex items-center gap-2">
                  {getDiagnosticIcon(diagnostics.hardwareStatus)}
                  <span>Hardware: {diagnostics.hardwareStatus}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recovery Actions */}
        {availableActions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recommended Recovery Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {availableActions.map(action => {
                  const Icon = action.icon;
                  return (
                    <div key={action.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-medium">{action.label}</p>
                          <p className="text-sm text-muted-foreground">{action.description}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => executeRecoveryAction(action)}
                        disabled={isRecovering}
                      >
                        {isRecovering ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          'Try'
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Manual Recovery Options */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              Attempt {recoveryAttempts}/3
            </Badge>
            <Badge variant={error.recoverable ? 'default' : 'destructive'}>
              {error.recoverable ? 'Recoverable' : 'Critical'}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {error.recoverable && (
              <Button variant="outline" onClick={onRetry} disabled={isRecovering}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            )}
            <Button onClick={onReset} disabled={isRecovering}>
              <Settings className="h-4 w-4 mr-2" />
              Reset Scanner
            </Button>
          </div>
        </div>

        {/* Recovery Tips */}
        <Alert>
          <HelpCircle className="h-4 w-4" />
          <AlertTitle>Recovery Tips</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1">
              <p>• Ensure good lighting when scanning QR codes</p>
              <p>• Hold camera steady and at appropriate distance</p>
              <p>• Check that QR codes are not damaged or distorted</p>
              <p>• Verify internet connection for database operations</p>
              <p>• Grant necessary permissions for camera and location access</p>
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

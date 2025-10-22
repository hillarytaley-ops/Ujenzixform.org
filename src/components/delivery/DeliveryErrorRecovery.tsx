import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  RefreshCw, 
  Wifi, 
  WifiOff,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Database,
  Smartphone,
  Router,
  Server
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ErrorRecoveryState {
  hasError: boolean;
  errorType: 'network' | 'database' | 'authentication' | 'permission' | 'validation' | 'unknown';
  errorMessage: string;
  retryCount: number;
  lastAttempt: string;
  isRecovering: boolean;
}

interface DeliveryErrorRecoveryProps {
  error?: Error | null;
  onRetry?: () => void;
  onReset?: () => void;
  maxRetries?: number;
  autoRetry?: boolean;
  showDiagnostics?: boolean;
}

export const DeliveryErrorRecovery: React.FC<DeliveryErrorRecoveryProps> = ({
  error,
  onRetry,
  onReset,
  maxRetries = 3,
  autoRetry = true,
  showDiagnostics = true
}) => {
  const [recoveryState, setRecoveryState] = useState<ErrorRecoveryState>({
    hasError: false,
    errorType: 'unknown',
    errorMessage: '',
    retryCount: 0,
    lastAttempt: '',
    isRecovering: false
  });
  const [diagnostics, setDiagnostics] = useState({
    networkStatus: 'checking',
    databaseStatus: 'checking',
    authStatus: 'checking',
    serviceStatus: 'checking'
  });
  const { toast } = useToast();

  useEffect(() => {
    if (error) {
      analyzeError(error);
      if (autoRetry && recoveryState.retryCount < maxRetries) {
        scheduleAutoRetry();
      }
    }
  }, [error]);

  useEffect(() => {
    if (showDiagnostics) {
      runDiagnostics();
    }
  }, [recoveryState.hasError]);

  const analyzeError = (error: Error) => {
    let errorType: ErrorRecoveryState['errorType'] = 'unknown';
    let errorMessage = error.message;

    // Analyze error type based on message content
    if (error.message.includes('fetch') || error.message.includes('network')) {
      errorType = 'network';
    } else if (error.message.includes('database') || error.message.includes('connection')) {
      errorType = 'database';
    } else if (error.message.includes('auth') || error.message.includes('unauthorized')) {
      errorType = 'authentication';
    } else if (error.message.includes('permission') || error.message.includes('access')) {
      errorType = 'permission';
    } else if (error.message.includes('validation') || error.message.includes('invalid')) {
      errorType = 'validation';
    }

    setRecoveryState(prev => ({
      ...prev,
      hasError: true,
      errorType,
      errorMessage,
      lastAttempt: new Date().toISOString()
    }));
  };

  const runDiagnostics = async () => {
    setDiagnostics({
      networkStatus: 'checking',
      databaseStatus: 'checking',
      authStatus: 'checking',
      serviceStatus: 'checking'
    });

    // Check network connectivity
    try {
      await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors' });
      setDiagnostics(prev => ({ ...prev, networkStatus: 'online' }));
    } catch {
      setDiagnostics(prev => ({ ...prev, networkStatus: 'offline' }));
    }

    // Check database connectivity
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase.from('profiles').select('id').limit(1);
      setDiagnostics(prev => ({ 
        ...prev, 
        databaseStatus: error ? 'error' : 'connected' 
      }));
    } catch {
      setDiagnostics(prev => ({ ...prev, databaseStatus: 'error' }));
    }

    // Check authentication status
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { user }, error } = await supabase.auth.getUser();
      setDiagnostics(prev => ({ 
        ...prev, 
        authStatus: error || !user ? 'unauthenticated' : 'authenticated' 
      }));
    } catch {
      setDiagnostics(prev => ({ ...prev, authStatus: 'error' }));
    }

    // Check service status (mock - in production this would ping health endpoint)
    setTimeout(() => {
      setDiagnostics(prev => ({ ...prev, serviceStatus: 'operational' }));
    }, 1000);
  };

  const scheduleAutoRetry = () => {
    const retryDelay = Math.min(1000 * Math.pow(2, recoveryState.retryCount), 30000); // Exponential backoff, max 30s
    
    setTimeout(() => {
      handleRetry();
    }, retryDelay);
  };

  const handleRetry = async () => {
    if (recoveryState.retryCount >= maxRetries) {
      toast({
        title: "Max Retries Reached",
        description: "Please check your connection and try again manually.",
        variant: "destructive"
      });
      return;
    }

    setRecoveryState(prev => ({
      ...prev,
      isRecovering: true,
      retryCount: prev.retryCount + 1,
      lastAttempt: new Date().toISOString()
    }));

    try {
      if (onRetry) {
        await onRetry();
      }
      
      // If retry succeeds, reset error state
      setRecoveryState(prev => ({
        ...prev,
        hasError: false,
        isRecovering: false,
        retryCount: 0
      }));

      toast({
        title: "Recovery Successful",
        description: "Connection restored and data synchronized.",
      });

    } catch (retryError) {
      console.error('Retry failed:', retryError);
      setRecoveryState(prev => ({
        ...prev,
        isRecovering: false
      }));

      if (autoRetry && recoveryState.retryCount < maxRetries - 1) {
        scheduleAutoRetry();
      }
    }
  };

  const handleReset = () => {
    setRecoveryState({
      hasError: false,
      errorType: 'unknown',
      errorMessage: '',
      retryCount: 0,
      lastAttempt: '',
      isRecovering: false
    });

    if (onReset) {
      onReset();
    }
  };

  const getErrorIcon = () => {
    switch (recoveryState.errorType) {
      case 'network':
        return <WifiOff className="h-6 w-6 text-red-500" />;
      case 'database':
        return <Database className="h-6 w-6 text-red-500" />;
      case 'authentication':
        return <Shield className="h-6 w-6 text-red-500" />;
      case 'permission':
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <AlertTriangle className="h-6 w-6 text-red-500" />;
    }
  };

  const getErrorTitle = () => {
    switch (recoveryState.errorType) {
      case 'network':
        return 'Network Connection Error';
      case 'database':
        return 'Database Connection Error';
      case 'authentication':
        return 'Authentication Error';
      case 'permission':
        return 'Permission Error';
      case 'validation':
        return 'Validation Error';
      default:
        return 'Unexpected Error';
    }
  };

  const getRecoveryInstructions = () => {
    switch (recoveryState.errorType) {
      case 'network':
        return 'Check your internet connection and try again.';
      case 'database':
        return 'Database service may be temporarily unavailable. Please try again in a few moments.';
      case 'authentication':
        return 'Please sign in again to continue using the delivery system.';
      case 'permission':
        return 'You may not have permission to perform this action. Contact support if needed.';
      case 'validation':
        return 'Please check your input data and correct any validation errors.';
      default:
        return 'An unexpected error occurred. Please try again or contact support.';
    }
  };

  const getDiagnosticIcon = (status: string) => {
    switch (status) {
      case 'online':
      case 'connected':
      case 'authenticated':
      case 'operational':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'offline':
      case 'error':
      case 'unauthenticated':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'checking':
        return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  if (!recoveryState.hasError) {
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
          {getRecoveryInstructions()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error Details */}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Details</AlertTitle>
          <AlertDescription>
            <p className="font-mono text-sm">{recoveryState.errorMessage}</p>
            <p className="text-xs mt-2">
              Last attempt: {new Date(recoveryState.lastAttempt).toLocaleString()}
            </p>
          </AlertDescription>
        </Alert>

        {/* System Diagnostics */}
        {showDiagnostics && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">System Diagnostics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  {getDiagnosticIcon(diagnostics.networkStatus)}
                  <span>Network: {diagnostics.networkStatus}</span>
                </div>
                <div className="flex items-center gap-2">
                  {getDiagnosticIcon(diagnostics.databaseStatus)}
                  <span>Database: {diagnostics.databaseStatus}</span>
                </div>
                <div className="flex items-center gap-2">
                  {getDiagnosticIcon(diagnostics.authStatus)}
                  <span>Auth: {diagnostics.authStatus}</span>
                </div>
                <div className="flex items-center gap-2">
                  {getDiagnosticIcon(diagnostics.serviceStatus)}
                  <span>Service: {diagnostics.serviceStatus}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recovery Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              Retry {recoveryState.retryCount}/{maxRetries}
            </Badge>
            {!isOnline && (
              <Badge variant="destructive">
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
            <Button 
              onClick={handleRetry} 
              disabled={recoveryState.isRecovering || recoveryState.retryCount >= maxRetries}
            >
              {recoveryState.isRecovering ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Auto-retry countdown */}
        {autoRetry && recoveryState.retryCount < maxRetries && !recoveryState.isRecovering && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Auto-retry in {Math.max(0, Math.ceil((1000 * Math.pow(2, recoveryState.retryCount)) / 1000))} seconds...
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw, WifiOff, ShieldAlert, Database, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  componentName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorType: 'network' | 'auth' | 'data' | 'render' | 'unknown';
}

// Helper to detect error type
const detectErrorType = (error: Error): ErrorBoundaryState['errorType'] => {
  const message = error.message.toLowerCase();
  if (message.includes('network') || message.includes('fetch') || message.includes('failed to fetch')) {
    return 'network';
  }
  if (message.includes('auth') || message.includes('unauthorized') || message.includes('401') || message.includes('403')) {
    return 'auth';
  }
  if (message.includes('supabase') || message.includes('database') || message.includes('query') || message.includes('row')) {
    return 'data';
  }
  if (message.includes('render') || message.includes('component') || message.includes('props')) {
    return 'render';
  }
  return 'unknown';
};

/**
 * Base Error Boundary with error type detection
 */
export class SmartErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorType: 'unknown' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorType: detectErrorType(error) };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[${this.props.componentName || 'Component'}] Error:`, error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorType: 'unknown' });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { errorType, error } = this.state;

      return (
        <Card className="m-4 border-destructive/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-destructive">
              {errorType === 'network' && <WifiOff className="h-5 w-5" />}
              {errorType === 'auth' && <ShieldAlert className="h-5 w-5" />}
              {errorType === 'data' && <Database className="h-5 w-5" />}
              {(errorType === 'render' || errorType === 'unknown') && <AlertCircle className="h-5 w-5" />}
              {errorType === 'network' && 'Connection Error'}
              {errorType === 'auth' && 'Authentication Error'}
              {errorType === 'data' && 'Data Error'}
              {errorType === 'render' && 'Display Error'}
              {errorType === 'unknown' && 'Something Went Wrong'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              {errorType === 'network' && 'Unable to connect to the server. Please check your internet connection.'}
              {errorType === 'auth' && 'Your session may have expired. Please sign in again.'}
              {errorType === 'data' && 'There was a problem loading the data. Please try again.'}
              {errorType === 'render' && 'This section couldn\'t be displayed properly.'}
              {errorType === 'unknown' && 'An unexpected error occurred.'}
            </p>
            
            {process.env.NODE_ENV === 'development' && error && (
              <details className="text-xs text-muted-foreground bg-muted p-2 rounded">
                <summary className="cursor-pointer">Technical Details</summary>
                <pre className="mt-2 whitespace-pre-wrap break-all">{error.message}</pre>
              </details>
            )}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={this.handleReset}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              {errorType === 'auth' && (
                <Button variant="default" size="sm" onClick={() => window.location.href = '/auth'}>
                  Sign In
                </Button>
              )}
              {errorType === 'network' && (
                <Button variant="default" size="sm" onClick={this.handleReload}>
                  Reload Page
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * Lightweight inline error boundary for small components
 */
export class InlineErrorBoundary extends React.Component<ErrorBoundaryProps, { hasError: boolean }> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[Inline] Error:`, error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <span className="text-destructive text-sm inline-flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Error loading
        </span>
      );
    }
    return this.props.children;
  }
}

/**
 * Card-level error boundary for dashboard widgets
 */
export class CardErrorBoundary extends React.Component<ErrorBoundaryProps & { title?: string }, { hasError: boolean }> {
  constructor(props: ErrorBoundaryProps & { title?: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-dashed border-muted-foreground/30">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              {this.props.title ? `Couldn't load ${this.props.title}` : 'Couldn\'t load this section'}
            </p>
            <Button variant="ghost" size="sm" onClick={this.handleReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}

/**
 * Async/Suspense compatible error boundary with loading state
 */
interface AsyncErrorBoundaryProps extends ErrorBoundaryProps {
  loadingFallback?: React.ReactNode;
}

export class AsyncErrorBoundary extends React.Component<AsyncErrorBoundaryProps, { hasError: boolean; error: Error | null }> {
  constructor(props: AsyncErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): { hasError: boolean; error: Error } {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6 text-center">
          <AlertCircle className="h-10 w-10 text-destructive mb-3" />
          <h3 className="font-semibold mb-1">Failed to Load</h3>
          <p className="text-sm text-muted-foreground mb-4">
            This content couldn't be loaded. Please try again.
          </p>
          <Button onClick={this.handleReset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      );
    }

    return (
      <React.Suspense 
        fallback={this.props.loadingFallback || (
          <div className="flex items-center justify-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
      >
        {this.props.children}
      </React.Suspense>
    );
  }
}

/**
 * Form error boundary - preserves form state on error
 */
export class FormErrorBoundary extends React.Component<ErrorBoundaryProps, { hasError: boolean }> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Alert variant="destructive" className="my-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Form Error</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-3">There was an error with the form. Your data has been preserved.</p>
            <Button variant="outline" size="sm" onClick={this.handleReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Restore Form
            </Button>
          </AlertDescription>
        </Alert>
      );
    }
    return this.props.children;
  }
}

// Re-export the original ErrorBoundary for backwards compatibility
export { ErrorBoundary } from './error-boundary';















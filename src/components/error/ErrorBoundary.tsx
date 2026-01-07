import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  resetKeys?: any[];
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary - Catches JavaScript errors in child component tree
 * 
 * @example
 * <ErrorBoundary onError={(error) => logToService(error)}>
 *   <MyComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Log to error tracking service (e.g., Sentry)
    // You can integrate with your preferred error tracking here
    this.logErrorToService(error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    // Reset error state if resetKeys change
    if (this.state.hasError && this.props.resetKeys) {
      const hasResetKeyChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );
      if (hasResetKeyChanged) {
        this.resetError();
      }
    }
  }

  logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // Integration point for error tracking services
    // Example: Sentry.captureException(error, { extra: errorInfo });
    
    // For now, store in localStorage for debugging
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        url: window.location.href,
        userAgent: navigator.userAgent,
      };
      
      const existingLogs = JSON.parse(localStorage.getItem('error_logs') || '[]');
      existingLogs.push(errorLog);
      
      // Keep only last 10 errors
      if (existingLogs.length > 10) {
        existingLogs.shift();
      }
      
      localStorage.setItem('error_logs', JSON.stringify(existingLogs));
    } catch (e) {
      // Silently fail if localStorage is not available
    }
  };

  resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <DefaultErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
          showDetails={this.props.showDetails}
        />
      );
    }

    return this.props.children;
  }
}

interface FallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  resetError: () => void;
  showDetails?: boolean;
}

/**
 * Default error fallback UI
 */
export const DefaultErrorFallback: React.FC<FallbackProps> = ({
  error,
  errorInfo,
  resetError,
  showDetails = process.env.NODE_ENV === 'development',
}) => {
  const [showStack, setShowStack] = React.useState(false);

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-destructive/50">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-xl text-destructive">
            Something went wrong
          </CardTitle>
          <CardDescription>
            An unexpected error occurred. Our team has been notified.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <code className="text-destructive font-mono">
                {error.message || 'Unknown error'}
              </code>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={resetError} className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = '/home')}
              className="flex-1"
            >
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </div>

          {showDetails && errorInfo && (
            <div className="pt-4 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowStack(!showStack)}
                className="text-muted-foreground text-xs"
              >
                <Bug className="mr-1 h-3 w-3" />
                {showStack ? 'Hide' : 'Show'} Technical Details
              </Button>
              
              {showStack && (
                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-48 font-mono">
                  {error?.stack}
                  {'\n\nComponent Stack:'}
                  {errorInfo.componentStack}
                </pre>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Minimal error fallback for smaller components
 */
export const MinimalErrorFallback: React.FC<{ resetError?: () => void }> = ({
  resetError,
}) => (
  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
    <AlertTriangle className="h-5 w-5 text-destructive mx-auto mb-2" />
    <p className="text-sm text-destructive mb-2">Failed to load</p>
    {resetError && (
      <Button variant="ghost" size="sm" onClick={resetError}>
        <RefreshCw className="mr-1 h-3 w-3" />
        Retry
      </Button>
    )}
  </div>
);

/**
 * HOC to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const ComponentWithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary fallback={fallback}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

  return ComponentWithErrorBoundary;
}

export default ErrorBoundary;






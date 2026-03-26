import React from "react";
import { AlertCircle, RefreshCw, Home, ArrowLeft, Bug, Copy, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { captureError } from "@/lib/sentry";

// Error types for better categorization
type ErrorType = 'network' | 'auth' | 'validation' | 'notfound' | 'permission' | 'unknown';

interface ErrorInfo {
  type: ErrorType;
  title: string;
  description: string;
  suggestion: string;
  canRetry: boolean;
}

const getErrorInfo = (error: Error): ErrorInfo => {
  const message = error.message.toLowerCase();
  
  if (message.includes('network') || message.includes('fetch') || message.includes('failed to load')) {
    return {
      type: 'network',
      title: 'Connection Problem',
      description: 'Unable to connect to the server. Please check your internet connection.',
      suggestion: 'Try refreshing the page or check your network settings.',
      canRetry: true
    };
  }
  
  if (message.includes('auth') || message.includes('unauthorized') || message.includes('jwt')) {
    return {
      type: 'auth',
      title: 'Authentication Error',
      description: 'Your session may have expired or you need to sign in again.',
      suggestion: 'Please sign in again to continue.',
      canRetry: false
    };
  }
  
  if (message.includes('permission') || message.includes('forbidden') || message.includes('access denied')) {
    return {
      type: 'permission',
      title: 'Access Denied',
      description: "You don't have permission to access this resource.",
      suggestion: 'Contact an administrator if you believe this is an error.',
      canRetry: false
    };
  }
  
  if (message.includes('not found') || message.includes('404')) {
    return {
      type: 'notfound',
      title: 'Not Found',
      description: 'The requested resource could not be found.',
      suggestion: 'The page may have been moved or deleted.',
      canRetry: false
    };
  }
  
  if (message.includes('validation') || message.includes('invalid')) {
    return {
      type: 'validation',
      title: 'Invalid Data',
      description: 'The data provided is invalid or incomplete.',
      suggestion: 'Please check your input and try again.',
      canRetry: true
    };
  }
  
  return {
    type: 'unknown',
    title: 'Something Went Wrong',
    description: 'An unexpected error occurred.',
    suggestion: 'Please try again or contact support if the problem persists.',
    canRetry: true
  };
};

const getErrorIcon = (type: ErrorType) => {
  const iconClass = "h-12 w-12";
  switch (type) {
    case 'network':
      return <div className={`${iconClass} text-orange-500`}>📡</div>;
    case 'auth':
      return <div className={`${iconClass} text-yellow-500`}>🔐</div>;
    case 'permission':
      return <div className={`${iconClass} text-red-500`}>🚫</div>;
    case 'notfound':
      return <div className={`${iconClass} text-gray-500`}>🔍</div>;
    case 'validation':
      return <div className={`${iconClass} text-blue-500`}>📝</div>;
    default:
      return <AlertCircle className={`${iconClass} text-red-500`} />;
  }
};

interface EnhancedErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showDetails?: boolean;
}

interface EnhancedErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  copied: boolean;
}

export class EnhancedErrorBoundary extends React.Component<EnhancedErrorBoundaryProps, EnhancedErrorBoundaryState> {
  constructor(props: EnhancedErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, copied: false };
  }

  static getDerivedStateFromError(error: Error): Partial<EnhancedErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 Error caught by boundary:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // Log to error tracking service (could be Sentry, etc.)
    this.logError(error, errorInfo);
  }

  logError = (error: Error, errorInfo: React.ErrorInfo) => {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    console.log('📊 Error Report:', errorReport);
    captureError(error, { ...errorReport, source: 'EnhancedErrorBoundary' });
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, copied: false });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleGoBack = () => {
    window.history.back();
  };

  handleCopyError = () => {
    if (this.state.error) {
      const errorText = `Error: ${this.state.error.message}\n\nStack: ${this.state.error.stack}\n\nComponent Stack: ${this.state.errorInfo?.componentStack}`;
      navigator.clipboard.writeText(errorText);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorInfo = getErrorInfo(this.state.error);

      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full shadow-xl">
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-4">
                {getErrorIcon(errorInfo.type)}
              </div>
              <CardTitle className="text-2xl">{errorInfo.title}</CardTitle>
              <CardDescription className="text-base mt-2">
                {errorInfo.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Suggestion */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  💡 <strong>Suggestion:</strong> {errorInfo.suggestion}
                </p>
              </div>
              
              {/* Error Details (collapsible) */}
              {this.props.showDetails !== false && (
                <details className="group">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-2">
                    <Bug className="h-4 w-4" />
                    Technical Details
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <pre className="text-xs overflow-auto max-h-32 text-red-600 dark:text-red-400">
                      {this.state.error.message}
                    </pre>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-2"
                      onClick={this.handleCopyError}
                    >
                      {this.state.copied ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Error Details
                        </>
                      )}
                    </Button>
                  </div>
                </details>
              )}
            </CardContent>
            
            <CardFooter className="flex flex-wrap gap-2 justify-center">
              {errorInfo.canRetry && (
                <Button onClick={this.handleReset} variant="default">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              )}
              <Button onClick={this.handleReload} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Page
              </Button>
              <Button onClick={this.handleGoBack} variant="ghost">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
              <Button onClick={this.handleGoHome} variant="ghost">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to trigger errors
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);
  
  if (error) {
    throw error;
  }
  
  return {
    throwError: (error: Error) => setError(error),
    clearError: () => setError(null)
  };
};

// Async error boundary wrapper
export const AsyncBoundary: React.FC<{
  children: React.ReactNode;
  loadingFallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
}> = ({ children, loadingFallback, errorFallback }) => {
  return (
    <EnhancedErrorBoundary fallback={errorFallback}>
      <React.Suspense fallback={loadingFallback || <DefaultLoadingFallback />}>
        {children}
      </React.Suspense>
    </EnhancedErrorBoundary>
  );
};

const DefaultLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
  </div>
);

export default EnhancedErrorBoundary;


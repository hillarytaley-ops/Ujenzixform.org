import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, MessageCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { logError } from '@/utils/errorHandler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isChunkError: boolean;
  isAutoReloading: boolean;
}

// Key for tracking reload attempts in sessionStorage
const CHUNK_ERROR_RELOAD_KEY = 'ujenzixform_chunk_reload_attempt';
const CHUNK_ERROR_TIMESTAMP_KEY = 'ujenzixform_chunk_reload_timestamp';

/**
 * Check if error is a chunk loading error (stale deployment)
 */
function isChunkLoadingError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('loading chunk') ||
    message.includes('loading css chunk') ||
    message.includes('failed to load module script') ||
    (message.includes('mime type') && message.includes('text/html'))
  );
}

/**
 * Clear all caches (service worker, browser cache)
 */
async function clearAllCaches(): Promise<void> {
  console.log('🧹 Clearing all caches...');
  
  // Clear service worker caches
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          console.log(`🗑️ Deleting cache: ${cacheName}`);
          return caches.delete(cacheName);
        })
      );
      console.log('✅ Service worker caches cleared');
    } catch (e) {
      console.warn('Failed to clear caches:', e);
    }
  }
  
  // Unregister service workers
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log('✅ Service worker unregistered');
      }
    } catch (e) {
      console.warn('Failed to unregister service workers:', e);
    }
  }
  
  // Clear localStorage items related to caching (but preserve auth)
  const keysToPreserve = ['supabase.auth.token', 'sb-', 'user_role', 'staff_'];
  Object.keys(localStorage).forEach(key => {
    const shouldPreserve = keysToPreserve.some(prefix => key.includes(prefix));
    if (!shouldPreserve && key.includes('cache')) {
      localStorage.removeItem(key);
    }
  });
}

/**
 * Check if we should auto-reload (prevent infinite loops)
 */
function shouldAutoReload(): boolean {
  const lastAttempt = sessionStorage.getItem(CHUNK_ERROR_TIMESTAMP_KEY);
  const attemptCount = parseInt(sessionStorage.getItem(CHUNK_ERROR_RELOAD_KEY) || '0', 10);
  
  // Don't auto-reload if we've already tried 2 times in this session
  if (attemptCount >= 2) {
    console.log('⚠️ Max auto-reload attempts reached');
    return false;
  }
  
  // Don't auto-reload if we just tried within the last 10 seconds
  if (lastAttempt) {
    const timeSinceLastAttempt = Date.now() - parseInt(lastAttempt, 10);
    if (timeSinceLastAttempt < 10000) {
      console.log('⚠️ Too soon since last reload attempt');
      return false;
    }
  }
  
  return true;
}

/**
 * Mark that we're attempting a reload
 */
function markReloadAttempt(): void {
  const currentCount = parseInt(sessionStorage.getItem(CHUNK_ERROR_RELOAD_KEY) || '0', 10);
  sessionStorage.setItem(CHUNK_ERROR_RELOAD_KEY, String(currentCount + 1));
  sessionStorage.setItem(CHUNK_ERROR_TIMESTAMP_KEY, String(Date.now()));
}

/**
 * Global Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 * Automatically handles chunk loading errors from stale deployments
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isChunkError: false,
      isAutoReloading: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const isChunk = isChunkLoadingError(error);
    return { 
      hasError: true, 
      error,
      isChunkError: isChunk
    };
  }

  async componentDidCatch(error: Error, errorInfo: ErrorInfo): Promise<void> {
    this.setState({ errorInfo });
    logError(error, `ErrorBoundary: ${errorInfo.componentStack}`);
    
    // Handle chunk loading errors automatically
    if (isChunkLoadingError(error)) {
      console.log('🔄 Chunk loading error detected - attempting automatic recovery...');
      
      if (shouldAutoReload()) {
        this.setState({ isAutoReloading: true });
        markReloadAttempt();
        
        try {
          await clearAllCaches();
          
          // Small delay to ensure caches are cleared
          setTimeout(() => {
            console.log('🔄 Reloading page with fresh assets...');
            // Force reload bypassing cache
            window.location.href = window.location.href.split('?')[0] + '?_refresh=' + Date.now();
          }, 500);
        } catch (e) {
          console.error('Failed to clear caches:', e);
          this.setState({ isAutoReloading: false });
        }
      }
    }
  }

  handleRefresh = (): void => {
    window.location.reload();
  };

  handleHardRefresh = async (): Promise<void> => {
    await clearAllCaches();
    // Reset reload counter since this is manual
    sessionStorage.removeItem(CHUNK_ERROR_RELOAD_KEY);
    sessionStorage.removeItem(CHUNK_ERROR_TIMESTAMP_KEY);
    window.location.href = window.location.href.split('?')[0] + '?_refresh=' + Date.now();
  };

  handleGoHome = (): void => {
    window.location.href = '/home';
  };

  handleContactSupport = (): void => {
    window.location.href = '/contact';
  };

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null, isChunkError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Show auto-reloading message for chunk errors
      if (this.state.isChunkError && this.state.isAutoReloading) {
        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <Card className="max-w-lg w-full bg-slate-800/50 border-blue-700 shadow-2xl">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
                  <Zap className="h-8 w-8 text-blue-400 animate-pulse" />
                </div>
                <CardTitle className="text-2xl text-white">App Updated!</CardTitle>
                <CardDescription className="text-slate-300 text-base">
                  A new version is available. Loading fresh content...
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                  <span className="text-slate-400">Updating...</span>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      }

      // Show chunk error UI with manual refresh option
      if (this.state.isChunkError) {
        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <Card className="max-w-lg w-full bg-slate-800/50 border-blue-700 shadow-2xl">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
                  <Zap className="h-8 w-8 text-blue-400" />
                </div>
                <CardTitle className="text-2xl text-white">App Updated!</CardTitle>
                <CardDescription className="text-slate-300 text-base">
                  A new version of UjenziXform is available. Please refresh to get the latest features.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4">
                  <p className="text-blue-300 text-sm">
                    💡 This happens when we deploy updates. Click the button below to load the new version.
                  </p>
                </div>

                <div className="grid gap-3">
                  <Button
                    onClick={this.handleHardRefresh}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    size="lg"
                  >
                    <RefreshCw className="h-5 w-5 mr-2" />
                    Load New Version
                  </Button>
                  
                  <Button
                    onClick={this.handleGoHome}
                    variant="outline"
                    className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Go to Home
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      }

      // Custom fallback UI for other errors
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full bg-slate-800/50 border-slate-700 shadow-2xl">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
              <CardTitle className="text-2xl text-white">Oops! Something went wrong</CardTitle>
              <CardDescription className="text-slate-400 text-base">
                We're sorry, but something unexpected happened. Our team has been notified.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Error details (only in development) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-4">
                  <p className="text-red-400 text-sm font-mono break-all">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={this.handleRetry}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  onClick={this.handleRefresh}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Page
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
                <Button
                  onClick={this.handleContactSupport}
                  variant="outline"
                  className="border-blue-600 text-blue-400 hover:bg-blue-900/30"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
              </div>

              {/* Help text */}
              <p className="text-center text-sm text-slate-500">
                If this problem persists, please contact our support team.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary wrapper for functional components
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
): React.FC<P> {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;

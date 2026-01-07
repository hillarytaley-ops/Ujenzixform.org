import React, { Suspense, ReactNode } from 'react';
import { ErrorBoundary, MinimalErrorFallback } from './ErrorBoundary';
import { Loader2 } from 'lucide-react';

interface AsyncBoundaryProps {
  children: ReactNode;
  loadingFallback?: ReactNode;
  errorFallback?: ReactNode;
  onError?: (error: Error) => void;
}

/**
 * Default loading spinner
 */
const DefaultLoadingFallback = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

/**
 * AsyncErrorBoundary - Combines Suspense and ErrorBoundary for async components
 * 
 * Use this for lazy-loaded components or components that fetch data
 * 
 * @example
 * <AsyncErrorBoundary>
 *   <LazyLoadedComponent />
 * </AsyncErrorBoundary>
 */
export const AsyncErrorBoundary: React.FC<AsyncBoundaryProps> = ({
  children,
  loadingFallback = <DefaultLoadingFallback />,
  errorFallback,
  onError,
}) => {
  return (
    <ErrorBoundary
      fallback={errorFallback || <MinimalErrorFallback />}
      onError={(error) => onError?.(error)}
    >
      <Suspense fallback={loadingFallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

/**
 * Page-level async boundary with full-page loading
 */
export const PageAsyncBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <AsyncErrorBoundary
    loadingFallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading page...</p>
        </div>
      </div>
    }
  >
    {children}
  </AsyncErrorBoundary>
);

/**
 * Card-level async boundary
 */
export const CardAsyncBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <AsyncErrorBoundary
    loadingFallback={
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    }
  >
    {children}
  </AsyncErrorBoundary>
);

export default AsyncErrorBoundary;






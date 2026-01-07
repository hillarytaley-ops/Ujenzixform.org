/**
 * Error Boundary Components
 * 
 * Provides error handling for React components to prevent entire app crashes
 * 
 * @example Basic usage
 * import { ErrorBoundary } from '@/components/error';
 * 
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 * 
 * @example With async components
 * import { AsyncErrorBoundary } from '@/components/error';
 * 
 * <AsyncErrorBoundary>
 *   <LazyComponent />
 * </AsyncErrorBoundary>
 * 
 * @example HOC pattern
 * import { withErrorBoundary } from '@/components/error';
 * 
 * const SafeComponent = withErrorBoundary(MyComponent);
 */

export { 
  ErrorBoundary, 
  DefaultErrorFallback, 
  MinimalErrorFallback,
  withErrorBoundary 
} from './ErrorBoundary';

export { 
  AsyncErrorBoundary, 
  PageAsyncBoundary, 
  CardAsyncBoundary 
} from './AsyncErrorBoundary';






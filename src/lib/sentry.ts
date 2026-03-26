/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   🐛 SENTRY ERROR MONITORING - UjenziXform                                             ║
 * ║                                                                                      ║
 * ║   CREATED: January 22, 2026                                                          ║
 * ║   SETUP:                                                                             ║
 * ║   1. Create account at https://sentry.io                                             ║
 * ║   2. Create a React project                                                          ║
 * ║   3. Get your DSN and add to .env: VITE_SENTRY_DSN=https://xxx@sentry.io/xxx        ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import * as Sentry from '@sentry/react';

// Check if we're in production
const isProduction = import.meta.env.PROD;
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

/**
 * Initialize Sentry error monitoring
 * Call this in main.tsx before rendering the app
 */
export const initSentry = () => {
  if (!SENTRY_DSN) {
    if (isProduction) {
      console.warn('⚠️ Sentry DSN not configured. Error monitoring disabled.');
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Environment
    environment: isProduction ? 'production' : 'development',
    
    // Release version (update with each deployment)
    release: `ujenzipro@${import.meta.env.VITE_APP_VERSION || '2.0.0'}`,
    
    // Integrations
    integrations: [
      // Browser tracing for performance monitoring
      Sentry.browserTracingIntegration(),
      // Replay for session recording on errors
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    
    // Performance monitoring - sample 10% of transactions
    tracesSampleRate: isProduction ? 0.1 : 1.0,
    
    // Session replay - capture 10% of sessions, 100% on error
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // Filter out noisy errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'canvas.contentDocument',
      'atomicFindClose',
      // Facebook borked
      'fb_xd_fragment',
      // Chrome extensions
      'chrome-extension://',
      // Safari extensions  
      'safari-extension://',
      // Network errors (handled separately)
      'NetworkError',
      'Failed to fetch',
      'Load failed',
      // User cancelled
      'AbortError',
      // Resize observer (common React issue, usually harmless)
      'ResizeObserver loop',
    ],
    
    // Don't send PII by default
    sendDefaultPii: false,
    
    // Before sending, scrub sensitive data
    beforeSend(event) {
      // Remove any potential PII from URLs
      if (event.request?.url) {
        event.request.url = event.request.url.replace(/token=[^&]+/g, 'token=REDACTED');
        event.request.url = event.request.url.replace(/password=[^&]+/g, 'password=REDACTED');
      }
      
      // Don't send errors in development unless explicitly enabled
      if (!isProduction && !import.meta.env.VITE_SENTRY_DEV_ENABLED) {
        return null;
      }
      
      return event;
    },
  });

  console.log('✅ Sentry initialized for error monitoring');
  
  // Expose test function globally for debugging (only in production)
  if (isProduction) {
    (window as any).testSentry = () => {
      const testError = new Error('🧪 Test error from UjenziXform - ' + new Date().toISOString());
      Sentry.captureException(testError);
      console.log('✅ Test error sent to Sentry! Check your dashboard in 1-2 minutes.');
      return 'Error sent!';
    };
    console.log('💡 To test Sentry, type: testSentry()');
  }
};

/**
 * Capture a custom error with context
 */
export const captureError = (error: Error, context?: Record<string, unknown>) => {
  if (!SENTRY_DSN) return;
  Sentry.captureException(error, {
    extra: context,
  });
};

/**
 * Capture a custom message
 */
export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  if (!SENTRY_DSN) return;
  Sentry.captureMessage(message, level);
};

/**
 * Set user context for error tracking
 * Call this after user logs in
 */
export const setUserContext = (user: { id: string; email?: string; role?: string }) => {
  if (!SENTRY_DSN) return;
  Sentry.setUser({
    id: user.id,
    email: user.email,
    // Custom data
    role: user.role,
  });
};

/**
 * Clear user context on logout
 */
export const clearUserContext = () => {
  if (!SENTRY_DSN) return;
  Sentry.setUser(null);
};

/**
 * Add breadcrumb for debugging
 */
export const addBreadcrumb = (
  message: string,
  category: string,
  data?: Record<string, unknown>
) => {
  if (!SENTRY_DSN) return;
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
};

/**
 * Start a performance transaction
 */
export const startTransaction = (name: string, op: string) => {
  if (!SENTRY_DSN) return undefined;
  return Sentry.startInactiveSpan({
    name,
    op,
  });
};

/**
 * Wrap a component with Sentry error boundary
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;

/**
 * HOC to wrap routes with Sentry
 */
export const withSentryRouting = Sentry.withSentryRouting;

// Export Sentry for direct access if needed
export { Sentry };


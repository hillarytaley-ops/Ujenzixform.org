/**
 * Error Tracking Utility
 * 
 * Centralized error tracking that can integrate with Sentry or other services.
 * Currently stores errors in Supabase for analysis.
 * 
 * Usage:
 * import { captureError, captureMessage } from '@/utils/errorTracking';
 * captureError(error, { component: 'UserForm' });
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  userEmail?: string;
  metadata?: Record<string, unknown>;
}

interface BrowserInfo {
  name: string;
  version: string;
  os: string;
  mobile: boolean;
}

/**
 * Get browser information
 */
const getBrowserInfo = (): BrowserInfo => {
  const ua = navigator.userAgent;
  let browserName = 'Unknown';
  let browserVersion = '';
  let os = 'Unknown';
  const mobile = /Mobile|Android|iPhone|iPad/.test(ua);

  // Detect browser
  if (ua.includes('Firefox')) {
    browserName = 'Firefox';
    browserVersion = ua.match(/Firefox\/(\d+)/)?.[1] || '';
  } else if (ua.includes('Chrome')) {
    browserName = 'Chrome';
    browserVersion = ua.match(/Chrome\/(\d+)/)?.[1] || '';
  } else if (ua.includes('Safari')) {
    browserName = 'Safari';
    browserVersion = ua.match(/Version\/(\d+)/)?.[1] || '';
  } else if (ua.includes('Edge')) {
    browserName = 'Edge';
    browserVersion = ua.match(/Edge\/(\d+)/)?.[1] || '';
  }

  // Detect OS
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return { name: browserName, version: browserVersion, os, mobile };
};

/**
 * Get device information
 */
const getDeviceInfo = () => {
  return {
    screen_width: window.screen.width,
    screen_height: window.screen.height,
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    pixel_ratio: window.devicePixelRatio,
    language: navigator.language,
    online: navigator.onLine,
    memory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
    cores: navigator.hardwareConcurrency,
  };
};

/**
 * Generate a unique session ID
 */
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('error_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('error_session_id', sessionId);
  }
  return sessionId;
};

/**
 * Generate a unique request ID
 */
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Capture and log an error
 */
export const captureError = async (
  error: Error | unknown,
  context: ErrorContext = {}
): Promise<void> => {
  const err = error instanceof Error ? error : new Error(String(error));
  
  // Log to console in development
  logger.error(`[ErrorTracking] ${err.message}`, { error: err, context });

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Prepare error data
    const errorData = {
      error_message: err.message,
      error_stack: err.stack,
      error_type: err.name,
      severity: 'error',
      user_id: context.userId || user?.id || null,
      user_email: context.userEmail || user?.email || null,
      page_url: window.location.href,
      user_agent: navigator.userAgent,
      browser_info: getBrowserInfo(),
      device_info: getDeviceInfo(),
      session_id: getSessionId(),
      request_id: generateRequestId(),
      metadata: {
        ...context.metadata,
        component: context.component,
        action: context.action,
        timestamp: new Date().toISOString(),
        referrer: document.referrer,
      },
    };

    // Insert into Supabase
    const { error: insertError } = await supabase
      .from('app_error_logs')
      .insert(errorData);

    if (insertError) {
      logger.warn('[ErrorTracking] Failed to save error to database', insertError);
    }
  } catch (trackingError) {
    // Don't let error tracking break the app
    logger.warn('[ErrorTracking] Error tracking failed', trackingError);
  }
};

/**
 * Capture a message (non-error event)
 */
export const captureMessage = async (
  message: string,
  level: 'debug' | 'info' | 'warning' | 'error' = 'info',
  context: ErrorContext = {}
): Promise<void> => {
  logger.info(`[ErrorTracking] ${message}`, { level, context });

  try {
    const { data: { user } } = await supabase.auth.getUser();

    const messageData = {
      error_message: message,
      error_type: 'message',
      severity: level,
      user_id: context.userId || user?.id || null,
      user_email: context.userEmail || user?.email || null,
      page_url: window.location.href,
      user_agent: navigator.userAgent,
      browser_info: getBrowserInfo(),
      device_info: getDeviceInfo(),
      session_id: getSessionId(),
      request_id: generateRequestId(),
      metadata: {
        ...context.metadata,
        component: context.component,
        action: context.action,
      },
    };

    await supabase.from('app_error_logs').insert(messageData);
  } catch (error) {
    logger.warn('[ErrorTracking] Failed to capture message', error);
  }
};

/**
 * Set user context for error tracking
 */
export const setUserContext = (userId: string, email?: string): void => {
  sessionStorage.setItem('error_tracking_user_id', userId);
  if (email) {
    sessionStorage.setItem('error_tracking_user_email', email);
  }
};

/**
 * Clear user context
 */
export const clearUserContext = (): void => {
  sessionStorage.removeItem('error_tracking_user_id');
  sessionStorage.removeItem('error_tracking_user_email');
};

/**
 * Track a performance metric
 */
export const trackPerformance = async (
  metricName: string,
  value: number,
  unit: string = 'ms'
): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('performance_metrics').insert({
      metric_name: metricName,
      metric_value: value,
      metric_unit: unit,
      page_url: window.location.href,
      user_id: user?.id || null,
      session_id: getSessionId(),
      device_type: getBrowserInfo().mobile ? 'mobile' : 'desktop',
      connection_type: (navigator as Navigator & { connection?: { effectiveType?: string } }).connection?.effectiveType || 'unknown',
    });
  } catch (error) {
    logger.warn('[ErrorTracking] Failed to track performance metric', error);
  }
};

/**
 * Track page load performance
 */
export const trackPageLoad = (): void => {
  if (typeof window !== 'undefined' && window.performance) {
    // Wait for page to fully load
    window.addEventListener('load', () => {
      setTimeout(() => {
        const timing = performance.timing;
        const metrics = {
          dns: timing.domainLookupEnd - timing.domainLookupStart,
          tcp: timing.connectEnd - timing.connectStart,
          ttfb: timing.responseStart - timing.requestStart,
          download: timing.responseEnd - timing.responseStart,
          domInteractive: timing.domInteractive - timing.navigationStart,
          domComplete: timing.domComplete - timing.navigationStart,
          loadComplete: timing.loadEventEnd - timing.navigationStart,
        };

        // Track each metric
        Object.entries(metrics).forEach(([name, value]) => {
          if (value > 0) {
            trackPerformance(`page_${name}`, value);
          }
        });
      }, 0);
    });
  }
};

/**
 * Initialize global error handlers
 */
export const initErrorTracking = (): void => {
  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    captureError(event.reason, {
      action: 'unhandledrejection',
      metadata: { type: 'promise_rejection' },
    });
  });

  // Global errors
  window.addEventListener('error', (event) => {
    captureError(event.error || event.message, {
      action: 'window_error',
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  // Track page load performance
  trackPageLoad();
};

export default {
  captureError,
  captureMessage,
  setUserContext,
  clearUserContext,
  trackPerformance,
  trackPageLoad,
  initErrorTracking,
};
















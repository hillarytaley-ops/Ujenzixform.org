/**
 * Utils Index
 * Central export point for utility functions
 */

// Logger utility
export { 
  logger, 
  authLogger, 
  apiLogger, 
  deliveryLogger, 
  adminLogger, 
  supplierLogger, 
  builderLogger 
} from './logger';

// Error tracking
export {
  captureError,
  captureMessage,
  setUserContext,
  clearUserContext,
  trackPerformance,
  trackPageLoad,
  initErrorTracking,
} from './errorTracking';

// Activity logger
export {
  logActivity,
  logLogin,
  logLogout,
  logSignup,
  logAdminAction,
  logUserAction,
  logContentChange,
  logOrderEvent,
  logDeliveryEvent,
  logSystemEvent,
} from './activityLogger';

// Security utilities
export { SecurityAudit } from './SecurityAudit';

// Session storage utilities
export * from './sessionStorage';
export * from './secureSessionStorage';

// Performance utilities
export * from './performance';

// Environment validation
export * from './envValidation';

// Route prefetching
export * from './routePrefetch';

// Correlation ID
export * from './correlationId';
















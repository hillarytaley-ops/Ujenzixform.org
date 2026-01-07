/**
 * Centralized Logger Utility
 * 
 * Replaces direct console.log/error/warn statements throughout the app.
 * In production, only errors and warnings are logged.
 * In development, all logs are shown with timestamps and categorization.
 * 
 * Usage:
 * import { logger } from '@/utils/logger';
 * logger.debug('Fetching data...', { userId: 123 });
 * logger.error('Failed to fetch', error);
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  category?: string;
  data?: unknown;
}

interface LoggerConfig {
  enabled: boolean;
  minLevel: LogLevel;
  persistToStorage: boolean;
  maxStoredLogs: number;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;

// Default configuration
const config: LoggerConfig = {
  enabled: true,
  minLevel: isDev ? 'debug' : 'warn',
  persistToStorage: isDev,
  maxStoredLogs: 50,
};

// Emoji prefixes for visual clarity in dev
const LOG_EMOJI: Record<LogLevel, string> = {
  debug: '🔍',
  info: 'ℹ️',
  warn: '⚠️',
  error: '❌',
};

// Color styles for console
const LOG_STYLES: Record<LogLevel, string> = {
  debug: 'color: #888; font-weight: normal;',
  info: 'color: #0066cc; font-weight: normal;',
  warn: 'color: #cc6600; font-weight: bold;',
  error: 'color: #cc0000; font-weight: bold;',
};

/**
 * Format timestamp for logs
 */
const formatTimestamp = (): string => {
  return new Date().toISOString();
};

/**
 * Check if we should log at this level
 */
const shouldLog = (level: LogLevel): boolean => {
  if (!config.enabled) return false;
  return LOG_LEVELS[level] >= LOG_LEVELS[config.minLevel];
};

/**
 * Persist log to localStorage (dev only, for debugging)
 */
const persistLog = (entry: LogEntry): void => {
  if (!config.persistToStorage || isProd) return;

  try {
    const key = 'app_debug_logs';
    const existingLogs: LogEntry[] = JSON.parse(localStorage.getItem(key) || '[]');
    existingLogs.push(entry);

    // Keep only the most recent logs
    if (existingLogs.length > config.maxStoredLogs) {
      existingLogs.splice(0, existingLogs.length - config.maxStoredLogs);
    }

    localStorage.setItem(key, JSON.stringify(existingLogs));
  } catch {
    // Silently fail if localStorage is not available
  }
};

/**
 * Create a log entry and output it
 */
const log = (level: LogLevel, message: string, data?: unknown, category?: string): void => {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    level,
    message,
    timestamp: formatTimestamp(),
    category,
    data,
  };

  // Console output
  const prefix = isDev ? `${LOG_EMOJI[level]} [${entry.timestamp}]` : `[${level.toUpperCase()}]`;
  const categoryPrefix = category ? `[${category}]` : '';
  const fullMessage = `${prefix}${categoryPrefix} ${message}`;

  if (isDev) {
    // Styled output in development
    if (data !== undefined) {
      console[level === 'debug' ? 'log' : level](
        `%c${fullMessage}`,
        LOG_STYLES[level],
        data
      );
    } else {
      console[level === 'debug' ? 'log' : level](
        `%c${fullMessage}`,
        LOG_STYLES[level]
      );
    }
  } else {
    // Simple output in production (only for warn/error)
    if (level === 'error') {
      console.error(fullMessage, data || '');
    } else if (level === 'warn') {
      console.warn(fullMessage, data || '');
    }
  }

  // Persist to storage
  persistLog(entry);
};

/**
 * Logger object with methods for each log level
 */
export const logger = {
  /**
   * Debug level - Development only
   * Use for detailed debugging information
   */
  debug: (message: string, data?: unknown, category?: string) => {
    log('debug', message, data, category);
  },

  /**
   * Info level - Development only
   * Use for general information
   */
  info: (message: string, data?: unknown, category?: string) => {
    log('info', message, data, category);
  },

  /**
   * Warn level - Always logged
   * Use for warnings that don't break functionality
   */
  warn: (message: string, data?: unknown, category?: string) => {
    log('warn', message, data, category);
  },

  /**
   * Error level - Always logged
   * Use for errors that need attention
   */
  error: (message: string, data?: unknown, category?: string) => {
    log('error', message, data, category);
  },

  /**
   * Create a scoped logger with a category prefix
   */
  scope: (category: string) => ({
    debug: (message: string, data?: unknown) => log('debug', message, data, category),
    info: (message: string, data?: unknown) => log('info', message, data, category),
    warn: (message: string, data?: unknown) => log('warn', message, data, category),
    error: (message: string, data?: unknown) => log('error', message, data, category),
  }),

  /**
   * Log a function execution with timing
   */
  time: async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = (performance.now() - start).toFixed(2);
      log('debug', `${label} completed in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = (performance.now() - start).toFixed(2);
      log('error', `${label} failed after ${duration}ms`, error);
      throw error;
    }
  },

  /**
   * Log an API call
   */
  api: (method: string, endpoint: string, data?: unknown) => {
    log('debug', `API ${method} ${endpoint}`, data, 'API');
  },

  /**
   * Log a Supabase query
   */
  supabase: (table: string, operation: string, data?: unknown) => {
    log('debug', `Supabase ${operation} on ${table}`, data, 'Supabase');
  },

  /**
   * Log authentication events
   */
  auth: (event: string, data?: unknown) => {
    log('info', `Auth: ${event}`, data, 'Auth');
  },

  /**
   * Log navigation events
   */
  navigation: (from: string, to: string) => {
    log('debug', `Navigation: ${from} → ${to}`, undefined, 'Navigation');
  },

  /**
   * Get stored logs (dev only)
   */
  getStoredLogs: (): LogEntry[] => {
    if (isProd) return [];
    try {
      return JSON.parse(localStorage.getItem('app_debug_logs') || '[]');
    } catch {
      return [];
    }
  },

  /**
   * Clear stored logs
   */
  clearStoredLogs: (): void => {
    try {
      localStorage.removeItem('app_debug_logs');
    } catch {
      // Silently fail
    }
  },

  /**
   * Update logger configuration
   */
  configure: (newConfig: Partial<LoggerConfig>): void => {
    Object.assign(config, newConfig);
  },
};

// Export scoped loggers for common categories
export const authLogger = logger.scope('Auth');
export const apiLogger = logger.scope('API');
export const deliveryLogger = logger.scope('Delivery');
export const adminLogger = logger.scope('Admin');
export const supplierLogger = logger.scope('Supplier');
export const builderLogger = logger.scope('Builder');

export default logger;
















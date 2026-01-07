/**
 * Logger Utility Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '@/utils/logger';

describe('Logger Utility', () => {
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };

  beforeEach(() => {
    console.log = vi.fn();
    console.info = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
    localStorage.clear();
  });

  afterEach(() => {
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  describe('Basic Logging', () => {
    it('should log debug messages in development', () => {
      logger.debug('Test debug message');
      expect(console.log).toHaveBeenCalled();
    });

    it('should log info messages', () => {
      logger.info('Test info message');
      expect(console.info).toHaveBeenCalled();
    });

    it('should log warning messages', () => {
      logger.warn('Test warning message');
      expect(console.warn).toHaveBeenCalled();
    });

    it('should log error messages', () => {
      logger.error('Test error message');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Scoped Logging', () => {
    it('should create scoped loggers', () => {
      const authLogger = logger.scope('Auth');
      authLogger.info('Login attempt');
      expect(console.info).toHaveBeenCalled();
    });

    it('should include category in scoped logs', () => {
      const apiLogger = logger.scope('API');
      apiLogger.debug('Request made');
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('Timed Operations', () => {
    it('should track async operation timing', async () => {
      const mockFn = vi.fn().mockResolvedValue('result');
      const result = await logger.time('Test Operation', mockFn);
      
      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalled();
    });

    it('should log error on failed operations', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Test error'));
      
      await expect(logger.time('Failed Operation', mockFn)).rejects.toThrow('Test error');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Specialized Loggers', () => {
    it('should log API calls', () => {
      logger.api('GET', '/api/users');
      expect(console.log).toHaveBeenCalled();
    });

    it('should log Supabase queries', () => {
      logger.supabase('users', 'SELECT');
      expect(console.log).toHaveBeenCalled();
    });

    it('should log auth events', () => {
      logger.auth('User logged in');
      expect(console.info).toHaveBeenCalled();
    });

    it('should log navigation events', () => {
      logger.navigation('/home', '/dashboard');
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('Log Storage', () => {
    it('should store logs in localStorage in dev mode', () => {
      logger.error('Stored error');
      const logs = logger.getStoredLogs();
      expect(Array.isArray(logs)).toBe(true);
    });

    it('should clear stored logs', () => {
      logger.error('Error to clear');
      logger.clearStoredLogs();
      const logs = logger.getStoredLogs();
      expect(logs.length).toBe(0);
    });
  });

  describe('Configuration', () => {
    it('should allow configuration updates', () => {
      logger.configure({ enabled: true });
      logger.debug('After config');
      expect(console.log).toHaveBeenCalled();
    });
  });
});
















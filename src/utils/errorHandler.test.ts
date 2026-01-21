import { describe, it, expect, vi } from 'vitest';
import { 
  parseError, 
  getUserFriendlyMessage, 
  handleErrorWithToast, 
  withRetry,
  safeAsync,
  logError 
} from './errorHandler';

describe('errorHandler', () => {
  describe('parseError', () => {
    it('should parse Error objects correctly', () => {
      const error = new Error('Test error message');
      const result = parseError(error);
      
      expect(result.message).toBe('Test error message');
      expect(result.type).toBe('UNKNOWN');
      expect(result.userMessage).toBeDefined();
    });

    it('should identify auth errors', () => {
      const error = new Error('Invalid login credentials');
      const result = parseError(error);
      
      expect(result.type).toBe('AUTH');
      expect(result.userMessage).toBe('Invalid email or password. Please try again.');
    });

    it('should identify network errors', () => {
      const error = new Error('Failed to fetch');
      const result = parseError(error);
      
      expect(result.type).toBe('NETWORK');
    });

    it('should identify permission errors', () => {
      const error = new Error('Access denied');
      const result = parseError(error);
      
      expect(result.type).toBe('PERMISSION');
    });

    it('should identify RLS policy errors', () => {
      const error = new Error('violates row-level security policy');
      const result = parseError(error);
      
      expect(result.type).toBe('PERMISSION');
      expect(result.userMessage).toContain('Access denied');
    });

    it('should handle string errors', () => {
      const result = parseError('Simple string error');
      
      expect(result.message).toBe('Simple string error');
    });

    it('should handle Supabase error objects', () => {
      const error = {
        code: '23505',
        message: 'duplicate key value violates unique constraint',
      };
      const result = parseError(error);
      
      expect(result.type).toBe('VALIDATION');
      expect(result.code).toBe('23505');
    });

    it('should handle payment errors', () => {
      const error = new Error('card_declined');
      const result = parseError(error);
      
      expect(result.type).toBe('PAYMENT');
    });

    it('should handle upload errors', () => {
      const error = new Error('File too large');
      const result = parseError(error);
      
      expect(result.type).toBe('UPLOAD');
      expect(result.userMessage).toContain('Maximum size');
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return user-friendly message for known errors', () => {
      const message = getUserFriendlyMessage(new Error('Email not confirmed'));
      expect(message).toBe('Please verify your email before signing in.');
    });

    it('should return generic message for unknown errors', () => {
      const message = getUserFriendlyMessage(new Error('Unknown error xyz'));
      expect(message).toBe('Something went wrong. Please try again.');
    });
  });

  describe('handleErrorWithToast', () => {
    it('should call toast with correct parameters', () => {
      const mockToast = vi.fn();
      const error = new Error('Test error');
      
      handleErrorWithToast(error, mockToast, 'TestContext');
      
      expect(mockToast).toHaveBeenCalledWith({
        title: expect.any(String),
        description: expect.any(String),
        variant: 'destructive',
      });
    });
  });

  describe('withRetry', () => {
    it('should return result on first success', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      
      const result = await withRetry(fn, 3, 10);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');
      
      const result = await withRetry(fn, 3, 10);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not retry auth errors', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Invalid login credentials'));
      
      await expect(withRetry(fn, 3, 10)).rejects.toThrow('Invalid login credentials');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should throw after max retries', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Network error'));
      
      await expect(withRetry(fn, 3, 10)).rejects.toThrow('Network error');
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('safeAsync', () => {
    it('should return result on success', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      
      const result = await safeAsync(fn);
      
      expect(result).toBe('success');
    });

    it('should return undefined on error', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Error'));
      
      const result = await safeAsync(fn);
      
      expect(result).toBeUndefined();
    });

    it('should return fallback on error', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Error'));
      
      const result = await safeAsync(fn, 'fallback');
      
      expect(result).toBe('fallback');
    });
  });

  describe('logError', () => {
    it('should log errors to console', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      logError(new Error('Test error'), 'TestContext');
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});


/**
 * Common Types Tests
 */

import { describe, it, expect } from 'vitest';
import {
  isNotNull,
  isNotUndefined,
  isDefined,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  STATUS_MAP,
  KENYA_COUNTIES,
} from '@/types';

describe('Type Guards', () => {
  describe('isNotNull', () => {
    it('should return true for non-null values', () => {
      expect(isNotNull('test')).toBe(true);
      expect(isNotNull(0)).toBe(true);
      expect(isNotNull(false)).toBe(true);
      expect(isNotNull({})).toBe(true);
      expect(isNotNull([])).toBe(true);
    });

    it('should return false for null', () => {
      expect(isNotNull(null)).toBe(false);
    });

    it('should return true for undefined (only checks null)', () => {
      expect(isNotNull(undefined)).toBe(true);
    });
  });

  describe('isNotUndefined', () => {
    it('should return true for non-undefined values', () => {
      expect(isNotUndefined('test')).toBe(true);
      expect(isNotUndefined(0)).toBe(true);
      expect(isNotUndefined(null)).toBe(true);
      expect(isNotUndefined(false)).toBe(true);
    });

    it('should return false for undefined', () => {
      expect(isNotUndefined(undefined)).toBe(false);
    });
  });

  describe('isDefined', () => {
    it('should return true for defined values', () => {
      expect(isDefined('test')).toBe(true);
      expect(isDefined(0)).toBe(true);
      expect(isDefined(false)).toBe(true);
      expect(isDefined('')).toBe(true);
    });

    it('should return false for null', () => {
      expect(isDefined(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isDefined(undefined)).toBe(false);
    });
  });
});

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create error with all properties', () => {
      const error = new AppError('Test error', 'TEST_ERROR', 500, { extra: 'data' });
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual({ extra: 'data' });
      expect(error.name).toBe('AppError');
    });

    it('should use default status code', () => {
      const error = new AppError('Test', 'TEST');
      expect(error.statusCode).toBe(500);
    });
  });

  describe('ValidationError', () => {
    it('should create validation error', () => {
      const error = new ValidationError('Invalid email', 'email');
      
      expect(error.message).toBe('Invalid email');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.details?.field).toBe('email');
      expect(error.name).toBe('ValidationError');
    });
  });

  describe('AuthenticationError', () => {
    it('should create auth error with default message', () => {
      const error = new AuthenticationError();
      
      expect(error.message).toBe('Authentication required');
      expect(error.code).toBe('AUTH_ERROR');
      expect(error.statusCode).toBe(401);
    });

    it('should create auth error with custom message', () => {
      const error = new AuthenticationError('Session expired');
      expect(error.message).toBe('Session expired');
    });
  });

  describe('AuthorizationError', () => {
    it('should create authorization error', () => {
      const error = new AuthorizationError();
      
      expect(error.message).toBe('Access denied');
      expect(error.code).toBe('FORBIDDEN');
      expect(error.statusCode).toBe(403);
    });
  });

  describe('NotFoundError', () => {
    it('should create not found error with default resource', () => {
      const error = new NotFoundError();
      expect(error.message).toBe('Resource not found');
    });

    it('should create not found error with custom resource', () => {
      const error = new NotFoundError('User');
      expect(error.message).toBe('User not found');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
    });
  });
});

describe('Constants', () => {
  describe('STATUS_MAP', () => {
    it('should have required statuses', () => {
      expect(STATUS_MAP.pending).toBeDefined();
      expect(STATUS_MAP.approved).toBeDefined();
      expect(STATUS_MAP.rejected).toBeDefined();
      expect(STATUS_MAP.active).toBeDefined();
      expect(STATUS_MAP.completed).toBeDefined();
    });

    it('should have label and color for each status', () => {
      Object.values(STATUS_MAP).forEach(status => {
        expect(status.label).toBeDefined();
        expect(status.color).toBeDefined();
        expect(status.bgColor).toBeDefined();
      });
    });
  });

  describe('KENYA_COUNTIES', () => {
    it('should have 47 counties', () => {
      expect(KENYA_COUNTIES.length).toBe(47);
    });

    it('should include major counties', () => {
      expect(KENYA_COUNTIES).toContain('Nairobi');
      expect(KENYA_COUNTIES).toContain('Mombasa');
      expect(KENYA_COUNTIES).toContain('Kisumu');
      expect(KENYA_COUNTIES).toContain('Nakuru');
    });

    it('should be sorted alphabetically', () => {
      const sorted = [...KENYA_COUNTIES].sort();
      expect(KENYA_COUNTIES).toEqual(sorted);
    });
  });
});
















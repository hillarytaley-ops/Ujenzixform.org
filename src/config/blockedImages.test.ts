/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   🧪 BLOCKED IMAGES TEST FILE                                                        ║
 * ║                                                                                      ║
 * ║   DATE: December 25, 2025                                                            ║
 * ║   PURPOSE: Test cases for blocked images validation                                  ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 * 
 * To run these tests:
 * 1. Install testing dependencies: npm install -D vitest @testing-library/react
 * 2. Run: npx vitest run src/config/blockedImages.test.ts
 */

import { describe, it, expect } from 'vitest';
import { 
  isBlockedImageUrl, 
  validateImageUrl, 
  getSafeImageUrl,
  BLOCKED_UNSPLASH_IDS,
  BLOCKED_URL_PATTERNS 
} from './blockedImages';

describe('blockedImages', () => {
  describe('isBlockedImageUrl', () => {
    it('should return true for blocked Unsplash IDs', () => {
      // Surveillance camera image
      expect(isBlockedImageUrl('https://images.unsplash.com/photo-1590856029826-c7a73142bbf1')).toBe(true);
      // Security camera image
      expect(isBlockedImageUrl('https://images.unsplash.com/photo-1587293852726-70cdb56c2866')).toBe(true);
    });

    it('should return true for URLs containing blocked patterns', () => {
      expect(isBlockedImageUrl('https://example.com/surveillance-cam.jpg')).toBe(true);
      expect(isBlockedImageUrl('https://example.com/cctv-footage.png')).toBe(true);
      expect(isBlockedImageUrl('https://example.com/security-camera.jpg')).toBe(true);
      expect(isBlockedImageUrl('https://example.com/monitoring-system.png')).toBe(true);
    });

    it('should return false for valid construction material images', () => {
      expect(isBlockedImageUrl('https://example.com/cement.jpg')).toBe(false);
      expect(isBlockedImageUrl('https://example.com/steel-bars.png')).toBe(false);
      expect(isBlockedImageUrl('/cement.png')).toBe(false);
      expect(isBlockedImageUrl('/steel.png')).toBe(false);
    });

    it('should return false for null/undefined URLs', () => {
      expect(isBlockedImageUrl(null)).toBe(false);
      expect(isBlockedImageUrl(undefined)).toBe(false);
      expect(isBlockedImageUrl('')).toBe(false);
    });
  });

  describe('validateImageUrl', () => {
    it('should return null for blocked URLs', () => {
      expect(validateImageUrl('https://images.unsplash.com/photo-1590856029826-c7a73142bbf1')).toBe(null);
    });

    it('should return null for invalid URL formats', () => {
      expect(validateImageUrl('invalid-url')).toBe(null);
      expect(validateImageUrl('ftp://example.com/image.jpg')).toBe(null);
    });

    it('should return the URL for valid URLs', () => {
      expect(validateImageUrl('/cement.png')).toBe('/cement.png');
      expect(validateImageUrl('https://example.com/cement.jpg')).toBe('https://example.com/cement.jpg');
      expect(validateImageUrl('data:image/svg+xml,...')).toBe('data:image/svg+xml,...');
    });
  });

  describe('getSafeImageUrl', () => {
    it('should return fallback for blocked URLs', () => {
      const fallback = '/fallback.png';
      expect(getSafeImageUrl('https://images.unsplash.com/photo-1590856029826-c7a73142bbf1', fallback)).toBe(fallback);
    });

    it('should return original URL for valid URLs', () => {
      const fallback = '/fallback.png';
      expect(getSafeImageUrl('/cement.png', fallback)).toBe('/cement.png');
    });

    it('should return fallback for null/undefined URLs', () => {
      const fallback = '/fallback.png';
      expect(getSafeImageUrl(null, fallback)).toBe(fallback);
      expect(getSafeImageUrl(undefined, fallback)).toBe(fallback);
    });
  });

  describe('constants', () => {
    it('should have blocked Unsplash IDs', () => {
      expect(BLOCKED_UNSPLASH_IDS.length).toBeGreaterThan(0);
      expect(BLOCKED_UNSPLASH_IDS).toContain('photo-1590856029826-c7a73142bbf1');
      expect(BLOCKED_UNSPLASH_IDS).toContain('photo-1587293852726-70cdb56c2866');
    });

    it('should have blocked URL patterns', () => {
      expect(BLOCKED_URL_PATTERNS.length).toBeGreaterThan(0);
      expect(BLOCKED_URL_PATTERNS).toContain('surveillance');
      expect(BLOCKED_URL_PATTERNS).toContain('camera');
      expect(BLOCKED_URL_PATTERNS).toContain('cctv');
    });
  });
});









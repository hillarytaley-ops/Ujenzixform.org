/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   🚫 BLOCKED IMAGES CONFIGURATION - PROTECTED FILE                                   ║
 * ║                                                                                      ║
 * ║   ⚠️⚠️⚠️  CRITICAL SECURITY FILE - DO NOT MODIFY WITHOUT REVIEW  ⚠️⚠️⚠️              ║
 * ║                                                                                      ║
 * ║   CREATED: December 25, 2025                                                         ║
 * ║   PURPOSE: Block unwanted/incorrect images from appearing in the marketplace        ║
 * ║   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
 * ║                                                                                      ║
 * ║   BLOCKED IMAGE TYPES:                                                               ║
 * ║   ┌─────────────────────────────────────────────────────────────────────────────┐   ║
 * ║   │  1. Surveillance/CCTV camera images (incorrectly stored in DB)              │   ║
 * ║   │  2. Security monitoring equipment images                                    │   ║
 * ║   │  3. Any non-construction related images                                     │   ║
 * ║   └─────────────────────────────────────────────────────────────────────────────┘   ║
 * ║                                                                                      ║
 * ║   HOW TO ADD NEW BLOCKED IMAGES:                                                     ║
 * ║   1. Identify the Unsplash photo ID or URL pattern                                  ║
 * ║   2. Add to BLOCKED_UNSPLASH_IDS or BLOCKED_URL_PATTERNS array                      ║
 * ║   3. Test in development before deploying                                           ║
 * ║                                                                                      ║
 * ║   🚫 DO NOT:                                                                         ║
 * ║   - Remove existing blocked IDs without approval                                    ║
 * ║   - Modify the validation logic without testing                                     ║
 * ║   - Bypass this validation in any component                                         ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Blocked Unsplash photo IDs
 * These are specific photos that were incorrectly associated with construction materials
 */
export const BLOCKED_UNSPLASH_IDS: readonly string[] = [
  // Surveillance camera images - incorrectly stored for cement products
  'photo-1590856029826-c7a73142bbf1',
  'photo-1587293852726-70cdb56c2866',
  // Camera/surveillance equipment images
  'photo-1557597774-9d273605dfa9', // CCTV camera
  'photo-1558618666-fcd25c85cd64', // Security camera
  // Warehouse/storage images (not product-specific)
  'photo-1586528116311-ad8dd3c8310d', // Warehouse shelves
  'photo-1553413077-190dd305871c', // Warehouse interior
  // Add more blocked IDs here as needed
] as const;

/**
 * Blocked URL patterns (case-insensitive)
 * Any URL containing these patterns will be rejected
 */
export const BLOCKED_URL_PATTERNS: readonly string[] = [
  'surveillance',
  'camera',
  'cctv',
  'security-cam',
  'security_cam',
  'monitoring',
  'webcam',
  'ipcam',
  'nvr',
  'dvr',
  'spy',
  'hidden-cam',
] as const;

/**
 * Check if an image URL should be blocked
 * @param url - The image URL to validate
 * @returns true if the URL should be blocked, false if it's safe to use
 */
export const isBlockedImageUrl = (url: string | null | undefined): boolean => {
  if (!url) return false; // Empty URLs are not "blocked", just invalid
  
  const lowerUrl = url.toLowerCase();
  
  // Check against blocked Unsplash photo IDs
  for (const blockedId of BLOCKED_UNSPLASH_IDS) {
    if (url.includes(blockedId)) {
      console.warn(`[BlockedImages] Blocked Unsplash ID detected: ${blockedId}`);
      return true;
    }
  }
  
  // Check against blocked URL patterns
  for (const pattern of BLOCKED_URL_PATTERNS) {
    if (lowerUrl.includes(pattern)) {
      console.warn(`[BlockedImages] Blocked URL pattern detected: ${pattern}`);
      return true;
    }
  }
  
  return false;
};

/**
 * Validate and sanitize an image URL
 * Returns the original URL if valid, or null if blocked/invalid
 * @param url - The image URL to validate
 * @returns The validated URL or null
 */
export const validateImageUrl = (url: string | null | undefined): string | null => {
  if (!url || url.trim() === '') return null;
  
  // Block known bad URLs
  if (isBlockedImageUrl(url)) return null;
  
  // Validate URL format
  const isValidFormat = 
    url.startsWith('/') || 
    url.startsWith('http://') || 
    url.startsWith('https://') || 
    url.startsWith('data:');
  
  if (!isValidFormat) {
    console.warn(`[BlockedImages] Invalid URL format: ${url}`);
    return null;
  }
  
  return url;
};

/**
 * Get a safe image URL with fallback
 * @param url - The primary image URL
 * @param fallbackUrl - The fallback URL to use if primary is blocked/invalid
 * @returns A safe image URL
 */
export const getSafeImageUrl = (
  url: string | null | undefined, 
  fallbackUrl: string
): string => {
  const validatedUrl = validateImageUrl(url);
  return validatedUrl || fallbackUrl;
};

// Export type for the blocked IDs for type safety
export type BlockedUnsplashId = typeof BLOCKED_UNSPLASH_IDS[number];
export type BlockedUrlPattern = typeof BLOCKED_URL_PATTERNS[number];


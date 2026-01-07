/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   🖼️ IMAGE PRELOADER UTILITY - PROTECTED MODULE                                      ║
 * ║                                                                                      ║
 * ║   ⚠️⚠️⚠️  DO NOT MODIFY WITHOUT AUTHORIZATION  ⚠️⚠️⚠️                                ║
 * ║                                                                                      ║
 * ║   LAST VERIFIED: December 24, 2025                                                   ║
 * ║   AUTHORIZED BY: Project Owner                                                       ║
 * ║   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
 * ║                                                                                      ║
 * ║   PURPOSE:                                                                           ║
 * ║   - Preloads images in the background for instant display                           ║
 * ║   - Caches loaded images to prevent re-fetching                                     ║
 * ║   - Used by Navigation (hover preload) and MaterialsGrid                            ║
 * ║                                                                                      ║
 * ║   CRITICAL FUNCTIONS:                                                                ║
 * ║   - preloadImage(): Preloads a single image                                         ║
 * ║   - preloadImages(): Preloads multiple images in parallel                           ║
 * ║   - isImagePreloaded(): Checks if image is cached                                   ║
 * ║   - startSupplierImagePreload(): Preloads supplier page images                      ║
 * ║                                                                                      ║
 * ║   🚫 UNAUTHORIZED CHANGES WILL BE REVERTED                                           ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

// Cache of preloaded image URLs
const preloadedImages = new Set<string>();
const loadingImages = new Map<string, Promise<void>>();

/**
 * Preload a single image
 */
export const preloadImage = (src: string): Promise<void> => {
  // Skip if already loaded or invalid
  if (!src || src === '' || preloadedImages.has(src)) {
    return Promise.resolve();
  }
  
  // Return existing promise if already loading
  if (loadingImages.has(src)) {
    return loadingImages.get(src)!;
  }
  
  const promise = new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      preloadedImages.add(src);
      loadingImages.delete(src);
      resolve();
    };
    img.onerror = () => {
      loadingImages.delete(src);
      resolve(); // Resolve anyway to not block
    };
    img.src = src;
  });
  
  loadingImages.set(src, promise);
  return promise;
};

/**
 * Preload multiple images in parallel
 */
export const preloadImages = (urls: string[]): Promise<void[]> => {
  return Promise.all(urls.filter(Boolean).map(preloadImage));
};

/**
 * Check if an image is already preloaded
 */
export const isImagePreloaded = (src: string): boolean => {
  return preloadedImages.has(src);
};

/**
 * Default category images to preload for the suppliers page
 */
export const SUPPLIERS_PAGE_IMAGES = [
  '/cement.png',
  '/steel.png',
  '/tiles.png',
  '/paint.png',
  '/iron-sheets.png',
  '/timber.png',
  '/hardware.png',
  '/plumbing.png',
  '/electrical.png',
  '/roofing.png',
  '/aggregates.png',
  '/sand.png',
  '/blocks.png',
  '/tools.jpg',
];

/**
 * Preload all supplier page images
 */
export const preloadSupplierImages = (): Promise<void[]> => {
  return preloadImages(SUPPLIERS_PAGE_IMAGES);
};

/**
 * Start preloading supplier images in the background
 * Call this on app mount or when hovering over Suppliers link
 */
let preloadStarted = false;
export const startSupplierImagePreload = (): void => {
  if (preloadStarted) return;
  preloadStarted = true;
  
  // Use requestIdleCallback if available, otherwise setTimeout
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      preloadSupplierImages();
    });
  } else {
    setTimeout(() => {
      preloadSupplierImages();
    }, 100);
  }
};


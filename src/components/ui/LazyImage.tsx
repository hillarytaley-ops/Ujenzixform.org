/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   🖼️ LAZY IMAGE COMPONENT - PROTECTED IMAGE RENDERING                               ║
 * ║                                                                                      ║
 * ║   ⚠️⚠️⚠️  CRITICAL UI COMPONENT - DO NOT MODIFY WITHOUT REVIEW  ⚠️⚠️⚠️              ║
 * ║                                                                                      ║
 * ║   LAST VERIFIED: December 25, 2025                                                   ║
 * ║   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
 * ║                                                                                      ║
 * ║   IMAGE PROTECTION (December 25, 2025):                                              ║
 * ║   ┌─────────────────────────────────────────────────────────────────────────────┐   ║
 * ║   │  ✅ Uses centralized blocked images config (src/config/blockedImages.ts)    │   ║
 * ║   │  ✅ Blocks surveillance/camera images automatically                         │   ║
 * ║   │  ✅ Falls back to category-specific embedded SVG data URIs                  │   ║
 * ║   │  🚫 DO NOT bypass isBlockedImageUrl validation                              │   ║
 * ║   └─────────────────────────────────────────────────────────────────────────────┘   ║
 * ║                                                                                      ║
 * ║   FIX APPLIED: December 25, 2025                                                     ║
 * ║   - Simplified image loading to prevent disappearing images                         ║
 * ║   - Removed complex IntersectionObserver that caused re-rendering issues           ║
 * ║   - Images now load once and stay loaded                                           ║
 * ║                                                                                      ║
 * ║   IMAGE FALLBACK LAYERS (in order of priority):                                      ║
 * ║   ┌─────────────────────────────────────────────────────────────────────────────┐   ║
 * ║   │  1. Primary image URL (validated against blocked list)                      │   ║
 * ║   │  2. Candidate URLs (optimized versions: avif, webp)                         │   ║
 * ║   │  3. Category-specific embedded SVG data URI (NEVER fails)                   │   ║
 * ║   │  4. Default package icon fallback                                           │   ║
 * ║   └─────────────────────────────────────────────────────────────────────────────┘   ║
 * ║                                                                                      ║
 * ║   EMBEDDED DATA URIs:                                                                ║
 * ║   - Cement, Steel, Tiles, Paint, Timber, Hardware, Plumbing, Electrical            ║
 * ║   - Roofing, Tools, Sand, Aggregates, Stone, Glass, Windows, Doors, etc.           ║
 * ║   - These are inline SVGs that CANNOT fail to load                                 ║
 * ║                                                                                      ║
 * ║   🚫 DO NOT:                                                                         ║
 * ║   - Remove embedded fallback images (FALLBACK_IMAGES constant)                     ║
 * ║   - Change the fallback priority order                                             ║
 * ║   - Remove category-based image selection                                          ║
 * ║   - Bypass the isBlockedImageUrl validation                                        ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Package } from 'lucide-react';
import { isImagePreloaded } from '@/utils/imagePreloader';
import { isBlockedImageUrl } from '@/config/blockedImages';

// Global image cache - stores successfully loaded image URLs
const imageCache = new Set<string>();

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'sync' | 'auto';
  candidates?: string[];
  sources?: { type?: string; srcSet: string }[];
  sizes?: string;
  /** Category for fallback image (e.g., 'Cement', 'Steel') */
  category?: string;
  /** Show icon fallback instead of broken image */
  showIconFallback?: boolean;
}

// Embedded fallback images as data URIs - these will NEVER disappear
const FALLBACK_IMAGES: Record<string, string> = {
  // Simple colored placeholder with category initial
  default: 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <rect fill="#f3f4f6" width="400" height="400"/>
      <rect fill="#e5e7eb" x="50" y="50" width="300" height="300" rx="20"/>
      <text x="200" y="220" font-family="Arial,sans-serif" font-size="120" fill="#9ca3af" text-anchor="middle">📦</text>
    </svg>
  `),
  cement: 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <rect fill="#fef3c7" width="400" height="400"/>
      <rect fill="#fbbf24" x="100" y="150" width="200" height="150" rx="10"/>
      <text x="200" y="245" font-family="Arial,sans-serif" font-size="80" fill="#92400e" text-anchor="middle">🧱</text>
    </svg>
  `),
  steel: 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <rect fill="#e5e7eb" width="400" height="400"/>
      <rect fill="#6b7280" x="50" y="180" width="300" height="40" rx="5"/>
      <text x="200" y="220" font-family="Arial,sans-serif" font-size="80" fill="#374151" text-anchor="middle">🔩</text>
    </svg>
  `),
  tiles: 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <rect fill="#dbeafe" width="400" height="400"/>
      <rect fill="#3b82f6" x="50" y="50" width="140" height="140"/>
      <rect fill="#60a5fa" x="210" y="50" width="140" height="140"/>
      <rect fill="#60a5fa" x="50" y="210" width="140" height="140"/>
      <rect fill="#3b82f6" x="210" y="210" width="140" height="140"/>
    </svg>
  `),
  paint: 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <rect fill="#fce7f3" width="400" height="400"/>
      <text x="200" y="220" font-family="Arial,sans-serif" font-size="100" fill="#ec4899" text-anchor="middle">🎨</text>
    </svg>
  `),
  timber: 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <rect fill="#fef3c7" width="400" height="400"/>
      <rect fill="#92400e" x="50" y="100" width="300" height="50" rx="5"/>
      <rect fill="#b45309" x="50" y="170" width="300" height="50" rx="5"/>
      <rect fill="#92400e" x="50" y="240" width="300" height="50" rx="5"/>
    </svg>
  `),
  hardware: 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <rect fill="#e5e7eb" width="400" height="400"/>
      <text x="200" y="220" font-family="Arial,sans-serif" font-size="100" fill="#374151" text-anchor="middle">🔧</text>
    </svg>
  `),
  plumbing: 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <rect fill="#dbeafe" width="400" height="400"/>
      <text x="200" y="220" font-family="Arial,sans-serif" font-size="100" fill="#2563eb" text-anchor="middle">🚿</text>
    </svg>
  `),
  electrical: 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <rect fill="#fef9c3" width="400" height="400"/>
      <text x="200" y="220" font-family="Arial,sans-serif" font-size="100" fill="#ca8a04" text-anchor="middle">⚡</text>
    </svg>
  `),
  roofing: 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <rect fill="#fee2e2" width="400" height="400"/>
      <text x="200" y="220" font-family="Arial,sans-serif" font-size="100" fill="#dc2626" text-anchor="middle">🏠</text>
    </svg>
  `),
  tools: 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <rect fill="#e5e7eb" width="400" height="400"/>
      <text x="200" y="220" font-family="Arial,sans-serif" font-size="100" fill="#374151" text-anchor="middle">🛠️</text>
    </svg>
  `),
  sand: 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <rect fill="#fef3c7" width="400" height="400"/>
      <text x="200" y="220" font-family="Arial,sans-serif" font-size="100" fill="#d97706" text-anchor="middle">🏖️</text>
    </svg>
  `),
  aggregates: 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <rect fill="#d1d5db" width="400" height="400"/>
      <text x="200" y="220" font-family="Arial,sans-serif" font-size="100" fill="#4b5563" text-anchor="middle">🪨</text>
    </svg>
  `),
  stone: 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <rect fill="#9ca3af" width="400" height="400"/>
      <text x="200" y="220" font-family="Arial,sans-serif" font-size="100" fill="#374151" text-anchor="middle">🪨</text>
    </svg>
  `),
  glass: 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <rect fill="#e0f2fe" width="400" height="400"/>
      <text x="200" y="220" font-family="Arial,sans-serif" font-size="100" fill="#0284c7" text-anchor="middle">🪟</text>
    </svg>
  `),
  windows: 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <rect fill="#e0f2fe" width="400" height="400"/>
      <text x="200" y="220" font-family="Arial,sans-serif" font-size="100" fill="#0284c7" text-anchor="middle">🪟</text>
    </svg>
  `),
  doors: 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <rect fill="#fef3c7" width="400" height="400"/>
      <text x="200" y="220" font-family="Arial,sans-serif" font-size="100" fill="#92400e" text-anchor="middle">🚪</text>
    </svg>
  `),
  insulation: 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <rect fill="#fce7f3" width="400" height="400"/>
      <text x="200" y="220" font-family="Arial,sans-serif" font-size="100" fill="#be185d" text-anchor="middle">🧱</text>
    </svg>
  `),
  plywood: 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <rect fill="#fef3c7" width="400" height="400"/>
      <rect fill="#b45309" x="50" y="100" width="300" height="200" rx="5"/>
      <text x="200" y="220" font-family="Arial,sans-serif" font-size="60" fill="#fef3c7" text-anchor="middle">PLYWOOD</text>
    </svg>
  `)
};

/** Get a guaranteed fallback image that will never fail */
const getFallbackImage = (category?: string): string => {
  if (!category) return FALLBACK_IMAGES.default;
  
  const key = category.toLowerCase().trim();
  
  // Direct match
  if (FALLBACK_IMAGES[key]) return FALLBACK_IMAGES[key];
  
  // Partial match - check if category contains known keywords
  const categoryMappings: Record<string, string> = {
    'cement': 'cement',
    'concrete': 'cement',
    'steel': 'steel',
    'metal': 'steel',
    'iron': 'steel',
    'tile': 'tiles',
    'ceramic': 'tiles',
    'paint': 'paint',
    'coating': 'paint',
    'timber': 'timber',
    'wood': 'timber',
    'lumber': 'timber',
    'hardware': 'hardware',
    'fastener': 'hardware',
    'nail': 'hardware',
    'screw': 'hardware',
    'plumb': 'plumbing',
    'pipe': 'plumbing',
    'water': 'plumbing',
    'electric': 'electrical',
    'wire': 'electrical',
    'cable': 'electrical',
    'roof': 'roofing',
    'shingle': 'roofing',
    'tool': 'tools',
    'equipment': 'tools',
    'sand': 'sand',
    'aggregate': 'aggregates',
    'gravel': 'aggregates',
    'stone': 'stone',
    'rock': 'stone',
    'glass': 'glass',
    'window': 'windows',
    'door': 'doors',
    'insulation': 'insulation',
    'foam': 'insulation',
    'plywood': 'plywood',
    'board': 'plywood'
  };
  
  // Check for partial matches
  for (const [keyword, fallbackKey] of Object.entries(categoryMappings)) {
    if (key.includes(keyword)) {
      return FALLBACK_IMAGES[fallbackKey] || FALLBACK_IMAGES.default;
    }
  }
  
  return FALLBACK_IMAGES.default;
};

/**
 * ⚠️ PROTECTED VALIDATION - December 25, 2025
 * Uses centralized blocked images config from src/config/blockedImages.ts
 * DO NOT create local validation - always use isBlockedImageUrl
 */

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className,
  placeholder = '/placeholder.svg',
  onLoad,
  onError,
  loading = 'lazy',
  decoding = 'async',
  candidates,
  sources,
  sizes,
  category,
  showIconFallback = false
}) => {
  // Use embedded fallback as ultimate backup - this is a data URI that CANNOT fail
  const ultimateFallback = getFallbackImage(category);
  
  /**
   * ⚠️ PROTECTED: Check if the URL is blocked (surveillance/camera images)
   * Uses centralized config from src/config/blockedImages.ts
   */
  const isValidSrc = src && !isBlockedImageUrl(src);
  
  // Check if image is already cached (preloaded or previously loaded)
  const isCached = isValidSrc && (imageCache.has(src) || isImagePreloaded(src));
  
  // Determine initial image source - use actual src if valid, otherwise fallback
  const getInitialSrc = () => {
    if (!isValidSrc) return ultimateFallback;
    if (isCached) return src;
    // For valid URLs, start with the actual src (let browser handle loading)
    if (src.startsWith('/') || src.startsWith('http') || src.startsWith('data:')) {
      return src;
    }
    return ultimateFallback;
  };
  
  const [imageSrc, setImageSrc] = useState(getInitialSrc);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(isCached);
  const imgRef = useRef<HTMLImageElement>(null);
  const hasTriedFallbackRef = useRef(false);
  
  // Reset when src changes
  useEffect(() => {
    hasTriedFallbackRef.current = false;
    setHasError(false);
    setIsLoaded(isCached);
    
    // If URL is invalid (surveillance/camera) or empty, use fallback
    if (!isValidSrc) {
      setImageSrc(ultimateFallback);
      setIsLoaded(true);
    } else if (src.startsWith('/') || src.startsWith('http') || src.startsWith('data:')) {
      setImageSrc(src);
    } else {
      setImageSrc(ultimateFallback);
      setIsLoaded(true);
    }
  }, [src, isValidSrc, ultimateFallback, isCached]);

  // Handle image load success
  const handleLoad = useCallback(() => {
    // Add to cache for future instant loads
    if (imageSrc && !imageSrc.startsWith('data:')) {
      imageCache.add(imageSrc);
    }
    setIsLoaded(true);
    setHasError(false);
    onLoad?.();
  }, [imageSrc, onLoad]);

  // Handle image load error - use fallback
  const handleError = useCallback(() => {
    // Prevent infinite loop - only try fallback once
    if (hasTriedFallbackRef.current) {
      setHasError(true);
      return;
    }
    
    hasTriedFallbackRef.current = true;
    
    // Try candidates if available
    if (candidates && candidates.length > 0) {
      // Find next candidate that hasn't been tried
      const currentIndex = candidates.indexOf(imageSrc);
      const nextCandidate = candidates[currentIndex + 1];
      
      if (nextCandidate) {
        setImageSrc(nextCandidate);
        return;
      }
    }
    
    // Use embedded fallback - this will NEVER fail
    setImageSrc(ultimateFallback);
    setHasError(true);
    onError?.();
  }, [imageSrc, candidates, ultimateFallback, onError]);

  // Show icon fallback for total failures (when showIconFallback is enabled)
  if (showIconFallback && hasError && imageSrc === ultimateFallback) {
    return (
      <div className={cn('flex items-center justify-center bg-muted', className)}>
        <Package className="h-16 w-16 text-muted-foreground" />
      </div>
    );
  }

  // Simple image rendering with native browser lazy loading
  // REMOVED: transition-opacity and opacity changes to prevent blinking during scroll
  if (sources && sources.length && !imageSrc.startsWith('data:')) {
    return (
      <picture>
        {sources.map((s, i) => (
          <source key={i} type={s.type} srcSet={s.srcSet} sizes={sizes} />
        ))}
        <img
          ref={imgRef}
          src={imageSrc}
          alt={alt}
          className={cn(className)}
          loading={loading}
          decoding={decoding}
          onLoad={handleLoad}
          onError={handleError}
        />
      </picture>
    );
  }

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={cn(className)}
      loading={loading}
      decoding={decoding}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
};













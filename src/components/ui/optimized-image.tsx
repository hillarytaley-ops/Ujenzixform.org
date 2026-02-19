import React, { useState, useRef, useEffect } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  blurHash?: string;
  width?: number;
  height?: number;
  priority?: boolean; // Load immediately without lazy loading
  onLoad?: () => void;
  onError?: () => void;
}

// Default placeholder with gradient
const DEFAULT_PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Cdefs%3E%3ClinearGradient id="g" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" stop-color="%23f3f4f6"/%3E%3Cstop offset="100%25" stop-color="%23e5e7eb"/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="400" height="300" fill="url(%23g)"/%3E%3C/svg%3E';

// Default fallback for failed images
const DEFAULT_FALLBACK = 'https://placehold.co/400x300/e5e7eb/9ca3af?text=No+Image';

// Cache for loaded images
const loadedImages = new Set<string>();

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  fallbackSrc = DEFAULT_FALLBACK,
  blurHash,
  width,
  height,
  priority = false,
  onLoad,
  onError
}) => {
  const [isLoaded, setIsLoaded] = useState(loadedImages.has(src));
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '100px', // Start loading 100px before entering viewport
        threshold: 0.01
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority, isInView]);

  // Handle image load
  const handleLoad = () => {
    setIsLoaded(true);
    loadedImages.add(src);
    onLoad?.();
  };

  // Handle image error
  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Get the current source
  const currentSrc = hasError ? fallbackSrc : src;
  const shouldRender = isInView || priority;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-gray-100 ${className}`}
      style={{ width, height }}
    >
      {/* Placeholder/blur background */}
      {!isLoaded && (
        <div 
          className="absolute inset-0 animate-pulse"
          style={{
            backgroundImage: blurHash 
              ? `url(${blurHash})`
              : `url(${DEFAULT_PLACEHOLDER})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: blurHash ? 'blur(10px)' : 'none'
          }}
        />
      )}

      {/* Actual image */}
      {shouldRender && (
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={`
            w-full h-full object-cover transition-opacity duration-300
            ${isLoaded ? 'opacity-100' : 'opacity-0'}
          `}
          style={{
            contentVisibility: 'auto',
            containIntrinsicSize: width && height ? `${width}px ${height}px` : 'auto'
          }}
        />
      )}

      {/* Loading shimmer effect */}
      {!isLoaded && shouldRender && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
      )}
    </div>
  );
};

// Preload images utility
export function preloadImages(urls: string[]): void {
  urls.forEach(url => {
    if (!url || loadedImages.has(url)) return;
    
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
  });
}

// Clear loaded images cache
export function clearImageCache(): void {
  loadedImages.clear();
}

// Product image with category fallback
interface ProductImageProps extends Omit<OptimizedImageProps, 'fallbackSrc'> {
  category?: string;
}

// Category-specific placeholder images
const CATEGORY_PLACEHOLDERS: Record<string, string> = {
  'Cement': 'https://placehold.co/400x300/6b7280/ffffff?text=Cement',
  'Steel': 'https://placehold.co/400x300/6b7280/ffffff?text=Steel',
  'Blocks': 'https://placehold.co/400x300/6b7280/ffffff?text=Blocks',
  'Paint': 'https://placehold.co/400x300/6b7280/ffffff?text=Paint',
  'Roofing': 'https://placehold.co/400x300/6b7280/ffffff?text=Roofing',
  'Tiles': 'https://placehold.co/400x300/6b7280/ffffff?text=Tiles',
  'Plumbing': 'https://placehold.co/400x300/6b7280/ffffff?text=Plumbing',
  'Electrical': 'https://placehold.co/400x300/6b7280/ffffff?text=Electrical',
  'Timber': 'https://placehold.co/400x300/6b7280/ffffff?text=Timber',
  'Glass': 'https://placehold.co/400x300/6b7280/ffffff?text=Glass',
  'Hardware': 'https://placehold.co/400x300/6b7280/ffffff?text=Hardware',
  'Sand': 'https://placehold.co/400x300/6b7280/ffffff?text=Sand',
  'Gravel': 'https://placehold.co/400x300/6b7280/ffffff?text=Gravel',
  'default': 'https://placehold.co/400x300/6b7280/ffffff?text=Material'
};

export const ProductImage: React.FC<ProductImageProps> = ({
  category,
  ...props
}) => {
  const fallbackSrc = category 
    ? CATEGORY_PLACEHOLDERS[category] || CATEGORY_PLACEHOLDERS['default']
    : CATEGORY_PLACEHOLDERS['default'];

  return <OptimizedImage {...props} fallbackSrc={fallbackSrc} />;
};

export default OptimizedImage;

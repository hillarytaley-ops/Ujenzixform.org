import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveImageProps {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
  aspectRatio?: 'auto' | 'square' | '16/9' | '4/3' | '3/2' | '21/9';
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  placeholder?: 'blur' | 'empty';
  onLoad?: () => void;
  onError?: () => void;
}

// Generate srcSet for responsive images
const generateSrcSet = (src: string): string => {
  // For Unsplash images, use their built-in resizing
  if (src.includes('unsplash.com')) {
    const baseUrl = src.split('?')[0];
    return [
      `${baseUrl}?w=400&q=70 400w`,
      `${baseUrl}?w=800&q=75 800w`,
      `${baseUrl}?w=1200&q=80 1200w`,
      `${baseUrl}?w=1600&q=80 1600w`,
      `${baseUrl}?w=2000&q=85 2000w`,
    ].join(', ');
  }
  
  // For other images, return original
  return src;
};

// Get default sizes based on common layouts
const getDefaultSizes = (): string => {
  return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';
};

const aspectRatioClasses: Record<string, string> = {
  'auto': '',
  'square': 'aspect-square',
  '16/9': 'aspect-video',
  '4/3': 'aspect-[4/3]',
  '3/2': 'aspect-[3/2]',
  '21/9': 'aspect-[21/9]',
};

export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  alt,
  className,
  sizes = getDefaultSizes(),
  loading = 'lazy',
  priority = false,
  aspectRatio = 'auto',
  objectFit = 'cover',
  placeholder = 'empty',
  onLoad,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Use IntersectionObserver for lazy loading
  useEffect(() => {
    if (priority || loading === 'eager') {
      return;
    }

    const img = imgRef.current;
    if (!img) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Image is in viewport, start loading
            observer.disconnect();
          }
        });
      },
      { rootMargin: '50px' }
    );

    observer.observe(img);
    return () => observer.disconnect();
  }, [priority, loading]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const srcSet = generateSrcSet(src);
  const aspectClass = aspectRatioClasses[aspectRatio] || '';

  if (hasError) {
    return (
      <div 
        className={cn(
          'bg-muted flex items-center justify-center text-muted-foreground',
          aspectClass,
          className
        )}
      >
        <span className="text-sm">Image unavailable</span>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', aspectClass, className)}>
      {/* Placeholder/skeleton */}
      {placeholder === 'blur' && !isLoaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      
      <img
        ref={imgRef}
        src={src}
        srcSet={srcSet !== src ? srcSet : undefined}
        sizes={srcSet !== src ? sizes : undefined}
        alt={alt}
        loading={priority ? 'eager' : loading}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'w-full h-full transition-opacity duration-300',
          objectFit === 'cover' && 'object-cover',
          objectFit === 'contain' && 'object-contain',
          objectFit === 'fill' && 'object-fill',
          objectFit === 'none' && 'object-none',
          !isLoaded && placeholder === 'blur' && 'opacity-0',
          isLoaded && 'opacity-100'
        )}
        decoding="async"
      />
    </div>
  );
};

// Hero image variant with better defaults for hero sections
export const HeroImage: React.FC<Omit<ResponsiveImageProps, 'priority' | 'loading'>> = (props) => (
  <ResponsiveImage
    {...props}
    priority
    loading="eager"
    sizes="100vw"
    aspectRatio="auto"
  />
);

// Card image variant
export const CardImage: React.FC<Omit<ResponsiveImageProps, 'aspectRatio'>> = (props) => (
  <ResponsiveImage
    {...props}
    aspectRatio="16/9"
    placeholder="blur"
  />
);

// Avatar/profile image variant
export const AvatarImage: React.FC<Omit<ResponsiveImageProps, 'aspectRatio' | 'objectFit'>> = (props) => (
  <ResponsiveImage
    {...props}
    aspectRatio="square"
    objectFit="cover"
    className={cn('rounded-full', props.className)}
  />
);

export default ResponsiveImage;









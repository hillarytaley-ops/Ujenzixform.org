import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'sync' | 'auto';
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className,
  placeholder = '/placeholder.svg',
  onLoad,
  onError,
  loading = 'lazy',
  decoding = 'async'
}) => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Start loading the actual image
            const imageLoader = new Image();
            
            imageLoader.onload = () => {
              setImageSrc(src);
              setImageLoaded(true);
              onLoad?.();
            };
            
            imageLoader.onerror = () => {
              setImageError(true);
              onError?.();
            };
            
            // Security: Validate image URL before loading
            if (src && (src.startsWith('/') || src.startsWith('https://') || src.startsWith('data:'))) {
              imageLoader.src = src;
            } else {
              console.warn('Unsafe image URL blocked:', src);
              setImageError(true);
            }
            
            observer.unobserve(img);
          }
        });
      },
      {
        rootMargin: '50px 0px', // Start loading 50px before image enters viewport
        threshold: 0.1
      }
    );

    observer.observe(img);

    return () => {
      observer.disconnect();
    };
  }, [src, onLoad, onError]);

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={cn(
        'transition-opacity duration-300',
        imageLoaded ? 'opacity-100' : 'opacity-70',
        imageError && 'opacity-50 grayscale',
        className
      )}
      loading={loading}
      decoding={decoding}
      onLoad={() => {
        if (imageSrc !== placeholder) {
          setImageLoaded(true);
          onLoad?.();
        }
      }}
      onError={() => {
        if (imageSrc !== placeholder) {
          setImageError(true);
          setImageSrc(placeholder);
          onError?.();
        }
      }}
      // Security attributes
      crossOrigin="anonymous"
      referrerPolicy="no-referrer"
    />
  );
};













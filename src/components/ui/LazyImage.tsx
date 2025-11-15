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
  candidates?: string[];
  sources?: { type?: string; srcSet: string }[];
  sizes?: string;
}

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
  sizes
}) => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    if (typeof window !== 'undefined' && !("IntersectionObserver" in window)) {
      const list = candidates && candidates.length ? candidates : [src];
      const loader = new Image();
      loader.onload = () => {
        setImageSrc(loader.src);
        setImageLoaded(true);
        onLoad?.();
      };
      loader.onerror = () => {
        setImageError(true);
        onError?.();
      };
      loader.src = list[0];
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const list = candidates && candidates.length ? candidates : [src];
            let index = 0;
            const loader = new Image();
            const tryNext = () => {
              const next = list[index];
              if (!next) {
                setImageError(true);
                onError?.();
                return;
              }
              if (next.startsWith('/') || next.startsWith('https://') || next.startsWith('data:')) {
                loader.src = next;
              } else {
                setImageError(true);
                onError?.();
              }
            };
            loader.onload = () => {
              setImageSrc(loader.src);
              setImageLoaded(true);
              onLoad?.();
            };
            loader.onerror = () => {
              index += 1;
              tryNext();
            };
            tryNext();
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

  if (sources && sources.length && imageSrc !== placeholder) {
    return (
      <picture>
        {sources.map((s, i) => (
          <source key={i} type={s.type} srcSet={s.srcSet} sizes={sizes} />
        ))}
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
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </picture>
    );
  }

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
      crossOrigin="anonymous"
      referrerPolicy="no-referrer"
    />
  );
};

















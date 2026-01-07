/**
 * Performance Utilities
 * 
 * Collection of utilities for optimizing app performance
 */

/**
 * Debounce function - delays execution until after wait period
 * 
 * @example
 * const debouncedSearch = debounce((query) => search(query), 300);
 * input.addEventListener('input', (e) => debouncedSearch(e.target.value));
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func.apply(this, args);
      timeoutId = null;
    }, wait);
  };
}

/**
 * Throttle function - limits execution to once per wait period
 * 
 * @example
 * const throttledScroll = throttle(() => updatePosition(), 100);
 * window.addEventListener('scroll', throttledScroll);
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Memoize function - caches results based on arguments
 * 
 * @example
 * const memoizedExpensiveCalc = memoize(expensiveCalculation);
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  resolver?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();

  return function (this: any, ...args: Parameters<T>): ReturnType<T> {
    const key = resolver ? resolver(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = func.apply(this, args);
    cache.set(key, result);
    return result;
  } as T;
}

/**
 * Lazy load images with IntersectionObserver
 * 
 * @example
 * useEffect(() => {
 *   const cleanup = lazyLoadImages();
 *   return cleanup;
 * }, []);
 */
export function lazyLoadImages(): () => void {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return () => {};
  }

  const images = document.querySelectorAll('img[data-src]');
  
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.dataset.src;
          
          if (src) {
            img.src = src;
            img.removeAttribute('data-src');
            observer.unobserve(img);
          }
        }
      });
    },
    {
      rootMargin: '50px 0px',
      threshold: 0.01,
    }
  );

  images.forEach((img) => observer.observe(img));

  return () => observer.disconnect();
}

/**
 * Preload critical resources
 * 
 * @example
 * preloadResources(['/fonts/main.woff2', '/images/hero.webp']);
 */
export function preloadResources(urls: string[]): void {
  urls.forEach((url) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;

    // Determine resource type
    if (url.endsWith('.woff2') || url.endsWith('.woff')) {
      link.as = 'font';
      link.type = 'font/woff2';
      link.crossOrigin = 'anonymous';
    } else if (url.match(/\.(png|jpg|jpeg|gif|webp|avif|svg)$/)) {
      link.as = 'image';
    } else if (url.endsWith('.js')) {
      link.as = 'script';
    } else if (url.endsWith('.css')) {
      link.as = 'style';
    }

    document.head.appendChild(link);
  });
}

/**
 * Measure and log component render time
 * 
 * @example
 * const endMeasure = measureRender('MyComponent');
 * // ... render logic
 * endMeasure();
 */
export function measureRender(componentName: string): () => void {
  if (process.env.NODE_ENV !== 'development') {
    return () => {};
  }

  const startTime = performance.now();

  return () => {
    const endTime = performance.now();
    const duration = endTime - startTime;

    if (duration > 16) {
      // Longer than one frame (60fps)
      console.warn(`⚠️ Slow render: ${componentName} took ${duration.toFixed(2)}ms`);
    } else {
      console.debug(`✅ ${componentName} rendered in ${duration.toFixed(2)}ms`);
    }
  };
}

/**
 * Request idle callback polyfill
 */
export const requestIdleCallback =
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? window.requestIdleCallback
    : (cb: IdleRequestCallback) => setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 }), 1);

/**
 * Cancel idle callback polyfill
 */
export const cancelIdleCallback =
  typeof window !== 'undefined' && 'cancelIdleCallback' in window
    ? window.cancelIdleCallback
    : (id: number) => clearTimeout(id);

/**
 * Run task during idle time
 * 
 * @example
 * runWhenIdle(() => {
 *   // Non-critical work
 *   analytics.track('page_view');
 * });
 */
export function runWhenIdle(task: () => void, timeout = 2000): void {
  requestIdleCallback(
    () => {
      task();
    },
    { timeout }
  );
}

/**
 * Chunk array for batch processing
 * 
 * @example
 * const batches = chunkArray(largeArray, 100);
 * for (const batch of batches) {
 *   await processBatch(batch);
 * }
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Virtual scroll helper - calculates visible items
 * 
 * @example
 * const { startIndex, endIndex, offsetY } = getVisibleRange(
 *   scrollTop, containerHeight, itemHeight, totalItems
 * );
 */
export function getVisibleRange(
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  totalItems: number,
  overscan = 3
): { startIndex: number; endIndex: number; offsetY: number } {
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    totalItems - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );
  const offsetY = startIndex * itemHeight;

  return { startIndex, endIndex, offsetY };
}

/**
 * Performance monitoring - Web Vitals
 */
export function reportWebVitals(onReport: (metric: any) => void): void {
  if (typeof window === 'undefined') return;

  // First Contentful Paint
  const paintObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-contentful-paint') {
        onReport({ name: 'FCP', value: entry.startTime });
      }
    }
  });
  paintObserver.observe({ entryTypes: ['paint'] });

  // Largest Contentful Paint
  const lcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    onReport({ name: 'LCP', value: lastEntry.startTime });
  });
  lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

  // First Input Delay
  const fidObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const fidEntry = entry as PerformanceEventTiming;
      onReport({ name: 'FID', value: fidEntry.processingStart - fidEntry.startTime });
    }
  });
  fidObserver.observe({ entryTypes: ['first-input'] });

  // Cumulative Layout Shift
  let clsValue = 0;
  const clsObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!(entry as any).hadRecentInput) {
        clsValue += (entry as any).value;
      }
    }
    onReport({ name: 'CLS', value: clsValue });
  });
  clsObserver.observe({ entryTypes: ['layout-shift'] });
}






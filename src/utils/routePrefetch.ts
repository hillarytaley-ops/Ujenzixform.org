/**
 * Route Prefetching Utility
 * 
 * Intelligently prefetches likely next pages to make navigation feel instant
 * on mobile devices and slow connections.
 * 
 * Usage:
 * import { prefetchRoute } from '@/utils/routePrefetch';
 * 
 * // In your component
 * useEffect(() => {
 *   prefetchRoute('/feedback', 3000); // Prefetch after 3 seconds
 * }, []);
 */

/**
 * Prefetch a route by dynamically importing its component
 * 
 * @param route - The route path (e.g., '/feedback', '/tracking')
 * @param delay - Milliseconds to wait before prefetching (default: 2000)
 * @param condition - Optional function that returns boolean (prefetch only if true)
 */
export const prefetchRoute = (
  route: string, 
  delay: number = 2000,
  condition?: () => boolean
): void => {
  // Check network conditions - skip on slow connections
  const conn: any = typeof navigator !== 'undefined' ? (navigator as any).connection : null;
  const isSlowConnection = !!conn && (
    conn.saveData || 
    conn.effectiveType === 'slow-2g' || 
    conn.effectiveType === '2g'
  );
  
  // Skip prefetching on very slow connections to save bandwidth
  if (isSlowConnection) {
    return;
  }
  
  // Check optional condition
  if (condition && !condition()) {
    return;
  }
  
  // Prefetch after delay
  setTimeout(() => {
    const routeMap: { [key: string]: () => Promise<any> } = {
      '/feedback': () => {
        // Prefetch both the page and the form component for instant mobile loading
        return Promise.all([
          import('@/pages/Feedback'),
          import('@/components/FeedbackForm')
        ]);
      },
      '/tracking': () => import('@/pages/Tracking'),
      '/delivery': () => import('@/pages/Delivery'),
      '/suppliers': () => import('@/pages/SuppliersMobileOptimized'),
      '/builders': () => import('@/pages/Builders'),
      '/monitoring': () => import('@/pages/Monitoring'),
      '/contact': () => import('@/pages/Contact'),
      '/about': () => import('@/pages/About'),
    };
    
    const importFn = routeMap[route];
    if (importFn) {
      importFn().catch(() => {
        // Silently fail - prefetch is optional optimization
      });
    }
  }, delay);
};

/**
 * Prefetch multiple routes with the same configuration
 * 
 * @param routes - Array of route paths to prefetch
 * @param delay - Milliseconds to wait before prefetching
 * @param stagger - Additional delay between each route (default: 500ms)
 */
export const prefetchRoutes = (
  routes: string[], 
  delay: number = 2000,
  stagger: number = 500
): void => {
  routes.forEach((route, index) => {
    prefetchRoute(route, delay + (index * stagger));
  });
};

/**
 * Smart prefetching based on current route
 * Automatically prefetches likely next pages
 * 
 * @param currentRoute - Current page route
 */
export const smartPrefetch = (currentRoute: string): void => {
  const prefetchMap: { [key: string]: string[] } = {
    '/': ['/suppliers', '/builders', '/auth'],
    '/suppliers': ['/delivery', '/tracking', '/feedback'],
    '/delivery': ['/feedback', '/tracking'],
    '/tracking': ['/delivery', '/feedback'],
    '/feedback': ['/suppliers', '/delivery'],
    '/builders': ['/suppliers', '/monitoring'],
    '/monitoring': ['/builders', '/delivery'],
    '/auth': ['/suppliers', '/private-client-registration', '/professional-builder-registration'],
  };
  
  const routesToPrefetch = prefetchMap[currentRoute];
  if (routesToPrefetch) {
    prefetchRoutes(routesToPrefetch, 3000, 1000);
  }
};

/**
 * Prefetch on user interaction (hover, focus)
 * Use for navigation links that user is likely to click
 * 
 * @param route - Route to prefetch
 */
export const prefetchOnInteraction = (route: string): void => {
  // Prefetch immediately when user shows intent
  prefetchRoute(route, 0);
};

export default {
  prefetchRoute,
  prefetchRoutes,
  smartPrefetch,
  prefetchOnInteraction,
};


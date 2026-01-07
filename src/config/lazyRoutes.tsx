/**
 * Lazy Route Configuration
 * 
 * This file provides lazy-loaded versions of heavy components.
 * Use these for better initial load times on fast connections.
 * 
 * For slow connections/mobile, consider using direct imports instead.
 * 
 * Usage:
 * import { LazyAdminDashboard, LazyAnalytics } from '@/config/lazyRoutes';
 * 
 * <Route path="/admin" element={
 *   <Suspense fallback={<PageLoader />}>
 *     <LazyAdminDashboard />
 *   </Suspense>
 * } />
 */

import React, { Suspense, ComponentType } from 'react';

// Page Loader Component
export const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-muted border-t-primary"></div>
      <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
    </div>
  </div>
);

// Skeleton Loader for Dashboard
export const DashboardSkeleton = () => (
  <div className="p-6 space-y-6 animate-pulse">
    {/* Header skeleton */}
    <div className="flex justify-between items-center">
      <div className="h-8 w-48 bg-muted rounded"></div>
      <div className="h-10 w-32 bg-muted rounded"></div>
    </div>
    
    {/* Stats cards skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-32 bg-muted rounded-lg"></div>
      ))}
    </div>
    
    {/* Content skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="h-64 bg-muted rounded-lg"></div>
      <div className="h-64 bg-muted rounded-lg"></div>
    </div>
  </div>
);

// Table Skeleton
export const TableSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-10 bg-muted rounded w-full"></div>
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="h-12 bg-muted rounded w-full"></div>
    ))}
  </div>
);

// Higher Order Component for wrapping lazy components with Suspense
export function withSuspense<P extends object>(
  Component: ComponentType<P>,
  Fallback: ComponentType = PageLoader
): React.FC<P> {
  const WrappedComponent: React.FC<P> = (props) => (
    <Suspense fallback={<Fallback />}>
      <Component {...props} />
    </Suspense>
  );
  
  WrappedComponent.displayName = `withSuspense(${Component.displayName || Component.name || 'Component'})`;
  
  return WrappedComponent;
}

// ===========================================
// LAZY LOADED COMPONENTS
// ===========================================

// Heavy Admin Pages
export const LazyAdminDashboard = React.lazy(() => import('@/pages/AdminDashboard'));
export const LazyAnalytics = React.lazy(() => import('@/pages/Analytics'));
export const LazyMonitoring = React.lazy(() => import('@/pages/Monitoring'));

// Dashboard Sub-components
export const LazyDeliveryAnalytics = React.lazy(() => 
  import('@/components/admin/DeliveryAnalytics').then(m => ({ default: m.DeliveryAnalytics }))
);
export const LazyMonitoringRequestsManager = React.lazy(() => 
  import('@/components/admin/MonitoringRequestsManager').then(m => ({ default: m.MonitoringRequestsManager }))
);
export const LazyAdminScanDashboard = React.lazy(() => 
  import('@/components/qr/AdminScanDashboard').then(m => ({ default: m.AdminScanDashboard }))
);

// Supplier Pages
export const LazySuppliersMobile = React.lazy(() => import('@/pages/SuppliersMobileOptimized'));
export const LazySupplierRegistration = React.lazy(() => import('@/pages/SupplierRegistration'));
export const LazySupplierDashboard = React.lazy(() => import('@/pages/SupplierDashboard'));

// Builder Pages
export const LazyBuilderDashboard = React.lazy(() => import('@/pages/BuilderDashboard'));
export const LazyBuilderPortal = React.lazy(() => import('@/pages/BuilderPortal'));
export const LazyProfessionalBuilderRegistration = React.lazy(() => import('@/pages/ProfessionalBuilderRegistration'));
export const LazyPrivateBuilderRegistration = React.lazy(() => import('@/pages/PrivateBuilderRegistration'));

// Delivery Pages
export const LazyDelivery = React.lazy(() => import('@/pages/Delivery'));
export const LazyDeliveryDashboard = React.lazy(() => import('@/pages/DeliveryDashboard'));
export const LazyDeliveryProviderApplication = React.lazy(() => import('@/pages/DeliveryProviderApplication'));

// Auth Pages (usually small, but can be lazy for admin auth)
export const LazyAdminAuth = React.lazy(() => import('@/pages/AdminAuth'));

// ===========================================
// PRE-WRAPPED LAZY COMPONENTS WITH SUSPENSE
// ===========================================

// These can be used directly without wrapping in Suspense
export const SuspenseAdminDashboard = withSuspense(LazyAdminDashboard, DashboardSkeleton);
export const SuspenseAnalytics = withSuspense(LazyAnalytics, DashboardSkeleton);
export const SuspenseDeliveryDashboard = withSuspense(LazyDeliveryDashboard, DashboardSkeleton);
export const SuspenseSupplierDashboard = withSuspense(LazySupplierDashboard, DashboardSkeleton);
export const SuspenseBuilderDashboard = withSuspense(LazyBuilderDashboard, DashboardSkeleton);

// ===========================================
// PRELOADING UTILITIES
// ===========================================

/**
 * Preload a lazy component
 * Call this on hover or when you anticipate navigation
 */
export const preloadComponent = (lazyComponent: React.LazyExoticComponent<ComponentType<unknown>>) => {
  // The import() is cached, so calling it again just returns the cached promise
  const componentModule = (lazyComponent as unknown as { _payload: { _result: unknown } })._payload?._result;
  if (!componentModule) {
    // Trigger the lazy load
    lazyComponent.toString();
  }
};

/**
 * Preload admin dashboard components
 */
export const preloadAdminDashboard = () => {
  preloadComponent(LazyAdminDashboard as React.LazyExoticComponent<ComponentType<unknown>>);
  preloadComponent(LazyDeliveryAnalytics as React.LazyExoticComponent<ComponentType<unknown>>);
  preloadComponent(LazyMonitoringRequestsManager as React.LazyExoticComponent<ComponentType<unknown>>);
};

/**
 * Preload supplier-related components
 */
export const preloadSupplierComponents = () => {
  preloadComponent(LazySuppliersMobile as React.LazyExoticComponent<ComponentType<unknown>>);
  preloadComponent(LazySupplierRegistration as React.LazyExoticComponent<ComponentType<unknown>>);
};

/**
 * Preload builder-related components
 */
export const preloadBuilderComponents = () => {
  preloadComponent(LazyBuilderDashboard as React.LazyExoticComponent<ComponentType<unknown>>);
  preloadComponent(LazyBuilderPortal as React.LazyExoticComponent<ComponentType<unknown>>);
};

// ===========================================
// CONNECTION-AWARE LOADING
// ===========================================

interface ConnectionInfo {
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
  saveData?: boolean;
  downlink?: number;
  rtt?: number;
}

/**
 * Check if the user has a slow connection
 */
export const isSlowConnection = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  
  const conn = (navigator as Navigator & { connection?: ConnectionInfo }).connection;
  if (!conn) return false;
  
  return !!(
    conn.saveData ||
    conn.effectiveType === 'slow-2g' ||
    conn.effectiveType === '2g' ||
    conn.effectiveType === '3g' ||
    (conn.downlink && conn.downlink < 1) ||
    (conn.rtt && conn.rtt > 500)
  );
};

/**
 * Get the appropriate loader based on connection speed
 */
export const getConnectionAwareLoader = () => {
  if (isSlowConnection()) {
    // For slow connections, show a minimal loader
    return () => (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-6 w-6 border-2 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }
  return PageLoader;
};
















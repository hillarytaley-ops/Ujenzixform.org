/**
 * Skeleton Loaders for UjenziPro
 * 
 * Provides visual feedback during loading, improving perceived performance
 */

import React from 'react';

/**
 * Card skeleton for grid layouts
 */
export const CardSkeleton = () => (
  <div className="animate-pulse bg-white rounded-lg shadow p-6 space-y-4">
    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
    <div className="flex justify-between mt-4">
      <div className="h-8 bg-gray-200 rounded w-24"></div>
      <div className="h-8 bg-gray-200 rounded w-24"></div>
    </div>
  </div>
);

/**
 * Table skeleton for data tables
 */
export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="animate-pulse bg-white rounded-lg shadow overflow-hidden">
    {/* Table Header */}
    <div className="bg-gray-100 p-4 border-b">
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-4 bg-gray-200 rounded"></div>
        ))}
      </div>
    </div>
    {/* Table Rows */}
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="p-4 border-b">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((j) => (
            <div key={j} className="h-3 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

/**
 * Form skeleton for feedback/contact forms
 */
export const FormSkeleton = () => (
  <div className="animate-pulse space-y-6">
    {/* Name field */}
    <div className="space-y-2">
      <div className="h-4 bg-gray-200 rounded w-24"></div>
      <div className="h-12 bg-gray-200 rounded"></div>
    </div>
    {/* Email field */}
    <div className="space-y-2">
      <div className="h-4 bg-gray-200 rounded w-24"></div>
      <div className="h-12 bg-gray-200 rounded"></div>
    </div>
    {/* Subject field */}
    <div className="space-y-2">
      <div className="h-4 bg-gray-200 rounded w-24"></div>
      <div className="h-12 bg-gray-200 rounded"></div>
    </div>
    {/* Message field */}
    <div className="space-y-2">
      <div className="h-4 bg-gray-200 rounded w-24"></div>
      <div className="h-32 bg-gray-200 rounded"></div>
    </div>
    {/* Submit button */}
    <div className="h-12 bg-gray-200 rounded"></div>
  </div>
);

/**
 * Page skeleton for full page loads
 */
export const PageSkeleton = () => (
  <div className="min-h-screen bg-background">
    {/* Navigation skeleton */}
    <div className="animate-pulse bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-200 rounded w-32"></div>
          <div className="flex gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 bg-gray-200 rounded w-20"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
    
    {/* Hero skeleton */}
    <div className="animate-pulse bg-gray-200 h-64"></div>
    
    {/* Content skeleton */}
    <div className="container mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  </div>
);

/**
 * Delivery card skeleton
 */
export const DeliveryCardSkeleton = () => (
  <div className="animate-pulse bg-white rounded-lg shadow p-6">
    {/* Header */}
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-32"></div>
          <div className="h-3 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
      <div className="h-6 bg-gray-200 rounded w-20"></div>
    </div>
    
    {/* Content */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-20"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      ))}
    </div>
    
    {/* Actions */}
    <div className="flex gap-2 mt-4">
      <div className="h-8 bg-gray-200 rounded w-24"></div>
      <div className="h-8 bg-gray-200 rounded w-24"></div>
    </div>
  </div>
);

/**
 * Material card skeleton (for suppliers page)
 */
export const MaterialCardSkeleton = () => (
  <div className="animate-pulse bg-white rounded-lg shadow overflow-hidden">
    {/* Image */}
    <div className="h-48 bg-gray-200"></div>
    {/* Content */}
    <div className="p-4 space-y-3">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-6 bg-gray-200 rounded w-1/2"></div>
      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
      <div className="h-10 bg-gray-200 rounded mt-4"></div>
    </div>
  </div>
);

/**
 * Profile skeleton
 */
export const ProfileSkeleton = () => (
  <div className="animate-pulse bg-white rounded-lg shadow p-6">
    <div className="flex items-center gap-4 mb-6">
      <div className="h-16 w-16 bg-gray-200 rounded-full"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-3 bg-gray-200 rounded"></div>
      ))}
    </div>
  </div>
);

/**
 * List skeleton
 */
export const ListSkeleton = ({ items = 5 }: { items?: number }) => (
  <div className="animate-pulse space-y-4">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-lg shadow">
        <div className="h-12 w-12 bg-gray-200 rounded"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="h-8 bg-gray-200 rounded w-20"></div>
      </div>
    ))}
  </div>
);

/**
 * Dashboard widget skeleton
 */
export const DashboardWidgetSkeleton = () => (
  <div className="animate-pulse bg-white rounded-lg shadow p-6">
    <div className="flex justify-between items-center mb-4">
      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
      <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
    </div>
    <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
  </div>
);

/**
 * Monitoring camera skeleton
 */
export const CameraSkeleton = () => (
  <div className="animate-pulse bg-white rounded-lg shadow overflow-hidden">
    <div className="aspect-video bg-gray-200"></div>
    <div className="p-4 space-y-2">
      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
    </div>
  </div>
);

/**
 * Generic shimmer effect wrapper
 */
export const ShimmerWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="relative overflow-hidden">
    {children}
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
  </div>
);

// Export all skeletons
export default {
  CardSkeleton,
  TableSkeleton,
  FormSkeleton,
  PageSkeleton,
  DeliveryCardSkeleton,
  MaterialCardSkeleton,
  ProfileSkeleton,
  ListSkeleton,
  DashboardWidgetSkeleton,
  CameraSkeleton,
  ShimmerWrapper,
};


import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface ProductSkeletonProps {
  count?: number;
  className?: string;
}

// Single product card skeleton
export const ProductCardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <Card className={`overflow-hidden animate-pulse ${className}`}>
      {/* Image skeleton */}
      <div className="w-full h-48 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer" />
      
      <CardHeader className="pb-2">
        {/* Title skeleton */}
        <Skeleton className="h-5 w-3/4 mb-2" />
        {/* Category skeleton */}
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Price skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>
        
        {/* Stock badge skeleton */}
        <Skeleton className="h-5 w-20" />
        
        {/* Description skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
        
        {/* Button skeleton */}
        <Skeleton className="h-10 w-full mt-4" />
      </CardContent>
    </Card>
  );
};

// Grid of skeleton cards
export const ProductGridSkeleton: React.FC<ProductSkeletonProps> = ({ 
  count = 12, 
  className = '' 
}) => {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
};

// Compact skeleton for smaller displays
export const ProductCardSkeletonCompact: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <Card className={`overflow-hidden animate-pulse ${className}`}>
      <div className="flex gap-3 p-3">
        {/* Image skeleton */}
        <Skeleton className="w-20 h-20 rounded-lg flex-shrink-0" />
        
        <div className="flex-1 space-y-2">
          {/* Title */}
          <Skeleton className="h-4 w-3/4" />
          {/* Category */}
          <Skeleton className="h-3 w-1/2" />
          {/* Price */}
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
    </Card>
  );
};

// List skeleton for table/list views
export const ProductListSkeleton: React.FC<ProductSkeletonProps> = ({ 
  count = 10, 
  className = '' 
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeletonCompact key={index} />
      ))}
    </div>
  );
};

// Category filter skeleton
export const CategoryFilterSkeleton: React.FC = () => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {Array.from({ length: 8 }).map((_, index) => (
        <Skeleton key={index} className="h-9 w-24 rounded-full flex-shrink-0" />
      ))}
    </div>
  );
};

// Full page loading skeleton
export const MaterialsPageSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Search and filters skeleton */}
      <div className="flex flex-col md:flex-row gap-4">
        <Skeleton className="h-10 flex-1 max-w-md" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
      
      {/* Category tabs skeleton */}
      <CategoryFilterSkeleton />
      
      {/* Results count skeleton */}
      <Skeleton className="h-5 w-48" />
      
      {/* Product grid skeleton */}
      <ProductGridSkeleton count={12} />
      
      {/* Pagination skeleton */}
      <div className="flex justify-center gap-2 mt-6">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-10 w-10" />
      </div>
    </div>
  );
};

export default ProductGridSkeleton;

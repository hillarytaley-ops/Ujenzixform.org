import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
  <div className={cn('animate-pulse bg-slate-700/50 rounded', className)} />
);

// Stats Card Skeleton
export const StatsCardSkeleton: React.FC = () => (
  <Card className="bg-slate-900/50 border-slate-800">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-5 w-5 rounded-full" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-16 mb-2" />
      <Skeleton className="h-3 w-32" />
    </CardContent>
  </Card>
);

// Stats Grid Skeleton
interface StatsGridSkeletonProps {
  count?: number;
}

export const StatsGridSkeleton: React.FC<StatsGridSkeletonProps> = ({ count = 4 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <StatsCardSkeleton key={i} />
    ))}
  </div>
);

// Table Row Skeleton
interface TableRowSkeletonProps {
  columns?: number;
}

export const TableRowSkeleton: React.FC<TableRowSkeletonProps> = ({ columns = 5 }) => (
  <tr className="border-b border-slate-700">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="p-4">
        <Skeleton className="h-4 w-full max-w-[120px]" />
      </td>
    ))}
  </tr>
);

// Table Skeleton
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 5, columns = 5 }) => (
  <Card className="bg-slate-900/50 border-slate-800">
    <CardHeader>
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-64 mt-2" />
    </CardHeader>
    <CardContent>
      <div className="rounded-md border border-slate-700">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800/50">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="p-4 text-left">
                  <Skeleton className="h-4 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <TableRowSkeleton key={i} columns={columns} />
            ))}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
);

// Card List Skeleton
interface CardListSkeletonProps {
  count?: number;
}

export const CardListSkeleton: React.FC<CardListSkeletonProps> = ({ count = 3 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i} className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-8 w-20 rounded" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

// Camera Grid Skeleton
export const CameraGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i} className="bg-slate-800 border-slate-700 overflow-hidden">
        <Skeleton className="aspect-video" />
        <CardContent className="p-3">
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </CardContent>
      </Card>
    ))}
  </div>
);

// Full Page Loading
export const PageLoadingSkeleton: React.FC = () => (
  <div className="space-y-6 p-6">
    <div className="flex items-center justify-between">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-10 w-32 rounded" />
    </div>
    <StatsGridSkeleton count={4} />
    <TableSkeleton rows={5} columns={5} />
  </div>
);



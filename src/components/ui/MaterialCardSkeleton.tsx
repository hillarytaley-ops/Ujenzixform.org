/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   💀 MATERIAL CARD SKELETON - PROTECTED COMPONENT                                    ║
 * ║                                                                                      ║
 * ║   ⚠️⚠️⚠️  DO NOT MODIFY WITHOUT AUTHORIZATION  ⚠️⚠️⚠️                                ║
 * ║                                                                                      ║
 * ║   LAST VERIFIED: December 24, 2025                                                   ║
 * ║   AUTHORIZED BY: Project Owner                                                       ║
 * ║   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
 * ║                                                                                      ║
 * ║   PURPOSE:                                                                           ║
 * ║   - Shows animated skeleton placeholders while materials load                       ║
 * ║   - Matches the exact layout of MaterialsGrid cards                                 ║
 * ║   - Provides better UX than a simple loading spinner                                ║
 * ║                                                                                      ║
 * ║   🚫 UNAUTHORIZED CHANGES WILL BE REVERTED                                           ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import React from 'react';
import { Card } from '@/components/ui/card';

export const MaterialCardSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <Card key={idx} className="overflow-hidden flex flex-col animate-pulse">
          {/* Image skeleton */}
          <div className="relative bg-gradient-to-br from-gray-200 to-gray-300 h-48 sm:h-52 md:h-56">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skeleton-shimmer" />
            {/* Category badge skeleton */}
            <div className="absolute top-2 left-2 z-20">
              <div className="h-6 w-16 bg-gray-400/50 rounded-full" />
            </div>
            {/* Stock badge skeleton */}
            <div className="absolute top-2 right-2 z-20">
              <div className="h-6 w-20 bg-gray-400/50 rounded-full" />
            </div>
          </div>
          
          {/* Content skeleton */}
          <div className="p-4 flex-grow flex flex-col">
            {/* Title */}
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
            {/* Description */}
            <div className="h-4 bg-gray-200 rounded w-full mb-1" />
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-4" />
            
            {/* Supplier info */}
            <div className="flex items-center gap-2 mb-3">
              <div className="h-4 w-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded w-32" />
            </div>
            
            {/* Price and rating */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <div className="h-6 bg-gray-200 rounded w-20 mb-1" />
                <div className="h-3 bg-gray-200 rounded w-12" />
              </div>
              <div className="h-5 bg-gray-200 rounded w-14" />
            </div>
            
            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 mt-auto">
              <div className="h-12 bg-blue-200 rounded w-full sm:flex-1" />
              <div className="h-12 bg-green-200 rounded w-full sm:flex-1" />
            </div>
          </div>
        </Card>
      ))}
      
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .skeleton-shimmer {
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </>
  );
};

export default MaterialCardSkeleton;


/**
 * DashboardLoader - Fast, optimized loading component for all dashboards
 * 
 * Features:
 * - CSS-only animations for instant rendering
 * - Minimal DOM structure for quick paint
 * - Branded colors for each dashboard type
 * - Smooth fade-in transition
 */

import React from 'react';
import { cn } from "@/lib/utils";

type DashboardType = 'admin' | 'builder' | 'supplier' | 'delivery' | 'default';

interface DashboardLoaderProps {
  type?: DashboardType;
  message?: string;
  className?: string;
  fullScreen?: boolean;
}

const themeConfig: Record<DashboardType, { primary: string; bg: string; text: string }> = {
  admin: {
    primary: 'border-blue-500',
    bg: 'bg-slate-950',
    text: 'text-gray-400'
  },
  builder: {
    primary: 'border-emerald-500',
    bg: 'bg-gray-900',
    text: 'text-gray-400'
  },
  supplier: {
    primary: 'border-orange-500',
    bg: 'bg-slate-900',
    text: 'text-gray-400'
  },
  delivery: {
    primary: 'border-teal-500',
    bg: 'bg-gray-900',
    text: 'text-gray-400'
  },
  default: {
    primary: 'border-primary',
    bg: 'bg-background',
    text: 'text-muted-foreground'
  }
};

export const DashboardLoader: React.FC<DashboardLoaderProps> = ({
  type = 'default',
  message,
  className,
  fullScreen = true
}) => {
  const theme = themeConfig[type];
  const defaultMessage = type === 'default' ? 'Loading...' : `Loading ${type} dashboard...`;

  return (
    <div 
      className={cn(
        "flex items-center justify-center animate-in fade-in duration-150",
        fullScreen && "min-h-screen",
        theme.bg,
        className
      )}
    >
      <div className="text-center">
        {/* Fast CSS-only spinner using Tailwind's animate-spin */}
        <div 
          className={cn(
            "h-10 w-10 mx-auto mb-3 rounded-full border-[3px] border-t-transparent animate-spin",
            theme.primary
          )}
        />
        <p className={cn("text-sm", theme.text)}>
          {message || defaultMessage}
        </p>
      </div>
    </div>
  );
};

// Inline loader for sections within a page
export const SectionLoader: React.FC<{ message?: string; className?: string }> = ({
  message = 'Loading...',
  className
}) => (
  <div className={cn("flex items-center justify-center py-12", className)}>
    <div className="text-center">
      <div className="h-8 w-8 mx-auto mb-2 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  </div>
);

export default DashboardLoader;


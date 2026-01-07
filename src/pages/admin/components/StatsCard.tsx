import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  onClick?: () => void;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-blue-500',
  trend,
  className,
  onClick,
}) => {
  return (
    <Card 
      className={cn(
        'bg-slate-900/50 border-slate-800 transition-all',
        onClick && 'cursor-pointer hover:border-slate-600',
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-400">{title}</CardTitle>
        <Icon className={cn('h-5 w-5', iconColor)} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">{value}</div>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        )}
        {trend && (
          <p className={cn(
            'text-xs mt-1',
            trend.isPositive ? 'text-green-500' : 'text-red-500'
          )}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% from last period
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// Grid of stats cards
interface StatsGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5 | 6;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ children, columns = 4 }) => {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
    5: 'md:grid-cols-3 lg:grid-cols-5',
    6: 'md:grid-cols-3 lg:grid-cols-6',
  };

  return (
    <div className={cn('grid grid-cols-1 gap-4', gridCols[columns])}>
      {children}
    </div>
  );
};



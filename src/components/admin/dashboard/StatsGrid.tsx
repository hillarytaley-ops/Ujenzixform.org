import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Users, Building2, Store, Truck, Clock, Activity,
  TrendingUp, TrendingDown, Minus
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  iconColor: string;
  valueColor?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, value, icon: Icon, iconColor, valueColor = 'text-white', trend 
}) => (
  <Card className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-colors">
    <CardContent className="p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-400 truncate">{title}</p>
          <p className={`text-xl sm:text-2xl font-bold ${valueColor} truncate`}>{value}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-1">
              {trend.direction === 'up' && <TrendingUp className="h-3 w-3 text-green-400" />}
              {trend.direction === 'down' && <TrendingDown className="h-3 w-3 text-red-400" />}
              {trend.direction === 'neutral' && <Minus className="h-3 w-3 text-gray-400" />}
              <span className={`text-xs ${
                trend.direction === 'up' ? 'text-green-400' : 
                trend.direction === 'down' ? 'text-red-400' : 'text-gray-400'
              }`}>
                {trend.value}%
              </span>
            </div>
          )}
        </div>
        <Icon className={`h-6 w-6 sm:h-8 sm:w-8 ${iconColor} opacity-50 flex-shrink-0`} />
      </div>
    </CardContent>
  </Card>
);

interface DashboardStats {
  totalUsers: number;
  totalBuilders: number;
  totalSuppliers: number;
  totalDelivery: number;
  pendingRegistrations: number;
  activeToday: number;
}

interface StatsGridProps {
  stats: DashboardStats;
  showTrends?: boolean;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats, showTrends = false }) => {
  const statCards: StatCardProps[] = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      iconColor: 'text-blue-500',
      trend: showTrends ? { value: 12, direction: 'up' } : undefined
    },
    {
      title: 'Builders',
      value: stats.totalBuilders,
      icon: Building2,
      iconColor: 'text-blue-500',
      valueColor: 'text-blue-400',
      trend: showTrends ? { value: 8, direction: 'up' } : undefined
    },
    {
      title: 'Suppliers',
      value: stats.totalSuppliers,
      icon: Store,
      iconColor: 'text-orange-500',
      valueColor: 'text-orange-400',
      trend: showTrends ? { value: 5, direction: 'up' } : undefined
    },
    {
      title: 'Delivery',
      value: stats.totalDelivery,
      icon: Truck,
      iconColor: 'text-teal-500',
      valueColor: 'text-teal-400',
      trend: showTrends ? { value: 3, direction: 'up' } : undefined
    },
    {
      title: 'Pending',
      value: stats.pendingRegistrations,
      icon: Clock,
      iconColor: 'text-yellow-500',
      valueColor: 'text-yellow-400',
      trend: showTrends ? { value: 2, direction: 'down' } : undefined
    },
    {
      title: 'Active Today',
      value: stats.activeToday,
      icon: Activity,
      iconColor: 'text-green-500',
      valueColor: 'text-green-400',
      trend: showTrends ? { value: 15, direction: 'up' } : undefined
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {statCards.map((card, index) => (
        <StatCard key={index} {...card} />
      ))}
    </div>
  );
};

export default StatsGrid;





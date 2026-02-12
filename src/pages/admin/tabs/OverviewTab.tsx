import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Server,
  Database,
  Wifi,
  Globe,
  Activity,
  Zap,
  Users,
  ChevronRight,
  MessageSquare,
  BarChart3,
  Layers,
  ShoppingCart,
  Truck,
  Package,
} from 'lucide-react';
import { DashboardStats, RegistrationRecord, AppPage } from '../types';
import { StatsCard, StatsGrid } from '../components/StatsCard';
import { EmptyState } from '../components/EmptyState';

interface OverviewTabProps {
  stats: DashboardStats;
  registrations: RegistrationRecord[];
  appPages: AppPage[];
  onTabChange: (tab: string) => void;
  onNavigate: (path: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  stats,
  registrations,
  appPages,
  onTabChange,
  onNavigate,
}) => {
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { className: string; label: string }> = {
      pending: { className: 'bg-yellow-600', label: 'Pending' },
      approved: { className: 'bg-green-600', label: 'Approved' },
      rejected: { className: 'bg-red-600', label: 'Rejected' },
      active: { className: 'bg-green-600', label: 'Active' },
    };
    const config = statusConfig[status] || { className: 'bg-gray-600', label: status };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* System Health Status */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Server className="h-5 w-5 text-green-500" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <SystemHealthItem
              icon={Server}
              title="API Server"
              status="Operational"
            />
            <SystemHealthItem
              icon={Database}
              title="Database"
              status="Supabase Connected"
            />
            <SystemHealthItem
              icon={Wifi}
              title="Auth Service"
              status="Active"
            />
            <SystemHealthItem
              icon={Globe}
              title="CDN"
              status="All Regions"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="bg-slate-900/50 border-slate-800 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {registrations.slice(0, 6).map((reg) => (
                <div
                  key={reg.id}
                  className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        reg.status === 'approved'
                          ? 'bg-green-500'
                          : reg.status === 'rejected'
                          ? 'bg-red-500'
                          : 'bg-yellow-500'
                      }`}
                    ></div>
                    <div>
                      <p className="text-sm text-white">{reg.name}</p>
                      <p className="text-xs text-gray-400">
                        {reg.type} registration •{' '}
                        {new Date(reg.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(reg.status)}
                </div>
              ))}
              {registrations.length === 0 && (
                <EmptyState
                  icon={Activity}
                  title="No Recent Activity"
                  description="Registration activity will appear here"
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <QuickActionButton
              icon={ShoppingCart}
              label={`Orders ${stats.pendingOrders > 0 ? `(${stats.pendingOrders} pending)` : `(${stats.totalOrders})`}`}
              color="orange"
              onClick={() => onTabChange('orders')}
            />
            <QuickActionButton
              icon={Truck}
              label={`Delivery Requests ${stats.pendingDeliveryRequests > 0 ? `(${stats.pendingDeliveryRequests} pending)` : ''}`}
              color="green"
              onClick={() => onTabChange('delivery-requests')}
            />
            <QuickActionButton
              icon={Users}
              label={`Pending Registrations (${stats.pendingRegistrations})`}
              color="blue"
              onClick={() => onTabChange('registrations')}
            />
            <QuickActionButton
              icon={Globe}
              label="View All Pages"
              color="purple"
              onClick={() => onTabChange('pages')}
            />
            <QuickActionButton
              icon={MessageSquare}
              label="View Feedback"
              color="green"
              onClick={() => onTabChange('feedback')}
            />
            <QuickActionButton
              icon={BarChart3}
              label="Analytics"
              color="orange"
              onClick={() => onNavigate('/analytics')}
            />
          </CardContent>
        </Card>
      </div>

      {/* App Pages Quick Overview */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-purple-500" />
              Application Pages Overview
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
              onClick={() => onTabChange('pages')}
            >
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {appPages.slice(0, 12).map((page, index) => (
              <div
                key={index}
                className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-center hover:border-blue-500/50 transition-all cursor-pointer"
                onClick={() => window.open(page.path, '_blank')}
              >
                <page.icon
                  className={`h-6 w-6 mx-auto mb-2 ${
                    page.category === 'admin'
                      ? 'text-red-400'
                      : page.category === 'protected'
                      ? 'text-green-400'
                      : 'text-blue-400'
                  }`}
                />
                <p className="text-xs text-white font-medium truncate">{page.name}</p>
                <div
                  className={`w-1.5 h-1.5 rounded-full mx-auto mt-2 ${
                    page.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'
                  }`}
                ></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// System Health Item Component
interface SystemHealthItemProps {
  icon: React.ElementType;
  title: string;
  status: string;
}

const SystemHealthItem: React.FC<SystemHealthItemProps> = ({ icon: Icon, title, status }) => (
  <div className="flex items-center gap-3 p-3 bg-green-900/20 border border-green-800/50 rounded-lg">
    <div className="p-2 bg-green-600/20 rounded-full">
      <Icon className="h-5 w-5 text-green-400" />
    </div>
    <div>
      <p className="text-sm text-green-400 font-medium">{title}</p>
      <p className="text-xs text-gray-400">{status}</p>
    </div>
    <div className="ml-auto w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
  </div>
);

// Quick Action Button Component
interface QuickActionButtonProps {
  icon: React.ElementType;
  label: string;
  color: 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'cyan' | 'yellow' | 'teal';
  onClick: () => void;
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  icon: Icon,
  label,
  color,
  onClick,
}) => {
  const colorClasses = {
    blue: 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border-blue-600/30',
    purple: 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border-purple-600/30',
    green: 'bg-green-600/20 hover:bg-green-600/30 text-green-400 border-green-600/30',
    orange: 'bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 border-orange-600/30',
    red: 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border-red-600/30',
    cyan: 'bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 border-cyan-600/30',
    yellow: 'bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 border-yellow-600/30',
    teal: 'bg-teal-600/20 hover:bg-teal-600/30 text-teal-400 border-teal-600/30',
  };

  return (
    <Button
      className={`w-full justify-start border ${colorClasses[color]}`}
      onClick={onClick}
    >
      <Icon className="h-4 w-4 mr-2" />
      {label}
      <ChevronRight className="h-4 w-4 ml-auto" />
    </Button>
  );
};



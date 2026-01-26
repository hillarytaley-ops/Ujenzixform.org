/**
 * Advanced Analytics Dashboard
 * Comprehensive analytics for admin users
 */

import React, { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Package, Users, Truck,
  Calendar, ArrowUpRight, ArrowDownRight, BarChart3, PieChart,
  MapPin, Clock, Star, ShoppingCart, RefreshCw, Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';

// Types
interface AnalyticsData {
  revenue: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    growth: number;
  };
  orders: {
    total: number;
    pending: number;
    completed: number;
    cancelled: number;
    averageValue: number;
  };
  users: {
    total: number;
    builders: number;
    suppliers: number;
    deliveryProviders: number;
    newThisMonth: number;
  };
  deliveries: {
    total: number;
    completed: number;
    inProgress: number;
    averageTime: number;
  };
  topSuppliers: Array<{
    id: string;
    name: string;
    revenue: number;
    orders: number;
    rating: number;
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    sales: number;
    revenue: number;
  }>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    orders: number;
  }>;
  ordersByStatus: Array<{
    status: string;
    count: number;
  }>;
  usersByCounty: Array<{
    county: string;
    count: number;
  }>;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

// Stat Card Component
const StatCard: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
  color?: string;
}> = ({ title, value, change, icon, trend, subtitle, color = 'blue' }) => {
  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-500 to-red-600',
    yellow: 'from-yellow-500 to-yellow-600'
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex">
          <div className={`w-2 bg-gradient-to-b ${colorClasses[color]}`} />
          <div className="flex-1 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{title}</p>
                <p className="text-2xl font-bold mt-1">{value}</p>
                {subtitle && (
                  <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
                )}
              </div>
              <div className={`p-3 rounded-full bg-gradient-to-br ${colorClasses[color]} text-white`}>
                {icon}
              </div>
            </div>
            {change !== undefined && (
              <div className={`flex items-center mt-2 text-sm ${
                trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {trend === 'up' ? (
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                ) : trend === 'down' ? (
                  <ArrowDownRight className="h-4 w-4 mr-1" />
                ) : null}
                <span>{Math.abs(change).toFixed(1)}% from last month</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Simple Bar Chart Component
const SimpleBarChart: React.FC<{
  data: Array<{ label: string; value: number }>;
  maxValue?: number;
  color?: string;
}> = ({ data, maxValue, color = 'blue' }) => {
  const max = maxValue || Math.max(...data.map(d => d.value));
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500'
  };

  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium">{formatNumber(item.value)}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${colorClasses[color]} rounded-full transition-all duration-500`}
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

// Donut Chart Component
const DonutChart: React.FC<{
  data: Array<{ label: string; value: number; color: string }>;
  centerLabel?: string;
  centerValue?: string;
}> = ({ data, centerLabel, centerValue }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;

  return (
    <div className="relative">
      <svg viewBox="0 0 100 100" className="w-full h-48">
        {data.map((item, index) => {
          const percentage = (item.value / total) * 100;
          const angle = (percentage / 100) * 360;
          const startAngle = currentAngle;
          currentAngle += angle;

          const x1 = 50 + 40 * Math.cos((Math.PI * startAngle) / 180);
          const y1 = 50 + 40 * Math.sin((Math.PI * startAngle) / 180);
          const x2 = 50 + 40 * Math.cos((Math.PI * (startAngle + angle)) / 180);
          const y2 = 50 + 40 * Math.sin((Math.PI * (startAngle + angle)) / 180);

          const largeArc = angle > 180 ? 1 : 0;

          return (
            <path
              key={index}
              d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
              fill={item.color}
              className="transition-all duration-300 hover:opacity-80"
            />
          );
        })}
        <circle cx="50" cy="50" r="25" fill="white" />
        {centerValue && (
          <>
            <text x="50" y="47" textAnchor="middle" className="text-lg font-bold fill-current">
              {centerValue}
            </text>
            <text x="50" y="57" textAnchor="middle" className="text-xs fill-muted-foreground">
              {centerLabel}
            </text>
          </>
        )}
      </svg>
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span>{item.label}: {item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AnalyticsDashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [data, setData] = useState<AnalyticsData | null>(null);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      // Fetch all data in parallel
      const [
        ordersResult,
        usersResult,
        deliveriesResult,
        suppliersResult,
        materialsResult
      ] = await Promise.all([
        supabase.from('purchase_orders').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('delivery_requests').select('*'),
        supabase.from('suppliers').select('*'),
        supabase.from('admin_material_images').select('id, name, category')
      ]);

      const orders = ordersResult.data || [];
      const users = usersResult.data || [];
      const deliveries = deliveriesResult.data || [];
      const suppliers = suppliersResult.data || [];

      // Calculate date ranges
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      // Revenue calculations
      const totalRevenue = orders
        .filter(o => o.status === 'confirmed' || o.status === 'completed')
        .reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);

      const thisMonthRevenue = orders
        .filter(o => {
          const date = new Date(o.created_at);
          return date >= thisMonthStart && (o.status === 'confirmed' || o.status === 'completed');
        })
        .reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);

      const lastMonthRevenue = orders
        .filter(o => {
          const date = new Date(o.created_at);
          return date >= lastMonthStart && date <= lastMonthEnd && (o.status === 'confirmed' || o.status === 'completed');
        })
        .reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);

      const revenueGrowth = lastMonthRevenue > 0 
        ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
        : 0;

      // User counts
      const builders = users.filter(u => u.role === 'professional_builder' || u.role === 'private_client').length;
      const supplierUsers = users.filter(u => u.role === 'supplier').length;
      const deliveryUsers = users.filter(u => u.role === 'delivery' || u.role === 'delivery_provider').length;
      const newUsersThisMonth = users.filter(u => new Date(u.created_at) >= thisMonthStart).length;

      // Order stats
      const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'quoted').length;
      const completedOrders = orders.filter(o => o.status === 'confirmed' || o.status === 'completed').length;
      const cancelledOrders = orders.filter(o => o.status === 'rejected' || o.status === 'cancelled').length;
      const avgOrderValue = completedOrders > 0 
        ? totalRevenue / completedOrders 
        : 0;

      // Delivery stats
      const completedDeliveries = deliveries.filter(d => d.status === 'delivered').length;
      const inProgressDeliveries = deliveries.filter(d => 
        ['accepted', 'picked_up', 'in_transit'].includes(d.status)
      ).length;

      // Top suppliers by order count
      const supplierOrders: Record<string, { count: number; revenue: number }> = {};
      orders.forEach(o => {
        if (o.supplier_id) {
          if (!supplierOrders[o.supplier_id]) {
            supplierOrders[o.supplier_id] = { count: 0, revenue: 0 };
          }
          supplierOrders[o.supplier_id].count++;
          if (o.status === 'confirmed' || o.status === 'completed') {
            supplierOrders[o.supplier_id].revenue += parseFloat(o.total_amount) || 0;
          }
        }
      });

      const topSuppliers = Object.entries(supplierOrders)
        .map(([id, data]) => {
          const supplier = suppliers.find(s => s.id === id || s.user_id === id);
          return {
            id,
            name: supplier?.company_name || 'Unknown Supplier',
            revenue: data.revenue,
            orders: data.count,
            rating: parseFloat(supplier?.rating || '0')
          };
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Revenue by month (last 6 months)
      const revenueByMonth: Array<{ month: string; revenue: number; orders: number }> = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' });
        
        const monthOrders = orders.filter(o => {
          const date = new Date(o.created_at);
          return date >= monthDate && date <= monthEnd;
        });
        
        const monthRevenue = monthOrders
          .filter(o => o.status === 'confirmed' || o.status === 'completed')
          .reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);

        revenueByMonth.push({
          month: monthName,
          revenue: monthRevenue,
          orders: monthOrders.length
        });
      }

      // Orders by status
      const ordersByStatus = [
        { status: 'Pending', count: pendingOrders },
        { status: 'Completed', count: completedOrders },
        { status: 'Cancelled', count: cancelledOrders }
      ];

      // Users by county (mock data - would need location data)
      const usersByCounty = [
        { county: 'Nairobi', count: Math.floor(users.length * 0.4) },
        { county: 'Mombasa', count: Math.floor(users.length * 0.15) },
        { county: 'Kisumu', count: Math.floor(users.length * 0.1) },
        { county: 'Nakuru', count: Math.floor(users.length * 0.08) },
        { county: 'Others', count: Math.floor(users.length * 0.27) }
      ];

      setData({
        revenue: {
          total: totalRevenue,
          thisMonth: thisMonthRevenue,
          lastMonth: lastMonthRevenue,
          growth: revenueGrowth
        },
        orders: {
          total: orders.length,
          pending: pendingOrders,
          completed: completedOrders,
          cancelled: cancelledOrders,
          averageValue: avgOrderValue
        },
        users: {
          total: users.length,
          builders,
          suppliers: supplierUsers,
          deliveryProviders: deliveryUsers,
          newThisMonth: newUsersThisMonth
        },
        deliveries: {
          total: deliveries.length,
          completed: completedDeliveries,
          inProgress: inProgressDeliveries,
          averageTime: 2.5 // Mock average delivery time in days
        },
        topSuppliers,
        topProducts: [], // Would need sales data per product
        revenueByMonth,
        ordersByStatus,
        usersByCounty
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BarChart3 className="h-12 w-12 mx-auto mb-4" />
        <p>Unable to load analytics data</p>
        <Button onClick={fetchAnalytics} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground">Track performance and insights</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchAnalytics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(data.revenue.total)}
          change={data.revenue.growth}
          trend={data.revenue.growth >= 0 ? 'up' : 'down'}
          icon={<DollarSign className="h-6 w-6" />}
          color="green"
          subtitle={`This month: ${formatCurrency(data.revenue.thisMonth)}`}
        />
        <StatCard
          title="Total Orders"
          value={formatNumber(data.orders.total)}
          icon={<ShoppingCart className="h-6 w-6" />}
          color="blue"
          subtitle={`Avg value: ${formatCurrency(data.orders.averageValue)}`}
        />
        <StatCard
          title="Total Users"
          value={formatNumber(data.users.total)}
          icon={<Users className="h-6 w-6" />}
          color="purple"
          subtitle={`+${data.users.newThisMonth} this month`}
        />
        <StatCard
          title="Deliveries"
          value={formatNumber(data.deliveries.total)}
          icon={<Truck className="h-6 w-6" />}
          color="orange"
          subtitle={`${data.deliveries.inProgress} in progress`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Revenue Trend
            </CardTitle>
            <CardDescription>Monthly revenue for the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarChart
              data={data.revenueByMonth.map(m => ({
                label: m.month,
                value: m.revenue
              }))}
              color="green"
            />
          </CardContent>
        </Card>

        {/* Order Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-blue-500" />
              Order Status
            </CardTitle>
            <CardDescription>Distribution of order statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={[
                { label: 'Pending', value: data.orders.pending, color: '#f59e0b' },
                { label: 'Completed', value: data.orders.completed, color: '#22c55e' },
                { label: 'Cancelled', value: data.orders.cancelled, color: '#ef4444' }
              ]}
              centerValue={data.orders.total.toString()}
              centerLabel="Total"
            />
          </CardContent>
        </Card>
      </div>

      {/* User Breakdown & Top Suppliers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              User Breakdown
            </CardTitle>
            <CardDescription>Users by role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Builders</span>
                <div className="flex items-center gap-2">
                  <Progress value={(data.users.builders / data.users.total) * 100} className="w-32 h-2" />
                  <span className="text-sm font-medium w-12 text-right">{data.users.builders}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Suppliers</span>
                <div className="flex items-center gap-2">
                  <Progress value={(data.users.suppliers / data.users.total) * 100} className="w-32 h-2" />
                  <span className="text-sm font-medium w-12 text-right">{data.users.suppliers}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Delivery Providers</span>
                <div className="flex items-center gap-2">
                  <Progress value={(data.users.deliveryProviders / data.users.total) * 100} className="w-32 h-2" />
                  <span className="text-sm font-medium w-12 text-right">{data.users.deliveryProviders}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Suppliers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Top Suppliers
            </CardTitle>
            <CardDescription>By revenue generated</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topSuppliers.length > 0 ? (
                data.topSuppliers.map((supplier, index) => (
                  <div key={supplier.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-muted-foreground w-6">#{index + 1}</span>
                      <div>
                        <p className="font-medium">{supplier.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {supplier.orders} orders • {supplier.rating.toFixed(1)}★
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(supplier.revenue)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">No supplier data yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Geographic Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-red-500" />
            Geographic Distribution
          </CardTitle>
          <CardDescription>Users by county</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {data.usersByCounty.map((county) => (
              <div key={county.county} className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{county.count}</p>
                <p className="text-sm text-muted-foreground">{county.county}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{data.deliveries.averageTime}d</p>
            <p className="text-sm text-muted-foreground">Avg Delivery Time</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Package className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{data.deliveries.completed}</p>
            <p className="text-sm text-muted-foreground">Completed Deliveries</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">
              {data.orders.total > 0 ? ((data.orders.completed / data.orders.total) * 100).toFixed(0) : 0}%
            </p>
            <p className="text-sm text-muted-foreground">Completion Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-orange-500" />
            <p className="text-2xl font-bold">+{data.users.newThisMonth}</p>
            <p className="text-sm text-muted-foreground">New Users (Month)</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;


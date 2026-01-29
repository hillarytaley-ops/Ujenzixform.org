/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   📊 USER ANALYTICS DASHBOARD                                                       ║
 * ║                                                                                      ║
 * ║   Created: January 29, 2026                                                          ║
 * ║   Features:                                                                          ║
 * ║   - Sales reports for suppliers                                                     ║
 * ║   - Spending trends for builders                                                    ║
 * ║   - Popular products analysis                                                       ║
 * ║   - Performance metrics                                                             ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  Users,
  Star,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Download,
  Target,
  Zap,
  Award
} from 'lucide-react';

interface AnalyticsData {
  // Revenue/Spending
  totalRevenue: number;
  revenueChange: number;
  monthlyRevenue: { month: string; amount: number }[];
  
  // Orders
  totalOrders: number;
  ordersChange: number;
  pendingOrders: number;
  completedOrders: number;
  
  // Products (for suppliers)
  totalProducts: number;
  topProducts: { name: string; sales: number; revenue: number }[];
  lowStockProducts: number;
  
  // Customers/Suppliers (depending on role)
  totalCustomers: number;
  repeatCustomers: number;
  newCustomers: number;
  
  // Performance
  averageOrderValue: number;
  averageRating: number;
  responseTime: number;
  fulfillmentRate: number;
}

interface UserAnalyticsDashboardProps {
  userId: string;
  userRole: 'supplier' | 'builder' | 'professional_builder' | 'private_client';
}

export const UserAnalyticsDashboard: React.FC<UserAnalyticsDashboardProps> = ({ userId, userRole }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30'); // days
  const { toast } = useToast();

  const isSupplier = userRole === 'supplier';

  useEffect(() => {
    loadAnalytics();
  }, [userId, userRole, dateRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));
      
      const previousStartDate = new Date(startDate);
      previousStartDate.setDate(previousStartDate.getDate() - parseInt(dateRange));
      
      // Fetch orders
      const orderQuery = supabase
        .from('purchase_orders')
        .select('*')
        .gte('created_at', startDate.toISOString());
      
      if (isSupplier) {
        orderQuery.eq('supplier_id', userId);
      } else {
        orderQuery.eq('buyer_id', userId);
      }
      
      const { data: orders, error: ordersError } = await orderQuery;
      
      // Fetch previous period orders for comparison
      const prevOrderQuery = supabase
        .from('purchase_orders')
        .select('total_amount')
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', startDate.toISOString());
      
      if (isSupplier) {
        prevOrderQuery.eq('supplier_id', userId);
      } else {
        prevOrderQuery.eq('buyer_id', userId);
      }
      
      const { data: prevOrders } = await prevOrderQuery;
      
      // Calculate metrics
      const currentRevenue = (orders || []).reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const previousRevenue = (prevOrders || []).reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0);
      const revenueChange = previousRevenue > 0 
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
        : 0;
      
      const completedOrders = (orders || []).filter(o => 
        ['delivered', 'completed', 'accepted'].includes(o.status?.toLowerCase())
      ).length;
      
      const pendingOrders = (orders || []).filter(o => 
        ['pending', 'processing', 'shipped'].includes(o.status?.toLowerCase())
      ).length;
      
      // Monthly breakdown
      const monthlyData: Record<string, number> = {};
      (orders || []).forEach((order: any) => {
        const month = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short' });
        monthlyData[month] = (monthlyData[month] || 0) + (order.total_amount || 0);
      });
      
      const monthlyRevenue = Object.entries(monthlyData).map(([month, amount]) => ({
        month,
        amount
      }));
      
      // Top products analysis
      const productSales: Record<string, { sales: number; revenue: number }> = {};
      (orders || []).forEach((order: any) => {
        try {
          const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
          items.forEach((item: any) => {
            const name = item.name || item.product_name || 'Unknown';
            if (!productSales[name]) {
              productSales[name] = { sales: 0, revenue: 0 };
            }
            productSales[name].sales += item.quantity || 1;
            productSales[name].revenue += (item.quantity || 1) * (item.unit_price || item.price || 0);
          });
        } catch (e) {
          // Ignore parse errors
        }
      });
      
      const topProducts = Object.entries(productSales)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
      
      // Customer analysis (for suppliers)
      let totalCustomers = 0;
      let repeatCustomers = 0;
      if (isSupplier) {
        const customerOrders: Record<string, number> = {};
        (orders || []).forEach((order: any) => {
          customerOrders[order.buyer_id] = (customerOrders[order.buyer_id] || 0) + 1;
        });
        totalCustomers = Object.keys(customerOrders).length;
        repeatCustomers = Object.values(customerOrders).filter(count => count > 1).length;
      }
      
      // Products count (for suppliers)
      let totalProducts = 0;
      let lowStockProducts = 0;
      if (isSupplier) {
        const { data: products } = await supabase
          .from('supplier_product_prices')
          .select('id, stock_quantity, in_stock')
          .eq('supplier_id', userId);
        
        totalProducts = products?.length || 0;
        lowStockProducts = products?.filter((p: any) => 
          (p.stock_quantity !== null && p.stock_quantity <= 10) || !p.in_stock
        ).length || 0;
      }
      
      // Rating (for suppliers)
      let averageRating = 0;
      if (isSupplier) {
        const { data: reviews } = await supabase
          .from('supplier_reviews')
          .select('rating')
          .eq('supplier_id', userId)
          .eq('status', 'approved');
        
        if (reviews && reviews.length > 0) {
          averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        }
      }
      
      setAnalytics({
        totalRevenue: currentRevenue,
        revenueChange,
        monthlyRevenue,
        totalOrders: orders?.length || 0,
        ordersChange: prevOrders ? ((orders?.length || 0) - prevOrders.length) / Math.max(prevOrders.length, 1) * 100 : 0,
        pendingOrders,
        completedOrders,
        totalProducts,
        topProducts,
        lowStockProducts,
        totalCustomers,
        repeatCustomers,
        newCustomers: totalCustomers - repeatCustomers,
        averageOrderValue: orders?.length ? currentRevenue / orders.length : 0,
        averageRating,
        responseTime: 24, // Placeholder - would need actual tracking
        fulfillmentRate: orders?.length ? (completedOrders / orders.length) * 100 : 0
      });
      
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load analytics data'
      });
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!analytics) return;
    
    const report = [
      `${isSupplier ? 'Sales' : 'Spending'} Report - Last ${dateRange} Days`,
      `Generated: ${new Date().toLocaleDateString()}`,
      '',
      `Total ${isSupplier ? 'Revenue' : 'Spent'}: KES ${analytics.totalRevenue.toLocaleString()}`,
      `Total Orders: ${analytics.totalOrders}`,
      `Completed Orders: ${analytics.completedOrders}`,
      `Pending Orders: ${analytics.pendingOrders}`,
      `Average Order Value: KES ${analytics.averageOrderValue.toLocaleString()}`,
      '',
      'Top Products:',
      ...analytics.topProducts.map((p, i) => `${i + 1}. ${p.name} - ${p.sales} sold - KES ${p.revenue.toLocaleString()}`)
    ].join('\n');
    
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${isSupplier ? 'sales' : 'spending'}-report-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: '📊 Report Downloaded',
      description: 'Your analytics report has been downloaded'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12 text-slate-400">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {isSupplier ? 'Sales Analytics' : 'Spending Analytics'}
          </h2>
          <p className="text-slate-400">Track your {isSupplier ? 'business performance' : 'purchase history'}</p>
        </div>
        
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px] bg-slate-800 border-slate-600">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
              <SelectItem value="365">Last Year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" onClick={exportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button size="sm" onClick={loadAnalytics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-300">{isSupplier ? 'Total Revenue' : 'Total Spent'}</p>
                <p className="text-2xl font-bold text-white">
                  KES {analytics.totalRevenue.toLocaleString()}
                </p>
                <div className={`flex items-center text-xs mt-1 ${
                  analytics.revenueChange >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {analytics.revenueChange >= 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {Math.abs(analytics.revenueChange).toFixed(1)}% vs previous period
                </div>
              </div>
              <DollarSign className="h-10 w-10 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-300">Total Orders</p>
                <p className="text-2xl font-bold text-white">{analytics.totalOrders}</p>
                <p className="text-xs text-green-400 mt-1">
                  {analytics.completedOrders} completed
                </p>
              </div>
              <ShoppingCart className="h-10 w-10 text-green-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-300">Avg Order Value</p>
                <p className="text-2xl font-bold text-white">
                  KES {analytics.averageOrderValue.toLocaleString()}
                </p>
                <p className="text-xs text-purple-400 mt-1">
                  Per order
                </p>
              </div>
              <Target className="h-10 w-10 text-purple-400" />
            </div>
          </CardContent>
        </Card>
        
        {isSupplier ? (
          <Card className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 border-yellow-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-300">Rating</p>
                  <p className="text-2xl font-bold text-white">
                    {analytics.averageRating.toFixed(1)} ⭐
                  </p>
                  <p className="text-xs text-yellow-400 mt-1">
                    Customer satisfaction
                  </p>
                </div>
                <Star className="h-10 w-10 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gradient-to-br from-orange-600/20 to-orange-800/20 border-orange-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-300">Pending Orders</p>
                  <p className="text-2xl font-bold text-white">{analytics.pendingOrders}</p>
                  <p className="text-xs text-orange-400 mt-1">
                    Awaiting delivery
                  </p>
                </div>
                <Package className="h-10 w-10 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts & Details */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {isSupplier ? 'Revenue' : 'Spending'} Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.monthlyRevenue.length > 0 ? (
              <div className="space-y-3">
                {analytics.monthlyRevenue.map((data, index) => {
                  const maxAmount = Math.max(...analytics.monthlyRevenue.map(d => d.amount));
                  const percentage = (data.amount / maxAmount) * 100;
                  
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">{data.month}</span>
                        <span className="text-white font-medium">
                          KES {data.amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-400 text-center py-8">No data for this period</p>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Award className="h-5 w-5" />
              Top Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.topProducts.length > 0 ? (
              <div className="space-y-3">
                {analytics.topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                        index === 1 ? 'bg-slate-400/20 text-slate-300' :
                        index === 2 ? 'bg-orange-500/20 text-orange-400' :
                        'bg-slate-600/20 text-slate-400'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-white font-medium truncate max-w-[150px]">{product.name}</p>
                        <p className="text-xs text-slate-400">{product.sales} {isSupplier ? 'sold' : 'purchased'}</p>
                      </div>
                    </div>
                    <p className="text-white font-medium">
                      KES {product.revenue.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-center py-8">No products data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Supplier-specific metrics */}
      {isSupplier && (
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-cyan-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{analytics.totalCustomers}</p>
                  <p className="text-xs text-slate-400">Total Customers</p>
                  <p className="text-xs text-cyan-400">{analytics.repeatCustomers} repeat buyers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Package className="h-8 w-8 text-emerald-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{analytics.totalProducts}</p>
                  <p className="text-xs text-slate-400">Products Listed</p>
                  {analytics.lowStockProducts > 0 && (
                    <p className="text-xs text-yellow-400">{analytics.lowStockProducts} low stock</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Zap className="h-8 w-8 text-amber-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{analytics.fulfillmentRate.toFixed(0)}%</p>
                  <p className="text-xs text-slate-400">Fulfillment Rate</p>
                  <p className="text-xs text-amber-400">Order completion</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default UserAnalyticsDashboard;


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
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from '@/integrations/supabase/client';
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

// Helper function to get Supabase config
const getSupabaseConfig = () => {
  let accessToken = '';
  try {
    const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
    if (storedSession) {
      const parsed = JSON.parse(storedSession);
      accessToken = parsed.access_token || '';
    }
  } catch (e) {}
  
  return { SUPABASE_URL, SUPABASE_ANON_KEY, accessToken };
};

// Helper function to add timeout to any promise
const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
  ]);
};

export const UserAnalyticsDashboard: React.FC<UserAnalyticsDashboardProps> = ({ userId, userRole }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30'); // days
  const { toast } = useToast();

  const isSupplier = userRole === 'supplier';

  useEffect(() => {
    loadAnalytics();
    // Safety timeout - force loading to false after 10 seconds
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
      console.log('⏱️ User Analytics safety timeout - forcing loading false');
    }, 10000);
    return () => clearTimeout(safetyTimeout);
  }, [userId, userRole, dateRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      console.log('📊 Loading user analytics for:', userId, 'role:', userRole);
      
      const { SUPABASE_URL, SUPABASE_ANON_KEY, accessToken } = getSupabaseConfig();
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));
      
      const previousStartDate = new Date(startDate);
      previousStartDate.setDate(previousStartDate.getDate() - parseInt(dateRange));
      
      // Build query params based on role
      const idField = isSupplier ? 'supplier_id' : 'buyer_id';
      
      // Fetch orders using REST API
      let orders: any[] = [];
      try {
        const ordersUrl = `${SUPABASE_URL}/rest/v1/purchase_orders?${idField}=eq.${userId}&created_at=gte.${startDate.toISOString()}&order=created_at.desc`;
        const ordersResponse = await withTimeout(
          fetch(ordersUrl, {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
            },
          }),
          5000
        );
        if (ordersResponse.ok) {
          orders = await ordersResponse.json();
          console.log('📊 Orders loaded:', orders?.length);
        }
      } catch (e) {
        console.log('Orders fetch timeout');
      }
      
      // Fetch previous period orders for comparison
      let prevOrders: any[] = [];
      try {
        const prevUrl = `${SUPABASE_URL}/rest/v1/purchase_orders?${idField}=eq.${userId}&created_at=gte.${previousStartDate.toISOString()}&created_at=lt.${startDate.toISOString()}&select=total_amount`;
        const prevResponse = await withTimeout(
          fetch(prevUrl, {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
            },
          }),
          5000
        );
        if (prevResponse.ok) {
          prevOrders = await prevResponse.json();
        }
      } catch (e) {
        console.log('Previous orders fetch timeout');
      }
      
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
        try {
          const productsUrl = `${SUPABASE_URL}/rest/v1/supplier_product_prices?supplier_id=eq.${userId}&select=id,stock_quantity,in_stock`;
          const productsResponse = await withTimeout(
            fetch(productsUrl, {
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
              },
            }),
            5000
          );
          if (productsResponse.ok) {
            const products = await productsResponse.json();
            totalProducts = products?.length || 0;
            lowStockProducts = products?.filter((p: any) => 
              (p.stock_quantity !== null && p.stock_quantity <= 10) || !p.in_stock
            ).length || 0;
            console.log('📊 Products loaded:', totalProducts);
          }
        } catch (e) {
          console.log('Products fetch timeout');
        }
      }
      
      // Rating (for suppliers)
      let averageRating = 0;
      if (isSupplier) {
        try {
          const reviewsUrl = `${SUPABASE_URL}/rest/v1/supplier_reviews?supplier_id=eq.${userId}&status=eq.approved&select=rating`;
          const reviewsResponse = await withTimeout(
            fetch(reviewsUrl, {
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
              },
            }),
            5000
          );
          if (reviewsResponse.ok) {
            const reviews = await reviewsResponse.json();
            if (reviews && reviews.length > 0) {
              averageRating = reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length;
            }
            console.log('📊 Reviews loaded for rating:', reviews?.length);
          }
        } catch (e) {
          console.log('Reviews fetch timeout');
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
      `Total ${isSupplier ? 'Revenue' : 'Spent'}: KES ${(analytics.totalRevenue || 0).toLocaleString()}`,
      `Total Orders: ${analytics.totalOrders || 0}`,
      `Completed Orders: ${analytics.completedOrders || 0}`,
      `Pending Orders: ${analytics.pendingOrders || 0}`,
      `Average Order Value: KES ${(analytics.averageOrderValue || 0).toLocaleString()}`,
      '',
      'Top Products:',
      ...(analytics.topProducts || []).map((p, i) => `${i + 1}. ${p.name} - ${p.sales || 0} sold - KES ${(p.revenue || 0).toLocaleString()}`)
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-indigo-600/10 via-purple-600/10 to-pink-600/10 rounded-lg p-6 border border-indigo-500/20">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            {isSupplier ? 'Sales Analytics' : 'Spending Analytics'}
          </h2>
          <p className="text-indigo-200 mt-2 text-sm font-medium">
            {isSupplier ? 'Track your business performance and revenue trends' : 'Monitor your purchase history and spending patterns'}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px] bg-white/10 backdrop-blur-sm border-indigo-400/30 text-white hover:bg-white/20">
              <Calendar className="h-4 w-4 mr-2 text-indigo-300" />
              <SelectValue className="text-white" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              <SelectItem value="7" className="text-white hover:bg-indigo-600">Last 7 Days</SelectItem>
              <SelectItem value="30" className="text-white hover:bg-indigo-600">Last 30 Days</SelectItem>
              <SelectItem value="90" className="text-white hover:bg-indigo-600">Last 90 Days</SelectItem>
              <SelectItem value="365" className="text-white hover:bg-indigo-600">Last Year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportReport}
            className="bg-white/10 backdrop-blur-sm border-indigo-400/30 text-white hover:bg-indigo-600/50 hover:border-indigo-400"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button 
            size="sm" 
            onClick={loadAnalytics}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 border-blue-400/50 shadow-lg hover:shadow-xl transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-100 mb-1">{isSupplier ? 'Total Revenue' : 'Total Spent'}</p>
                <p className="text-3xl font-bold text-white mb-2">
                  KES {(analytics.totalRevenue || 0).toLocaleString()}
                </p>
                <div className={`flex items-center text-xs font-medium ${
                  (analytics.revenueChange || 0) >= 0 ? 'text-emerald-200' : 'text-red-200'
                }`}>
                  {(analytics.revenueChange || 0) >= 0 ? (
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 mr-1" />
                  )}
                  {Math.abs(analytics.revenueChange || 0).toFixed(1)}% vs previous period
                </div>
              </div>
              <div className="bg-white/20 rounded-full p-3">
                <DollarSign className="h-8 w-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-500 via-green-600 to-teal-600 border-emerald-400/50 shadow-lg hover:shadow-xl transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-100 mb-1">Total Orders</p>
                <p className="text-3xl font-bold text-white mb-2">{analytics.totalOrders}</p>
                <p className="text-xs font-medium text-emerald-200">
                  {analytics.completedOrders} completed
                </p>
              </div>
              <div className="bg-white/20 rounded-full p-3">
                <ShoppingCart className="h-8 w-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500 via-purple-600 to-pink-600 border-purple-400/50 shadow-lg hover:shadow-xl transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-100 mb-1">Avg Order Value</p>
                <p className="text-3xl font-bold text-white mb-2">
                  KES {(analytics.averageOrderValue || 0).toLocaleString()}
                </p>
                <p className="text-xs font-medium text-purple-200">
                  Per order
                </p>
              </div>
              <div className="bg-white/20 rounded-full p-3">
                <Target className="h-8 w-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {isSupplier ? (
          <Card className="bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-500 border-amber-400/50 shadow-lg hover:shadow-xl transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-100 mb-1">Rating</p>
                  <p className="text-3xl font-bold text-white mb-2">
                    {analytics.averageRating.toFixed(1)} ⭐
                  </p>
                  <p className="text-xs font-medium text-amber-200">
                    Customer satisfaction
                  </p>
                </div>
                <div className="bg-white/20 rounded-full p-3">
                  <Star className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gradient-to-br from-orange-500 via-red-500 to-rose-600 border-orange-400/50 shadow-lg hover:shadow-xl transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-100 mb-1">Pending Orders</p>
                  <p className="text-3xl font-bold text-white mb-2">{analytics.pendingOrders}</p>
                  <p className="text-xs font-medium text-orange-200">
                    Awaiting delivery
                  </p>
                </div>
                <div className="bg-white/20 rounded-full p-3">
                  <Package className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts & Details */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <Card className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 border-indigo-500/30 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border-b border-indigo-500/30">
            <CardTitle className="text-white flex items-center gap-2 text-lg font-semibold">
              <TrendingUp className="h-5 w-5 text-indigo-400" />
              {isSupplier ? 'Revenue' : 'Spending'} Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {analytics.monthlyRevenue.length > 0 ? (
              <div className="space-y-4">
                {analytics.monthlyRevenue.map((data, index) => {
                  const maxAmount = Math.max(...analytics.monthlyRevenue.map(d => d.amount));
                  const percentage = (data.amount / maxAmount) * 100;
                  
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-indigo-200 font-medium">{data.month}</span>
                        <span className="text-white font-bold text-base">
                          KES {(data.amount || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="h-3 bg-slate-600/50 rounded-full overflow-hidden shadow-inner">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-700 shadow-md"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-slate-500 opacity-50" />
                <p className="text-slate-400 font-medium">No data for this period</p>
                <p className="text-slate-500 text-sm mt-1">Start making purchases to see trends</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 border-purple-500/30 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-purple-500/30">
            <CardTitle className="text-white flex items-center gap-2 text-lg font-semibold">
              <Award className="h-5 w-5 text-purple-400" />
              Top Products
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {analytics.topProducts.length > 0 ? (
              <div className="space-y-3">
                {analytics.topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-700/50 to-slate-600/30 rounded-lg border border-slate-600/50 hover:border-purple-500/50 transition-all">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-md ${
                        index === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white' :
                        index === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-500 text-white' :
                        index === 2 ? 'bg-gradient-to-br from-orange-400 to-red-500 text-white' :
                        'bg-gradient-to-br from-slate-600 to-slate-700 text-slate-300'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-white font-semibold truncate max-w-[150px]">{product.name}</p>
                        <p className="text-xs text-purple-300 font-medium">{product.sales} {isSupplier ? 'sold' : 'purchased'}</p>
                      </div>
                    </div>
                    <p className="text-white font-bold text-base">
                      KES {(product.revenue || 0).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Award className="h-12 w-12 mx-auto mb-4 text-slate-500 opacity-50" />
                <p className="text-slate-400 font-medium">No products data</p>
                <p className="text-slate-500 text-sm mt-1">Product analytics will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Supplier-specific metrics */}
      {isSupplier && (
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 border-cyan-400/50 shadow-lg hover:shadow-xl transition-all">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 rounded-full p-3">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white mb-1">{analytics.totalCustomers}</p>
                  <p className="text-sm font-medium text-cyan-100">Total Customers</p>
                  <p className="text-xs font-medium text-cyan-200 mt-1">{analytics.repeatCustomers} repeat buyers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-emerald-500 via-teal-500 to-green-600 border-emerald-400/50 shadow-lg hover:shadow-xl transition-all">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 rounded-full p-3">
                  <Package className="h-8 w-8 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white mb-1">{analytics.totalProducts}</p>
                  <p className="text-sm font-medium text-emerald-100">Products Listed</p>
                  {analytics.lowStockProducts > 0 && (
                    <p className="text-xs font-medium text-amber-200 mt-1">{analytics.lowStockProducts} low stock</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-500 border-amber-400/50 shadow-lg hover:shadow-xl transition-all">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 rounded-full p-3">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white mb-1">{analytics.fulfillmentRate.toFixed(0)}%</p>
                  <p className="text-sm font-medium text-amber-100">Fulfillment Rate</p>
                  <p className="text-xs font-medium text-amber-200 mt-1">Order completion</p>
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


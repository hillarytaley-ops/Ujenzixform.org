import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardLoader } from "@/components/ui/DashboardLoader";
import { 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  DollarSign,
  Users,
  Star,
  Truck,
  Plus,
  Eye,
  Edit,
  BarChart3,
  Bell,
  Settings,
  Store,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Shield,
  Moon,
  Sun,
  Globe,
  Headphones
} from "lucide-react";
import { useSupplierData, logDataAccessAttempt } from "@/hooks/useDataIsolation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SupplierCharts } from "@/components/supplier/SupplierCharts";
import { ProductManagement } from "@/components/supplier/ProductManagement";
import { OrderManagement } from "@/components/supplier/OrderManagement";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SupplierAnalyticsDashboard } from "@/components/suppliers/SupplierAnalyticsDashboard";
import { SupplierProductManager } from "@/components/suppliers/SupplierProductManager";
import { SupportChat } from "@/components/support/SupportChat";

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  averageRating: number;
}

interface RecentOrder {
  id: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  total_amount: number;
  status: string;
  created_at: string;
}

const SupplierDashboard = () => {
  const { user, userRole } = useAuth();
  const { t } = useLanguage();
  
  // NOTE: Role check is already done by RoleProtectedRoute in App.tsx
  // No need for duplicate verification here - this speeds up loading!
  
  // Dark mode state - initialize immediately for instant UI
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('supplier-dark-mode');
    return saved ? JSON.parse(saved) : false;
  });

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode((prev: boolean) => {
      const newValue = !prev;
      localStorage.setItem('supplier-dark-mode', JSON.stringify(newValue));
      return newValue;
    });
  };
  
  // Use data isolation hook - ensures only THIS supplier's data is fetched
  const {
    profile: isolatedProfile,
    orders: supplierOrders,
    stats: isolatedStats,
    loading: dataLoading,
    error: dataError,
    refetch: refetchData
  } = useSupplierData();
  
  const [loading, setLoading] = useState(true);
  const [supplierProfile, setSupplierProfile] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    averageRating: 0
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  // Show UI immediately - don't wait for data
  useEffect(() => {
    if (user) {
      setLoading(false);
    }
  }, [user]);

  // Update local state when isolated data loads (background)
  useEffect(() => {
    if (isolatedProfile) {
      setSupplierProfile(isolatedProfile);
    }
    if (isolatedStats) {
      setStats(isolatedStats);
    }
    // Transform orders to match local format
    if (supplierOrders && supplierOrders.length > 0) {
      const formattedOrders: RecentOrder[] = supplierOrders.slice(0, 10).map((order: any) => ({
        id: order.id,
        customer_name: order.builder_name || 'Customer',
        product_name: order.items?.[0]?.name || order.description || 'Order Items',
        quantity: order.items?.[0]?.quantity || 1,
        total_amount: order.total_amount || 0,
        status: order.status || 'pending',
        created_at: order.created_at
      }));
      setRecentOrders(formattedOrders);
    }
  }, [isolatedProfile, isolatedStats, supplierOrders]);

  // Log data access for security audit
  useEffect(() => {
    if (user?.id) {
      logDataAccessAttempt(user.id, 'view', 'supplier_dashboard', true, 'Dashboard loaded');
    }
  }, [user?.id]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        // Fetch supplier profile - ONLY for current user
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        setSupplierProfile(profile);

        // Fetch orders where this supplier is the vendor - ONLY for current user
        const { data: ordersData } = await supabase
          .from('purchase_orders')
          .select('*')
          .eq('supplier_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (ordersData && ordersData.length > 0) {
          const formattedOrders: RecentOrder[] = ordersData.map((order: any) => ({
            id: order.id,
            customer_name: order.builder_name || 'Customer',
            product_name: order.items?.[0]?.name || order.description || 'Order Items',
            quantity: order.items?.[0]?.quantity || 1,
            total_amount: order.total_amount || 0,
            status: order.status || 'pending',
            created_at: order.created_at
          }));
          setRecentOrders(formattedOrders);
          
          // Calculate stats from actual data
          const pendingCount = ordersData.filter(o => o.status === 'pending').length;
          const totalRevenue = ordersData.reduce((sum, o) => sum + (o.total_amount || 0), 0);
          const uniqueCustomers = new Set(ordersData.map(o => o.builder_id)).size;
          
          setStats(prev => ({
            ...prev,
            totalOrders: ordersData.length,
            pendingOrders: pendingCount,
            totalRevenue,
            totalCustomers: uniqueCustomers
          }));
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'processing': return <Package className="h-4 w-4" />;
      case 'shipped': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  // Theme classes
  const bgMain = isDarkMode 
    ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
    : 'bg-gradient-to-br from-orange-50 via-white to-amber-50';
  const cardBg = isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white';
  const textColor = isDarkMode ? 'text-white' : 'text-gray-900';
  const mutedText = isDarkMode ? 'text-gray-400' : 'text-gray-500';

  if (loading) {
    return <DashboardLoader type="supplier" />;
  }

  return (
    <div className={`min-h-screen ${bgMain}`}>
      <Navigation />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-orange-600 to-amber-600 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Store className="h-8 w-8" />
                {t('supplier.dashboard.title')}
              </h1>
              <p className="text-orange-100 mt-1">
                {t('supplier.dashboard.welcome')}, {supplierProfile?.full_name || supplierProfile?.company_name || user?.email}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <LanguageSwitcher variant="compact" />
              <Button 
                variant="outline" 
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={toggleDarkMode}
              >
                {isDarkMode ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
                {isDarkMode ? 'Light' : 'Dark'}
              </Button>
              <Button variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                <Bell className="h-4 w-4 mr-2" />
                {t('supplier.dashboard.notifications')}
              </Button>
              <Button variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                <Settings className="h-4 w-4 mr-2" />
                {t('supplier.dashboard.settings')}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card className={`${cardBg} shadow-lg hover:shadow-xl transition-shadow`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${mutedText}`}>{t('supplier.stats.products')}</p>
                  <p className={`text-2xl font-bold ${textColor}`}>{stats.totalProducts}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${cardBg} shadow-lg hover:shadow-xl transition-shadow`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${mutedText}`}>{t('supplier.stats.totalOrders')}</p>
                  <p className={`text-2xl font-bold ${textColor}`}>{stats.totalOrders}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <ShoppingCart className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${cardBg} shadow-lg hover:shadow-xl transition-shadow`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${mutedText}`}>{t('supplier.stats.pending')}</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${cardBg} shadow-lg hover:shadow-xl transition-shadow`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${mutedText}`}>{t('supplier.stats.revenue')}</p>
                  <p className={`text-xl font-bold ${textColor}`}>{formatCurrency(stats.totalRevenue)}</p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-full">
                  <DollarSign className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${cardBg} shadow-lg hover:shadow-xl transition-shadow`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${mutedText}`}>{t('supplier.stats.customers')}</p>
                  <p className={`text-2xl font-bold ${textColor}`}>{stats.totalCustomers}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${cardBg} shadow-lg hover:shadow-xl transition-shadow`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${mutedText}`}>{t('supplier.stats.rating')}</p>
                  <p className={`text-2xl font-bold ${textColor}`}>{stats.averageRating || '4.5'}</p>
                </div>
                <div className="p-3 bg-amber-100 rounded-full">
                  <Star className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Button 
            className="h-auto py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
            onClick={() => setActiveTab('products')}
          >
            <div className="flex flex-col items-center gap-2">
              <Plus className="h-6 w-6" />
              <span>{t('supplier.actions.addProduct')}</span>
            </div>
          </Button>
          <Button 
            variant="outline" 
            className={`h-auto py-4 border-2 ${isDarkMode ? 'border-slate-600 hover:bg-slate-700' : 'hover:bg-orange-50'}`}
            onClick={() => setActiveTab('orders')}
          >
            <div className="flex flex-col items-center gap-2">
              <Eye className={`h-6 w-6 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} />
              <span className={textColor}>{t('supplier.actions.viewOrders')}</span>
            </div>
          </Button>
          <Button 
            variant="outline" 
            className={`h-auto py-4 border-2 ${isDarkMode ? 'border-slate-600 hover:bg-slate-700' : 'hover:bg-orange-50'}`}
            onClick={() => setActiveTab('analytics')}
          >
            <div className="flex flex-col items-center gap-2">
              <BarChart3 className={`h-6 w-6 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} />
              <span className={textColor}>{t('supplier.actions.analytics')}</span>
            </div>
          </Button>
          <Button 
            variant="outline" 
            className={`h-auto py-4 border-2 ${isDarkMode ? 'border-slate-600 hover:bg-slate-700' : 'hover:bg-orange-50'}`}
          >
            <div className="flex flex-col items-center gap-2">
              <FileText className={`h-6 w-6 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} />
              <span className={textColor}>{t('supplier.actions.reports')}</span>
            </div>
          </Button>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} shadow-md p-1 rounded-lg flex-wrap h-auto`}>
            <TabsTrigger value="overview" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              Overview
            </TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              {t('supplier.tabs.orders')}
            </TabsTrigger>
            <TabsTrigger value="products" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              {t('supplier.tabs.myProducts')}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              {t('supplier.tabs.analytics')}
            </TabsTrigger>
            <TabsTrigger value="add-products" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
              <Plus className="h-4 w-4 mr-1" />
              Add New Products
            </TabsTrigger>
            <TabsTrigger value="support" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <Headphones className="h-4 w-4 mr-1" />
              Support
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="space-y-6">
              {/* Recent Orders Summary */}
              <Card className={cardBg}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className={textColor}>{t('supplier.orders.title')}</CardTitle>
                      <CardDescription className={mutedText}>{t('supplier.orders.description')}</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab('orders')}>
                      {t('supplier.orders.viewAll')}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentOrders.slice(0, 5).map((order) => (
                      <div key={order.id} className={`flex items-center justify-between p-4 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'} rounded-lg hover:${isDarkMode ? 'bg-slate-600' : 'bg-gray-100'} transition-colors`}>
                        <div className="flex items-center gap-4">
                          <div className={`p-2 ${isDarkMode ? 'bg-slate-600' : 'bg-white'} rounded-lg shadow-sm`}>
                            <Package className="h-8 w-8 text-orange-500" />
                          </div>
                          <div>
                            <p className={`font-medium ${textColor}`}>{order.product_name}</p>
                            <p className={`text-sm ${mutedText}`}>
                              {order.customer_name} • Qty: {order.quantity}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className={`font-semibold ${textColor}`}>{formatCurrency(order.total_amount)}</p>
                            <p className={`text-xs ${mutedText}`}>
                              {new Date(order.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className={`${getStatusColor(order.status)} flex items-center gap-1`}>
                            {getStatusIcon(order.status)}
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    ))}

                    {recentOrders.length === 0 && (
                      <div className="text-center py-12">
                        <ShoppingCart className={`h-12 w-12 ${isDarkMode ? 'text-slate-600' : 'text-gray-300'} mx-auto mb-4`} />
                        <p className={mutedText}>{t('supplier.orders.noOrders')}</p>
                        <p className={`text-sm ${mutedText}`}>{t('supplier.orders.ordersAppear')}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Analytics */}
              <SupplierCharts isDarkMode={isDarkMode} />
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <OrderManagement supplierId={user?.id || ''} isDarkMode={isDarkMode} />
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <ProductManagement supplierId={user?.id || ''} isDarkMode={isDarkMode} />
          </TabsContent>

          {/* Analytics Tab - Enhanced Dashboard */}
          <TabsContent value="analytics">
            <SupplierAnalyticsDashboard supplierId={user?.id || ''} />
          </TabsContent>

          {/* Add New Products Tab - For supplier-uploaded products (pending admin approval) */}
          <TabsContent value="add-products">
            <Card className={cardBg}>
              <CardHeader>
                <CardTitle className={textColor}>Add New Products</CardTitle>
                <CardDescription className={mutedText}>
                  Upload new products with images. Products will be pending admin approval before appearing in the marketplace.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SupplierProductManager supplierId={user?.id || ''} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Support Tab */}
          <TabsContent value="support">
            <Card className={cardBg}>
              <CardHeader>
                <CardTitle className={textColor}>
                  <Headphones className="h-5 w-5 inline-block mr-2 text-purple-500" />
                  Support Center
                </CardTitle>
                <CardDescription className={mutedText}>
                  Get help from our support team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Headphones className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className={mutedText}>
                    Need help? Click the support button in the bottom right corner to start a chat with our team.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Support Chat Widget */}
        {user && (
          <SupportChat 
            userId={user.id}
            userRole="supplier"
            userName={supplierProfile?.company_name || user.email?.split('@')[0] || 'Supplier'}
          />
        )}
      </main>

      <Footer />
    </div>
  );
};

export default SupplierDashboard;

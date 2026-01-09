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
  Headphones,
  FileCheck,
  XCircle,
  Send,
  MapPin,
  Building2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSupplierData, logDataAccessAttempt } from "@/hooks/useDataIsolation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SupplierCharts } from "@/components/supplier/SupplierCharts";
import { ProductManagement } from "@/components/supplier/ProductManagement";
import { OrderManagement } from "@/components/supplier/OrderManagement";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SupplierAnalyticsDashboard } from "@/components/suppliers/SupplierAnalyticsDashboard";
import { SupplierProductManager } from "@/components/suppliers/SupplierProductManager";
import { MessageSquare } from "lucide-react";

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
  const [quoteRequests, setQuoteRequests] = useState<any[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [quoteResponse, setQuoteResponse] = useState({
    quoteAmount: '',
    validUntil: '',
    supplierNotes: ''
  });
  const [processingQuote, setProcessingQuote] = useState(false);

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

  // Fetch quote requests for this supplier
  useEffect(() => {
    const fetchQuoteRequests = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('quotation_requests')
          .select('*')
          .eq('supplier_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setQuoteRequests(data || []);
      } catch (error) {
        console.error('Error fetching quote requests:', error);
      }
    };

    fetchQuoteRequests();
  }, [user?.id]);

  const handleQuoteAction = async (action: 'approve' | 'reject') => {
    if (!selectedQuote) return;
    
    setProcessingQuote(true);
    try {
      const updateData: any = {
        status: action === 'approve' ? 'quoted' : 'rejected',
        updated_at: new Date().toISOString()
      };

      if (action === 'approve') {
        if (!quoteResponse.quoteAmount) {
          throw new Error('Please enter a quote amount');
        }
        updateData.quote_amount = parseFloat(quoteResponse.quoteAmount);
        updateData.quote_valid_until = quoteResponse.validUntil || null;
        updateData.supplier_notes = quoteResponse.supplierNotes || null;
      } else {
        updateData.supplier_notes = quoteResponse.supplierNotes || 'Quote request rejected';
      }

      const { error } = await supabase
        .from('quotation_requests')
        .update(updateData)
        .eq('id', selectedQuote.id);

      if (error) throw error;

      // Refresh quote requests
      const { data: newData } = await supabase
        .from('quotation_requests')
        .select('*')
        .eq('supplier_id', user?.id)
        .order('created_at', { ascending: false });
      
      setQuoteRequests(newData || []);
      setQuoteDialogOpen(false);
      setSelectedQuote(null);
      setQuoteResponse({ quoteAmount: '', validUntil: '', supplierNotes: '' });

    } catch (error: any) {
      console.error('Error processing quote:', error);
      alert(error.message || 'Failed to process quote');
    } finally {
      setProcessingQuote(false);
    }
  };

  const openQuoteDialog = (quote: any) => {
    setSelectedQuote(quote);
    setQuoteResponse({
      quoteAmount: quote.quote_amount?.toString() || '',
      validUntil: quote.quote_valid_until || '',
      supplierNotes: quote.supplier_notes || ''
    });
    setQuoteDialogOpen(true);
  };

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
            <TabsTrigger value="quotes" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <FileCheck className="h-4 w-4 mr-1" />
              Quote Requests
              {quoteRequests.filter(q => q.status === 'pending').length > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {quoteRequests.filter(q => q.status === 'pending').length}
                </span>
              )}
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

          {/* Quote Requests Tab */}
          <TabsContent value="quotes">
            <Card className={cardBg}>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className={`flex items-center gap-2 ${textColor}`}>
                      <FileCheck className="h-5 w-5 text-blue-500" />
                      Quote Requests from Professional Builders
                    </CardTitle>
                    <CardDescription className={mutedText}>
                      Review and respond to quote requests from professional builders
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-100 text-amber-700 border border-amber-300">
                      {quoteRequests.filter(q => q.status === 'pending').length} Pending
                    </Badge>
                    <Badge className="bg-green-100 text-green-700 border border-green-300">
                      {quoteRequests.filter(q => q.status === 'quoted').length} Quoted
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {quoteRequests.length > 0 ? (
                  <div className="space-y-4">
                    {quoteRequests.map((quote) => (
                      <div 
                        key={quote.id} 
                        className={`border rounded-lg p-4 transition-colors ${
                          isDarkMode ? 'border-slate-600 hover:bg-slate-700/50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                          {/* Quote Details */}
                          <div className="flex-1">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${
                                quote.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                                quote.status === 'quoted' ? 'bg-green-100 text-green-600' :
                                quote.status === 'accepted' ? 'bg-blue-100 text-blue-600' :
                                'bg-red-100 text-red-600'
                              }`}>
                                <Package className="h-5 w-5" />
                              </div>
                              <div className="flex-1">
                                <h4 className={`font-semibold ${textColor}`}>{quote.material_name}</h4>
                                <div className="flex flex-wrap items-center gap-3 mt-1 text-sm">
                                  <span className={mutedText}>
                                    <strong>Qty:</strong> {quote.quantity} {quote.unit}
                                  </span>
                                  <span className={mutedText}>•</span>
                                  <span className={`flex items-center gap-1 ${mutedText}`}>
                                    <MapPin className="h-3 w-3" />
                                    {quote.delivery_address}
                                  </span>
                                </div>
                                {quote.project_description && (
                                  <p className={`text-sm mt-2 ${mutedText}`}>
                                    <strong>Project:</strong> {quote.project_description}
                                  </p>
                                )}
                                {quote.special_requirements && (
                                  <p className={`text-sm mt-1 ${mutedText}`}>
                                    <strong>Requirements:</strong> {quote.special_requirements}
                                  </p>
                                )}
                                {quote.preferred_delivery_date && (
                                  <p className={`text-sm mt-1 ${mutedText}`}>
                                    <strong>Preferred Delivery:</strong> {new Date(quote.preferred_delivery_date).toLocaleDateString()}
                                  </p>
                                )}
                                <p className={`text-xs mt-2 ${mutedText}`}>
                                  Requested: {new Date(quote.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Status & Actions */}
                          <div className="flex flex-col items-end gap-3">
                            <Badge className={`${
                              quote.status === 'pending' ? 'bg-amber-100 text-amber-700 border-amber-300' :
                              quote.status === 'quoted' ? 'bg-green-100 text-green-700 border-green-300' :
                              quote.status === 'accepted' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                              'bg-red-100 text-red-700 border-red-300'
                            }`}>
                              {quote.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                              {quote.status === 'quoted' && <CheckCircle className="h-3 w-3 mr-1" />}
                              {quote.status === 'accepted' && <CheckCircle className="h-3 w-3 mr-1" />}
                              {quote.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                              {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                            </Badge>

                            {quote.quote_amount && (
                              <div className="text-right">
                                <p className={`text-lg font-bold ${textColor}`}>
                                  KES {quote.quote_amount.toLocaleString()}
                                </p>
                                {quote.quote_valid_until && (
                                  <p className={`text-xs ${mutedText}`}>
                                    Valid until: {new Date(quote.quote_valid_until).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            )}

                            {quote.status === 'pending' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="bg-green-500 hover:bg-green-600"
                                  onClick={() => openQuoteDialog(quote)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Respond
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-300 text-red-600 hover:bg-red-50"
                                  onClick={() => {
                                    setSelectedQuote(quote);
                                    handleQuoteAction('reject');
                                  }}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}

                            {quote.status === 'quoted' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openQuoteDialog(quote)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit Quote
                              </Button>
                            )}
                          </div>
                        </div>

                        {quote.supplier_notes && quote.status !== 'pending' && (
                          <div className={`mt-3 pt-3 border-t ${isDarkMode ? 'border-slate-600' : 'border-gray-200'}`}>
                            <p className={`text-sm ${mutedText}`}>
                              <strong>Your Response:</strong> {quote.supplier_notes}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileCheck className={`h-16 w-16 mx-auto mb-4 ${isDarkMode ? 'text-slate-600' : 'text-gray-300'}`} />
                    <p className={`text-lg font-medium ${textColor}`}>No Quote Requests Yet</p>
                    <p className={mutedText}>Quote requests from professional builders will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quote Response Dialog */}
            <Dialog open={quoteDialogOpen} onOpenChange={setQuoteDialogOpen}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-blue-500" />
                    Respond to Quote Request
                  </DialogTitle>
                  <DialogDescription>
                    {selectedQuote && (
                      <span>
                        Provide your quote for <strong>{selectedQuote.material_name}</strong> ({selectedQuote.quantity} {selectedQuote.unit})
                      </span>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="quoteAmount">Quote Amount (KES) *</Label>
                    <Input
                      id="quoteAmount"
                      type="number"
                      placeholder="Enter your quote amount"
                      value={quoteResponse.quoteAmount}
                      onChange={(e) => setQuoteResponse(prev => ({ ...prev, quoteAmount: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="validUntil">Quote Valid Until</Label>
                    <Input
                      id="validUntil"
                      type="date"
                      value={quoteResponse.validUntil}
                      onChange={(e) => setQuoteResponse(prev => ({ ...prev, validUntil: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplierNotes">Notes to Builder</Label>
                    <Textarea
                      id="supplierNotes"
                      placeholder="Add any notes about pricing, delivery terms, etc."
                      value={quoteResponse.supplierNotes}
                      onChange={(e) => setQuoteResponse(prev => ({ ...prev, supplierNotes: e.target.value }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setQuoteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => handleQuoteAction('approve')}
                    disabled={processingQuote}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    {processingQuote ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Quote
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
                  Live Support
                </CardTitle>
                <CardDescription className={mutedText}>
                  Chat directly with MradiPro support team
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Live Chat Guide */}
                <div className={`rounded-lg p-6 border ${isDarkMode ? 'bg-gradient-to-r from-purple-900/30 to-orange-900/30 border-purple-800' : 'bg-gradient-to-r from-purple-50 to-orange-50 border-purple-200'}`}>
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-purple-600 rounded-full text-white">
                      <MessageSquare className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className={`text-lg font-semibold mb-2 ${textColor}`}>💬 Live Chat Available</h3>
                      <p className={`${mutedText} mb-4`}>
                        Click the <strong className="text-purple-500">"Live"</strong> chat button in the bottom-right corner of your screen to:
                      </p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className={mutedText}>Chat with our AI assistant for instant answers</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className={mutedText}>Request human support from our team</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className={mutedText}>Get help with orders, products, and payments</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Quick Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className={isDarkMode ? 'bg-orange-900/20 border-orange-800' : 'bg-orange-50 border-orange-200'}>
                    <CardContent className="p-4">
                      <h4 className={`font-semibold mb-2 flex items-center gap-2 ${textColor}`}>
                        <Clock className="h-4 w-4 text-orange-500" />
                        Support Hours
                      </h4>
                      <p className={`text-sm ${mutedText}`}>
                        Mon - Fri: 8AM - 6PM<br />
                        Saturday: 9AM - 4PM<br />
                        Sunday: Closed
                      </p>
                    </CardContent>
                  </Card>
                  <Card className={isDarkMode ? 'bg-purple-900/20 border-purple-800' : 'bg-purple-50 border-purple-200'}>
                    <CardContent className="p-4">
                      <h4 className={`font-semibold mb-2 flex items-center gap-2 ${textColor}`}>
                        <AlertCircle className="h-4 w-4 text-purple-500" />
                        Supplier Hotline
                      </h4>
                      <p className={`text-sm ${mutedText}`}>
                        Call: +254 700 000 000<br />
                        Email: suppliers@mradipro.co.ke
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default SupplierDashboard;

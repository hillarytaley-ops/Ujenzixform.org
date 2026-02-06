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
import { MessageSquare, QrCode, Boxes, BarChart3 as BarChartIcon } from "lucide-react";
import { EnhancedQRCodeManager } from "@/components/qr/EnhancedQRCodeManager";
import { InventoryManager } from "@/components/supplier/InventoryManager";
import { OrderHistory } from "@/components/orders/OrderHistory";
import { ReviewsList, SupplierRatingSummary } from "@/components/reviews/ReviewSystem";
import { UserAnalyticsDashboard } from "@/components/analytics/UserAnalyticsDashboard";

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
  const [supplierRecordId, setSupplierRecordId] = useState<string | null>(null); // Actual supplier table ID
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
  const [loadingQuotes, setLoadingQuotes] = useState(false);

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

  // Fetch quote requests function - extracted for reuse
  const fetchQuoteRequests = async () => {
    if (!user?.id) {
      console.log('❌ Cannot fetch quotes - no user.id');
      return;
    }
    
    setLoadingQuotes(true);
    console.log('🔄 Fetching quotes for supplier user.id:', user.id, 'email:', user.email);
    
    try {
      // First, try to find supplier record by user_id
      let supplierRecord = null;
      const { data: byUserId, error: userIdError } = await supabase
        .from('suppliers')
        .select('id, user_id, company_name, email')
        .eq('user_id', user.id)
        .maybeSingle();
      
      supplierRecord = byUserId;
      console.log('📦 Supplier record by user_id:', byUserId, 'error:', userIdError);
      
      // If not found by user_id, try by email
      if (!supplierRecord && user.email) {
        const { data: byEmail, error: emailError } = await supabase
          .from('suppliers')
          .select('id, user_id, company_name, email')
          .eq('email', user.email)
          .maybeSingle();
        
        supplierRecord = byEmail;
        console.log('📦 Supplier record by email:', byEmail, 'error:', emailError);
      }
      
      // Build list of IDs to check (user.id, suppliers.id, AND suppliers.user_id)
      const supplierIds = [user.id];
      if (supplierRecord?.id && !supplierIds.includes(supplierRecord.id)) {
        supplierIds.push(supplierRecord.id);
      }
      if (supplierRecord?.user_id && !supplierIds.includes(supplierRecord.user_id)) {
        supplierIds.push(supplierRecord.user_id);
      }
      
      console.log('🔍 Looking for quotes with supplier_id in:', supplierIds);
      console.log('📦 Final supplier record:', supplierRecord);
      
      // Store the supplier record ID for use by child components
      if (supplierRecord?.id) {
        setSupplierRecordId(supplierRecord.id);
      }

      // Fetch from purchase_orders where this supplier is the target
      // Check BOTH user.id AND suppliers.id since quotes might use either
      const { data: purchaseOrderQuotes, error: poError } = await supabase
        .from('purchase_orders')
        .select('*')
        .in('supplier_id', supplierIds)
        .in('status', ['pending', 'quoted', 'rejected', 'confirmed'])
        .order('created_at', { ascending: false });
      
      console.log('📋 Raw purchase_orders query result:', purchaseOrderQuotes?.length || 0, 'quotes, error:', poError);
      
      // DEBUG: Log what IDs we're checking vs what's in the database
      const { data: allPendingQuotes } = await supabase
        .from('purchase_orders')
        .select('id, supplier_id, buyer_id, status, po_number, created_at')
        .in('status', ['pending', 'quoted', 'confirmed'])
        .order('created_at', { ascending: false })
        .limit(20);
      
      console.log('🔎 DEBUG - All recent quotes in system:', allPendingQuotes);
      console.log('🔎 DEBUG - Checking if any quote supplier_id matches our IDs:');
      allPendingQuotes?.forEach(q => {
        const matches = supplierIds.includes(q.supplier_id);
        console.log(`   Quote ${q.po_number}: supplier_id=${q.supplier_id}, matches=${matches ? '✓' : '✗'}`);
      });
        
        if (poError) {
          console.error('Error fetching purchase order quotes:', poError);
        }

        // Also fetch from quotation_requests table (legacy)
        const { data: legacyQuotes, error: qrError } = await supabase
          .from('quotation_requests')
          .select('*')
          .eq('supplier_id', user.id)
          .order('created_at', { ascending: false });
        
        if (qrError) {
          console.error('Error fetching legacy quote requests:', qrError);
        }

        // Transform purchase_orders to match quote display format
        const transformedPOQuotes = (purchaseOrderQuotes || []).map(po => ({
          id: po.id,
          material_name: po.items?.[0]?.material_name || po.project_name || 'Quote Request',
          quantity: po.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 1,
          unit: po.items?.[0]?.unit || 'items',
          delivery_address: po.delivery_address || 'To be provided',
          project_description: po.project_name,
          special_requirements: null,
          preferred_delivery_date: po.delivery_date,
          status: po.status,
          quote_amount: po.quote_amount || po.total_amount,
          quote_valid_until: null,
          supplier_notes: null,
          created_at: po.created_at,
          buyer_id: po.buyer_id,
          purchase_order_id: po.id,
          // Include all items for display
          items: po.items,
          po_number: po.po_number,
          total_amount: po.total_amount
        }));

        // Combine both sources, with purchase_orders taking priority
        const allQuotes = [...transformedPOQuotes, ...(legacyQuotes || [])];
        
        // Remove duplicates by id
        const uniqueQuotes = allQuotes.filter((quote, index, self) => 
          index === self.findIndex(q => q.id === quote.id)
        );

        console.log('📋 Quote requests loaded:', uniqueQuotes.length, 'from purchase_orders:', transformedPOQuotes.length);
        setQuoteRequests(uniqueQuotes);
      } catch (error) {
        console.error('Error fetching quote requests:', error);
      } finally {
        setLoadingQuotes(false);
      }
  };

  // Fetch quote requests on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      fetchQuoteRequests();
    }
    
    // Set up real-time subscription for new quote requests
    // Listen to all purchase_orders changes and filter in callback
    const subscription = supabase
      .channel('supplier-quotes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'purchase_orders' },
        (payload: any) => {
          // Check if this quote is for us (either by user_id or suppliers.id)
          const newRecord = payload.new;
          if (newRecord?.supplier_id) {
            console.log('📬 Quote activity detected, refreshing...');
            fetchQuoteRequests();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  const handleQuoteAction = async (action: 'approve' | 'reject') => {
    if (!selectedQuote) return;
    
    setProcessingQuote(true);
    try {
      const newStatus = action === 'approve' ? 'quoted' : 'rejected';
      
      if (action === 'approve' && !quoteResponse.quoteAmount) {
        throw new Error('Please enter a quote amount');
      }

      // Check if this is a purchase_order quote (has purchase_order_id or po_number)
      const isPurchaseOrderQuote = selectedQuote.purchase_order_id || selectedQuote.po_number;
      
      if (isPurchaseOrderQuote) {
        // Update purchase_orders table directly
        const updateData: any = {
          status: newStatus,
          updated_at: new Date().toISOString()
        };
        
        if (action === 'approve') {
          const quoteAmountValue = parseFloat(quoteResponse.quoteAmount);
          updateData.quote_amount = quoteAmountValue;
          // Also save supplier notes if provided
          if (quoteResponse.supplierNotes) {
            updateData.supplier_notes = quoteResponse.supplierNotes;
          }
          if (quoteResponse.validUntil) {
            updateData.quote_valid_until = quoteResponse.validUntil;
          }
          console.log('💰 Quote amount being saved:', quoteAmountValue, 'from input:', quoteResponse.quoteAmount);
        }

        const quoteId = selectedQuote.purchase_order_id || selectedQuote.id;
        console.log('🔄 Attempting to update purchase_order:', quoteId);
        console.log('📝 Update data:', JSON.stringify(updateData, null, 2));
        console.log('🔑 Current user.id:', user?.id);

        const { data: updateResult, error: poError } = await supabase
          .from('purchase_orders')
          .update(updateData)
          .eq('id', quoteId)
          .select();
        
        if (poError) {
          console.error('❌ Error updating purchase order:', poError);
          console.error('❌ Error details:', poError.message, poError.details, poError.hint);
          throw poError;
        }
        
        // Check if any rows were actually updated
        if (!updateResult || updateResult.length === 0) {
          console.error('⚠️ No rows updated! RLS policy may be blocking the update.');
          console.error('Quote ID:', quoteId, 'Supplier user.id:', user?.id);
          
          // Try to fetch the order to see what supplier_id it has
          const { data: orderCheck } = await supabase
            .from('purchase_orders')
            .select('id, supplier_id, status')
            .eq('id', quoteId)
            .single();
          console.error('📋 Order details:', orderCheck);
          
          throw new Error('Failed to update quote - you may not have permission to update this order');
        }
        
        console.log(`✅ Quote ${action === 'approve' ? 'sent' : 'rejected'} - Purchase order updated:`, updateResult);
        console.log('💰 Saved quote_amount:', updateResult[0]?.quote_amount);
      } else {
        // Legacy: Update quotation_requests table
        const updateData: any = {
          status: newStatus,
          updated_at: new Date().toISOString()
        };

        if (action === 'approve') {
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
      }

      // Refresh quote requests - fetch from both tables
      // Get supplier record to find their suppliers.id
      const { data: supplierRecord } = await supabase
        .from('suppliers')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();
      
      const supplierIds = [user?.id];
      if (supplierRecord?.id) supplierIds.push(supplierRecord.id);

      const { data: purchaseOrderQuotes } = await supabase
        .from('purchase_orders')
        .select('*')
        .in('supplier_id', supplierIds)
        .in('status', ['pending', 'quoted', 'rejected'])
        .order('created_at', { ascending: false });

      const transformedPOQuotes = (purchaseOrderQuotes || []).map(po => ({
        id: po.id,
        material_name: po.items?.[0]?.material_name || po.project_name || 'Quote Request',
        quantity: po.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 1,
        unit: po.items?.[0]?.unit || 'items',
        delivery_address: po.delivery_address || 'To be provided',
        project_description: po.project_name,
        status: po.status,
        quote_amount: po.quote_amount || po.total_amount,
        created_at: po.created_at,
        buyer_id: po.buyer_id,
        purchase_order_id: po.id,
        items: po.items,
        po_number: po.po_number,
        total_amount: po.total_amount
      }));

      setQuoteRequests(transformedPOQuotes);
      setQuoteDialogOpen(false);
      setSelectedQuote(null);
      setQuoteResponse({ quoteAmount: '', validUntil: '', supplierNotes: '' });

      alert(action === 'approve' 
        ? '✅ Quote sent to builder! They will review and accept/reject.' 
        : '❌ Quote request rejected.'
      );

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

        // Fetch orders where this supplier is the vendor
        // Look up supplier by user_id OR email to handle account mismatches
        let supplierRecordForOrders = null;
        const { data: byUserIdOrders } = await supabase
          .from('suppliers')
          .select('id, user_id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        supplierRecordForOrders = byUserIdOrders;
        
        // If not found by user_id, try by email
        if (!supplierRecordForOrders && user.email) {
          const { data: byEmailOrders } = await supabase
            .from('suppliers')
            .select('id, user_id')
            .eq('email', user.email)
            .maybeSingle();
          supplierRecordForOrders = byEmailOrders;
        }
        
        // Build list of IDs to check
        const orderSupplierIds = [user.id];
        if (supplierRecordForOrders?.id && !orderSupplierIds.includes(supplierRecordForOrders.id)) {
          orderSupplierIds.push(supplierRecordForOrders.id);
        }
        if (supplierRecordForOrders?.user_id && !orderSupplierIds.includes(supplierRecordForOrders.user_id)) {
          orderSupplierIds.push(supplierRecordForOrders.user_id);
        }

        const { data: ordersData } = await supabase
          .from('purchase_orders')
          .select('*')
          .in('supplier_id', orderSupplierIds)
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

  const formatCurrency = (amount: number | undefined | null) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount || 0);
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
            <TabsTrigger value="qr-codes" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white">
              <QrCode className="h-4 w-4 mr-1" />
              QR Codes
            </TabsTrigger>
            <TabsTrigger value="add-products" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
              <Plus className="h-4 w-4 mr-1" />
              Add New Products
            </TabsTrigger>
            <TabsTrigger value="support" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <Headphones className="h-4 w-4 mr-1" />
              Support
            </TabsTrigger>
            <TabsTrigger value="inventory" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              <Boxes className="h-4 w-4 mr-1" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="order-history" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
              <FileText className="h-4 w-4 mr-1" />
              Order History
            </TabsTrigger>
            <TabsTrigger value="reviews" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-white">
              <Star className="h-4 w-4 mr-1" />
              Reviews
            </TabsTrigger>
            <TabsTrigger value="my-analytics" className="data-[state=active]:bg-pink-500 data-[state=active]:text-white">
              <BarChartIcon className="h-4 w-4 mr-1" />
              My Analytics
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
                              {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                          <Badge className={`${getStatusColor(order.status || 'pending')} flex items-center gap-1`}>
                            {getStatusIcon(order.status || 'pending')}
                            {(order.status || 'pending').charAt(0).toUpperCase() + (order.status || 'pending').slice(1)}
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
            <OrderManagement supplierId={supplierRecordId || user?.id || ''} isDarkMode={isDarkMode} />
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <ProductManagement supplierId={supplierRecordId || user?.id || ''} isDarkMode={isDarkMode} />
          </TabsContent>

          {/* Analytics Tab - Enhanced Dashboard */}
          <TabsContent value="analytics">
            <SupplierAnalyticsDashboard supplierId={supplierRecordId || user?.id || ''} />
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchQuoteRequests}
                      disabled={loadingQuotes}
                      className="mr-2"
                    >
                      {loadingQuotes ? (
                        <Clock className="h-4 w-4 animate-spin" />
                      ) : (
                        <Bell className="h-4 w-4" />
                      )}
                      <span className="ml-1">Refresh</span>
                    </Button>
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
                                <h4 className={`font-semibold ${textColor}`}>
                                  {quote.po_number || quote.material_name}
                                </h4>
                                
                                {/* Show all items if available */}
                                {quote.items && quote.items.length > 0 ? (
                                  <div className={`mt-2 space-y-1 text-sm ${mutedText}`}>
                                    <strong>Items ({quote.items.length}):</strong>
                                    <ul className="list-disc list-inside ml-2 space-y-0.5">
                                      {quote.items.slice(0, 5).map((item: any, idx: number) => (
                                        <li key={idx} className="text-xs">
                                          {item.material_name || item.name} - Qty: {item.quantity} {item.unit}
                                        </li>
                                      ))}
                                      {quote.items.length > 5 && (
                                        <li className="text-xs text-blue-500">
                                          +{quote.items.length - 5} more items...
                                        </li>
                                      )}
                                    </ul>
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap items-center gap-3 mt-1 text-sm">
                                    <span className={mutedText}>
                                      <strong>Qty:</strong> {quote.quantity} {quote.unit}
                                    </span>
                                  </div>
                                )}
                                
                                <div className={`flex items-center gap-1 mt-2 text-sm ${mutedText}`}>
                                  <MapPin className="h-3 w-3" />
                                  {quote.delivery_address}
                                </div>
                                
                                {quote.total_amount != null && (
                                  <p className={`text-sm mt-1 ${mutedText}`}>
                                    <strong>Estimated Total:</strong> KES {Number(quote.total_amount || 0).toLocaleString()}
                                  </p>
                                )}
                                
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
                                  Requested: {quote.created_at ? new Date(quote.created_at).toLocaleString() : 'N/A'}
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
                              {(quote.status || 'pending').charAt(0).toUpperCase() + (quote.status || 'pending').slice(1)}
                            </Badge>

                            {quote.quote_amount != null && (
                              <div className="text-right">
                                <p className={`text-lg font-bold ${textColor}`}>
                                  KES {Number(quote.quote_amount || 0).toLocaleString()}
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

          {/* QR Codes Tab - View and download QR codes for confirmed orders */}
          <TabsContent value="qr-codes">
            <Card className={cardBg}>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${textColor}`}>
                  <QrCode className="h-5 w-5 text-cyan-500" />
                  QR Code Management
                </CardTitle>
                <CardDescription className={mutedText}>
                  View and download QR codes for confirmed orders. Attach these to materials before dispatch.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="mb-4 bg-cyan-50 border-cyan-200">
                  <QrCode className="h-4 w-4 text-cyan-600" />
                  <AlertTitle className="text-cyan-800">How QR Codes Work</AlertTitle>
                  <AlertDescription className="text-cyan-700 text-sm">
                    <ul className="list-disc ml-4 mt-2 space-y-1">
                      <li>QR codes are <strong>automatically generated</strong> when a professional builder accepts your quote</li>
                      <li>Download and print QR codes to attach to each material item</li>
                      <li>Delivery providers and builders scan these codes to verify materials</li>
                      <li>Track the full journey: Dispatch → In Transit → Delivered</li>
                    </ul>
                  </AlertDescription>
                </Alert>
                <EnhancedQRCodeManager />
              </CardContent>
            </Card>
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
                <SupplierProductManager supplierId={supplierRecordId || user?.id || ''} />
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
                  Chat directly with UjenziXform support team
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
                        Email: suppliers@UjenziXform.co.ke
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Management Tab */}
          <TabsContent value="inventory">
            <Card className={cardBg}>
              <CardHeader>
                <CardTitle className={textColor}>Inventory Management</CardTitle>
                <CardDescription className={mutedText}>
                  Track stock levels, set alerts, and manage your inventory
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Use supplier record ID if available, fallback to user.id */}
                {user && <InventoryManager supplierId={supplierRecordId || user.id} />}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Order History Tab */}
          <TabsContent value="order-history">
            <Card className={cardBg}>
              <CardHeader>
                <CardTitle className={textColor}>Order History</CardTitle>
                <CardDescription className={mutedText}>
                  View all orders and download invoices
                </CardDescription>
              </CardHeader>
              <CardContent>
                {user && <OrderHistory userId={user.id} userRole="supplier" />}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            <div className="space-y-6">
              {/* Rating Summary */}
              {user && <SupplierRatingSummary supplierId={supplierRecordId || user.id} />}
              
              {/* Reviews List */}
              <Card className={cardBg}>
                <CardHeader>
                  <CardTitle className={textColor}>Customer Reviews</CardTitle>
                  <CardDescription className={mutedText}>
                    See what your customers are saying
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {user && <ReviewsList supplierId={supplierRecordId || user.id} />}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* My Analytics Tab */}
          <TabsContent value="my-analytics">
            <Card className={cardBg}>
              <CardHeader>
                <CardTitle className={textColor}>Sales Analytics</CardTitle>
                <CardDescription className={mutedText}>
                  Track your sales performance and trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                {user && <UserAnalyticsDashboard userId={user.id} userRole="supplier" />}
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

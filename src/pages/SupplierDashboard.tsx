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
  Building2,
  LogOut
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
import { MessageSquare, QrCode, Boxes, BarChart3 as BarChartIcon, User } from "lucide-react";
import { EnhancedQRCodeManager } from "@/components/qr/EnhancedQRCodeManager";
import { ProfileEditDialog } from "@/components/profile/ProfileEditDialog";
import { InventoryManager } from "@/components/supplier/InventoryManager";
import { OrderHistory } from "@/components/orders/OrderHistory";
import { ReviewsList, SupplierRatingSummary } from "@/components/reviews/ReviewSystem";
import { UserAnalyticsDashboard } from "@/components/analytics/UserAnalyticsDashboard";
import { InAppCommunication } from "@/components/communication/InAppCommunication";

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
  const [showProfileEdit, setShowProfileEdit] = useState(false);
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
    // Safety timeout - show UI after 2 seconds max
    const timeout = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timeout);
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

  // Fetch quote requests function - using native fetch API for reliability
  const fetchQuoteRequests = async () => {
    if (!user?.id) {
      console.log('❌ Cannot fetch quotes - no user.id');
      return;
    }
    
    setLoadingQuotes(true);
    console.log('🔄 Fetching quotes for supplier user.id:', user.id, 'email:', user.email);
    
    // Get auth token from localStorage for faster access
    const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
    
    let accessToken: string | null = null;
    try {
      const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        accessToken = parsed.access_token;
      }
    } catch (e) {
      console.warn('Could not get session from localStorage');
    }
    
    const headers: Record<string, string> = {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    try {
      // First, try to find supplier record by user_id using fetch with timeout
      const supplierController = new AbortController();
      const supplierTimeout = setTimeout(() => supplierController.abort(), 5000);
      
      let supplierRecord = null;
      
      // Try by user_id first
      const supplierResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/suppliers?user_id=eq.${user.id}&select=id,user_id,company_name,email`,
        { headers, signal: supplierController.signal, cache: 'no-store' }
      );
      clearTimeout(supplierTimeout);
      
      if (supplierResponse.ok) {
        const supplierData = await supplierResponse.json();
        supplierRecord = supplierData?.[0] || null;
        console.log('📦 Supplier record by user_id:', supplierRecord);
      }
      
      // If not found by user_id, try by email
      if (!supplierRecord && user.email) {
        const emailController = new AbortController();
        const emailTimeout = setTimeout(() => emailController.abort(), 5000);
        
        const emailResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/suppliers?email=eq.${encodeURIComponent(user.email)}&select=id,user_id,company_name,email`,
          { headers, signal: emailController.signal, cache: 'no-store' }
        );
        clearTimeout(emailTimeout);
        
        if (emailResponse.ok) {
          const emailData = await emailResponse.json();
          supplierRecord = emailData?.[0] || null;
          console.log('📦 Supplier record by email:', supplierRecord);
        }
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
      const quotesController = new AbortController();
      const quotesTimeout = setTimeout(() => quotesController.abort(), 8000);
      
      const supplierIdsParam = supplierIds.join(',');
      const quotesResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/purchase_orders?supplier_id=in.(${supplierIdsParam})&status=in.(pending,quoted,rejected,confirmed)&order=created_at.desc`,
        { headers, signal: quotesController.signal, cache: 'no-store' }
      );
      clearTimeout(quotesTimeout);
      
      let purchaseOrderQuotes: any[] = [];
      if (quotesResponse.ok) {
        purchaseOrderQuotes = await quotesResponse.json();
        console.log('📋 Raw purchase_orders query result:', purchaseOrderQuotes.length, 'quotes');
      } else {
        console.error('Error fetching purchase order quotes:', quotesResponse.status);
      }
      
      // DEBUG: Fetch all recent quotes to show what's in the system
      const debugController = new AbortController();
      const debugTimeout = setTimeout(() => debugController.abort(), 5000);
      
      try {
        const debugResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/purchase_orders?status=in.(pending,quoted,confirmed)&order=created_at.desc&limit=20&select=id,supplier_id,buyer_id,status,po_number,created_at`,
          { headers, signal: debugController.signal, cache: 'no-store' }
        );
        clearTimeout(debugTimeout);
        
        if (debugResponse.ok) {
          const allPendingQuotes = await debugResponse.json();
          console.log('🔎 DEBUG - All recent quotes in system:', allPendingQuotes?.length || 0);
          allPendingQuotes?.forEach((q: any) => {
            const matches = supplierIds.includes(q.supplier_id);
            console.log(`   Quote ${q.po_number}: supplier_id=${q.supplier_id}, matches=${matches ? '✓' : '✗'}`);
          });
        }
      } catch (debugErr) {
        console.log('Debug query skipped due to timeout');
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

      // Remove duplicates by id
      const uniqueQuotes = transformedPOQuotes.filter((quote, index, self) => 
        index === self.findIndex(q => q.id === quote.id)
      );

      console.log('📋 Quote requests loaded:', uniqueQuotes.length, 'from purchase_orders:', transformedPOQuotes.length);
      setQuoteRequests(uniqueQuotes);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('Quote fetch timed out');
      } else {
        console.error('Error fetching quote requests:', error);
      }
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
      .channel('supplier-quotes-realtime')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'purchase_orders' },
        (payload: any) => {
          console.log('📬 NEW quote request detected:', payload.new?.po_number, 'supplier_id:', payload.new?.supplier_id);
          fetchQuoteRequests();
        }
      )
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'purchase_orders' },
        (payload: any) => {
          console.log('🔄 Quote UPDATE detected:', payload.new?.po_number, 'status:', payload.new?.status);
          fetchQuoteRequests();
        }
      )
      .subscribe();
    
    console.log('📡 Supplier Dashboard: Real-time subscription active for quote requests');

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  const handleQuoteAction = async (action: 'approve' | 'reject') => {
    if (!selectedQuote) return;
    
    setProcessingQuote(true);
    
    // Get auth token from localStorage for faster access
    const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
    
    let accessToken: string | null = null;
    try {
      const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        accessToken = parsed.access_token;
      }
    } catch (e) {
      console.warn('Could not get session from localStorage');
    }
    
    if (!accessToken) {
      alert('Not authenticated - please sign in again');
      setProcessingQuote(false);
      return;
    }
    
    try {
      const newStatus = action === 'approve' ? 'quoted' : 'rejected';
      
      if (action === 'approve' && !quoteResponse.quoteAmount) {
        throw new Error('Please enter a quote amount');
      }

      // Check if this is a purchase_order quote (has purchase_order_id or po_number)
      const isPurchaseOrderQuote = selectedQuote.purchase_order_id || selectedQuote.po_number;
      
      if (isPurchaseOrderQuote) {
        // Update purchase_orders table directly using fetch API
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

        // Use fetch API with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${quoteId}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(updateData),
            signal: controller.signal
          }
        );
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Error updating purchase order:', response.status, errorText);
          throw new Error(`Failed to update quote: ${response.status}`);
        }
        
        const updateResult = await response.json();
        
        // Check if any rows were actually updated
        if (!updateResult || updateResult.length === 0) {
          console.error('⚠️ No rows updated! RLS policy may be blocking the update.');
          console.error('Quote ID:', quoteId, 'Supplier user.id:', user?.id);
          
          // This is likely an RLS policy issue - the supplier needs permission to update
          // Show a more helpful error message
          throw new Error('Database permission error. Please contact admin to run the RLS policy fix migration.');
        }
        
        console.log(`✅ Quote ${action === 'approve' ? 'sent' : 'rejected'} - Purchase order updated:`, updateResult);
        console.log('💰 Saved quote_amount:', updateResult[0]?.quote_amount);
      } else {
        // Legacy: Update quotation_requests table using fetch API
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

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/quotation_requests?id=eq.${selectedQuote.id}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify(updateData),
            signal: controller.signal
          }
        );
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to update quote: ${errorText}`);
        }
      }

      // Close dialog and reset form
      setQuoteDialogOpen(false);
      setSelectedQuote(null);
      setQuoteResponse({ quoteAmount: '', validUntil: '', supplierNotes: '' });

      // Show success message
      alert(action === 'approve' 
        ? '✅ Quote sent to builder! They will review and accept/reject.' 
        : '❌ Quote request rejected.'
      );
      
      // Refresh quote requests using the existing fetchQuoteRequests function
      fetchQuoteRequests();

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

      // Use native fetch with auth headers to avoid Supabase client timeouts
      const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
      const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
      
      // Get access token from localStorage
      let accessToken = '';
      try {
        const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          accessToken = parsed.access_token || '';
        }
      } catch (e) {
        console.warn('Could not get access token');
      }
      
      const authHeaders: Record<string, string> = { 
        'apikey': apiKey,
        'Content-Type': 'application/json'
      };
      if (accessToken) {
        authHeaders['Authorization'] = `Bearer ${accessToken}`;
      }

      try {
        // Fetch supplier profile
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          const profileResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=*`,
            { headers: authHeaders, signal: controller.signal, cache: 'no-store' }
          );
          clearTimeout(timeoutId);
          if (profileResponse.ok) {
            const profiles = await profileResponse.json();
            if (profiles?.[0]) setSupplierProfile(profiles[0]);
          }
        } catch (e) {
          console.log('Profile fetch timeout');
        }

        // Build supplier IDs list - check suppliers table for this user using multiple methods
        const orderSupplierIds = [user.id];
        console.log('📊 Dashboard: Starting supplier lookup for user.id:', user.id, 'email:', user.email);
        
        // Method 1: Look up supplier by user_id = auth.uid
        try {
          const supplierController = new AbortController();
          const supplierTimeout = setTimeout(() => supplierController.abort(), 5000);
          
          const supplierResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/suppliers?user_id=eq.${user.id}&select=id,user_id,email,company_name`,
            { headers: authHeaders, signal: supplierController.signal, cache: 'no-store' }
          );
          clearTimeout(supplierTimeout);
          
          if (supplierResponse.ok) {
            const supplierData = await supplierResponse.json();
            console.log('📦 Dashboard: Supplier by user_id:', supplierData);
            if (supplierData?.[0]) {
              if (supplierData[0].id && !orderSupplierIds.includes(supplierData[0].id)) {
                orderSupplierIds.push(supplierData[0].id);
              }
              if (supplierData[0].user_id && !orderSupplierIds.includes(supplierData[0].user_id)) {
                orderSupplierIds.push(supplierData[0].user_id);
              }
              setSupplierRecordId(supplierData[0].id);
            }
          }
        } catch (e) {
          console.log('Supplier lookup by user_id timeout');
        }
        
        // Method 2: Look up supplier by id = auth.uid (in case user_id is profile.id)
        if (orderSupplierIds.length === 1) {
          try {
            const supplierController = new AbortController();
            const supplierTimeout = setTimeout(() => supplierController.abort(), 5000);
            
            const supplierResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/suppliers?id=eq.${user.id}&select=id,user_id,email,company_name`,
              { headers: authHeaders, signal: supplierController.signal, cache: 'no-store' }
            );
            clearTimeout(supplierTimeout);
            
            if (supplierResponse.ok) {
              const supplierData = await supplierResponse.json();
              console.log('📦 Dashboard: Supplier by id:', supplierData);
              if (supplierData?.[0]) {
                if (supplierData[0].id && !orderSupplierIds.includes(supplierData[0].id)) {
                  orderSupplierIds.push(supplierData[0].id);
                }
                if (supplierData[0].user_id && !orderSupplierIds.includes(supplierData[0].user_id)) {
                  orderSupplierIds.push(supplierData[0].user_id);
                }
                setSupplierRecordId(supplierData[0].id);
              }
            }
          } catch (e) {
            console.log('Supplier lookup by id timeout');
          }
        }
        
        // Method 3: Look up supplier by email
        if (orderSupplierIds.length === 1 && user.email) {
          try {
            const emailController = new AbortController();
            const emailTimeout = setTimeout(() => emailController.abort(), 5000);
            
            const emailResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/suppliers?email=eq.${encodeURIComponent(user.email)}&select=id,user_id,email,company_name`,
              { headers: authHeaders, signal: emailController.signal, cache: 'no-store' }
            );
            clearTimeout(emailTimeout);
            
            if (emailResponse.ok) {
              const emailData = await emailResponse.json();
              console.log('📦 Dashboard: Supplier by email:', emailData);
              if (emailData?.[0]) {
                if (emailData[0].id && !orderSupplierIds.includes(emailData[0].id)) {
                  orderSupplierIds.push(emailData[0].id);
                }
                if (emailData[0].user_id && !orderSupplierIds.includes(emailData[0].user_id)) {
                  orderSupplierIds.push(emailData[0].user_id);
                }
                setSupplierRecordId(emailData[0].id);
              }
            }
          } catch (e) {
            console.log('Supplier lookup by email timeout');
          }
        }
        
        // Method 4: Get profile.id and look up supplier by user_id = profile.id
        if (orderSupplierIds.length === 1) {
          try {
            const profileController = new AbortController();
            const profileTimeout = setTimeout(() => profileController.abort(), 5000);
            
            const profileResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=id`,
              { headers: authHeaders, signal: profileController.signal, cache: 'no-store' }
            );
            clearTimeout(profileTimeout);
            
            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              console.log('📦 Dashboard: Profile lookup:', profileData);
              if (profileData?.[0]?.id && profileData[0].id !== user.id) {
                // Profile ID is different from user ID, try to find supplier by profile.id
                const supplierController2 = new AbortController();
                const supplierTimeout2 = setTimeout(() => supplierController2.abort(), 5000);
                
                const supplierResponse2 = await fetch(
                  `${SUPABASE_URL}/rest/v1/suppliers?user_id=eq.${profileData[0].id}&select=id,user_id,email,company_name`,
                  { headers: authHeaders, signal: supplierController2.signal, cache: 'no-store' }
                );
                clearTimeout(supplierTimeout2);
                
                if (supplierResponse2.ok) {
                  const supplierData2 = await supplierResponse2.json();
                  console.log('📦 Dashboard: Supplier by profile.id:', supplierData2);
                  if (supplierData2?.[0]) {
                    if (supplierData2[0].id && !orderSupplierIds.includes(supplierData2[0].id)) {
                      orderSupplierIds.push(supplierData2[0].id);
                    }
                    if (supplierData2[0].user_id && !orderSupplierIds.includes(supplierData2[0].user_id)) {
                      orderSupplierIds.push(supplierData2[0].user_id);
                    }
                    // Also add profile.id to the list
                    if (!orderSupplierIds.includes(profileData[0].id)) {
                      orderSupplierIds.push(profileData[0].id);
                    }
                    setSupplierRecordId(supplierData2[0].id);
                  }
                }
              }
            }
          } catch (e) {
            console.log('Profile/supplier lookup timeout');
          }
        }
        
        // Debug: Fetch ALL recent orders to see what supplier_id values exist
        try {
          const debugController = new AbortController();
          const debugTimeout = setTimeout(() => debugController.abort(), 5000);
          
          const debugResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/purchase_orders?select=id,po_number,supplier_id,buyer_id,status&order=created_at.desc&limit=15`,
            { headers: authHeaders, signal: debugController.signal, cache: 'no-store' }
          );
          clearTimeout(debugTimeout);
          
          if (debugResponse.ok) {
            const debugOrders = await debugResponse.json();
            console.log('📊 Dashboard DEBUG: All recent orders supplier_ids:');
            debugOrders.forEach((o: any) => {
              const matches = orderSupplierIds.includes(o.supplier_id);
              console.log(`   ${o.po_number}: supplier_id=${o.supplier_id} ${matches ? '✅ MATCH' : '❌ no match'}`);
            });
            
            // If we found orders but no matches, add the most common supplier_id
            if (debugOrders.length > 0 && orderSupplierIds.length === 1) {
              const supplierIdCounts: Record<string, number> = {};
              debugOrders.forEach((o: any) => {
                if (o.supplier_id) {
                  supplierIdCounts[o.supplier_id] = (supplierIdCounts[o.supplier_id] || 0) + 1;
                }
              });
              console.log('📊 Dashboard DEBUG: Supplier ID counts:', supplierIdCounts);
            }
          }
        } catch (e) {
          console.log('Debug orders fetch timeout');
        }
        
        console.log('📊 Dashboard: Final supplier IDs for stats query:', orderSupplierIds);

        // Fetch ALL orders for this supplier (not just 10) for accurate stats
        try {
          const supplierIdsParam = orderSupplierIds.join(',');
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          
          const ordersResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/purchase_orders?supplier_id=in.(${supplierIdsParam})&order=created_at.desc`,
            { headers: authHeaders, signal: controller.signal, cache: 'no-store' }
          );
          clearTimeout(timeoutId);

          if (ordersResponse.ok) {
            const ordersData = await ordersResponse.json();
            console.log('📊 Dashboard: Orders loaded:', ordersData?.length || 0);

            if (ordersData && ordersData.length > 0) {
              // Fetch buyer profiles to get actual names
              const buyerIds = [...new Set(ordersData.map((o: any) => o.buyer_id).filter(Boolean))];
              let buyerProfiles: Record<string, string> = {};
              
              if (buyerIds.length > 0) {
                try {
                  const profilesController = new AbortController();
                  const profilesTimeout = setTimeout(() => profilesController.abort(), 5000);
                  
                  const profilesResponse = await fetch(
                    `${SUPABASE_URL}/rest/v1/profiles?user_id=in.(${buyerIds.join(',')})&select=user_id,full_name,company_name`,
                    { headers: authHeaders, signal: profilesController.signal, cache: 'no-store' }
                  );
                  clearTimeout(profilesTimeout);
                  
                  if (profilesResponse.ok) {
                    const profiles = await profilesResponse.json();
                    profiles.forEach((p: any) => {
                      buyerProfiles[p.user_id] = p.full_name || p.company_name || 'Customer';
                    });
                  }
                } catch (e) {
                  console.log('Buyer profiles fetch timeout');
                }
              }
              
              // Take first 10 for recent orders display
              const formattedOrders: RecentOrder[] = ordersData.slice(0, 10).map((order: any) => {
                // Get product names from items array
                const items = order.items || [];
                let productName = 'Order Items';
                let totalQty = 0;
                
                if (items.length > 0) {
                  // Get first item name, or summarize if multiple
                  const itemNames = items.map((item: any) => item.name || item.material_name || 'Item').filter(Boolean);
                  totalQty = items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
                  
                  if (itemNames.length === 1) {
                    productName = itemNames[0];
                  } else if (itemNames.length > 1) {
                    productName = `${itemNames[0]} +${itemNames.length - 1} more`;
                  }
                }
                
                return {
                  id: order.id,
                  customer_name: buyerProfiles[order.buyer_id] || order.builder_name || order.project_name || 'Customer',
                  product_name: productName,
                  quantity: totalQty || order.items?.length || 1,
                  total_amount: order.total_amount || 0,
                  status: order.status || 'pending',
                  created_at: order.created_at
                };
              });
              setRecentOrders(formattedOrders);
              
              // Calculate stats from ALL orders
              const pendingCount = ordersData.filter((o: any) => o.status === 'pending').length;
              const confirmedCount = ordersData.filter((o: any) => o.status === 'confirmed').length;
              const totalRevenue = ordersData.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0);
              const uniqueCustomers = new Set(ordersData.map((o: any) => o.buyer_id)).size;
              
              console.log('📊 Dashboard stats: Orders:', ordersData.length, 'Pending:', pendingCount, 'Confirmed:', confirmedCount, 'Revenue:', totalRevenue);
              
              setStats(prev => ({
                ...prev,
                totalOrders: ordersData.length,
                pendingOrders: pendingCount,
                totalRevenue,
                totalCustomers: uniqueCustomers
              }));
            }
          }
        } catch (e) {
          console.log('Orders fetch timeout for stats');
        }

        // Fetch products count from supplier_product_prices
        try {
          const supplierIdsParam = orderSupplierIds.join(',');
          const productsController = new AbortController();
          const productsTimeout = setTimeout(() => productsController.abort(), 5000);
          
          const productsResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/supplier_product_prices?supplier_id=in.(${supplierIdsParam})&select=id`,
            { headers: authHeaders, signal: productsController.signal, cache: 'no-store' }
          );
          clearTimeout(productsTimeout);
          
          if (productsResponse.ok) {
            const productsData = await productsResponse.json();
            console.log('📦 Dashboard: Products count:', productsData?.length || 0);
            setStats(prev => ({
              ...prev,
              totalProducts: productsData?.length || 0
            }));
          }
        } catch (e) {
          console.log('Products count fetch timeout');
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

  // Full sign out function - clears all auth data and redirects to login
  const handleSignOut = async () => {
    console.log('🚪 Sign Out: Starting full sign out process...');
    
    // Clear ALL localStorage auth data FIRST (synchronous)
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_role_id');
    localStorage.removeItem('user_role_verified');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_id');
    localStorage.removeItem('admin_authenticated');
    localStorage.removeItem('admin_login_time');
    localStorage.removeItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
    
    // Clear session storage
    sessionStorage.clear();
    
    console.log('🚪 Sign Out: Auth data cleared, redirecting to login...');
    
    // IMMEDIATELY redirect - don't wait for Supabase signOut which can hang
    // Use replace() to prevent back button returning to dashboard
    window.location.replace('/auth');
    
    // Sign out from Supabase in background (page is already redirecting)
    await supabase.auth.signOut();
  };

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
              <Button 
                variant="outline" 
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={() => setShowProfileEdit(true)}
              >
                <User className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
              <Button variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                <Settings className="h-4 w-4 mr-2" />
                {t('supplier.dashboard.settings')}
              </Button>
              <Button 
                variant="outline" 
                className="bg-red-500/20 border-red-400/50 text-white hover:bg-red-500/40"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
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
              <Store className="h-4 w-4 mr-1" />
              Products & Prices
            </TabsTrigger>
            <TabsTrigger value="my-products" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
              <Plus className="h-4 w-4 mr-1" />
              My Uploads
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

          {/* Products Tab - Admin Catalog with Pricing */}
          <TabsContent value="products">
            <ProductManagement supplierId={supplierRecordId || user?.id || ''} isDarkMode={isDarkMode} />
          </TabsContent>
          
          {/* My Products Tab - Supplier's Own Products with Full Edit Capabilities */}
          <TabsContent value="my-products">
            <Card className={cardBg}>
              <CardHeader>
                <CardTitle className={textColor}>My Uploaded Products</CardTitle>
                <CardDescription className={mutedText}>
                  Manage your own products - add new products, update images, prices, and variants. Products require admin approval before appearing in the marketplace.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SupplierProductManager supplierId={supplierRecordId || user?.id || ''} />
              </CardContent>
            </Card>
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
                      Review and respond to quote requests. Once you send a quote and the client accepts, it becomes an ORDER.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
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
                    <Badge className="bg-blue-100 text-blue-700 border border-blue-300">
                      {quoteRequests.filter(q => q.status === 'quoted').length} Quoted (Awaiting Client)
                    </Badge>
                    <Badge className="bg-green-100 text-green-700 border border-green-300">
                      {quoteRequests.filter(q => q.status === 'confirmed' || q.status === 'accepted').length} ✓ Confirmed Orders
                    </Badge>
                  </div>
                </div>
                
                {/* Quote-to-Order Flow Explanation */}
                <div className={`mt-4 p-3 rounded-lg ${isDarkMode ? 'bg-slate-700/50' : 'bg-blue-50'} border ${isDarkMode ? 'border-slate-600' : 'border-blue-200'}`}>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                      <span className={mutedText}>1. Quote Request</span>
                    </div>
                    <span className={mutedText}>→</span>
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                      <span className={mutedText}>2. You Send Price</span>
                    </div>
                    <span className={mutedText}>→</span>
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-green-500"></span>
                      <span className={`font-medium ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>3. Client Accepts = ORDER ✓</span>
                    </div>
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
                          quote.status === 'confirmed' || quote.status === 'accepted'
                            ? isDarkMode 
                              ? 'border-green-500 bg-green-900/20 hover:bg-green-900/30' 
                              : 'border-green-300 bg-green-50 hover:bg-green-100'
                            : quote.status === 'quoted'
                              ? isDarkMode
                                ? 'border-blue-500 bg-blue-900/20 hover:bg-blue-900/30'
                                : 'border-blue-300 bg-blue-50 hover:bg-blue-100'
                              : isDarkMode 
                                ? 'border-slate-600 hover:bg-slate-700/50' 
                                : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                          {/* Quote Details */}
                          <div className="flex-1">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${
                                quote.status === 'confirmed' || quote.status === 'accepted' 
                                  ? 'bg-green-500 text-white' :
                                quote.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                                quote.status === 'quoted' ? 'bg-blue-100 text-blue-600' :
                                'bg-red-100 text-red-600'
                              }`}>
                                {quote.status === 'confirmed' || quote.status === 'accepted' 
                                  ? <CheckCircle className="h-5 w-5" />
                                  : <Package className="h-5 w-5" />
                                }
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
                            {/* Status Badge - Different for each stage */}
                            {quote.status === 'confirmed' || quote.status === 'accepted' ? (
                              <Badge className="bg-green-500 text-white border-green-600 px-3 py-1">
                                <CheckCircle className="h-4 w-4 mr-1" />
                                ✓ CONFIRMED ORDER
                              </Badge>
                            ) : (
                              <Badge className={`${
                                quote.status === 'pending' ? 'bg-amber-100 text-amber-700 border-amber-300' :
                                quote.status === 'quoted' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                                'bg-red-100 text-red-700 border-red-300'
                              }`}>
                                {quote.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                                {quote.status === 'quoted' && <Clock className="h-3 w-3 mr-1" />}
                                {quote.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                                {quote.status === 'pending' ? 'Awaiting Your Response' :
                                 quote.status === 'quoted' ? 'Awaiting Client Acceptance' :
                                 (quote.status || 'pending').charAt(0).toUpperCase() + (quote.status || 'pending').slice(1)}
                              </Badge>
                            )}

                            {quote.quote_amount != null && (
                              <div className="text-right">
                                <p className={`text-lg font-bold ${textColor}`}>
                                  KES {Number(quote.quote_amount || 0).toLocaleString()}
                                </p>
                                {quote.quote_valid_until && quote.status === 'quoted' && (
                                  <p className={`text-xs ${mutedText}`}>
                                    Valid until: {new Date(quote.quote_valid_until).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Actions based on status */}
                            {quote.status === 'pending' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="bg-green-500 hover:bg-green-600"
                                  onClick={() => openQuoteDialog(quote)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Send Quote
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
                                  Decline
                                </Button>
                              </div>
                            )}

                            {quote.status === 'quoted' && (
                              <div className="flex flex-col gap-2">
                                <p className={`text-xs ${mutedText} text-center`}>
                                  Waiting for client to accept...
                                </p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openQuoteDialog(quote)}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit Quote
                                </Button>
                              </div>
                            )}

                            {(quote.status === 'confirmed' || quote.status === 'accepted') && (
                              <div className="flex flex-col gap-2">
                                <p className={`text-xs text-green-600 font-medium text-center`}>
                                  🎉 Client accepted! This is now an order.
                                </p>
                                <Button
                                  size="sm"
                                  className="bg-orange-500 hover:bg-orange-600"
                                  onClick={() => setActiveTab('orders')}
                                >
                                  <Package className="h-4 w-4 mr-1" />
                                  View in Orders
                                </Button>
                              </div>
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
                <EnhancedQRCodeManager supplierId={supplierRecordId || undefined} />
              </CardContent>
            </Card>
          </TabsContent>


          {/* Support Tab */}
          <TabsContent value="support">
            <div className="space-y-6">
              {/* In-App Communication */}
              {user && (
                <InAppCommunication
                  userId={user.id}
                  userName={supplierProfile?.company_name || supplierProfile?.full_name || user.email || 'Supplier'}
                  userRole="supplier"
                  isDarkMode={isDarkMode}
                />
              )}

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
            </div>
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

      {/* Profile Edit Dialog */}
      <ProfileEditDialog
        isOpen={showProfileEdit}
        onClose={() => setShowProfileEdit(false)}
        onSave={() => {
          // Refresh data after profile save
          refetchData();
        }}
        userRole="supplier"
      />
    </div>
  );
};

export default SupplierDashboard;

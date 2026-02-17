import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SectionLoader } from '@/components/ui/DashboardLoader';
import { BarChart, Package, TrendingUp, Clock, CheckCircle, AlertTriangle, User, Building2, Search, Filter, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ScanStatistics {
  total_items: number;
  pending_items: number;
  dispatched_items: number;
  received_items: number;
  verified_items: number;
  damaged_items: number;
  total_scans: number;
  dispatch_scans: number;
  receiving_scans: number;
  verification_scans: number;
  avg_dispatch_to_receive_hours: number;
}

interface ScanEvent {
  id: string;
  qr_code: string;
  scan_type: string;
  scanner_type: string;
  material_condition: string;
  scanned_at: string;
  notes: string | null;
  // Enhanced fields
  material_type?: string;
  client_name?: string;
  client_email?: string;
  supplier_name?: string;
  status?: string;
  purchase_order_number?: string;
}

interface MaterialItemEnhanced {
  id: string;
  qr_code: string;
  material_type: string;
  status: string;
  buyer_name?: string;
  buyer_email?: string;
  buyer_phone?: string;
  buyer_role?: string;
  supplier_id?: string;
  purchase_order_id?: string;
  created_at: string;
  dispatch_scanned_at?: string;
  receive_scanned_at?: string;
}

// Default empty stats to show UI immediately
const defaultStats: ScanStatistics = {
  total_items: 0,
  pending_items: 0,
  dispatched_items: 0,
  received_items: 0,
  verified_items: 0,
  damaged_items: 0,
  total_scans: 0,
  dispatch_scans: 0,
  receiving_scans: 0,
  verification_scans: 0,
  avg_dispatch_to_receive_hours: 0
};

export const AdminScanDashboard: React.FC = () => {
  // Initialize with default values so UI shows immediately
  const [stats, setStats] = useState<ScanStatistics>(defaultStats);
  const [recentScans, setRecentScans] = useState<ScanEvent[]>([]);
  const [materialItems, setMaterialItems] = useState<MaterialItemEnhanced[]>([]);
  const [loading, setLoading] = useState(false); // Start with false - show UI immediately
  const [dataLoading, setDataLoading] = useState(true); // Track background data loading
  const [userRole, setUserRole] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [suppliers, setSuppliers] = useState<{id: string, company_name: string, user_id: string}[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // FAST PATH: Check localStorage immediately for role
    const storedRole = localStorage.getItem('user_role');
    if (storedRole === 'admin') {
      setUserRole('admin');
      // Load data in background - don't block UI
      loadDataInBackground();
    } else {
      // No admin role in localStorage - try Supabase with short timeout
      checkAuthAndFetch();
    }
  }, []);

  const loadDataInBackground = async () => {
    setDataLoading(true);
    try {
      // Load all data in parallel with individual timeouts
      await Promise.allSettled([
        fetchStatisticsWithTimeout(),
        fetchRecentScansWithTimeout(),
        fetchMaterialItemsWithTimeout(),
        fetchSuppliersWithTimeout()
      ]);
    } catch (error) {
      console.error('Background data load error:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const checkAuthAndFetch = async () => {
    try {
      // Quick timeout for auth check
      const timeoutPromise = new Promise<null>((resolve) => 
        setTimeout(() => resolve(null), 3000)
      );
      
      const authPromise = (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        
        return roleData?.role || null;
      })();
      
      const role = await Promise.race([authPromise, timeoutPromise]);
      
      if (role === 'admin') {
        setUserRole('admin');
        loadDataInBackground();
      } else {
        // Check localStorage as final fallback
        const storedRole = localStorage.getItem('user_role');
        if (storedRole === 'admin') {
          setUserRole('admin');
          loadDataInBackground();
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      // Final fallback to localStorage
      const storedRole = localStorage.getItem('user_role');
      if (storedRole === 'admin') {
        setUserRole('admin');
        loadDataInBackground();
      }
    }
  };

  // Wrapper functions with individual timeouts
  const fetchStatisticsWithTimeout = async () => {
    const timeout = setTimeout(() => {
      console.log('⏱️ Statistics fetch timeout');
    }, 5000);
    try {
      await fetchStatistics();
    } finally {
      clearTimeout(timeout);
    }
  };

  const fetchRecentScansWithTimeout = async () => {
    const timeout = setTimeout(() => {
      console.log('⏱️ Recent scans fetch timeout');
    }, 5000);
    try {
      await fetchRecentScans();
    } finally {
      clearTimeout(timeout);
    }
  };

  const fetchMaterialItemsWithTimeout = async () => {
    const timeout = setTimeout(() => {
      console.log('⏱️ Material items fetch timeout');
    }, 5000);
    try {
      await fetchMaterialItems();
    } finally {
      clearTimeout(timeout);
    }
  };

  const fetchSuppliersWithTimeout = async () => {
    const timeout = setTimeout(() => {
      console.log('⏱️ Suppliers fetch timeout');
    }, 5000);
    try {
      await fetchSuppliers();
    } finally {
      clearTimeout(timeout);
    }
  };

  // Helper for fetch with timeout
  const fetchWithTimeout = async (url: string, options: RequestInit, timeout: number = 8000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  const fetchSuppliers = async () => {
    try {
      // Use native fetch for faster loading
      const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
      
      const response = await fetchWithTimeout(
        `${SUPABASE_URL}/rest/v1/suppliers?select=id,company_name,user_id`,
        { headers: { 'apikey': SUPABASE_ANON_KEY } },
        5000
      );
      
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data || []);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const getSupplierName = (supplierId: string | null | undefined): string => {
    if (!supplierId) return 'Unknown Supplier';
    const supplier = suppliers.find(s => s.id === supplierId || s.user_id === supplierId);
    return supplier?.company_name || 'Unknown Supplier';
  };

  const fetchStatistics = async () => {
    try {
      const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
      const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
      
      // Get access token for authenticated requests
      let accessToken = ANON_KEY;
      try {
        const stored = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (stored) {
          const parsed = JSON.parse(stored);
          accessToken = parsed.access_token || ANON_KEY;
        }
      } catch (e) {}
      
      // Try RPC first
      const rpcResponse = await fetchWithTimeout(
        `${SUPABASE_URL}/rest/v1/rpc/get_scan_statistics`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            _start_date: null,
            _end_date: null,
            _supplier_id: null
          })
        },
        5000
      );

      if (rpcResponse.ok) {
        const data = await rpcResponse.json();
        console.log('📊 Scan statistics from RPC:', data);
        if (data && data.length > 0) {
          setStats(data[0] as ScanStatistics);
          return;
        }
      }
      
      // Fallback: Calculate stats from direct table queries
      console.log('📊 Calculating stats from direct queries...');
      
      // Fetch material_items counts
      const itemsResponse = await fetchWithTimeout(
        `${SUPABASE_URL}/rest/v1/material_items?select=status`,
        {
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
          }
        },
        5000
      );
      
      // Fetch qr_scan_events counts
      const scansResponse = await fetchWithTimeout(
        `${SUPABASE_URL}/rest/v1/qr_scan_events?select=scan_type`,
        {
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
          }
        },
        5000
      );
      
      if (itemsResponse.ok && scansResponse.ok) {
        const items = await itemsResponse.json();
        const scans = await scansResponse.json();
        
        console.log('📦 Direct items count:', items?.length);
        console.log('📷 Direct scans count:', scans?.length);
        
        const calculatedStats: ScanStatistics = {
          total_items: items?.length || 0,
          pending_items: items?.filter((i: any) => i.status === 'pending').length || 0,
          dispatched_items: items?.filter((i: any) => i.status === 'dispatched').length || 0,
          received_items: items?.filter((i: any) => i.status === 'received').length || 0,
          verified_items: items?.filter((i: any) => i.status === 'verified').length || 0,
          damaged_items: items?.filter((i: any) => i.status === 'damaged').length || 0,
          total_scans: scans?.length || 0,
          dispatch_scans: scans?.filter((s: any) => s.scan_type === 'dispatch').length || 0,
          receiving_scans: scans?.filter((s: any) => s.scan_type === 'receiving').length || 0,
          verification_scans: scans?.filter((s: any) => s.scan_type === 'verification').length || 0,
          avg_dispatch_to_receive_hours: 0
        };
        
        setStats(calculatedStats);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
      toast({
        title: "Error",
        description: "Failed to load scan statistics",
        variant: "destructive",
      });
    }
  };

  const fetchMaterialItems = async () => {
    try {
      const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
      const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
      
      let accessToken = ANON_KEY;
      try {
        const stored = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (stored) {
          const parsed = JSON.parse(stored);
          accessToken = parsed.access_token || ANON_KEY;
        }
      } catch (e) {}
      
      // Fetch material items with REST API
      const response = await fetchWithTimeout(
        `${SUPABASE_URL}/rest/v1/material_items?select=id,qr_code,material_type,status,supplier_id,purchase_order_id,created_at,dispatch_scanned_at,receive_scanned_at&order=created_at.desc&limit=100`,
        {
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
          }
        },
        8000
      );

      if (!response.ok) {
        console.error('Error fetching material_items:', response.status);
        throw new Error(`HTTP ${response.status}`);
      }
      
      const items = await response.json();
      console.log('📦 Material items loaded:', items?.length);

      // Fetch purchase orders to get buyer info
      const orderIds = [...new Set(items?.map(i => i.purchase_order_id).filter(Boolean))];
      console.log('📋 Order IDs to fetch:', orderIds);
      
      let ordersMap: Record<string, any> = {};
      if (orderIds.length > 0) {
        const { data: orders, error: ordersError } = await supabase
          .from('purchase_orders')
          .select('id, po_number, buyer_id, project_name')
          .in('id', orderIds);
        
        if (ordersError) {
          console.error('Error fetching purchase_orders:', ordersError);
        }
        
        console.log('📋 Purchase orders loaded:', orders);
        
        if (orders && orders.length > 0) {
          // Get buyer profiles with phone
          const buyerIds = [...new Set(orders.map(o => o.buyer_id).filter(Boolean))];
          console.log('👥 Buyer IDs to fetch:', buyerIds);
          
          // Try multiple sources for profile data
          const profilesMap: Record<string, any> = {};
          
          // Method 1: Try profiles table (user_id is the foreign key, not id)
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, user_id, full_name, email, phone, company_name')
            .in('user_id', buyerIds);
          
          if (profilesError) {
            console.error('Error fetching profiles:', profilesError);
          }
          console.log('👥 Profiles from profiles table:', profiles);
          
          profiles?.forEach(p => { 
            // Use user_id as the key since that's what buyer_id references
            profilesMap[p.user_id] = p; 
          });
          
          // If profiles table didn't return results, the RLS might be blocking
          // Let's also check if we can get info from purchase_orders items array
          if (!profiles || profiles.length === 0) {
            console.log('⚠️ No profiles found - checking purchase_orders for buyer info...');
            
            // Some purchase orders store buyer info in the items or metadata
            orders.forEach(o => {
              if (!profilesMap[o.buyer_id]) {
                // Check if project_name has useful info
                profilesMap[o.buyer_id] = {
                  user_id: o.buyer_id,
                  full_name: '', // Will be filled from roles
                  email: '',
                  phone: '',
                  company_name: ''
                };
              }
            });
          }
          
          // Get user roles to identify builder type
          const { data: userRoles } = await supabase
            .from('user_roles')
            .select('user_id, role')
            .in('user_id', buyerIds);
          
          const rolesMap: Record<string, string> = {};
          userRoles?.forEach(r => { rolesMap[r.user_id] = r.role; });
          
          console.log('🔑 User roles:', userRoles);
          console.log('📊 Final profiles map:', profilesMap);
          
          orders.forEach(o => {
            const profile = profilesMap[o.buyer_id];
            const role = rolesMap[o.buyer_id];
            
            // Try multiple sources for the name
            let buyerName = 'Unknown Client';
            let buyerEmail = '';
            let buyerPhone = '';
            
            if (profile) {
              if (profile.full_name && profile.full_name.trim()) {
                buyerName = profile.full_name;
              } else if (profile.company_name && profile.company_name.trim()) {
                buyerName = profile.company_name;
              } else if (profile.email) {
                // Use email username as fallback
                buyerName = profile.email.split('@')[0];
              }
              buyerEmail = profile.email || '';
              buyerPhone = profile.phone || '';
            } else {
              // If no profile found, try to get name from role
              if (role === 'professional_builder') {
                buyerName = `Builder #${o.buyer_id.substring(0, 8)}`;
              } else if (role === 'private_client') {
                buyerName = `Client #${o.buyer_id.substring(0, 8)}`;
              } else {
                buyerName = `User #${o.buyer_id.substring(0, 8)}`;
              }
            }
            
            ordersMap[o.id] = {
              ...o,
              buyer_name: buyerName,
              buyer_email: buyerEmail,
              buyer_phone: buyerPhone,
              buyer_role: role || ''
            };
          });
        }
      }

      // Enhance items with buyer info
      const enhancedItems = items?.map(item => ({
        ...item,
        buyer_name: ordersMap[item.purchase_order_id]?.buyer_name || 'No Order Link',
        buyer_email: ordersMap[item.purchase_order_id]?.buyer_email || '',
        buyer_phone: ordersMap[item.purchase_order_id]?.buyer_phone || '',
        buyer_role: ordersMap[item.purchase_order_id]?.buyer_role || '',
        po_number: ordersMap[item.purchase_order_id]?.po_number || ''
      })) || [];

      console.log('✅ Enhanced items:', enhancedItems.slice(0, 3));
      setMaterialItems(enhancedItems);
    } catch (error) {
      console.error('Error fetching material items:', error);
    }
  };

  const fetchRecentScans = async () => {
    try {
      const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
      const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
      
      let accessToken = ANON_KEY;
      try {
        const stored = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (stored) {
          const parsed = JSON.parse(stored);
          accessToken = parsed.access_token || ANON_KEY;
        }
      } catch (e) {}
      
      const response = await fetchWithTimeout(
        `${SUPABASE_URL}/rest/v1/qr_scan_events?select=*&order=scanned_at.desc&limit=50`,
        {
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
          }
        },
        5000
      );

      if (response.ok) {
        const data = await response.json();
        console.log('📷 Recent scans loaded:', data?.length);
        setRecentScans(data || []);
      }
    } catch (error) {
      console.error('Error fetching scans:', error);
    }
  };

  // Filter material items
  const filteredItems = materialItems.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.material_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.buyer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.qr_code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Get scan info for an item
  const getItemScanInfo = (qrCode: string) => {
    const scans = recentScans.filter(s => s.qr_code === qrCode);
    return {
      dispatchScan: scans.find(s => s.scan_type === 'dispatch'),
      receiveScan: scans.find(s => s.scan_type === 'receiving'),
      totalScans: scans.length
    };
  };

  const handleRefresh = async () => {
    setLoading(true);
    await Promise.all([
      fetchStatistics(),
      fetchRecentScans(),
      fetchMaterialItems()
    ]);
    setLoading(false);
    toast({
      title: "Refreshed",
      description: "Data has been updated",
    });
  };

  // Don't block UI with loading - show content immediately
  // Only check role - if not admin from localStorage, show access denied
  const storedRole = localStorage.getItem('user_role');
  if (userRole !== 'admin' && storedRole !== 'admin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scan Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Access restricted to administrators only.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Data loading indicator - subtle, doesn't block UI */}
      {dataLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading scan data...
        </div>
      )}
      
      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.total_items || 0}</div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge className="bg-gray-500">{stats?.pending_items || 0} Pending</Badge>
              <Badge className="bg-blue-500">{stats?.dispatched_items || 0} Dispatched</Badge>
              <Badge className="bg-green-500">{stats?.received_items || 0} Received</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              Total Scans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.total_scans || 0}</div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge variant="outline">{stats?.dispatch_scans || 0} Dispatch</Badge>
              <Badge variant="outline">{stats?.receiving_scans || 0} Receiving</Badge>
              <Badge variant="outline">{stats?.verification_scans || 0} Verified</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Avg Transit Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.avg_dispatch_to_receive_hours?.toFixed(1) || '0'}<span className="text-xl">h</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Dispatch to receiving
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Status Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats?.pending_items || 0}</div>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats?.dispatched_items || 0}</div>
              <p className="text-sm text-muted-foreground">Dispatched</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats?.received_items || 0}</div>
              <p className="text-sm text-muted-foreground">Received</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">{stats?.verified_items || 0}</div>
              <p className="text-sm text-muted-foreground">Verified</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats?.damaged_items || 0}</div>
              <p className="text-sm text-muted-foreground">Damaged</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {stats ? Math.round(((stats.verified_items + stats.received_items) / stats.total_items) * 100) : 0}%
              </div>
              <p className="text-sm text-muted-foreground">Completion</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Material Items with Full Details */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Material Items Overview
            </CardTitle>
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by material, client, QR..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="dispatched">Dispatched</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-100 dark:bg-slate-800">
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-100">Material</TableHead>
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-100">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      Client
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-100">
                    <div className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      Supplier
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-100">Status</TableHead>
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-100">QR Generated</TableHead>
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-100">Dispatched</TableHead>
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-100">Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No material items found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => {
                    const scanInfo = getItemScanInfo(item.qr_code);
                    return (
                      <TableRow key={item.id} className="hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors">
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100">{item.material_type}</p>
                            <code className="text-[10px] bg-slate-200 dark:bg-slate-600 px-1.5 py-0.5 rounded font-mono text-slate-600 dark:text-slate-300">
                              {item.qr_code?.substring(0, 25)}...
                            </code>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              item.buyer_role === 'professional_builder' ? 'bg-purple-100' : 
                              item.buyer_role === 'private_client' ? 'bg-cyan-100' : 'bg-gray-100'
                            }`}>
                              <User className={`h-4 w-4 ${
                                item.buyer_role === 'professional_builder' ? 'text-purple-600' : 
                                item.buyer_role === 'private_client' ? 'text-cyan-600' : 'text-gray-600'
                              }`} />
                            </div>
                            <div>
                              <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{item.buyer_name}</p>
                              {item.buyer_role && (
                                <Badge variant="outline" className={`text-[10px] px-1 py-0 ${
                                  item.buyer_role === 'professional_builder' 
                                    ? 'bg-purple-50 text-purple-700 border-purple-200' 
                                    : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                                }`}>
                                  {item.buyer_role === 'professional_builder' ? 'Professional Builder' : 'Private Client'}
                                </Badge>
                              )}
                              <p className="text-xs text-slate-500 dark:text-slate-400">{item.buyer_email}</p>
                              {item.buyer_phone && (
                                <p className="text-xs text-slate-400 dark:text-slate-500">{item.buyer_phone}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                              <Building2 className="h-4 w-4 text-orange-600" />
                            </div>
                            <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{getSupplierName(item.supplier_id)}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              item.status === 'pending' ? 'bg-gray-500 text-white' :
                              item.status === 'dispatched' ? 'bg-blue-500 text-white' :
                              item.status === 'in_transit' ? 'bg-yellow-500 text-white' :
                              item.status === 'received' ? 'bg-green-500 text-white' :
                              item.status === 'verified' ? 'bg-emerald-600 text-white' :
                              'bg-gray-400 text-white'
                            }
                          >
                            {item.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              <Clock className="h-3 w-3 mr-1" />
                              Generated
                            </Badge>
                            <p className="text-slate-600 dark:text-slate-400 mt-1">
                              {new Date(item.created_at).toLocaleDateString()}
                            </p>
                            <p className="text-slate-500 dark:text-slate-500 text-[10px]">
                              {new Date(item.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.dispatch_scanned_at || scanInfo.dispatchScan ? (
                            <div className="text-xs">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Dispatched
                              </Badge>
                              <p className="text-slate-600 dark:text-slate-400 mt-1">
                                {new Date(item.dispatch_scanned_at || scanInfo.dispatchScan?.scanned_at || '').toLocaleDateString()}
                              </p>
                              <p className="text-slate-500 dark:text-slate-500 text-[10px]">
                                {new Date(item.dispatch_scanned_at || scanInfo.dispatchScan?.scanned_at || '').toLocaleTimeString()}
                              </p>
                            </div>
                          ) : (
                            <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-200">
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.receive_scanned_at || scanInfo.receiveScan ? (
                            <div className="text-xs">
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Received
                              </Badge>
                              <p className="text-slate-600 dark:text-slate-400 mt-1">
                                {new Date(item.receive_scanned_at || scanInfo.receiveScan?.scanned_at || '').toLocaleDateString()}
                              </p>
                              <p className="text-slate-500 dark:text-slate-500 text-[10px]">
                                {new Date(item.receive_scanned_at || scanInfo.receiveScan?.scanned_at || '').toLocaleTimeString()}
                              </p>
                              {scanInfo.receiveScan?.material_condition === 'damaged' && (
                                <Badge className="bg-red-500 text-white mt-1">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Damaged
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-200">
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Scan Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Recent Scan Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-100 dark:bg-slate-800">
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-100">Material</TableHead>
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-100">Client</TableHead>
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-100">Supplier</TableHead>
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-100">Scan Type</TableHead>
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-100">Scanner</TableHead>
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-100">Condition</TableHead>
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-100">Date & Time</TableHead>
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-100">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentScans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No scan activity yet
                    </TableCell>
                  </TableRow>
                ) : (
                  recentScans.map((scan) => {
                    // Find matching material item
                    const matchingItem = materialItems.find(m => m.qr_code === scan.qr_code);
                    return (
                      <TableRow key={scan.id} className="hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors">
                        <TableCell>
                          <p className="font-medium text-sm text-slate-900 dark:text-slate-100">
                            {matchingItem?.material_type || 'Unknown Material'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0">
                              <User className="h-3 w-3 text-cyan-600" />
                            </div>
                            <div>
                              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{matchingItem?.buyer_name || 'Unknown'}</span>
                              {matchingItem?.buyer_email && (
                                <p className="text-[10px] text-slate-500">{matchingItem.buyer_email}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                              <Building2 className="h-3 w-3 text-orange-600" />
                            </div>
                            <span className="text-sm text-slate-900 dark:text-slate-100">{getSupplierName(matchingItem?.supplier_id)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              scan.scan_type === 'dispatch'
                                ? 'bg-blue-500 text-white'
                                : scan.scan_type === 'receiving'
                                ? 'bg-green-500 text-white'
                                : 'bg-purple-500 text-white'
                            }
                          >
                            {scan.scan_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-slate-700 dark:text-slate-300">{scan.scanner_type}</Badge>
                        </TableCell>
                        <TableCell>
                          {scan.material_condition === 'damaged' ? (
                            <Badge className="bg-red-500 text-white">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {scan.material_condition}
                            </Badge>
                          ) : (
                            <span className="text-sm capitalize text-green-600 font-medium">{scan.material_condition}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <p className="text-slate-900 dark:text-slate-100 font-medium">
                              {new Date(scan.scanned_at).toLocaleDateString()}
                            </p>
                            <p className="text-slate-500">
                              {new Date(scan.scanned_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 dark:text-slate-400 max-w-[150px] truncate">
                          {scan.notes || '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

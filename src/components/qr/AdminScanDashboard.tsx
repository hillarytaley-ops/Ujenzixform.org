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

export const AdminScanDashboard: React.FC = () => {
  const [stats, setStats] = useState<ScanStatistics | null>(null);
  const [recentScans, setRecentScans] = useState<ScanEvent[]>([]);
  const [materialItems, setMaterialItems] = useState<MaterialItemEnhanced[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [suppliers, setSuppliers] = useState<{id: string, company_name: string, user_id: string}[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      setUserRole(roleData?.role || null);

      if (roleData?.role === 'admin') {
        await Promise.all([
          fetchStatistics(),
          fetchRecentScans(),
          fetchMaterialItems(),
          fetchSuppliers()
        ]);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, company_name, user_id');
      
      if (!error && data) {
        setSuppliers(data);
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
      const { data, error } = await supabase.rpc('get_scan_statistics', {
        _start_date: null,
        _end_date: null,
        _supplier_id: null
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setStats(data[0] as ScanStatistics);
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
      // Fetch material items with purchase order info
      const { data: items, error } = await supabase
        .from('material_items')
        .select(`
          id,
          qr_code,
          material_type,
          status,
          supplier_id,
          purchase_order_id,
          created_at,
          dispatch_scanned_at,
          receive_scanned_at
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching material_items:', error);
        throw error;
      }

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
          
          // Fetch from profiles table
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email, phone, company_name')
            .in('id', buyerIds);
          
          if (profilesError) {
            console.error('Error fetching profiles:', profilesError);
          }
          
          console.log('👥 Profiles loaded:', profiles);
          
          const profilesMap: Record<string, any> = {};
          profiles?.forEach(p => { 
            profilesMap[p.id] = p; 
          });
          
          // Also try to get user roles to identify builder type
          const { data: userRoles } = await supabase
            .from('user_roles')
            .select('user_id, role')
            .in('user_id', buyerIds);
          
          const rolesMap: Record<string, string> = {};
          userRoles?.forEach(r => { rolesMap[r.user_id] = r.role; });
          
          console.log('🔑 User roles:', userRoles);
          
          orders.forEach(o => {
            const profile = profilesMap[o.buyer_id];
            const role = rolesMap[o.buyer_id];
            
            // Try multiple sources for the name
            let buyerName = 'Unknown Client';
            if (profile?.full_name && profile.full_name.trim()) {
              buyerName = profile.full_name;
            } else if (profile?.company_name && profile.company_name.trim()) {
              buyerName = profile.company_name;
            } else if (profile?.email) {
              // Use email username as fallback
              buyerName = profile.email.split('@')[0];
            }
            
            // Add role indicator
            if (role === 'professional_builder') {
              buyerName += ' (Pro)';
            } else if (role === 'private_client') {
              buyerName += ' (Private)';
            }
            
            ordersMap[o.id] = {
              ...o,
              buyer_name: buyerName,
              buyer_email: profile?.email || '',
              buyer_phone: profile?.phone || '',
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
      const { data, error } = await supabase
        .from('qr_scan_events')
        .select('*')
        .order('scanned_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setRecentScans(data || []);
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

  if (loading) {
    return <SectionLoader message="Loading scan dashboard..." className="p-6 h-48" />;
  }

  if (userRole !== 'admin') {
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

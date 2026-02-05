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
  supplier_id?: string;
  purchase_order_id?: string;
  created_at: string;
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
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Fetch purchase orders to get buyer info
      const orderIds = [...new Set(items?.map(i => i.purchase_order_id).filter(Boolean))];
      
      let ordersMap: Record<string, any> = {};
      if (orderIds.length > 0) {
        const { data: orders } = await supabase
          .from('purchase_orders')
          .select('id, po_number, buyer_id')
          .in('id', orderIds);
        
        if (orders) {
          // Get buyer profiles
          const buyerIds = [...new Set(orders.map(o => o.buyer_id).filter(Boolean))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', buyerIds);
          
          const profilesMap: Record<string, any> = {};
          profiles?.forEach(p => { profilesMap[p.id] = p; });
          
          orders.forEach(o => {
            ordersMap[o.id] = {
              ...o,
              buyer_name: profilesMap[o.buyer_id]?.full_name || 'Unknown',
              buyer_email: profilesMap[o.buyer_id]?.email || ''
            };
          });
        }
      }

      // Enhance items with buyer info
      const enhancedItems = items?.map(item => ({
        ...item,
        buyer_name: ordersMap[item.purchase_order_id]?.buyer_name || 'Unknown Client',
        buyer_email: ordersMap[item.purchase_order_id]?.buyer_email || '',
        po_number: ordersMap[item.purchase_order_id]?.po_number || ''
      })) || [];

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
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold">Material</TableHead>
                  <TableHead className="font-semibold">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      Client
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold">
                    <div className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      Supplier
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Dispatched</TableHead>
                  <TableHead className="font-semibold">Received</TableHead>
                  <TableHead className="font-semibold">QR Code</TableHead>
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
                      <TableRow key={item.id} className="hover:bg-slate-50">
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.material_type}</p>
                            <p className="text-xs text-muted-foreground">
                              Created: {new Date(item.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center">
                              <User className="h-4 w-4 text-cyan-600" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{item.buyer_name}</p>
                              <p className="text-xs text-muted-foreground">{item.buyer_email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                              <Building2 className="h-4 w-4 text-orange-600" />
                            </div>
                            <p className="font-medium text-sm">{getSupplierName(item.supplier_id)}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              item.status === 'pending' ? 'bg-gray-500' :
                              item.status === 'dispatched' ? 'bg-blue-500' :
                              item.status === 'in_transit' ? 'bg-yellow-500' :
                              item.status === 'received' ? 'bg-green-500' :
                              item.status === 'verified' ? 'bg-emerald-600' :
                              'bg-gray-400'
                            }
                          >
                            {item.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {scanInfo.dispatchScan ? (
                            <div className="text-xs">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Dispatched
                              </Badge>
                              <p className="text-muted-foreground mt-1">
                                {new Date(scanInfo.dispatchScan.scanned_at).toLocaleString()}
                              </p>
                            </div>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50 text-gray-500">
                              Not yet
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {scanInfo.receiveScan ? (
                            <div className="text-xs">
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Received
                              </Badge>
                              <p className="text-muted-foreground mt-1">
                                {new Date(scanInfo.receiveScan.scanned_at).toLocaleString()}
                              </p>
                              {scanInfo.receiveScan.material_condition === 'damaged' && (
                                <Badge className="bg-red-500 mt-1">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Damaged
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50 text-gray-500">
                              Not yet
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono">
                            {item.qr_code?.substring(0, 20)}...
                          </code>
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
                <TableRow className="bg-slate-50">
                  <TableHead>Material</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Scan Type</TableHead>
                  <TableHead>Scanner</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Notes</TableHead>
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
                      <TableRow key={scan.id} className="hover:bg-slate-50">
                        <TableCell>
                          <p className="font-medium text-sm">
                            {matchingItem?.material_type || 'Unknown Material'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-cyan-600" />
                            <span className="text-sm">{matchingItem?.buyer_name || 'Unknown'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-orange-600" />
                            <span className="text-sm">{getSupplierName(matchingItem?.supplier_id)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              scan.scan_type === 'dispatch'
                                ? 'bg-blue-500'
                                : scan.scan_type === 'receiving'
                                ? 'bg-green-500'
                                : 'bg-purple-500'
                            }
                          >
                            {scan.scan_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{scan.scanner_type}</Badge>
                        </TableCell>
                        <TableCell>
                          {scan.material_condition === 'damaged' ? (
                            <Badge className="bg-red-500">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {scan.material_condition}
                            </Badge>
                          ) : (
                            <span className="text-sm capitalize">{scan.material_condition}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(scan.scanned_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
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

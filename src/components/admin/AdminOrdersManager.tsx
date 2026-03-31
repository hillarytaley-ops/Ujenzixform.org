import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';
/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   📦 ADMIN ORDERS MANAGER                                                           ║
 * ║                                                                                      ║
 * ║   Created: February 11, 2026                                                        ║
 * ║   Features:                                                                          ║
 * ║   - View all orders across the platform                                             ║
 * ║   - Filter by status, date, buyer, supplier                                         ║
 * ║   - View order details and QR codes                                                 ║
 * ║   - Update order status                                                             ║
 * ║   - Export orders to CSV                                                            ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  Package,
  Search,
  Filter,
  Download,
  Eye,
  RefreshCw,
  Calendar,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  ShoppingCart,
  MapPin,
  User,
  Building,
  DollarSign,
  QrCode,
  AlertCircle,
  TrendingUp,
  ArrowUpDown
} from 'lucide-react';

interface OrderItem {
  name: string;
  quantity: number;
  unit: string;
  unit_price: number;
}

interface Order {
  id: string;
  po_number: string;
  supplier_id: string;
  supplier_name?: string;
  buyer_id: string;
  buyer_name?: string;
  buyer_email?: string;
  status: string;
  total_amount: number;
  items: OrderItem[];
  delivery_address: string;
  delivery_date?: string;
  tracking_number?: string;
  payment_status?: string;
  special_instructions?: string;
  qr_code_generated?: boolean;
  created_at: string;
  updated_at: string;
}

interface OrderStats {
  total: number;
  pending: number;
  quoted: number;
  confirmed: number;
  rejected: number;
  completed: number;
  totalRevenue: number;
}

export const AdminOrdersManager: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortField, setSortField] = useState<'created_at' | 'total_amount' | 'status'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [stats, setStats] = useState<OrderStats>({
    total: 0,
    pending: 0,
    quoted: 0,
    confirmed: 0,
    rejected: 0,
    completed: 0,
    totalRevenue: 0
  });
  
  const { toast } = useToast();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      console.log('📦 AdminOrdersManager: Loading all orders...');
      
      // Use native fetch with timeout
      // Get access token from localStorage
      const stored = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      let accessToken = '';
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          accessToken = parsed.access_token || '';
        } catch (e) {}
      }
      
      const headers: Record<string, string> = { 'apikey': SUPABASE_ANON_KEY };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      // Fetch all orders
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/purchase_orders?order=created_at.desc&limit=500`,
        { headers, signal: controller.signal, cache: 'no-store' }
      );
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📦 AdminOrdersManager: Orders loaded:', data?.length || 0);
      
      // Parse items JSON and format orders
      const formattedOrders: Order[] = (data || []).map((order: any) => {
        let items: OrderItem[] = [];
        try {
          items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
        } catch (e) {
          items = [];
        }
        
        return {
          ...order,
          items,
          supplier_name: order.supplier_name || 'Unknown Supplier',
          buyer_name: order.builder_name || order.buyer_name || 'Unknown Buyer'
        };
      });
      
      // Load supplier and buyer names in background
      loadSupplierAndBuyerNames(formattedOrders, headers);
      
      setOrders(formattedOrders);
      calculateStats(formattedOrders);
      
    } catch (error: any) {
      console.error('❌ AdminOrdersManager Error:', error?.message || error);
      if (error?.name !== 'AbortError') {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load orders'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSupplierAndBuyerNames = async (orders: Order[], headers: Record<string, string>) => {
    // Get unique supplier IDs
    const supplierIds = [...new Set(orders.map(o => o.supplier_id).filter(Boolean))];
    const buyerIds = [...new Set(orders.map(o => o.buyer_id).filter(Boolean))];
    
    // Load supplier names
    if (supplierIds.length > 0) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const orFilter = supplierIds.map(id => `id.eq.${id},user_id.eq.${id}`).join(',');
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/suppliers?select=id,user_id,company_name&or=(${orFilter})`,
          { headers, signal: controller.signal, cache: 'no-store' }
        );
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const suppliers = await response.json();
          const supplierMap = new Map();
          suppliers.forEach((s: any) => {
            supplierMap.set(s.id, s.company_name);
            supplierMap.set(s.user_id, s.company_name);
          });
          
          setOrders(prev => prev.map(order => ({
            ...order,
            supplier_name: supplierMap.get(order.supplier_id) || order.supplier_name
          })));
        }
      } catch (e) {
        console.log('Supplier lookup timeout');
      }
    }
    
    // Load buyer names from profiles
    if (buyerIds.length > 0) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const inFilter = buyerIds.join(',');
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?select=user_id,full_name,email&user_id=in.(${inFilter})`,
          { headers, signal: controller.signal, cache: 'no-store' }
        );
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const profiles = await response.json();
          const profileMap = new Map();
          profiles.forEach((p: any) => {
            profileMap.set(p.user_id, { name: p.full_name, email: p.email });
          });
          
          setOrders(prev => prev.map(order => ({
            ...order,
            buyer_name: profileMap.get(order.buyer_id)?.name || order.buyer_name,
            buyer_email: profileMap.get(order.buyer_id)?.email || order.buyer_email
          })));
        }
      } catch (e) {
        console.log('Buyer lookup timeout');
      }
    }
  };

  const calculateStats = (orders: Order[]) => {
    const stats: OrderStats = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      quoted: orders.filter(o => o.status === 'quoted').length,
      confirmed: orders.filter(o => o.status === 'confirmed').length,
      rejected: orders.filter(o => o.status === 'rejected').length,
      completed: orders.filter(o => ['delivered', 'completed', 'received'].includes(o.status)).length,
      totalRevenue: orders
        .filter(o => ['confirmed', 'delivered', 'completed', 'received'].includes(o.status))
        .reduce((sum, o) => sum + (o.total_amount || 0), 0)
    };
    setStats(stats);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      pending: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50', icon: <Clock className="h-3 w-3" /> },
      quoted: { color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50', icon: <FileText className="h-3 w-3" /> },
      confirmed: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/50', icon: <CheckCircle className="h-3 w-3" /> },
      processing: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/50', icon: <Package className="h-3 w-3" /> },
      shipped: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/50', icon: <Truck className="h-3 w-3" /> },
      delivered: { color: 'bg-green-500/20 text-green-400 border-green-500/50', icon: <CheckCircle className="h-3 w-3" /> },
      completed: { color: 'bg-green-500/20 text-green-400 border-green-500/50', icon: <CheckCircle className="h-3 w-3" /> },
      cancelled: { color: 'bg-red-500/20 text-red-400 border-red-500/50', icon: <XCircle className="h-3 w-3" /> },
      rejected: { color: 'bg-red-500/20 text-red-400 border-red-500/50', icon: <XCircle className="h-3 w-3" /> }
    };
    
    const config = statusConfig[status.toLowerCase()] || { color: 'bg-gray-500/20 text-gray-400', icon: null };
    
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        {config.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const filteredOrders = orders
    .filter(order => {
      // Search filter
      const matchesSearch = 
        order.po_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.buyer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.buyer_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.items.some(item => item.name?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || order.status.toLowerCase() === statusFilter;
      
      // Date filter
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const orderDate = new Date(order.created_at);
        const now = new Date();
        
        if (dateFilter === 'today') {
          matchesDate = orderDate.toDateString() === now.toDateString();
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = orderDate >= weekAgo;
        } else if (dateFilter === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = orderDate >= monthAgo;
        } else if (dateFilter === 'year') {
          const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          matchesDate = orderDate >= yearAgo;
        }
      }
      
      return matchesSearch && matchesStatus && matchesDate;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'created_at') {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortField === 'total_amount') {
        comparison = (a.total_amount || 0) - (b.total_amount || 0);
      } else if (sortField === 'status') {
        comparison = a.status.localeCompare(b.status);
      }
      return sortDirection === 'desc' ? -comparison : comparison;
    });

  const exportToCSV = () => {
    const headers = ['PO Number', 'Status', 'Buyer', 'Supplier', 'Total Amount', 'Items', 'Created At'];
    const rows = filteredOrders.map(order => [
      order.po_number,
      order.status,
      order.buyer_name || order.buyer_id,
      order.supplier_name || order.supplier_id,
      order.total_amount,
      order.items.length,
      new Date(order.created_at).toLocaleString()
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast({
      title: 'Export Complete',
      description: `Exported ${filteredOrders.length} orders to CSV`
    });
  };

  const toggleSort = (field: 'created_at' | 'total_amount' | 'status') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-400">Loading orders...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-8 w-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-xs text-slate-400">Total Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.pending}</p>
                <p className="text-xs text-slate-400">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-cyan-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.quoted}</p>
                <p className="text-xs text-slate-400">Quoted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.confirmed}</p>
                <p className="text-xs text-slate-400">Confirmed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.rejected}</p>
                <p className="text-xs text-slate-400">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Truck className="h-8 w-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.completed}</p>
                <p className="text-xs text-slate-400">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-emerald-400" />
              <div>
                <p className="text-lg font-bold text-white">KES {(stats.totalRevenue / 1000).toFixed(0)}K</p>
                <p className="text-xs text-slate-400">Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full lg:w-auto">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search orders, buyers, suppliers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-900 border-slate-600 text-white"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px] bg-slate-900 border-slate-600 text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="quoted">Quoted</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[150px] bg-slate-900 border-slate-600 text-white">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV} className="border-slate-600 text-slate-300">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button size="sm" onClick={loadOrders} className="bg-blue-600 hover:bg-blue-700">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Package className="h-5 w-5" />
            All Orders ({filteredOrders.length})
          </CardTitle>
          <CardDescription>Manage and track all platform orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-slate-800/50">
                  <TableHead className="text-slate-300">PO Number</TableHead>
                  <TableHead className="text-slate-300">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toggleSort('status')}
                      className="text-slate-300 hover:text-white p-0"
                    >
                      Status
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-slate-300">Buyer</TableHead>
                  <TableHead className="text-slate-300">Supplier</TableHead>
                  <TableHead className="text-slate-300">Items</TableHead>
                  <TableHead className="text-slate-300">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toggleSort('total_amount')}
                      className="text-slate-300 hover:text-white p-0"
                    >
                      Amount
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-slate-300">QR</TableHead>
                  <TableHead className="text-slate-300">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toggleSort('created_at')}
                      className="text-slate-300 hover:text-white p-0"
                    >
                      Date
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id} className="border-slate-700 hover:bg-slate-800/50">
                    <TableCell className="font-mono text-white text-sm">
                      {order.po_number}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(order.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="text-white text-sm">{order.buyer_name || 'Unknown'}</p>
                          {order.buyer_email && (
                            <p className="text-slate-400 text-xs">{order.buyer_email}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-300 text-sm">{order.supplier_name || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-slate-300">
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white font-medium">
                      KES {(order.total_amount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {order.qr_code_generated ? (
                        <Badge className="bg-green-500/20 text-green-400">
                          <QrCode className="h-3 w-3 mr-1" />
                          Yes
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-500">
                          No
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm">
                      {new Date(order.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowOrderDetails(true);
                        }}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                
                {filteredOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-slate-600" />
                      <p className="text-slate-400">No orders found</p>
                      <p className="text-slate-500 text-sm mt-1">Try adjusting your filters</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-700 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Details
            </DialogTitle>
            <DialogDescription>
              {selectedOrder?.po_number}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Status and Date */}
              <div className="flex items-center justify-between">
                {getStatusBadge(selectedOrder.status)}
                <span className="text-slate-400 text-sm">
                  {new Date(selectedOrder.created_at).toLocaleString()}
                </span>
              </div>
              
              {/* Buyer & Supplier Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-blue-400" />
                    <p className="text-sm font-medium text-slate-300">Buyer</p>
                  </div>
                  <p className="text-white">{selectedOrder.buyer_name || 'Unknown'}</p>
                  {selectedOrder.buyer_email && (
                    <p className="text-slate-400 text-sm">{selectedOrder.buyer_email}</p>
                  )}
                </div>
                <div className="bg-slate-800/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Building className="h-4 w-4 text-green-400" />
                    <p className="text-sm font-medium text-slate-300">Supplier</p>
                  </div>
                  <p className="text-white">{selectedOrder.supplier_name || 'Unknown'}</p>
                </div>
              </div>
              
              {/* Items */}
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Order Items</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex justify-between p-3 bg-slate-800/50 rounded-lg">
                      <div>
                        <p className="text-white">{item.name}</p>
                        <p className="text-xs text-slate-400">{item.quantity} {item.unit}</p>
                      </div>
                      <p className="text-white font-medium">
                        KES {((item.quantity || 1) * (item.unit_price || 0)).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Delivery Info */}
              {selectedOrder.delivery_address && (
                <div className="bg-slate-800/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-orange-400" />
                    <p className="text-sm font-medium text-slate-300">Delivery Address</p>
                  </div>
                  <p className="text-slate-400">{selectedOrder.delivery_address}</p>
                  {selectedOrder.delivery_date && (
                    <p className="text-slate-500 text-sm mt-1">
                      Delivery Date: {new Date(selectedOrder.delivery_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
              
              {/* QR Code Status */}
              <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                <QrCode className={`h-5 w-5 ${selectedOrder.qr_code_generated ? 'text-green-400' : 'text-slate-500'}`} />
                <span className="text-slate-300">
                  QR Codes: {selectedOrder.qr_code_generated ? 'Generated' : 'Not Generated'}
                </span>
              </div>
              
              {/* Total */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-700">
                <span className="text-lg font-semibold text-white">Total Amount</span>
                <span className="text-2xl font-bold text-emerald-400">
                  KES {(selectedOrder.total_amount || 0).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrdersManager;

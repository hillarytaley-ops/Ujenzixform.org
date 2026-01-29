/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   📋 ORDER HISTORY COMPONENT                                                        ║
 * ║                                                                                      ║
 * ║   Created: January 29, 2026                                                          ║
 * ║   Features:                                                                          ║
 * ║   - View all orders with filters                                                    ║
 * ║   - Download PDF invoices                                                           ║
 * ║   - Track order status                                                              ║
 * ║   - Reorder functionality                                                           ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { InvoiceGenerator, generateInvoiceFromOrder } from '@/components/invoices/InvoiceGenerator';
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
  Star
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
  status: string;
  total_amount: number;
  items: OrderItem[];
  delivery_address: string;
  delivery_date?: string;
  tracking_number?: string;
  payment_status?: string;
  special_instructions?: string;
  created_at: string;
  updated_at: string;
}

interface OrderHistoryProps {
  userId: string;
  userRole: 'builder' | 'professional_builder' | 'private_client' | 'supplier';
}

export const OrderHistory: React.FC<OrderHistoryProps> = ({ userId, userRole }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [supplierInfo, setSupplierInfo] = useState<any>(null);
  const [buyerInfo, setBuyerInfo] = useState<any>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    loadOrders();
  }, [userId, userRole]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      
      // Determine query based on user role
      let query = supabase
        .from('purchase_orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (userRole === 'supplier') {
        query = query.eq('supplier_id', userId);
      } else {
        query = query.eq('buyer_id', userId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
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
          supplier_name: order.supplier_name || 'Supplier'
        };
      });
      
      // Load supplier names for buyer view
      if (userRole !== 'supplier' && formattedOrders.length > 0) {
        const supplierIds = [...new Set(formattedOrders.map(o => o.supplier_id).filter(Boolean))];
        if (supplierIds.length > 0) {
          const { data: suppliers } = await supabase
            .from('suppliers')
            .select('id, user_id, company_name')
            .or(`id.in.(${supplierIds.join(',')}),user_id.in.(${supplierIds.join(',')})`);
          
          if (suppliers) {
            const supplierMap = new Map();
            suppliers.forEach((s: any) => {
              supplierMap.set(s.id, s.company_name);
              supplierMap.set(s.user_id, s.company_name);
            });
            
            formattedOrders.forEach(order => {
              order.supplier_name = supplierMap.get(order.supplier_id) || 'Supplier';
            });
          }
        }
      }
      
      setOrders(formattedOrders);
      
    } catch (error) {
      console.error('Error loading orders:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load order history'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadOrderDetails = async (order: Order) => {
    setSelectedOrder(order);
    
    // Load supplier info
    if (order.supplier_id) {
      const { data: supplier } = await supabase
        .from('suppliers')
        .select('*')
        .or(`id.eq.${order.supplier_id},user_id.eq.${order.supplier_id}`)
        .maybeSingle();
      setSupplierInfo(supplier);
    }
    
    // Load buyer info
    if (order.buyer_id) {
      const { data: buyer } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', order.buyer_id)
        .maybeSingle();
      setBuyerInfo(buyer);
    }
    
    setShowOrderDetails(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      pending: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50', icon: <Clock className="h-3 w-3" /> },
      confirmed: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/50', icon: <CheckCircle className="h-3 w-3" /> },
      processing: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/50', icon: <Package className="h-3 w-3" /> },
      shipped: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/50', icon: <Truck className="h-3 w-3" /> },
      delivered: { color: 'bg-green-500/20 text-green-400 border-green-500/50', icon: <CheckCircle className="h-3 w-3" /> },
      completed: { color: 'bg-green-500/20 text-green-400 border-green-500/50', icon: <CheckCircle className="h-3 w-3" /> },
      cancelled: { color: 'bg-red-500/20 text-red-400 border-red-500/50', icon: <XCircle className="h-3 w-3" /> },
      rejected: { color: 'bg-red-500/20 text-red-400 border-red-500/50', icon: <XCircle className="h-3 w-3" /> },
      quoted: { color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50', icon: <FileText className="h-3 w-3" /> },
      accepted: { color: 'bg-green-500/20 text-green-400 border-green-500/50', icon: <CheckCircle className="h-3 w-3" /> }
    };
    
    const config = statusConfig[status.toLowerCase()] || { color: 'bg-gray-500/20 text-gray-400', icon: null };
    
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        {config.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const filteredOrders = orders.filter(order => {
    // Search filter
    const matchesSearch = 
      order.po_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
  });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => ['pending', 'quoted'].includes(o.status.toLowerCase())).length,
    inProgress: orders.filter(o => ['confirmed', 'processing', 'shipped'].includes(o.status.toLowerCase())).length,
    completed: orders.filter(o => ['delivered', 'completed'].includes(o.status.toLowerCase())).length,
    totalSpent: orders
      .filter(o => ['delivered', 'completed', 'accepted'].includes(o.status.toLowerCase()))
      .reduce((sum, o) => sum + (o.total_amount || 0), 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
              <Truck className="h-8 w-8 text-orange-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.inProgress}</p>
                <p className="text-xs text-slate-400">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-400" />
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
              <FileText className="h-8 w-8 text-purple-400" />
              <div>
                <p className="text-2xl font-bold text-white">KES {stats.totalSpent.toLocaleString()}</p>
                <p className="text-xs text-slate-400">Total Spent</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-600"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] bg-slate-800 border-slate-600">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[150px] bg-slate-800 border-slate-600">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button size="sm" onClick={loadOrders}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Orders List */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order History ({filteredOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-white font-medium">{order.po_number}</span>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="text-sm text-slate-400 space-y-1">
                      <p className="flex items-center gap-2">
                        <Package className="h-3 w-3" />
                        {order.items.length} item(s) • {order.supplier_name}
                      </p>
                      <p className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                      {order.tracking_number && (
                        <p className="flex items-center gap-2">
                          <Truck className="h-3 w-3" />
                          Tracking: {order.tracking_number}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-bold text-white">
                        KES {(order.total_amount || 0).toLocaleString()}
                      </p>
                      {order.payment_status && (
                        <Badge variant="outline" className="text-xs">
                          {order.payment_status}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => loadOrderDetails(order)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          loadOrderDetails(order);
                          setShowInvoice(true);
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredOrders.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No orders found</p>
                <p className="text-sm mt-1">Your order history will appear here</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={showOrderDetails && !showInvoice} onOpenChange={setShowOrderDetails}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Order Details</DialogTitle>
            <DialogDescription>
              {selectedOrder?.po_number}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between">
                {getStatusBadge(selectedOrder.status)}
                <span className="text-slate-400 text-sm">
                  {new Date(selectedOrder.created_at).toLocaleString()}
                </span>
              </div>
              
              {/* Items */}
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Items</h4>
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
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-2">Delivery Address</h4>
                  <p className="text-slate-400 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {selectedOrder.delivery_address}
                  </p>
                </div>
              )}
              
              {/* Tracking */}
              {selectedOrder.tracking_number && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-2">Tracking Number</h4>
                  <p className="text-white font-mono">{selectedOrder.tracking_number}</p>
                </div>
              )}
              
              {/* Total */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-700">
                <span className="text-lg font-semibold text-white">Total</span>
                <span className="text-2xl font-bold text-white">
                  KES {(selectedOrder.total_amount || 0).toLocaleString()}
                </span>
              </div>
              
              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowOrderDetails(false);
                    setShowInvoice(true);
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Invoice
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invoice Dialog */}
      <Dialog open={showInvoice} onOpenChange={setShowInvoice}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice</DialogTitle>
            <DialogDescription>
              {selectedOrder?.po_number}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <InvoiceGenerator
              invoice={generateInvoiceFromOrder(selectedOrder, supplierInfo, buyerInfo)}
              onClose={() => setShowInvoice(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderHistory;


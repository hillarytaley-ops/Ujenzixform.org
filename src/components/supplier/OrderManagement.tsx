import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Package, 
  Search,
  Eye,
  CheckCircle,
  Clock,
  Truck,
  XCircle,
  RefreshCw,
  Download,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_address: string;
  items: OrderItem[];
  total_amount: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed';
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface OrderManagementProps {
  supplierId: string;
  isDarkMode?: boolean;
}

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  processing: { label: 'Processing', color: 'bg-indigo-100 text-indigo-800', icon: Package },
  shipped: { label: 'Shipped', color: 'bg-purple-100 text-purple-800', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle }
};

export const OrderManagement: React.FC<OrderManagementProps> = ({ supplierId, isDarkMode = false }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadOrders();
  }, [supplierId]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      
      // Get current user and their supplier record
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user authenticated');
        setOrders([]);
        return;
      }

      // Get supplier record for the user
      const { data: supplierData } = await supabase
        .from('suppliers')
        .select('id, user_id')
        .or(`user_id.eq.${user.id},id.eq.${supplierId}`)
        .single();

      const supplierIds = [user.id, supplierId];
      if (supplierData?.id) supplierIds.push(supplierData.id);
      if (supplierData?.user_id) supplierIds.push(supplierData.user_id);

      // Fetch real orders from purchase_orders table
      const { data: purchaseOrders, error: ordersError } = await supabase
        .from('purchase_orders')
        .select('*')
        .or(supplierIds.map(id => `supplier_id.eq.${id}`).join(','))
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        throw ordersError;
      }

      console.log('📦 Real orders loaded:', purchaseOrders?.length || 0);

      // Also fetch buyer profiles to get customer names
      const buyerIds = [...new Set(purchaseOrders?.map(po => po.buyer_id).filter(Boolean) || [])];
      let buyerProfiles: Record<string, any> = {};
      
      if (buyerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, phone, email')
          .in('id', buyerIds);
        
        if (profiles) {
          buyerProfiles = Object.fromEntries(profiles.map(p => [p.id, p]));
        }
      }

      // Transform purchase_orders to Order format
      const realOrders: Order[] = (purchaseOrders || []).map((po, index) => {
        const buyer = buyerProfiles[po.buyer_id] || {};
        const items = Array.isArray(po.items) ? po.items : [];
        
        return {
          id: po.id,
          order_number: po.po_number || `ORD-${String(index + 1).padStart(4, '0')}`,
          customer_name: buyer.full_name || po.project_name || 'Customer',
          customer_email: buyer.email || '',
          customer_phone: buyer.phone || '',
          delivery_address: po.delivery_address || '',
          items: items.map((item: any) => ({
            name: item.material_name || item.name || 'Item',
            quantity: item.quantity || 1,
            price: item.unit_price || item.price || 0
          })),
          total_amount: po.total_amount || 0,
          status: (po.status || 'pending') as Order['status'],
          payment_status: 'paid' as const, // Default to paid for now
          notes: po.special_instructions || po.delivery_notes || '',
          created_at: po.created_at,
          updated_at: po.updated_at || po.created_at
        };
      });

      if (realOrders.length === 0) {
        console.log('No real orders found, showing empty state');
      }

      setOrders(realOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to load orders',
        variant: 'destructive'
      });
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    setIsUpdating(true);
    try {
      // Update in database
      const { error } = await supabase
        .from('purchase_orders')
        .update({ 
          status: newStatus, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', orderId);

      if (error) {
        console.error('Error updating order status:', error);
        throw error;
      }

      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus, updated_at: new Date().toISOString() }
          : order
      ));

      toast({
        title: 'Status Updated',
        description: `Order status changed to ${STATUS_CONFIG[newStatus].label}`
      });

      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update order status',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getNextStatus = (currentStatus: Order['status']): Order['status'] | null => {
    const flow: Record<Order['status'], Order['status'] | null> = {
      pending: 'confirmed',
      confirmed: 'processing',
      processing: 'shipped',
      shipped: 'delivered',
      delivered: null,
      cancelled: null
    };
    return flow[currentStatus];
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => ['confirmed', 'processing'].includes(o.status)).length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    totalRevenue: orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.total_amount, 0)
  };

  const cardBg = isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white';
  const textColor = isDarkMode ? 'text-white' : 'text-gray-900';
  const mutedText = isDarkMode ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className={cardBg}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${mutedText}`}>Total Orders</p>
                <p className={`text-2xl font-bold ${textColor}`}>{stats.total}</p>
              </div>
              <Package className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className={cardBg}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${mutedText}`}>Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className={cardBg}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${mutedText}`}>Processing</p>
                <p className="text-2xl font-bold text-blue-600">{stats.processing}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className={cardBg}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${mutedText}`}>Shipped</p>
                <p className="text-2xl font-bold text-purple-600">{stats.shipped}</p>
              </div>
              <Truck className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className={cardBg}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${mutedText}`}>Revenue</p>
                <p className={`text-lg font-bold ${textColor}`}>{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className={cardBg}>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
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
            <Button variant="outline" onClick={loadOrders}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className={cardBg}>
        <CardHeader>
          <CardTitle className={textColor}>Orders ({filteredOrders.length})</CardTitle>
          <CardDescription className={mutedText}>
            Manage and track customer orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className={textColor}>No orders found</p>
              <p className={mutedText}>Orders will appear here when customers place them</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const StatusIcon = STATUS_CONFIG[order.status].icon;
                    const nextStatus = getNextStatus(order.status);
                    
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.order_number}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.customer_name}</p>
                            <p className={`text-xs ${mutedText}`}>{order.customer_phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{order.items.length} item(s)</p>
                        </TableCell>
                        <TableCell className="font-semibold">{formatCurrency(order.total_amount)}</TableCell>
                        <TableCell>
                          <Badge className={`${STATUS_CONFIG[order.status].color} flex items-center gap-1 w-fit`}>
                            <StatusIcon className="h-3 w-3" />
                            {STATUS_CONFIG[order.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'}>
                            {order.payment_status === 'paid' ? 'Paid' : 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-sm ${mutedText}`}>
                          {format(new Date(order.created_at), 'MMM dd, HH:mm')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {nextStatus && (
                              <Button 
                                size="sm" 
                                onClick={() => updateOrderStatus(order.id, nextStatus)}
                                disabled={isUpdating}
                                className="bg-orange-500 hover:bg-orange-600 text-xs"
                              >
                                {nextStatus === 'confirmed' && 'Confirm'}
                                {nextStatus === 'processing' && 'Process'}
                                {nextStatus === 'shipped' && 'Ship'}
                                {nextStatus === 'delivered' && 'Complete'}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Order {selectedOrder.order_number}</span>
                  <Badge className={STATUS_CONFIG[selectedOrder.status].color}>
                    {STATUS_CONFIG[selectedOrder.status].label}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  Placed on {format(new Date(selectedOrder.created_at), 'MMMM dd, yyyy HH:mm')}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Customer Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{selectedOrder.customer_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Mail className="h-4 w-4" />
                        {selectedOrder.customer_email}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Phone className="h-4 w-4" />
                        {selectedOrder.customer_phone}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Delivery Address</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 mt-0.5 text-gray-500" />
                        <span>{selectedOrder.delivery_address}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Order Items */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Order Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrder.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(item.quantity * item.price)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={3} className="text-right font-bold">Total</TableCell>
                          <TableCell className="text-right font-bold text-orange-600">
                            {formatCurrency(selectedOrder.total_amount)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Notes */}
                {selectedOrder.notes && (
                  <Card className="bg-yellow-50 border-yellow-200">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-yellow-800">Customer Notes</p>
                          <p className="text-sm text-yellow-700">{selectedOrder.notes}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2">
                  {selectedOrder.status === 'pending' && (
                    <Button 
                      variant="destructive" 
                      onClick={() => {
                        updateOrderStatus(selectedOrder.id, 'cancelled');
                        setSelectedOrder(null);
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Order
                    </Button>
                  )}
                  {getNextStatus(selectedOrder.status) && (
                    <Button 
                      onClick={() => {
                        const next = getNextStatus(selectedOrder.status);
                        if (next) updateOrderStatus(selectedOrder.id, next);
                      }}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      {getNextStatus(selectedOrder.status) === 'confirmed' && 'Confirm Order'}
                      {getNextStatus(selectedOrder.status) === 'processing' && 'Start Processing'}
                      {getNextStatus(selectedOrder.status) === 'shipped' && 'Mark as Shipped'}
                      {getNextStatus(selectedOrder.status) === 'delivered' && 'Mark as Delivered'}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderManagement;





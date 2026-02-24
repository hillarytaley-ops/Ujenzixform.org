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
  AlertTriangle,
  FileText
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
  // Additional fields for order type identification
  order_type?: 'quote_request' | 'direct_purchase';
  buyer_role?: string;
  // Delivery provider fields
  delivery_provider_id?: string;
  delivery_provider_name?: string;
  delivery_provider_phone?: string;
  delivery_vehicle_info?: string;
  delivery_status?: 'pending' | 'requested' | 'assigned' | 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  delivery_assigned_at?: string;
  delivery_accepted_at?: string;
  estimated_delivery_time?: string;
}

interface OrderManagementProps {
  supplierId: string;
  isDarkMode?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  processing: { label: 'Processing', color: 'bg-indigo-100 text-indigo-800', icon: Package },
  shipped: { label: 'Shipped', color: 'bg-purple-100 text-purple-800', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle },
  quoted: { label: 'Quoted', color: 'bg-orange-100 text-orange-800', icon: FileText },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle }
};

// Safe getter for status config
const getStatusConfig = (status: string) => {
  return STATUS_CONFIG[status] || STATUS_CONFIG.pending;
};

export const OrderManagement: React.FC<OrderManagementProps> = ({ supplierId, isDarkMode = false }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null); // Track which order is being updated
  const [activeOrderTab, setActiveOrderTab] = useState<'not_dispatched' | 'shipped' | 'delivered'>('not_dispatched');
  const { toast } = useToast();

  useEffect(() => {
    loadOrders();
    // Safety timeout - force loading to false after 5 seconds (reduced from 20)
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
      console.log('⏱️ Orders safety timeout - forcing loading false after 5s');
    }, 5000);
    return () => clearTimeout(safetyTimeout);
  }, [supplierId]);

  const loadOrders = async () => {
    // Use native fetch API (same as dashboard) for reliability
    const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
    
    try {
      setLoading(true);
      console.log('🔍 OrderManagement: Loading orders... supplierId prop:', supplierId);

      // Get auth token and user ID from localStorage
      let accessToken = '';
      let userId = '';
      try {
        const stored = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (stored) {
          const parsed = JSON.parse(stored);
          accessToken = parsed.access_token || '';
          userId = parsed.user?.id || '';
        }
      } catch (e) {
        console.log('Could not get auth from localStorage');
      }

      const headers: Record<string, string> = {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      // Build supplier IDs list
      const orderSupplierIds: string[] = [];
      const effectiveId = supplierId && supplierId.trim() !== '' ? supplierId : userId;
      
      if (effectiveId) orderSupplierIds.push(effectiveId);
      if (userId && !orderSupplierIds.includes(userId)) orderSupplierIds.push(userId);

      // Look up supplier record to get all related IDs
      try {
        const supplierResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/suppliers?or=(user_id.eq.${effectiveId},id.eq.${effectiveId})&select=id,user_id`,
          { headers, cache: 'no-store' }
        );
        if (supplierResponse.ok) {
          const supplierData = await supplierResponse.json();
          supplierData.forEach((s: any) => {
            if (s.id && !orderSupplierIds.includes(s.id)) orderSupplierIds.push(s.id);
            if (s.user_id && !orderSupplierIds.includes(s.user_id)) orderSupplierIds.push(s.user_id);
          });
        }
      } catch (e) {
        console.log('Supplier lookup failed');
      }

      console.log('🔑 OrderManagement: Supplier IDs to check:', orderSupplierIds);

      if (orderSupplierIds.length === 0) {
        console.log('❌ No supplier IDs found');
        setOrders([]);
        return;
      }

      // Fetch orders using native fetch (same as dashboard)
      const supplierIdsParam = orderSupplierIds.join(',');
      const ordersResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/purchase_orders?supplier_id=in.(${supplierIdsParam})&order=created_at.desc&limit=500`,
        { headers, cache: 'no-store' }
      );

      if (!ordersResponse.ok) {
        console.error('❌ Orders fetch failed:', ordersResponse.status);
        setOrders([]);
        return;
      }

      const purchaseOrders = await ordersResponse.json();
      console.log(`✅ OrderManagement: Found ${purchaseOrders?.length || 0} orders`);

      if (!purchaseOrders || purchaseOrders.length === 0) {
        setOrders([]);
        return;
      }

      // Fetch buyer profiles
      const buyerIds = [...new Set(purchaseOrders.map((po: any) => po.buyer_id).filter(Boolean))];
      let buyerProfiles: Record<string, any> = {};
      
      if (buyerIds.length > 0) {
        try {
          const profilesResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?user_id=in.(${buyerIds.join(',')})&select=user_id,full_name,email,phone`,
            { headers, cache: 'no-store' }
          );
          if (profilesResponse.ok) {
            const profiles = await profilesResponse.json();
            profiles.forEach((p: any) => { buyerProfiles[p.user_id] = p; });
          }
        } catch (e) {
          console.log('Profiles fetch failed');
        }
      }

      // Map orders to UI format
      const realOrders: Order[] = purchaseOrders.map((po: any, index: number) => {
        const buyer = buyerProfiles[po.buyer_id] || {};
        const items = Array.isArray(po.items) ? po.items : [];
        const isQuoteRequest = po.po_number?.startsWith('QR-') || po.status === 'pending' || po.status === 'quoted';
        
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
          payment_status: 'paid' as const,
          notes: po.special_instructions || po.delivery_notes || '',
          created_at: po.created_at,
          updated_at: po.updated_at || po.created_at,
          order_type: isQuoteRequest ? 'quote_request' : 'direct_purchase',
          buyer_role: po.buyer_role || 'unknown',
          delivery_provider_id: po.delivery_provider_id || undefined,
          delivery_provider_name: po.delivery_provider_name || undefined,
          delivery_provider_phone: po.delivery_provider_phone || undefined,
          delivery_vehicle_info: po.delivery_vehicle_info || undefined,
          delivery_status: po.delivery_status || undefined,
          delivery_assigned_at: po.delivery_assigned_at || undefined,
          delivery_accepted_at: po.delivery_accepted_at || undefined,
          estimated_delivery_time: po.estimated_delivery_time || undefined
        };
      });

      setOrders(realOrders);
      console.log(`✅ OrderManagement: Loaded ${realOrders.length} orders successfully`);

    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    setUpdatingOrderId(orderId); // Track which specific order is being updated
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
        description: `Order status changed to ${getStatusConfig(newStatus).label}`
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
      setUpdatingOrderId(null); // Clear the updating state
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
    const matchesType = orderTypeFilter === 'all' || order.order_type === orderTypeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Stats
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => ['confirmed', 'processing'].includes(o.status)).length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    totalRevenue: orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.total_amount, 0),
    // New stats for order types
    directPurchases: orders.filter(o => o.order_type === 'direct_purchase').length,
    quoteRequests: orders.filter(o => o.order_type === 'quote_request').length,
    newDirectOrders: orders.filter(o => o.order_type === 'direct_purchase' && o.status === 'confirmed').length
  };

  const cardBg = isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white';
  const textColor = isDarkMode ? 'text-white' : 'text-gray-900';
  const mutedText = isDarkMode ? 'text-gray-400' : 'text-gray-500';

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER ORDERS TABLE FUNCTION
  // ═══════════════════════════════════════════════════════════════════════════════
  const renderOrdersTable = (ordersList: Order[], tabType: 'not_dispatched' | 'shipped' | 'delivered') => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      );
    }

    if (ordersList.length === 0) {
      const emptyMessages = {
        not_dispatched: {
          title: 'No orders awaiting dispatch',
          description: 'New orders will appear here when customers place them'
        },
        shipped: {
          title: 'No shipped orders',
          description: 'Orders will appear here after you dispatch them using the QR scanner'
        },
        delivered: {
          title: 'No delivered orders yet',
          description: 'Orders will appear here after delivery is confirmed at the construction site'
        }
      };

      return (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className={textColor}>{emptyMessages[tabType].title}</p>
          <p className={mutedText}>{emptyMessages[tabType].description}</p>
        </div>
      );
    }

    // Helper to get delivery status badge
    const getDeliveryStatusBadge = (order: Order) => {
      if (!order.delivery_provider_id && !order.delivery_provider_name) {
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-xs">
            🚚 No delivery assigned
          </Badge>
        );
      }
      
      const deliveryStatusColors: Record<string, string> = {
        pending: 'bg-gray-100 text-gray-700 border-gray-300',
        requested: 'bg-yellow-100 text-yellow-700 border-yellow-300',
        assigned: 'bg-blue-100 text-blue-700 border-blue-300',
        accepted: 'bg-green-100 text-green-700 border-green-300',
        picked_up: 'bg-purple-100 text-purple-700 border-purple-300',
        in_transit: 'bg-indigo-100 text-indigo-700 border-indigo-300',
        delivered: 'bg-emerald-100 text-emerald-700 border-emerald-300',
        cancelled: 'bg-red-100 text-red-700 border-red-300'
      };
      
      const statusLabels: Record<string, string> = {
        pending: '⏳ Pending',
        requested: '📤 Requested',
        assigned: '📋 Assigned',
        accepted: '✅ Accepted',
        picked_up: '📦 Picked Up',
        in_transit: '🚚 In Transit',
        delivered: '✓ Delivered',
        cancelled: '✗ Cancelled'
      };
      
      const status = order.delivery_status || 'assigned';
      
      return (
        <div className="space-y-1">
          <Badge variant="outline" className={`${deliveryStatusColors[status] || deliveryStatusColors.assigned} text-xs`}>
            {statusLabels[status] || 'Assigned'}
          </Badge>
          <div className="text-xs">
            <p className="font-medium text-blue-700">🚚 {order.delivery_provider_name}</p>
            {order.delivery_provider_phone && (
              <p className={mutedText}>{order.delivery_provider_phone}</p>
            )}
            {order.delivery_vehicle_info && (
              <p className={`${mutedText} text-[10px]`}>{order.delivery_vehicle_info}</p>
            )}
          </div>
        </div>
      );
    };

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Delivery</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordersList.map((order) => {
              const statusConfig = getStatusConfig(order.status);
              const StatusIcon = statusConfig.icon;
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
                    <Badge 
                      variant="outline" 
                      className={order.order_type === 'direct_purchase' 
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                      }
                    >
                      {order.order_type === 'direct_purchase' ? '🛒 Direct' : '📋 Quote'}
                    </Badge>
                    {order.buyer_role && (
                      <p className={`text-[10px] mt-1 ${mutedText}`}>
                        {order.buyer_role === 'private_client' ? 'Private Client' : 
                         order.buyer_role === 'professional_builder' ? 'Pro Builder' : order.buyer_role}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{order.items.length} item(s)</p>
                  </TableCell>
                  <TableCell className="font-semibold">{formatCurrency(order.total_amount)}</TableCell>
                  <TableCell>
                    {getDeliveryStatusBadge(order)}
                  </TableCell>
                  <TableCell>
                    <Badge className={`${statusConfig.color} flex items-center gap-1 w-fit`}>
                      <StatusIcon className="h-3 w-3" />
                      {statusConfig.label}
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
                      {/* For Direct Purchase orders (confirmed), show Process button */}
                      {order.order_type === 'direct_purchase' && order.status === 'confirmed' && (
                        <Button 
                          size="sm" 
                          onClick={() => updateOrderStatus(order.id, 'processing')}
                          disabled={updatingOrderId === order.id}
                          className="bg-green-600 hover:bg-green-700 text-xs"
                        >
                          {updatingOrderId === order.id ? '...' : '✅ Process'}
                        </Button>
                      )}
                      {/* For Quote Requests (pending), show Confirm/Reject */}
                      {order.order_type === 'quote_request' && order.status === 'pending' && (
                        <>
                          <Button 
                            size="sm" 
                            onClick={() => updateOrderStatus(order.id, 'confirmed')}
                            disabled={updatingOrderId === order.id}
                            className="bg-blue-600 hover:bg-blue-700 text-xs"
                          >
                            {updatingOrderId === order.id ? '...' : 'Accept'}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => updateOrderStatus(order.id, 'cancelled')}
                            disabled={updatingOrderId === order.id}
                            className="text-xs"
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {/* Processing orders - show Ship button */}
                      {order.status === 'processing' && (
                        <Button 
                          size="sm" 
                          onClick={() => updateOrderStatus(order.id, 'shipped')}
                          disabled={updatingOrderId === order.id}
                          className="bg-purple-600 hover:bg-purple-700 text-xs"
                        >
                          {updatingOrderId === order.id ? '...' : '🚚 Ship'}
                        </Button>
                      )}
                      {/* Shipped orders - show Mark Delivered button */}
                      {order.status === 'shipped' && (
                        <Button 
                          size="sm" 
                          onClick={() => updateOrderStatus(order.id, 'delivered')}
                          disabled={updatingOrderId === order.id}
                          className="bg-green-600 hover:bg-green-700 text-xs"
                        >
                          {updatingOrderId === order.id ? '...' : '✅ Delivered'}
                        </Button>
                      )}
                      {/* Delivered orders - show completion badge */}
                      {order.status === 'delivered' && (
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                          ✓ Complete
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // GROUP ORDERS BY DISPATCH STATUS
  // ═══════════════════════════════════════════════════════════════════════════════
  // Not Yet Dispatched: pending, confirmed, processing
  // Shipped: shipped (dispatched but not delivered)
  // Delivered: delivered (confirmed arrival at site)
  const notDispatchedOrders = filteredOrders.filter(o => 
    ['pending', 'confirmed', 'processing'].includes(o.status)
  );
  const shippedOrders = filteredOrders.filter(o => o.status === 'shipped');
  const deliveredOrders = filteredOrders.filter(o => o.status === 'delivered');

  return (
    <div className="space-y-4">
      {/* Order Status Tabs - Clean and Simple */}
      <Tabs value={activeOrderTab} onValueChange={(v) => setActiveOrderTab(v as any)} className="w-full">
        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="direct_purchase">🛒 Direct</SelectItem>
              <SelectItem value="quote_request">📋 Quote</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadOrders}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>

        {/* Tab Buttons */}
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger 
            value="not_dispatched" 
            className="data-[state=active]:bg-amber-500 data-[state=active]:text-white"
          >
            <Clock className="h-4 w-4 mr-2" />
            Not Dispatched ({notDispatchedOrders.length})
          </TabsTrigger>
          <TabsTrigger 
            value="shipped" 
            className="data-[state=active]:bg-purple-500 data-[state=active]:text-white"
          >
            <Truck className="h-4 w-4 mr-2" />
            Shipped ({shippedOrders.length})
          </TabsTrigger>
          <TabsTrigger 
            value="delivered" 
            className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Delivered ({deliveredOrders.length})
          </TabsTrigger>
        </TabsList>

        {/* Not Dispatched Orders Tab */}
        <TabsContent value="not_dispatched">
          <Card className={cardBg}>
            <CardContent className="pt-4">
              {renderOrdersTable(notDispatchedOrders, 'not_dispatched')}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shipped Orders Tab */}
        <TabsContent value="shipped">
          <Card className={cardBg}>
            <CardContent className="pt-4">
              {renderOrdersTable(shippedOrders, 'shipped')}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivered Orders Tab */}
        <TabsContent value="delivered">
          <Card className={cardBg}>
            <CardContent className="pt-4">
              {renderOrdersTable(deliveredOrders, 'delivered')}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Order {selectedOrder.order_number}</span>
                  <div className="flex gap-2">
                    <Badge 
                      variant="outline" 
                      className={selectedOrder.order_type === 'direct_purchase' 
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                      }
                    >
                      {selectedOrder.order_type === 'direct_purchase' ? '🛒 Direct Purchase' : '📋 Quote Request'}
                    </Badge>
                    <Badge className={getStatusConfig(selectedOrder.status).color}>
                      {getStatusConfig(selectedOrder.status).label}
                    </Badge>
                  </div>
                </DialogTitle>
                <DialogDescription>
                  Placed on {format(new Date(selectedOrder.created_at), 'MMMM dd, yyyy HH:mm')}
                  {selectedOrder.buyer_role && (
                    <span className="ml-2">
                      by {selectedOrder.buyer_role === 'private_client' ? 'Private Client' : 
                          selectedOrder.buyer_role === 'professional_builder' ? 'Professional Builder' : selectedOrder.buyer_role}
                    </span>
                  )}
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

                {/* Delivery Provider Info */}
                <Card className={selectedOrder.delivery_provider_name ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Delivery Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedOrder.delivery_provider_name ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-blue-800">
                              🚚 To be delivered by: {selectedOrder.delivery_provider_name}
                            </p>
                            {selectedOrder.delivery_provider_phone && (
                              <p className="text-sm text-blue-600 flex items-center gap-1 mt-1">
                                <Phone className="h-3 w-3" />
                                {selectedOrder.delivery_provider_phone}
                              </p>
                            )}
                            {selectedOrder.delivery_vehicle_info && (
                              <p className="text-xs text-blue-500 mt-1">
                                Vehicle: {selectedOrder.delivery_vehicle_info}
                              </p>
                            )}
                          </div>
                          <Badge 
                            variant="outline" 
                            className={
                              selectedOrder.delivery_status === 'accepted' 
                                ? 'bg-green-100 text-green-700 border-green-300' 
                                : selectedOrder.delivery_status === 'in_transit'
                                ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                                : 'bg-blue-100 text-blue-700 border-blue-300'
                            }
                          >
                            {selectedOrder.delivery_status === 'accepted' && '✅ Accepted'}
                            {selectedOrder.delivery_status === 'assigned' && '📋 Assigned'}
                            {selectedOrder.delivery_status === 'picked_up' && '📦 Picked Up'}
                            {selectedOrder.delivery_status === 'in_transit' && '🚚 In Transit'}
                            {selectedOrder.delivery_status === 'delivered' && '✓ Delivered'}
                            {!selectedOrder.delivery_status && '📋 Assigned'}
                          </Badge>
                        </div>
                        {selectedOrder.estimated_delivery_time && (
                          <p className="text-sm text-gray-600">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            Estimated delivery: {format(new Date(selectedOrder.estimated_delivery_time), 'MMM dd, yyyy HH:mm')}
                          </p>
                        )}
                        {selectedOrder.delivery_accepted_at && (
                          <p className="text-xs text-green-600">
                            ✓ Accepted on {format(new Date(selectedOrder.delivery_accepted_at), 'MMM dd, HH:mm')}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <Truck className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">No delivery provider assigned yet</p>
                        <p className="text-gray-400 text-xs mt-1">
                          A delivery provider will be assigned once the order is processed
                        </p>
                      </div>
                    )}
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
                      disabled={updatingOrderId === selectedOrder.id}
                      onClick={() => {
                        updateOrderStatus(selectedOrder.id, 'cancelled');
                        setSelectedOrder(null);
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {updatingOrderId === selectedOrder.id ? 'Cancelling...' : 'Cancel Order'}
                    </Button>
                  )}
                  {getNextStatus(selectedOrder.status) && (
                    <Button
                      disabled={updatingOrderId === selectedOrder.id}
                      onClick={() => {
                        const next = getNextStatus(selectedOrder.status);
                        if (next) updateOrderStatus(selectedOrder.id, next);
                      }}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      {updatingOrderId === selectedOrder.id ? 'Updating...' : (
                        <>
                          {getNextStatus(selectedOrder.status) === 'confirmed' && 'Confirm Order'}
                          {getNextStatus(selectedOrder.status) === 'processing' && 'Start Processing'}
                          {getNextStatus(selectedOrder.status) === 'shipped' && 'Mark as Shipped'}
                          {getNextStatus(selectedOrder.status) === 'delivered' && 'Mark as Delivered'}
                        </>
                      )}
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

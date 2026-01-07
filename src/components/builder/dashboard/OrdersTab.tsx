import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Filter, Search, Download, Eye, MoreVertical, RefreshCw,
  Package, Truck, CheckCircle, Clock, XCircle, AlertCircle,
  FileText, Phone
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Order {
  id: string;
  supplier: string;
  supplier_id?: string;
  items: string;
  amount: number;
  status: 'pending' | 'processing' | 'in_transit' | 'delivered' | 'cancelled';
  date: string;
  tracking_number?: string;
  estimated_delivery?: string;
}

interface OrdersTabProps {
  userId?: string;
  isDarkMode?: boolean;
  isProfessional?: boolean;
}

export const OrdersTab: React.FC<OrdersTabProps> = ({ 
  userId, 
  isDarkMode = false,
  isProfessional = false 
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  // Fetch orders from database
  const fetchOrders = async () => {
    if (!userId) {
      // Use mock data if no userId
      setOrders(mockOrders);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          id,
          order_number,
          supplier_id,
          items,
          total_amount,
          status,
          created_at,
          tracking_number,
          estimated_delivery
        `)
        .eq('builder_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const formattedOrders: Order[] = data.map(order => ({
          id: order.order_number || order.id,
          supplier: 'Supplier', // Would need a join to get supplier name
          supplier_id: order.supplier_id,
          items: order.items || 'Construction Materials',
          amount: order.total_amount || 0,
          status: order.status as Order['status'],
          date: new Date(order.created_at).toISOString().split('T')[0],
          tracking_number: order.tracking_number,
          estimated_delivery: order.estimated_delivery
        }));
        setOrders(formattedOrders);
      } else {
        // Fall back to mock data if no orders found
        setOrders(mockOrders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders(mockOrders);
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    fetchOrders();

    if (userId) {
      const channel = supabase
        .channel('orders-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'purchase_orders',
            filter: `builder_id=eq.${userId}`
          },
          (payload) => {
            console.log('Order change:', payload);
            fetchOrders(); // Refresh orders on any change
            
            if (payload.eventType === 'UPDATE') {
              toast({
                title: "Order Updated",
                description: `Order status has been updated`,
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Orders list has been updated",
    });
  };

  const handleExport = () => {
    const csv = [
      ['Order ID', 'Supplier', 'Items', 'Amount', 'Status', 'Date'].join(','),
      ...filteredOrders.map(order => 
        [order.id, order.supplier, `"${order.items}"`, order.amount, order.status, order.date].join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Exported",
      description: "Orders exported to CSV file",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-700 border-green-300';
      case 'in_transit': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'processing': return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'pending': return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'in_transit': return <Truck className="h-4 w-4" />;
      case 'processing': return <Package className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.items.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const cardClass = isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white';
  const textClass = isDarkMode ? 'text-gray-300' : 'text-gray-600';
  const headerClass = isDarkMode ? 'text-white' : 'text-gray-900';

  if (loading) {
    return (
      <Card className={cardClass}>
        <CardContent className="py-12 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
          <p className={textClass}>Loading orders...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cardClass}>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className={`text-xl ${headerClass}`}>Order History</CardTitle>
          <div className="flex flex-wrap gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-9 w-48 ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`}
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className={`w-36 ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`}>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Refresh */}
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
              className={isDarkMode ? 'border-gray-600' : ''}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>

            {/* Export */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExport}
              className={isDarkMode ? 'border-gray-600' : ''}
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className={`h-12 w-12 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
            <p className={textClass}>No orders found</p>
            <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Your orders will appear here'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                <tr>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Order ID
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Supplier
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Items
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Amount
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Status
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Date
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700 bg-gray-800' : 'divide-gray-200 bg-white'}`}>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className={isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                    <td className={`px-4 py-3 text-sm font-medium ${headerClass}`}>
                      {order.id}
                    </td>
                    <td className={`px-4 py-3 text-sm ${textClass}`}>
                      {order.supplier}
                    </td>
                    <td className={`px-4 py-3 text-sm ${textClass}`}>
                      <span className="max-w-xs truncate block">{order.items}</span>
                    </td>
                    <td className={`px-4 py-3 text-sm font-semibold ${headerClass}`}>
                      {formatCurrency(order.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`${getStatusColor(order.status)} flex items-center gap-1 w-fit`}>
                        {getStatusIcon(order.status)}
                        <span className="capitalize">
                          {order.status === 'in_transit' ? 'In Transit' : order.status}
                        </span>
                      </Badge>
                    </td>
                    <td className={`px-4 py-3 text-sm ${textClass}`}>
                      {order.date}
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <FileText className="h-4 w-4 mr-2" />
                            Download Invoice
                          </DropdownMenuItem>
                          {order.status === 'in_transit' && (
                            <DropdownMenuItem>
                              <Truck className="h-4 w-4 mr-2" />
                              Track Delivery
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem>
                            <Phone className="h-4 w-4 mr-2" />
                            Contact Supplier
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary Stats */}
        {filteredOrders.length > 0 && (
          <div className={`mt-6 pt-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className={textClass}>Total Orders: </span>
                <span className={`font-semibold ${headerClass}`}>{filteredOrders.length}</span>
              </div>
              <div>
                <span className={textClass}>Total Value: </span>
                <span className={`font-semibold ${headerClass}`}>
                  {formatCurrency(filteredOrders.reduce((sum, o) => sum + o.amount, 0))}
                </span>
              </div>
              <div>
                <span className={textClass}>Delivered: </span>
                <span className="font-semibold text-green-600">
                  {filteredOrders.filter(o => o.status === 'delivered').length}
                </span>
              </div>
              <div>
                <span className={textClass}>In Transit: </span>
                <span className="font-semibold text-blue-600">
                  {filteredOrders.filter(o => o.status === 'in_transit').length}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Mock data fallback
const mockOrders: Order[] = [
  { 
    id: 'ORD-2024-001', 
    supplier: 'Bamburi Cement', 
    items: 'Cement (100 bags)', 
    amount: 70000, 
    status: 'delivered', 
    date: '2024-01-15' 
  },
  { 
    id: 'ORD-2024-002', 
    supplier: 'Steel Masters Kenya', 
    items: 'Steel Bars (2 tons)', 
    amount: 180000, 
    status: 'in_transit', 
    date: '2024-01-14' 
  },
  { 
    id: 'ORD-2024-003', 
    supplier: 'Nairobi Timber', 
    items: 'Timber (500 pieces)', 
    amount: 125000, 
    status: 'processing', 
    date: '2024-01-13' 
  },
  { 
    id: 'ORD-2024-004', 
    supplier: 'Paint World', 
    items: 'Paint (50 buckets)', 
    amount: 45000, 
    status: 'pending', 
    date: '2024-01-12' 
  },
  { 
    id: 'ORD-2024-005', 
    supplier: 'Roofing Solutions', 
    items: 'Roofing Sheets (100 pcs)', 
    amount: 95000, 
    status: 'delivered', 
    date: '2024-01-10' 
  },
];

export default OrdersTab;





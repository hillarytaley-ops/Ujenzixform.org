import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  MapPin, 
  Calendar,
  User,
  Phone,
  Mail,
  FileText,
  QrCode,
  Camera,
  Upload,
  Download,
  RefreshCw,
  Send,
  Eye,
  Edit,
  Plus,
  Minus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  specifications?: string;
  qr_code?: string;
  status: 'pending' | 'confirmed' | 'prepared' | 'dispatched' | 'delivered';
}

interface Order {
  id: string;
  order_number: string;
  builder_id: string;
  builder_name: string;
  builder_email: string;
  builder_phone: string;
  delivery_address: string;
  status: 'pending' | 'confirmed' | 'processing' | 'ready' | 'dispatched' | 'delivered' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  order_date: string;
  requested_delivery_date: string;
  actual_delivery_date?: string;
  total_amount: number;
  items: OrderItem[];
  notes?: string;
  tracking_updates: TrackingUpdate[];
}

interface TrackingUpdate {
  id: string;
  timestamp: string;
  status: string;
  message: string;
  location?: string;
  updated_by: string;
  photos?: string[];
}

export const SupplierOrderTracker: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState("active");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      
      // Mock data - replace with actual Supabase queries
      const mockOrders: Order[] = [
        {
          id: '1',
          order_number: 'PO-2024-001',
          builder_id: 'builder-1',
          builder_name: 'Mwangi Construction Ltd',
          builder_email: 'info@mwangiconstruction.co.ke',
          builder_phone: '+254712345678',
          delivery_address: '123 Industrial Area, Nairobi',
          status: 'processing',
          priority: 'high',
          order_date: '2024-10-08T10:00:00Z',
          requested_delivery_date: '2024-10-15T00:00:00Z',
          total_amount: 125000,
          items: [
            {
              id: 'item-1',
              name: 'Cement 50kg bags',
              quantity: 20,
              unit: 'bags',
              unit_price: 850,
              total_price: 17000,
              status: 'confirmed',
              qr_code: 'UJP-CEMENT-PO001-ITEM001-20241008-ABC123'
            },
            {
              id: 'item-2',
              name: 'Steel bars 12mm',
              quantity: 50,
              unit: 'pieces',
              unit_price: 1200,
              total_price: 60000,
              status: 'prepared',
              qr_code: 'UJP-STEEL-PO001-ITEM002-20241008-DEF456'
            }
          ],
          tracking_updates: [
            {
              id: 'update-1',
              timestamp: '2024-10-08T10:00:00Z',
              status: 'confirmed',
              message: 'Order confirmed and processing started',
              updated_by: 'Supplier Team'
            },
            {
              id: 'update-2',
              timestamp: '2024-10-08T14:30:00Z',
              status: 'processing',
              message: 'Items being prepared for dispatch',
              updated_by: 'Warehouse Team'
            }
          ]
        },
        {
          id: '2',
          order_number: 'PO-2024-002',
          builder_id: 'builder-2',
          builder_name: 'Nairobi Builders Co',
          builder_email: 'orders@nairobibuilders.com',
          builder_phone: '+254723456789',
          delivery_address: '456 Westlands, Nairobi',
          status: 'dispatched',
          priority: 'medium',
          order_date: '2024-10-07T14:30:00Z',
          requested_delivery_date: '2024-10-12T00:00:00Z',
          total_amount: 89000,
          items: [
            {
              id: 'item-3',
              name: 'Roofing sheets',
              quantity: 30,
              unit: 'sheets',
              unit_price: 2500,
              total_price: 75000,
              status: 'dispatched',
              qr_code: 'UJP-ROOF-PO002-ITEM001-20241007-GHI789'
            }
          ],
          tracking_updates: [
            {
              id: 'update-3',
              timestamp: '2024-10-07T14:30:00Z',
              status: 'confirmed',
              message: 'Order confirmed',
              updated_by: 'Supplier Team'
            },
            {
              id: 'update-4',
              timestamp: '2024-10-08T09:00:00Z',
              status: 'dispatched',
              message: 'Order dispatched via truck KCA 123A',
              location: 'Supplier Warehouse',
              updated_by: 'Logistics Team'
            }
          ]
        }
      ];

      setOrders(mockOrders);
      if (mockOrders.length > 0) {
        setSelectedOrder(mockOrders[0]);
      }

    } catch (error: any) {
      console.error('Error loading orders:', error);
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string, message: string, location?: string) => {
    try {
      setUpdating(true);

      // Update order status in database
      // This would be replaced with actual Supabase update

      // Add tracking update
      const newUpdate: TrackingUpdate = {
        id: `update-${Date.now()}`,
        timestamp: new Date().toISOString(),
        status: newStatus,
        message,
        location,
        updated_by: 'Supplier Team'
      };

      // Update local state
      setOrders(orders.map(order => 
        order.id === orderId 
          ? { 
              ...order, 
              status: newStatus as any,
              tracking_updates: [...order.tracking_updates, newUpdate]
            }
          : order
      ));

      if (selectedOrder?.id === orderId) {
        setSelectedOrder({
          ...selectedOrder,
          status: newStatus as any,
          tracking_updates: [...selectedOrder.tracking_updates, newUpdate]
        });
      }

      toast({
        title: "Status Updated",
        description: `Order status updated to ${newStatus}`,
      });

    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update order status",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const generateQRCodes = async (orderId: string) => {
    try {
      // Generate QR codes for all items in the order
      toast({
        title: "QR Codes Generated",
        description: "QR codes have been generated for all items in this order",
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate QR codes",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'processing': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ready': return 'bg-green-100 text-green-800 border-green-200';
      case 'dispatched': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getOrderProgress = (status: string) => {
    switch (status) {
      case 'pending': return 10;
      case 'confirmed': return 25;
      case 'processing': return 50;
      case 'ready': return 75;
      case 'dispatched': return 90;
      case 'delivered': return 100;
      case 'completed': return 100;
      default: return 0;
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchesSearch = searchQuery === '' || 
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.builder_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading orders...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Order Tracking</h1>
          <p className="text-muted-foreground">Track and manage order fulfillment</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadOrders}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders List */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Orders</CardTitle>
              <div className="flex gap-2">
                <Input
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="dispatched">Dispatched</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedOrder?.id === order.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{order.order_number}</span>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {order.builder_name}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>KES {order.total_amount.toLocaleString()}</span>
                      <Badge className={getPriorityColor(order.priority)} variant="outline">
                        {order.priority}
                      </Badge>
                    </div>
                    <Progress value={getOrderProgress(order.status)} className="mt-2 h-1" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Details */}
        <div className="lg:col-span-2">
          {selectedOrder ? (
            <Tabs defaultValue="details" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="items">Items</TabsTrigger>
                <TabsTrigger value="tracking">Tracking</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{selectedOrder.order_number}</CardTitle>
                      <div className="flex gap-2">
                        <Badge className={getStatusColor(selectedOrder.status)}>
                          {selectedOrder.status}
                        </Badge>
                        <Badge className={getPriorityColor(selectedOrder.priority)}>
                          {selectedOrder.priority} priority
                        </Badge>
                      </div>
                    </div>
                    <CardDescription>
                      Order placed on {format(new Date(selectedOrder.order_date), 'MMM dd, yyyy')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium">Builder Information</Label>
                          <div className="mt-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span>{selectedOrder.builder_name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span>{selectedOrder.builder_email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span>{selectedOrder.builder_phone}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium">Delivery Information</Label>
                          <div className="mt-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>{selectedOrder.delivery_address}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>Due: {format(new Date(selectedOrder.requested_delivery_date), 'MMM dd, yyyy')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-medium">Total Amount</span>
                        <span className="text-2xl font-bold">KES {selectedOrder.total_amount.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <Label className="text-sm font-medium">Progress</Label>
                      <div className="mt-2">
                        <Progress value={getOrderProgress(selectedOrder.status)} className="h-3" />
                        <div className="flex justify-between text-sm text-muted-foreground mt-1">
                          <span>Order Placed</span>
                          <span>{getOrderProgress(selectedOrder.status)}% Complete</span>
                          <span>Delivered</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="items" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Order Items</CardTitle>
                    <CardDescription>Items in this order with individual tracking</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedOrder.items.map((item) => (
                        <div key={item.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-medium">{item.name}</h3>
                            <Badge className={getStatusColor(item.status)}>
                              {item.status}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Quantity:</span>
                              <div className="font-medium">{item.quantity} {item.unit}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Unit Price:</span>
                              <div className="font-medium">KES {item.unit_price.toLocaleString()}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Total:</span>
                              <div className="font-medium">KES {item.total_price.toLocaleString()}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">QR Code:</span>
                              <div className="font-medium">
                                {item.qr_code ? (
                                  <Button size="sm" variant="outline">
                                    <QrCode className="h-4 w-4 mr-2" />
                                    View
                                  </Button>
                                ) : (
                                  <span className="text-muted-foreground">Not generated</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tracking" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Tracking History</CardTitle>
                    <CardDescription>Complete timeline of order updates</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedOrder.tracking_updates.map((update, index) => (
                        <div key={update.id} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={`w-3 h-3 rounded-full ${
                              index === 0 ? 'bg-primary' : 'bg-muted'
                            }`} />
                            {index < selectedOrder.tracking_updates.length - 1 && (
                              <div className="w-0.5 h-8 bg-muted mt-2" />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium capitalize">{update.status}</span>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(update.timestamp), 'MMM dd, HH:mm')}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{update.message}</p>
                            {update.location && (
                              <div className="flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{update.location}</span>
                              </div>
                            )}
                            <span className="text-xs text-muted-foreground">by {update.updated_by}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="actions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Order Actions</CardTitle>
                    <CardDescription>Update order status and manage fulfillment</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        onClick={() => updateOrderStatus(selectedOrder.id, 'confirmed', 'Order confirmed and inventory verified')}
                        disabled={updating || selectedOrder.status !== 'pending'}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Confirm Order
                      </Button>
                      
                      <Button
                        onClick={() => updateOrderStatus(selectedOrder.id, 'processing', 'Started preparing items for dispatch')}
                        disabled={updating || !['confirmed'].includes(selectedOrder.status)}
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Start Processing
                      </Button>
                      
                      <Button
                        onClick={() => generateQRCodes(selectedOrder.id)}
                        disabled={updating}
                      >
                        <QrCode className="h-4 w-4 mr-2" />
                        Generate QR Codes
                      </Button>
                      
                      <Button
                        onClick={() => updateOrderStatus(selectedOrder.id, 'ready', 'Items prepared and ready for dispatch')}
                        disabled={updating || !['processing'].includes(selectedOrder.status)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Ready
                      </Button>
                      
                      <Button
                        onClick={() => updateOrderStatus(selectedOrder.id, 'dispatched', 'Order dispatched for delivery', 'Supplier Warehouse')}
                        disabled={updating || !['ready'].includes(selectedOrder.status)}
                      >
                        <Truck className="h-4 w-4 mr-2" />
                        Mark Dispatched
                      </Button>
                      
                      <Button
                        onClick={() => updateOrderStatus(selectedOrder.id, 'delivered', 'Order delivered to customer')}
                        disabled={updating || !['dispatched'].includes(selectedOrder.status)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Delivered
                      </Button>
                    </div>

                    <div className="border-t pt-4">
                      <Label htmlFor="custom-update">Add Custom Update</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          id="custom-update"
                          placeholder="Enter update message..."
                          className="flex-1"
                        />
                        <Button>
                          <Send className="h-4 w-4 mr-2" />
                          Add Update
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Select an Order</h3>
                  <p className="text-muted-foreground">Choose an order from the list to view details and manage tracking</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

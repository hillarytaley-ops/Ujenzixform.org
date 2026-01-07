import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SectionLoader } from "@/components/ui/DashboardLoader";
import { 
  Package, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  FileText, 
  Truck, 
  QrCode,
  DollarSign,
  Calendar,
  Users,
  Star,
  ArrowRight,
  RefreshCw,
  Download,
  Eye,
  Edit,
  Send
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { SupplierProductManager } from "./SupplierProductManager";

interface WorkflowStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  averageRating: number;
  onTimeDelivery: number;
}

interface Order {
  id: string;
  order_number: string;
  builder_name: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'completed';
  total_amount: number;
  created_at: string;
  delivery_date: string;
  items_count: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'pending';
  icon: React.ReactNode;
  estimatedTime?: string;
  actualTime?: string;
}

export const SupplierWorkflowDashboard: React.FC = () => {
  const [stats, setStats] = useState<WorkflowStats>({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    averageRating: 0,
    onTimeDelivery: 0
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Set supplier ID for product manager
      setSupplierId(user.id);

      // Load supplier stats and orders
      // This would be replaced with actual database queries
      const mockStats: WorkflowStats = {
        totalOrders: 156,
        pendingOrders: 12,
        completedOrders: 144,
        totalRevenue: 2450000,
        averageRating: 4.7,
        onTimeDelivery: 94
      };

      const mockOrders: Order[] = [
        {
          id: '1',
          order_number: 'PO-2024-001',
          builder_name: 'Mwangi Construction Ltd',
          status: 'pending',
          total_amount: 125000,
          created_at: '2024-10-08T10:00:00Z',
          delivery_date: '2024-10-15T00:00:00Z',
          items_count: 5,
          priority: 'high'
        },
        {
          id: '2',
          order_number: 'PO-2024-002',
          builder_name: 'Nairobi Builders Co',
          status: 'processing',
          total_amount: 89000,
          created_at: '2024-10-07T14:30:00Z',
          delivery_date: '2024-10-12T00:00:00Z',
          items_count: 3,
          priority: 'medium'
        },
        {
          id: '3',
          order_number: 'PO-2024-003',
          builder_name: 'Coastal Construction',
          status: 'shipped',
          total_amount: 67000,
          created_at: '2024-10-06T09:15:00Z',
          delivery_date: '2024-10-10T00:00:00Z',
          items_count: 7,
          priority: 'low'
        }
      ];

      setStats(mockStats);
      setOrders(mockOrders);

    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'processing': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'shipped': return 'bg-orange-100 text-orange-800 border-orange-200';
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

  const getWorkflowSteps = (order: Order): WorkflowStep[] => {
    const steps: WorkflowStep[] = [
      {
        id: 'received',
        title: 'Order Received',
        description: 'Purchase order received and validated',
        status: 'completed',
        icon: <FileText className="h-4 w-4" />,
        actualTime: '2 min'
      },
      {
        id: 'confirmed',
        title: 'Order Confirmed',
        description: 'Order confirmed and inventory checked',
        status: order.status === 'pending' ? 'current' : 'completed',
        icon: <CheckCircle className="h-4 w-4" />,
        estimatedTime: '15 min'
      },
      {
        id: 'processing',
        title: 'Processing',
        description: 'Items being prepared and packaged',
        status: ['processing', 'shipped', 'delivered', 'completed'].includes(order.status) ? 'completed' : 
               order.status === 'confirmed' ? 'current' : 'pending',
        icon: <Package className="h-4 w-4" />,
        estimatedTime: '2-4 hours'
      },
      {
        id: 'qr_generated',
        title: 'QR Codes Generated',
        description: 'QR codes generated for tracking',
        status: ['processing', 'shipped', 'delivered', 'completed'].includes(order.status) ? 'completed' : 'pending',
        icon: <QrCode className="h-4 w-4" />,
        estimatedTime: '5 min'
      },
      {
        id: 'shipped',
        title: 'Shipped',
        description: 'Order dispatched for delivery',
        status: ['shipped', 'delivered', 'completed'].includes(order.status) ? 'completed' : 
               order.status === 'processing' ? 'current' : 'pending',
        icon: <Truck className="h-4 w-4" />,
        estimatedTime: '1-3 days'
      },
      {
        id: 'delivered',
        title: 'Delivered',
        description: 'Order delivered to customer',
        status: ['delivered', 'completed'].includes(order.status) ? 'completed' : 
               order.status === 'shipped' ? 'current' : 'pending',
        icon: <CheckCircle className="h-4 w-4" />,
        estimatedTime: 'On delivery date'
      }
    ];

    return steps;
  };

  const handleOrderAction = async (orderId: string, action: string) => {
    try {
      // Implement order actions (confirm, process, ship, etc.)
      toast({
        title: "Action Completed",
        description: `Order ${action} successfully`,
      });
      
      // Reload data
      loadDashboardData();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${action} order`,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <SectionLoader message="Loading workflow dashboard..." className="h-64" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Supplier Workflow Dashboard</h1>
          <p className="text-muted-foreground">Manage orders, track deliveries, and monitor performance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadDashboardData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +8% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageRating}/5.0</div>
            <p className="text-xs text-muted-foreground">
              {stats.onTimeDelivery}% on-time delivery
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Workflow Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button variant="outline" className="h-20 flex-col">
                  <FileText className="h-6 w-6 mb-2" />
                  New Quote
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <Package className="h-6 w-6 mb-2" />
                  Process Orders
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <QrCode className="h-6 w-6 mb-2" />
                  Generate QR
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <Truck className="h-6 w-6 mb-2" />
                  Track Delivery
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Latest purchase orders requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orders.slice(0, 3).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="font-medium">{order.order_number}</span>
                        <span className="text-sm text-muted-foreground">{order.builder_name}</span>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                      <Badge className={getPriorityColor(order.priority)}>
                        {order.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-medium">KES {order.total_amount.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">
                          Due: {format(new Date(order.delivery_date), 'MMM dd')}
                        </div>
                      </div>
                      <Button size="sm" onClick={() => setSelectedOrder(order)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          {supplierId ? (
            <SupplierProductManager supplierId={supplierId} />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Loading...</h3>
                  <p className="text-muted-foreground">Getting your supplier information</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Order Management</CardTitle>
              <CardDescription>View and manage all purchase orders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div>
                          <h3 className="font-medium">{order.order_number}</h3>
                          <p className="text-sm text-muted-foreground">{order.builder_name}</p>
                        </div>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                        <Badge className={getPriorityColor(order.priority)}>
                          {order.priority} priority
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button size="sm">
                          <Send className="h-4 w-4 mr-2" />
                          Process
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Amount:</span>
                        <div className="font-medium">KES {order.total_amount.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Items:</span>
                        <div className="font-medium">{order.items_count} items</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Order Date:</span>
                        <div className="font-medium">{format(new Date(order.created_at), 'MMM dd, yyyy')}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Delivery Date:</span>
                        <div className="font-medium">{format(new Date(order.delivery_date), 'MMM dd, yyyy')}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflow" className="space-y-4">
          {selectedOrder ? (
            <Card>
              <CardHeader>
                <CardTitle>Order Workflow: {selectedOrder.order_number}</CardTitle>
                <CardDescription>Track progress through the fulfillment process</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {getWorkflowSteps(selectedOrder).map((step, index) => (
                    <div key={step.id} className="flex items-center gap-4">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                        step.status === 'completed' ? 'bg-green-100 border-green-500 text-green-700' :
                        step.status === 'current' ? 'bg-blue-100 border-blue-500 text-blue-700' :
                        'bg-gray-100 border-gray-300 text-gray-500'
                      }`}>
                        {step.icon}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className={`font-medium ${
                            step.status === 'completed' ? 'text-green-700' :
                            step.status === 'current' ? 'text-blue-700' :
                            'text-gray-500'
                          }`}>
                            {step.title}
                          </h3>
                          <div className="text-sm text-muted-foreground">
                            {step.actualTime || step.estimatedTime}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                      
                      {index < getWorkflowSteps(selectedOrder).length - 1 && (
                        <div className="absolute left-5 mt-10 w-0.5 h-6 bg-gray-300" />
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 flex gap-2">
                  <Button onClick={() => handleOrderAction(selectedOrder.id, 'confirm')}>
                    Confirm Order
                  </Button>
                  <Button variant="outline" onClick={() => handleOrderAction(selectedOrder.id, 'process')}>
                    Start Processing
                  </Button>
                  <Button variant="outline" onClick={() => handleOrderAction(selectedOrder.id, 'ship')}>
                    Mark as Shipped
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Select an Order</h3>
                  <p className="text-muted-foreground">Choose an order from the Orders tab to view its workflow</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>On-time Delivery</span>
                    <span>{stats.onTimeDelivery}%</span>
                  </div>
                  <Progress value={stats.onTimeDelivery} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Order Accuracy</span>
                    <span>97%</span>
                  </div>
                  <Progress value={97} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Customer Satisfaction</span>
                    <span>96%</span>
                  </div>
                  <Progress value={96} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Orders Growth</span>
                    <div className="flex items-center text-green-600">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      +12%
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Revenue Growth</span>
                    <div className="flex items-center text-green-600">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      +8%
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">New Customers</span>
                    <div className="flex items-center text-blue-600">
                      <Users className="h-4 w-4 mr-1" />
                      23
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Settings</CardTitle>
              <CardDescription>Configure your workflow preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Workflow Configuration</AlertTitle>
                <AlertDescription>
                  Workflow settings will be available in the next update. Contact support for custom configurations.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

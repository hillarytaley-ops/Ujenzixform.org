import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { QuoteComparison } from './QuoteComparison';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  Package,
  Calendar,
  MapPin,
  Loader2,
  Eye
} from 'lucide-react';

interface PurchaseOrderManagerProps {
  builderId: string;
}

interface PurchaseOrder {
  id: string;
  project_name: string;
  delivery_address: string;
  delivery_date: string;
  status: string;
  created_at: string;
  quote_count: number;
}

export const PurchaseOrderManager: React.FC<PurchaseOrderManagerProps> = ({ builderId }) => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, [builderId]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          quotes(count)
        `)
        .eq('builder_id', builderId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedOrders = (data || []).map((order: any) => ({
        id: order.id,
        project_name: order.project_name,
        delivery_address: order.delivery_address,
        delivery_date: order.delivery_date,
        status: order.status,
        created_at: order.created_at,
        quote_count: order.quotes?.[0]?.count || 0
      }));

      setOrders(transformedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: 'Error loading orders',
        description: 'Could not load your purchase orders',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-300">Pending Quotes</Badge>;
      case 'quoted':
        return <Badge className="bg-blue-600">Quotes Received</Badge>;
      case 'accepted':
        return <Badge className="bg-green-600">Quote Accepted</Badge>;
      case 'completed':
        return <Badge className="bg-gray-600">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
          <p className="text-sm text-gray-500 mt-4">Loading your purchase orders...</p>
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Purchase Orders Yet</CardTitle>
          <CardDescription>
            Create your first purchase order to request quotes from suppliers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Click "Create Purchase Order" in the hero section to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            My Purchase Orders ({orders.length})
          </CardTitle>
          <CardDescription>
            View and compare quotes from suppliers for your orders
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            All ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending
          </TabsTrigger>
          <TabsTrigger value="quoted">
            Has Quotes
          </TabsTrigger>
          <TabsTrigger value="accepted">
            Accepted
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{order.project_name}</CardTitle>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {order.delivery_address}
                      </div>
                      {order.delivery_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(order.delivery_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(order.status)}
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">
                      {order.quote_count} Quote{order.quote_count !== 1 ? 's' : ''} Received
                    </span>
                  </div>
                  {order.quote_count > 0 && (
                    <Button
                      size="sm"
                      variant={selectedOrder === order.id ? "default" : "outline"}
                      onClick={() => setSelectedOrder(selectedOrder === order.id ? null : order.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {selectedOrder === order.id ? 'Hide' : 'Compare'} Quotes
                    </Button>
                  )}
                </div>

                {/* Show quote comparison when selected */}
                {selectedOrder === order.id && order.quote_count > 0 && (
                  <div className="pt-3 border-t">
                    <QuoteComparison orderId={order.id} builderId={builderId} />
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  Created {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Other tabs filter by status */}
        {['pending', 'quoted', 'accepted'].map((status) => (
          <TabsContent key={status} value={status} className="space-y-4">
            {orders.filter(o => o.status === status).length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  No {status} orders
                </CardContent>
              </Card>
            ) : (
              orders.filter(o => o.status === status).map((order) => (
                <Card key={order.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{order.project_name}</CardTitle>
                    <CardDescription>{order.delivery_address}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      size="sm"
                      onClick={() => setSelectedOrder(selectedOrder === order.id ? null : order.id)}
                    >
                      {selectedOrder === order.id ? 'Hide' : 'View'} Details
                    </Button>
                    {selectedOrder === order.id && (
                      <div className="mt-4">
                        <QuoteComparison orderId={order.id} builderId={builderId} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};



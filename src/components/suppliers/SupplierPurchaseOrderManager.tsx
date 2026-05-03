import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, CheckCircle, Download, Eye, Shield, Lock, FileText, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PurchaseOrder {
  id: string;
  po_number: string;
  buyer_id: string;
  supplier_id: string;
  items: any[];
  total_amount: number;
  delivery_date: string;
  status: string;
  created_at: string;
  buyer_name?: string;
  delivery_address?: string;
}

const SupplierPurchaseOrderManager: React.FC = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userProfile) {
      fetchPurchaseOrders();
    }
  }, [userProfile]);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        
        // SECURITY: Explicit column selection - exclude sensitive data
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, company_name')
          .eq('user_id', user.id)
          .single();
        
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      // Get supplier profile
      const { data: supplier } = await supabase
        .from('suppliers')
        .select('id')
        .eq('user_id', userProfile.id)
        .single();

      if (!supplier) {
        toast({
          title: "Error",
          description: "You need to be registered as a supplier to view purchase orders.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          id,
          po_number,
          buyer_id,
          supplier_id,
          items,
          total_amount,
          delivery_date,
          status,
          created_at,
          delivery_address
        `)
        .eq('supplier_id', supplier.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching purchase orders:', error);
        toast({
          title: "Error",
          description: "Failed to fetch purchase orders.",
          variant: "destructive",
        });
        return;
      }

      // Fetch buyer names separately for security
      const ordersWithBuyerNames = await Promise.all(
        (data || []).map(async (order) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', order.buyer_id)
            .single();
          
          return {
            ...order,
            items: Array.isArray(order.items) ? order.items : [],
            buyer_name: profile?.full_name || 'CO/Contractor'
          };
        })
      );

      setPurchaseOrders(ordersWithBuyerNames);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
    }
  };

  const confirmPurchaseOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({ 
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) {
        console.error('Error confirming purchase order:', error);
        toast({
          title: "Error",
          description: "Failed to confirm purchase order.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Purchase order confirmed successfully! QR codes will be automatically generated.",
      });

      fetchPurchaseOrders();
    } catch (error) {
      console.error('Error confirming purchase order:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-muted';
      case 'confirmed':
        return 'bg-primary';
      case 'dispatched':
        return 'bg-secondary';
      case 'delivered':
        return 'bg-accent';
      case 'completed':
        return 'bg-muted';
      default:
        return 'bg-muted';
    }
  };

  if (loading) {
    return <div className="p-6">Loading purchase orders...</div>;
  }

  if (!user || userProfile?.role !== 'supplier') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Purchase Order Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-amber-800">
              <Lock className="h-4 w-4" />
              <span className="font-medium">Secure Access Required</span>
            </div>
            <p className="text-sm text-amber-700 mt-1">
              Please log in as a registered supplier to access purchase order management.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Notice */}
      <Card className="border-border bg-muted/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-primary">
            <Shield className="h-5 w-5" />
            <h3 className="font-semibold">Information Security Notice</h3>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <span>SSL encrypted data transmission</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Access logs maintained for security</span>
            </div>
          </div>
          <div className="mt-2 p-2 bg-accent rounded text-xs">
            All purchase order data is protected and only accessible to authorized parties.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Purchase Orders Received
          </CardTitle>
        </CardHeader>
        <CardContent>
          {purchaseOrders.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No purchase orders received yet</p>
              <p className="text-sm text-muted-foreground">
                Purchase orders from builders will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <Tabs defaultValue="pending" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
                  <TabsTrigger value="dispatched">Dispatched</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                </TabsList>

                {['pending', 'confirmed', 'dispatched', 'completed'].map((status) => (
                  <TabsContent key={status} value={status}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>PO Number</TableHead>
                          <TableHead>Buyer</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Delivery Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purchaseOrders
                          .filter(po => po.status === status)
                          .map((po) => (
                          <TableRow key={po.id}>
                            <TableCell className="font-mono text-sm">
                              {po.po_number}
                            </TableCell>
                            <TableCell>
                              {po.buyer_name}
                            </TableCell>
                            <TableCell>
                              {po.items.length} items
                            </TableCell>
                            <TableCell>
                              KSh {po.total_amount.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              {new Date(po.delivery_date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${getStatusColor(po.status)} text-white`}>
                                {po.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setSelectedPO(po)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-4xl">
                                    <DialogHeader>
                                      <DialogTitle>Purchase Order Details</DialogTitle>
                                    </DialogHeader>
                                    {selectedPO && (
                                      <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <span className="font-medium">PO Number:</span> {selectedPO.po_number}
                                          </div>
                                          <div>
                                            <span className="font-medium">Buyer:</span> {selectedPO.buyer_name}
                                          </div>
                                          <div>
                                            <span className="font-medium">Total Amount:</span> KSh {selectedPO.total_amount.toLocaleString()}
                                          </div>
                                          <div>
                                            <span className="font-medium">Delivery Date:</span> {selectedPO.delivery_date}
                                          </div>
                                        </div>
                                        
                                        <div>
                                          <h4 className="font-medium mb-2">Items Ordered:</h4>
                                          <Table>
                                            <TableHeader>
                                              <TableRow>
                                                <TableHead>Material</TableHead>
                                                <TableHead>Quantity</TableHead>
                                                <TableHead>Unit Price</TableHead>
                                                <TableHead>Total</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {selectedPO.items.map((item, index) => (
                                                <TableRow key={index}>
                                                  <TableCell>{item.material_type}</TableCell>
                                                  <TableCell>{item.quantity} {item.unit}</TableCell>
                                                  <TableCell>KSh {item.unit_price?.toLocaleString() || 'TBD'}</TableCell>
                                                  <TableCell>KSh {(item.quantity * (item.unit_price || 0)).toLocaleString()}</TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        </div>
                                      </div>
                                    )}
                                  </DialogContent>
                                </Dialog>
                                
                                {po.status === 'pending' && (
                                  <Button
                                    size="sm"
                                    onClick={() => confirmPurchaseOrder(po.id)}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Confirm
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplierPurchaseOrderManager;
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  Package, 
  Truck, 
  QrCode, 
  Clock, 
  CheckCircle, 
  MapPin,
  Calendar,
  RefreshCw,
  Eye,
  ChevronDown,
  ChevronUp,
  Download,
  Maximize2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import QRCode from 'qrcode';

interface MaterialItem {
  id: string;
  qr_code: string;
  item_sequence: number;
  material_type: string;
  category: string;
  quantity: number;
  unit: string;
  status: string;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  total_amount: number;
  delivery_address: string;
  delivery_date: string;
  status: string;
  items: any[];
  qr_code_generated: boolean;
  created_at: string;
  material_items?: MaterialItem[];
}

interface ScanEvent {
  id: string;
  qr_code: string;
  scan_type: string;
  scanned_at: string;
  material_condition: string;
  notes: string;
}

interface BuilderOrdersTrackerProps {
  builderId: string;
}

// QR Code Image Component - Larger size for better scanning
const QRCodeImage: React.FC<{ value: string; size?: number; className?: string }> = ({ value, size = 150, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 2,
        errorCorrectionLevel: 'H', // High error correction for better scanning
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }).catch(err => console.error('QR Code generation error:', err));
    }
  }, [value, size]);
  
  return <canvas ref={canvasRef} className={`rounded border bg-white ${className}`} />;
};

// Large QR Code Dialog for scanning
const QRCodeDialog: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  item: MaterialItem | null;
}> = ({ isOpen, onClose, item }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (canvasRef.current && item?.qr_code && isOpen) {
      QRCode.toCanvas(canvasRef.current, item.qr_code, {
        width: 300,
        margin: 3,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }).catch(err => console.error('QR Code generation error:', err));
    }
  }, [item?.qr_code, isOpen]);

  const downloadQRCode = () => {
    if (canvasRef.current && item) {
      const link = document.createElement('a');
      link.download = `QR-${item.material_type.replace(/\s+/g, '-')}-${item.qr_code.slice(-8)}.png`;
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
    }
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-blue-600" />
            {item.material_type}
          </DialogTitle>
          <DialogDescription>
            Scan this QR code to track material delivery
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4 py-4">
          {/* Large QR Code for scanning */}
          <div className="p-4 bg-white rounded-xl shadow-lg border-2 border-gray-200">
            <canvas ref={canvasRef} className="rounded" />
          </div>
          
          {/* QR Code Value */}
          <div className="w-full text-center">
            <p className="font-mono text-xs bg-gray-100 px-3 py-2 rounded-lg break-all">
              {item.qr_code}
            </p>
          </div>
          
          {/* Item Details */}
          <div className="w-full grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-gray-500 text-xs">Quantity</p>
              <p className="font-semibold">{item.quantity} {item.unit}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-gray-500 text-xs">Category</p>
              <p className="font-semibold">{item.category}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg col-span-2">
              <p className="text-gray-500 text-xs">Status</p>
              <Badge className={`mt-1 ${
                item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                item.status === 'dispatched' ? 'bg-blue-100 text-blue-800' :
                item.status === 'in_transit' ? 'bg-purple-100 text-purple-800' :
                item.status === 'received' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {item.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </div>
          
          {/* Download Button */}
          <Button onClick={downloadQRCode} className="w-full" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const BuilderOrdersTracker: React.FC<BuilderOrdersTrackerProps> = ({ builderId }) => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [scanEvents, setScanEvents] = useState<ScanEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [selectedQRItem, setSelectedQRItem] = useState<MaterialItem | null>(null);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (builderId) {
      fetchOrders();
      fetchScanEvents();
      setupRealtimeSubscription();
    }
  }, [builderId]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 BuilderOrdersTracker: Fetching orders for builder:', builderId);
      
      // Fetch purchase orders for this builder
      const { data: ordersData, error: ordersError } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('buyer_id', builderId)
        .order('created_at', { ascending: false });

      console.log('📦 Orders fetched:', ordersData?.length || 0, 'orders', ordersError ? `Error: ${ordersError.message}` : '');

      if (ordersError) throw ordersError;

      // Fetch material items for each order
      const ordersWithItems = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: itemsData } = await supabase
            .from('material_items')
            .select('*')
            .eq('purchase_order_id', order.id)
            .order('item_sequence', { ascending: true });

          return {
            ...order,
            material_items: itemsData || []
          };
        })
      );

      console.log('📦 Orders with items:', ordersWithItems);
      setOrders(ordersWithItems);
    } catch (error) {
      console.error('❌ Error fetching orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to load orders',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchScanEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('qr_scan_events')
        .select('*')
        .order('scanned_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setScanEvents(data || []);
    } catch (error) {
      console.error('Error fetching scan events:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    // Subscribe to material_items changes
    const itemsChannel = supabase
      .channel('builder-material-items')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'material_items'
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    // Subscribe to scan events
    const scansChannel = supabase
      .channel('builder-scan-events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'qr_scan_events'
        },
        (payload) => {
          const newScan = payload.new as ScanEvent;
          setScanEvents(prev => [newScan, ...prev.slice(0, 49)]);
          
          toast({
            title: '📦 Material Update',
            description: `QR ${newScan.qr_code} was ${newScan.scan_type}ed`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(itemsChannel);
      supabase.removeChannel(scansChannel);
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'dispatched': return 'bg-blue-100 text-blue-800';
      case 'in_transit': return 'bg-purple-100 text-purple-800';
      case 'received': return 'bg-green-100 text-green-800';
      case 'verified': return 'bg-emerald-100 text-emerald-800';
      case 'damaged': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'dispatched': return <Package className="h-4 w-4" />;
      case 'in_transit': return <Truck className="h-4 w-4" />;
      case 'received': return <CheckCircle className="h-4 w-4" />;
      case 'verified': return <CheckCircle className="h-4 w-4" />;
      default: return <QrCode className="h-4 w-4" />;
    }
  };

  const getOrderProgress = (items: MaterialItem[]) => {
    if (!items || items.length === 0) return 0;
    const receivedCount = items.filter(i => ['received', 'verified'].includes(i.status)).length;
    return Math.round((receivedCount / items.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-600">No orders yet</p>
          <p className="text-sm text-gray-500 mb-4">Your material orders will appear here</p>
          <Button variant="outline" onClick={fetchOrders}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{orders.length}</p>
                <p className="text-xs text-gray-500">Total Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Truck className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {orders.reduce((acc, o) => acc + (o.material_items?.filter(i => i.status === 'in_transit').length || 0), 0)}
                </p>
                <p className="text-xs text-gray-500">In Transit</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {orders.reduce((acc, o) => acc + (o.material_items?.filter(i => ['received', 'verified'].includes(i.status)).length || 0), 0)}
                </p>
                <p className="text-xs text-gray-500">Received</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {orders.reduce((acc, o) => acc + (o.material_items?.filter(i => i.status === 'pending').length || 0), 0)}
                </p>
                <p className="text-xs text-gray-500">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              Your Orders
            </CardTitle>
            <CardDescription>Track your material orders and deliveries</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchOrders}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {orders.map((order) => {
            const isExpanded = expandedOrder === order.id;
            const progress = getOrderProgress(order.material_items || []);
            
            return (
              <Card key={order.id} className="border">
                <CardContent className="p-4">
                  {/* Order Header */}
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <QrCode className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold">{order.po_number}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(order.created_at), 'MMM dd, yyyy')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {/* Progress Bar */}
                      <div className="hidden md:block w-32">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-500">Progress</span>
                          <span className="font-medium">{progress}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                      
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                      
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                  
                  {/* Order Details (Expanded) */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      {/* Delivery Info */}
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="font-medium">Delivery Address</p>
                          <p className="text-gray-600">{order.delivery_address}</p>
                        </div>
                      </div>
                      
                      {/* Material Items with QR Codes */}
                      <div>
                        <p className="font-medium mb-3 flex items-center gap-2">
                          <QrCode className="h-4 w-4" />
                          Material Items with QR Codes ({order.material_items?.length || 0})
                        </p>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {order.material_items?.map((item) => (
                            <div 
                              key={item.id}
                              className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-gray-50 rounded-lg border hover:shadow-md transition-shadow"
                            >
                              {/* QR Code Image - Larger and clickable */}
                              <div 
                                className="flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => {
                                  setSelectedQRItem(item);
                                  setShowQRDialog(true);
                                }}
                                title="Click to enlarge for scanning"
                              >
                                <div className="relative">
                                  <QRCodeImage value={item.qr_code} size={140} />
                                  <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-1 rounded-full shadow-lg">
                                    <Maximize2 className="h-3 w-3" />
                                  </div>
                                </div>
                              </div>
                              
                              {/* Item Details */}
                              <div className="flex-1 min-w-0 text-center sm:text-left">
                                <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between mb-2 gap-2">
                                  <p className="font-semibold">{item.material_type}</p>
                                  <Badge className={getStatusColor(item.status)}>
                                    {getStatusIcon(item.status)}
                                    <span className="ml-1">{item.status}</span>
                                  </Badge>
                                </div>
                                
                                <div className="space-y-1 text-sm text-gray-600">
                                  <p><strong>Quantity:</strong> {item.quantity} {item.unit}</p>
                                  <p><strong>Category:</strong> {item.category}</p>
                                </div>
                                
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="mt-3 w-full sm:w-auto"
                                  onClick={() => {
                                    setSelectedQRItem(item);
                                    setShowQRDialog(true);
                                  }}
                                >
                                  <Maximize2 className="h-4 w-4 mr-2" />
                                  View Full Size
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Total */}
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-gray-600">Total Amount</span>
                        <span className="text-lg font-bold">
                          KES {order.total_amount?.toLocaleString() || '0'}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      {/* Recent Scan Activity */}
      {scanEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-purple-600" />
              Recent Scan Activity
            </CardTitle>
            <CardDescription>Real-time updates on your material scans</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {scanEvents.slice(0, 10).map((scan) => (
                <div 
                  key={scan.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge className={
                      scan.scan_type === 'dispatch' ? 'bg-blue-100 text-blue-800' :
                      scan.scan_type === 'receiving' ? 'bg-green-100 text-green-800' :
                      'bg-purple-100 text-purple-800'
                    }>
                      {scan.scan_type}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{scan.qr_code}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(scan.scanned_at), 'MMM dd, HH:mm')}
                      </p>
                    </div>
                  </div>
                  {scan.material_condition && (
                    <Badge variant="outline">{scan.material_condition}</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* QR Code Full Size Dialog */}
      <QRCodeDialog 
        isOpen={showQRDialog} 
        onClose={() => {
          setShowQRDialog(false);
          setSelectedQRItem(null);
        }} 
        item={selectedQRItem} 
      />
    </div>
  );
};

export default BuilderOrdersTracker;


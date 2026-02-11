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
  Maximize2,
  ShieldCheck,
  ShieldX,
  AlertCircle
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
  // New fields for enhanced tracking
  buyer_id?: string;
  buyer_name?: string;
  buyer_email?: string;
  item_unit_price?: number;
  item_total_price?: number;
  dispatch_scanned?: boolean;
  dispatch_scanned_at?: string;
  receive_scanned?: boolean;
  receive_scanned_at?: string;
  supplier_id?: string;
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

// QR Code Image Component - EXTRA LARGE for easy scanning
const QRCodeImage: React.FC<{ value: string; size?: number; className?: string }> = ({ value, size = 250, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 3,
        errorCorrectionLevel: 'H', // High error correction for better scanning
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }).catch(err => console.error('QR Code generation error:', err));
    }
  }, [value, size]);
  
  return <canvas ref={canvasRef} className={`rounded-lg border-2 bg-white shadow-md ${className}`} />;
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
        width: 400, // EXTRA LARGE for dialog
        margin: 4,
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
      <DialogContent className="max-w-2xl w-[95vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <QrCode className="h-7 w-7 text-blue-600" />
            {item.material_type}
          </DialogTitle>
          <DialogDescription className="text-base">
            Your unique QR code for this item. Each code can only be scanned once.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-6 py-6">
          {/* MASSIVE QR Code for scanning */}
          <div className="p-6 bg-white rounded-2xl shadow-2xl border-4 border-blue-300">
            <canvas ref={canvasRef} className="rounded-lg" />
          </div>

          {/* Scan Status Indicators */}
          <div className="w-full grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl text-center ${item.dispatch_scanned ? 'bg-green-100 border-2 border-green-400' : 'bg-gray-100 border-2 border-gray-300'}`}>
              <div className="flex items-center justify-center gap-2 mb-2">
                {item.dispatch_scanned ? <ShieldCheck className="h-6 w-6 text-green-600" /> : <ShieldX className="h-6 w-6 text-gray-400" />}
                <p className={`font-bold ${item.dispatch_scanned ? 'text-green-700' : 'text-gray-500'}`}>Dispatch</p>
              </div>
              {item.dispatch_scanned ? (
                <p className="text-sm text-green-600">✓ Supplier scanned</p>
              ) : (
                <p className="text-sm text-gray-500">Awaiting dispatch</p>
              )}
            </div>
            <div className={`p-4 rounded-xl text-center ${item.receive_scanned ? 'bg-green-100 border-2 border-green-400' : 'bg-gray-100 border-2 border-gray-300'}`}>
              <div className="flex items-center justify-center gap-2 mb-2">
                {item.receive_scanned ? <ShieldCheck className="h-6 w-6 text-green-600" /> : <ShieldX className="h-6 w-6 text-gray-400" />}
                <p className={`font-bold ${item.receive_scanned ? 'text-green-700' : 'text-gray-500'}`}>Received</p>
              </div>
              {item.receive_scanned ? (
                <p className="text-sm text-green-600">✓ You confirmed receipt</p>
              ) : (
                <p className="text-sm text-gray-500">Scan when you receive</p>
              )}
            </div>
          </div>
          
          {/* QR Code Value */}
          <div className="w-full text-center">
            <p className="font-mono text-base bg-gray-100 px-4 py-3 rounded-lg break-all">
              {item.qr_code}
            </p>
          </div>
          
          {/* Item Details */}
          <div className="w-full grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-xl text-center">
              <p className="text-blue-600 text-sm font-medium">Quantity</p>
              <p className="font-bold text-2xl">{item.quantity} {item.unit}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-xl text-center">
              <p className="text-green-600 text-sm font-medium">Category</p>
              <p className="font-bold text-xl">{item.category}</p>
            </div>
            {item.item_total_price && item.item_total_price > 0 && (
              <div className="bg-purple-50 p-4 rounded-xl col-span-2 text-center">
                <p className="text-purple-600 text-sm font-medium">Item Value</p>
                <p className="font-bold text-2xl text-purple-700">KES {item.item_total_price.toLocaleString()}</p>
              </div>
            )}
          </div>

          {/* One-Time Scan Info */}
          <div className="w-full flex items-center gap-3 text-blue-700 bg-blue-50 border border-blue-200 px-4 py-3 rounded-xl">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">This QR code is unique to this item and can only be scanned once for dispatch and once for receiving.</p>
          </div>
          
          {/* Download Button */}
          <Button onClick={downloadQRCode} className="w-full text-lg py-6" size="lg">
            <Download className="h-6 w-6 mr-3" />
            Download QR Code Image
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
      
      // Use native fetch with timeout for faster loading
      const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
      const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
      
      // Get access token from localStorage
      const stored = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      let accessToken = '';
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          accessToken = parsed.access_token || '';
        } catch (e) {}
      }
      
      const headers: Record<string, string> = { 'apikey': apiKey };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      
      // Fetch purchase orders for this builder with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      const ordersResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/purchase_orders?buyer_id=eq.${builderId}&order=created_at.desc`,
        { headers, signal: controller.signal, cache: 'no-store' }
      );
      clearTimeout(timeoutId);
      
      if (!ordersResponse.ok) {
        throw new Error(`HTTP ${ordersResponse.status}`);
      }
      
      const ordersData = await ordersResponse.json();
      console.log('📦 Orders fetched:', ordersData?.length || 0, 'orders');

      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      // Fetch all material items for all orders in one batch request
      const orderIds = ordersData.map((o: any) => o.id);
      const orderIdsParam = orderIds.join(',');
      
      let allMaterialItems: MaterialItem[] = [];
      try {
        const itemsController = new AbortController();
        const itemsTimeoutId = setTimeout(() => itemsController.abort(), 5000);
        
        const itemsResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/material_items?purchase_order_id=in.(${orderIdsParam})&order=item_sequence.asc`,
          { headers, signal: itemsController.signal, cache: 'no-store' }
        );
        clearTimeout(itemsTimeoutId);
        
        if (itemsResponse.ok) {
          allMaterialItems = await itemsResponse.json();
          console.log('📦 Material items fetched:', allMaterialItems.length);
        }
      } catch (e) {
        console.log('⚠️ Material items fetch timeout, continuing without items');
      }

      // Group material items by order
      const itemsByOrder = new Map<string, MaterialItem[]>();
      allMaterialItems.forEach(item => {
        const orderId = (item as any).purchase_order_id;
        if (!itemsByOrder.has(orderId)) {
          itemsByOrder.set(orderId, []);
        }
        itemsByOrder.get(orderId)!.push(item);
      });

      // Combine orders with their items
      const ordersWithItems = ordersData.map((order: any) => ({
        ...order,
        material_items: itemsByOrder.get(order.id) || []
      }));

      console.log('📦 Orders with items:', ordersWithItems.length);
      setOrders(ordersWithItems);
    } catch (error: any) {
      console.error('❌ Error fetching orders:', error?.message || error);
      if (error?.name !== 'AbortError') {
        toast({
          title: 'Error',
          description: 'Failed to load orders',
          variant: 'destructive'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchScanEvents = async () => {
    try {
      // Use native fetch with timeout for faster loading
      const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
      const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
      
      // Get access token from localStorage
      const stored = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      let accessToken = '';
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          accessToken = parsed.access_token || '';
        } catch (e) {}
      }
      
      const headers: Record<string, string> = { 'apikey': apiKey };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/qr_scan_events?order=scanned_at.desc&limit=50`,
        { headers, signal: controller.signal, cache: 'no-store' }
      );
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        setScanEvents(data || []);
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('Error fetching scan events:', error);
      }
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
                      
                      {/* Material Items with QR Codes - EXTRA LARGE */}
                      <div>
                        <p className="font-medium mb-4 flex items-center gap-2 text-lg">
                          <QrCode className="h-5 w-5" />
                          Material Items with QR Codes ({order.material_items?.length || 0})
                        </p>
                        <div className="space-y-6">
                          {order.material_items?.map((item) => (
                            <div 
                              key={item.id}
                              className="flex flex-col items-center p-6 bg-white rounded-xl border-2 border-gray-200 shadow-lg hover:shadow-xl transition-shadow"
                            >
                              {/* Item Header */}
                              <div className="w-full flex flex-col sm:flex-row items-center justify-between mb-4 gap-3">
                                <h3 className="text-xl font-bold text-gray-800">{item.material_type}</h3>
                                <Badge className={`text-base px-4 py-2 ${getStatusColor(item.status)}`}>
                                  {getStatusIcon(item.status)}
                                  <span className="ml-2">{item.status.replace('_', ' ').toUpperCase()}</span>
                                </Badge>
                              </div>
                              
                              {/* HUGE QR Code Image */}
                              <div 
                                className="cursor-pointer hover:scale-[1.02] transition-transform my-4"
                                onClick={() => {
                                  setSelectedQRItem(item);
                                  setShowQRDialog(true);
                                }}
                                title="Click to enlarge for scanning"
                              >
                                <div className="relative p-4 bg-white rounded-2xl border-4 border-blue-200 shadow-xl">
                                  <QRCodeImage value={item.qr_code} size={280} />
                                  <div className="absolute -bottom-3 -right-3 bg-blue-600 text-white p-2 rounded-full shadow-lg">
                                    <Maximize2 className="h-5 w-5" />
                                  </div>
                                </div>
                              </div>
                              
                              {/* QR Code Value */}
                              <p className="font-mono text-sm bg-gray-100 px-4 py-2 rounded-lg my-3 break-all text-center max-w-full">
                                {item.qr_code}
                              </p>
                              
                              {/* Item Details */}
                              <div className="w-full grid grid-cols-2 gap-4 mt-2">
                                <div className="bg-gray-50 p-4 rounded-lg text-center">
                                  <p className="text-gray-500 text-sm">Quantity</p>
                                  <p className="font-bold text-xl">{item.quantity} {item.unit}</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg text-center">
                                  <p className="text-gray-500 text-sm">Category</p>
                                  <p className="font-bold text-xl">{item.category}</p>
                                </div>
                              </div>
                              
                              <Button 
                                variant="default" 
                                size="lg" 
                                className="mt-4 w-full sm:w-auto px-8"
                                onClick={() => {
                                  setSelectedQRItem(item);
                                  setShowQRDialog(true);
                                }}
                              >
                                <Maximize2 className="h-5 w-5 mr-2" />
                                Open Full Screen for Scanning
                              </Button>
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


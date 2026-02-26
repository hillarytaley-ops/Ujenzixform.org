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
  purchase_order_id?: string;
  po_number?: string;
  material_type?: string;
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

// Filter types for order status
type OrderFilter = 'all' | 'pending' | 'dispatched' | 'in_transit' | 'received';

export const BuilderOrdersTracker: React.FC<BuilderOrdersTrackerProps> = ({ builderId }) => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [scanEvents, setScanEvents] = useState<ScanEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [selectedQRItem, setSelectedQRItem] = useState<MaterialItem | null>(null);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [activeFilter, setActiveFilter] = useState<OrderFilter>('pending'); // Default to pending orders
  const { toast } = useToast();

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
      
      // Fetch purchase orders with delivery provider information
      const ordersResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/purchase_orders?buyer_id=eq.${builderId}&select=*&order=created_at.desc`,
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

      // Fetch delivery provider names for orders that have provider_id but no name
      const ordersNeedingProviderNames = ordersData.filter((o: any) => 
        o.delivery_provider_id && !o.delivery_provider_name
      );
      
      let providerNamesMap = new Map<string, string>();
      if (ordersNeedingProviderNames.length > 0) {
        try {
          const providerIds = [...new Set(ordersNeedingProviderNames.map((o: any) => o.delivery_provider_id).filter(Boolean))];
          if (providerIds.length > 0) {
            const providerIdsParam = providerIds.join(',');
            const providersController = new AbortController();
            const providersTimeoutId = setTimeout(() => providersController.abort(), 5000);
            
            // Fetch provider names from delivery_providers table
            const providersRes = await fetch(
              `${SUPABASE_URL}/rest/v1/delivery_providers?id=in.(${providerIdsParam})&select=id,provider_name,company_name`,
              { headers, signal: providersController.signal, cache: 'no-store' }
            );
            
            if (providersRes.ok) {
              const providers = await providersRes.json();
              providers.forEach((p: any) => {
                providerNamesMap.set(p.id, p.provider_name || p.company_name || 'Delivery Provider');
              });
            }
            clearTimeout(providersTimeoutId);
          }
        } catch (e) {
          console.log('⚠️ Provider names fetch timeout, continuing without names');
        }
      }

      // Combine orders with their items and enriched provider names
      const ordersWithItems = ordersData.map((order: any) => ({
        ...order,
        material_items: itemsByOrder.get(order.id) || [],
        // Set provider name if we found it
        delivery_provider_name: order.delivery_provider_name || 
          (order.delivery_provider_id ? providerNamesMap.get(order.delivery_provider_id) : null) || 
          order.delivery_provider_name
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
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      // Fetch scan events and material items separately, then join in memory
      const [scansRes, itemsRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/qr_scan_events?order=scanned_at.desc&limit=50`, { headers, signal: controller.signal, cache: 'no-store' }),
        fetch(`${SUPABASE_URL}/rest/v1/material_items?select=id,qr_code,purchase_order_id,material_type`, { headers, signal: controller.signal, cache: 'no-store' })
      ]);
      clearTimeout(timeoutId);
      
      if (scansRes.ok && itemsRes.ok) {
        const scans = await scansRes.json();
        const items = await itemsRes.json();
        const itemsMap = new Map(items.map((item: any) => [item.qr_code, item]));
        
        // Fetch purchase orders for the items
        const orderIds = [...new Set(items.map((item: any) => item.purchase_order_id).filter(Boolean))];
        let ordersMap = new Map();
        if (orderIds.length > 0) {
          const ordersParam = orderIds.join(',');
          const ordersController = new AbortController();
          const ordersTimeoutId = setTimeout(() => ordersController.abort(), 5000);
          const ordersRes = await fetch(
            `${SUPABASE_URL}/rest/v1/purchase_orders?id=in.(${ordersParam})&select=id,po_number`,
            { headers, signal: ordersController.signal, cache: 'no-store' }
          );
          clearTimeout(ordersTimeoutId);
          if (ordersRes.ok) {
            const orders = await ordersRes.json();
            ordersMap = new Map(orders.map((order: any) => [order.id, order]));
          }
        }
        
        const transformedData = scans.map((scan: any) => {
          const item = itemsMap.get(scan.qr_code);
          const order = item?.purchase_order_id ? ordersMap.get(item.purchase_order_id) : null;
          return {
            ...scan,
            purchase_order_id: item?.purchase_order_id || null,
            po_number: order?.po_number || null,
            material_type: item?.material_type || null,
          };
        });
        setScanEvents(transformedData);
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
        async (payload) => {
          const newScan = payload.new as ScanEvent;
          
          // Fetch order information for the new scan
          let enrichedScan: ScanEvent = { ...newScan };
          try {
            const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
            const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
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
            
            // Fetch material item info
            const itemRes = await fetch(
              `${SUPABASE_URL}/rest/v1/material_items?qr_code=eq.${newScan.qr_code}&select=purchase_order_id,material_type&limit=1`,
              { headers, cache: 'no-store' }
            );
            
            if (itemRes.ok) {
              const items = await itemRes.json();
              const item = items[0];
              
              if (item?.purchase_order_id) {
                const orderRes = await fetch(
                  `${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${item.purchase_order_id}&select=po_number&limit=1`,
                  { headers, cache: 'no-store' }
                );
                if (orderRes.ok) {
                  const orders = await orderRes.json();
                  const order = orders[0];
                  enrichedScan = {
                    ...newScan,
                    purchase_order_id: item.purchase_order_id,
                    po_number: order?.po_number || null,
                    material_type: item.material_type || null,
                  };
                }
              }
            }
          } catch (e) {
            console.log('Could not fetch order info for new scan:', e);
          }
          
          setScanEvents(prev => [enrichedScan, ...prev.slice(0, 49)]);
          
          toast({
            title: '📦 Material Update',
            description: `QR ${enrichedScan.qr_code} was ${enrichedScan.scan_type}ed${enrichedScan.po_number ? ` (Order: ${enrichedScan.po_number})` : ''}`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(itemsChannel);
      supabase.removeChannel(scansChannel);
    };
  };

  useEffect(() => {
    if (builderId) {
      fetchOrders();
      fetchScanEvents();
      const cleanup = setupRealtimeSubscription();
      
      // Safety timeout - stop loading after 10 seconds max
      const timeout = setTimeout(() => {
        setLoading(false);
      }, 10000);
      
      return () => {
        clearTimeout(timeout);
        if (cleanup) cleanup();
      };
    } else {
      // No builderId - stop loading immediately
      setLoading(false);
    }
  }, [builderId]);

  // Order status flow: confirmed → dispatched → in_transit → delivered
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'confirmed': return 'bg-amber-100 text-amber-800';
      case 'quoted': return 'bg-green-100 text-green-800';
      case 'dispatched': return 'bg-orange-100 text-orange-800';
      case 'partially_dispatched': return 'bg-orange-50 text-orange-700';
      case 'in_transit': return 'bg-purple-100 text-purple-800';
      case 'partially_delivered': return 'bg-teal-100 text-teal-800';
      case 'received': return 'bg-green-100 text-green-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'verified': return 'bg-emerald-100 text-emerald-800';
      case 'damaged': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'confirmed': return <CheckCircle className="h-4 w-4" />;
      case 'quoted': return <CheckCircle className="h-4 w-4" />;
      case 'dispatched': return <Package className="h-4 w-4" />;
      case 'partially_dispatched': return <Package className="h-4 w-4" />;
      case 'in_transit': return <Truck className="h-4 w-4" />;
      case 'partially_delivered': return <Truck className="h-4 w-4" />;
      case 'received': return <CheckCircle className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'verified': return <CheckCircle className="h-4 w-4" />;
      default: return <QrCode className="h-4 w-4" />;
    }
  };

  // Get human-readable status label for items
  const getItemStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'confirmed': return 'Confirmed';
      case 'quoted': return 'Quoted';
      case 'dispatched': return '📦 Dispatched';
      case 'partially_dispatched': return '📦 Partially Dispatched';
      case 'in_transit': return '🚚 In Transit';
      case 'partially_delivered': return '📬 Partially Delivered';
      case 'received': return '✅ Received';
      case 'delivered': return '✅ Delivered';
      case 'verified': return '✓ Verified';
      case 'damaged': return '⚠️ Damaged';
      default: return status;
    }
  };

  // Get human-readable status label with delivery provider info for orders
  const getStatusLabel = (order: any) => {
    const status = order.status || 'pending';
    const deliveryStatus = order.delivery_status || 'pending';
    // Check if provider has accepted - either by ID/name or by delivery_status
    const hasDeliveryProvider = order.delivery_provider_id || order.delivery_provider_name || 
                                ['assigned', 'accepted', 'picked_up', 'in_transit', 'delivered'].includes(deliveryStatus);
    const providerName = order.delivery_provider_name || 'Delivery Provider';
    const items = order.material_items || [];
    
    // Check if items are dispatched, in transit, or received (regardless of order status)
    const hasDispatchedItems = items.some((i: any) => (i.dispatch_scanned || i.status === 'dispatched') && !['in_transit', 'received', 'verified'].includes(i.status) && !i.receive_scanned);
    const hasInTransitItems = items.some((i: any) => i.status === 'in_transit');
    const hasReceivedItems = items.some((i: any) => ['received', 'verified'].includes(i.status) || i.receive_scanned);
    
    // For orders with dispatched items, show provider name (dispatched orders MUST have a provider)
    if (hasDispatchedItems) {
      if (hasDeliveryProvider) {
        return `📦 To Be Delivered by ${providerName}`;
      }
      // Even if provider name not in data, show dispatched status (provider exists but name not loaded)
      return '📦 Dispatched';
    }
    
    // For orders with in-transit items, show provider name
    if (hasInTransitItems) {
      if (hasDeliveryProvider) {
        return `🚚 Being Delivered by ${providerName}`;
      }
      return '🚚 In Transit';
    }
    
    // For orders with received items, show who delivered it
    if (hasReceivedItems) {
      if (hasDeliveryProvider) {
        return `✅ Was Delivered by ${providerName}`;
      }
      return '✅ Received';
    }
    
    // For quoted orders (supplier has responded), show "Supplier Responded"
    if (status === 'quoted') {
      return 'Supplier Responded';
    }
    
    // For pending and confirmed orders (accepted quotes), show delivery provider status
    if (status === 'pending' || status === 'confirmed') {
      if (hasDeliveryProvider) {
        // Show provider name if available, otherwise show generic message
        if (order.delivery_provider_name && order.delivery_provider_name !== 'Delivery Provider') {
          return `To Be Delivered by ${order.delivery_provider_name}`;
        } else if (order.delivery_provider_id || ['assigned', 'accepted', 'picked_up', 'in_transit', 'delivered'].includes(deliveryStatus)) {
          // Provider has accepted but name not loaded yet - show generic message
          return 'To Be Delivered by Provider';
        }
        return `To Be Delivered by ${providerName}`;
      }
      return 'Awaiting Delivery Provider';
    }
    
    switch (status) {
      case 'dispatched':
        // If delivery provider is assigned, show provider name
        if (hasDeliveryProvider) {
          return `📦 To Be Delivered by ${providerName}`;
        }
        return '📦 Dispatched';
      case 'partially_dispatched':
        // If delivery provider is assigned, show provider name
        if (hasDeliveryProvider) {
          return `📦 To Be Delivered by ${providerName}`;
        }
        return '📦 Partially Dispatched';
      case 'in_transit':
        // If delivery provider is assigned, show provider name
        if (hasDeliveryProvider) {
          return `🚚 Being Delivered by ${providerName}`;
        }
        return '🚚 In Transit';
      case 'partially_delivered': return '📬 Partially Delivered';
      case 'received':
        // If delivery provider is assigned, show who delivered it
        if (hasDeliveryProvider) {
          return `✅ Was Delivered by ${providerName}`;
        }
        return '✅ Received';
      case 'delivered':
        // If delivery provider is assigned, show who delivered it
        if (hasDeliveryProvider) {
          return `✅ Was Delivered by ${providerName}`;
        }
        return '✅ Delivered';
      case 'verified': return '✓ Verified';
      case 'damaged': return '⚠️ Damaged';
      default: return status;
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

  // Filter orders based on active filter
  const getFilteredOrders = () => {
    if (activeFilter === 'all') return orders;
    
    return orders.filter(order => {
      const items = order.material_items || [];
      switch (activeFilter) {
        case 'pending':
          // Orders that are pending/confirmed/quoted (accepted quotes or supplier responded) but not yet dispatched
          // This includes orders awaiting delivery provider allocation
          const isPendingStatus = order.status === 'pending' || order.status === 'confirmed' || order.status === 'quoted';
          const hasPendingItems = items.some(i => !i.dispatch_scanned && !['dispatched', 'in_transit', 'received', 'verified'].includes(i.status));
          return isPendingStatus || hasPendingItems;
        case 'dispatched':
          // Orders with dispatched items (but not yet in transit or received)
          return items.some(i => (i.dispatch_scanned || i.status === 'dispatched') && !['in_transit', 'received', 'verified'].includes(i.status) && !i.receive_scanned);
        case 'in_transit':
          // Orders currently being delivered
          return items.some(i => i.status === 'in_transit');
        case 'received':
          // Orders that have been fully received
          return items.some(i => ['received', 'verified'].includes(i.status) || i.receive_scanned);
        default:
          return true;
      }
    });
  };

  const filteredOrders = getFilteredOrders();

  // Calculate stats - Count ORDERS (not items) to match the tab filtering
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(order => {
    // Include orders with status 'pending', 'confirmed', or 'quoted' (accepted quotes or supplier responded awaiting dispatch)
    const isPendingStatus = order.status === 'pending' || order.status === 'confirmed' || order.status === 'quoted';
    const items = order.material_items || [];
    const hasPendingItems = items.some(i => !i.dispatch_scanned && !['dispatched', 'in_transit', 'received', 'verified'].includes(i.status));
    return isPendingStatus || hasPendingItems;
  }).length;
  const dispatchedOrders = orders.filter(order => {
    const items = order.material_items || [];
    return items.some(i => (i.dispatch_scanned || i.status === 'dispatched') && !['in_transit', 'received', 'verified'].includes(i.status) && !i.receive_scanned);
  }).length;
  const inTransitOrders = orders.filter(order => {
    const items = order.material_items || [];
    return items.some(i => i.status === 'in_transit');
  }).length;
  const receivedOrders = orders.filter(order => {
    const items = order.material_items || [];
    return items.some(i => ['received', 'verified'].includes(i.status) || i.receive_scanned);
  }).length;

  return (
    <div className="space-y-6">
      {/* Filter Cards - Clickable status filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Pending/Confirmed - Accepted quotes awaiting dispatch */}
        <Card 
          className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
            activeFilter === 'pending' 
              ? 'border-2 border-amber-500 bg-amber-100 ring-2 ring-amber-300 shadow-lg' 
              : 'border-amber-200 bg-amber-50/50 hover:bg-amber-100/70'
          }`}
          onClick={() => setActiveFilter(activeFilter === 'pending' ? 'all' : 'pending')}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${activeFilter === 'pending' ? 'bg-amber-200' : 'bg-amber-100'}`}>
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-amber-700">{pendingOrders}</p>
                <p className="text-xs text-amber-600 font-medium">Pending</p>
              </div>
            </div>
            <p className="text-[10px] text-amber-600/80 mt-1">Accepted quotes</p>
          </CardContent>
        </Card>

        {/* Dispatched */}
        <Card 
          className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
            activeFilter === 'dispatched' 
              ? 'border-2 border-orange-500 bg-orange-100 ring-2 ring-orange-300 shadow-lg' 
              : 'border-orange-200 bg-orange-50/50 hover:bg-orange-100/70'
          }`}
          onClick={() => setActiveFilter(activeFilter === 'dispatched' ? 'all' : 'dispatched')}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${activeFilter === 'dispatched' ? 'bg-orange-200' : 'bg-orange-100'}`}>
                <Package className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-orange-700">{dispatchedOrders}</p>
                <p className="text-xs text-orange-600 font-medium">📦 Dispatched</p>
              </div>
            </div>
            <p className="text-[10px] text-orange-600/80 mt-1">Sent by supplier</p>
          </CardContent>
        </Card>
        
        {/* In Transit */}
        <Card 
          className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
            activeFilter === 'in_transit' 
              ? 'border-2 border-purple-500 bg-purple-100 ring-2 ring-purple-300 shadow-lg' 
              : 'border-purple-200 bg-purple-50/50 hover:bg-purple-100/70'
          }`}
          onClick={() => setActiveFilter(activeFilter === 'in_transit' ? 'all' : 'in_transit')}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${activeFilter === 'in_transit' ? 'bg-purple-200' : 'bg-purple-100'}`}>
                <Truck className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-purple-700">{inTransitOrders}</p>
                <p className="text-xs text-purple-600 font-medium">🚚 In Transit</p>
              </div>
            </div>
            <p className="text-[10px] text-purple-600/80 mt-1">Being delivered</p>
          </CardContent>
        </Card>
        
        {/* Received */}
        <Card 
          className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
            activeFilter === 'received' 
              ? 'border-2 border-green-500 bg-green-100 ring-2 ring-green-300 shadow-lg' 
              : 'border-green-200 bg-green-50/50 hover:bg-green-100/70'
          }`}
          onClick={() => setActiveFilter(activeFilter === 'received' ? 'all' : 'received')}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${activeFilter === 'received' ? 'bg-green-200' : 'bg-green-100'}`}>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-green-700">{receivedOrders}</p>
                <p className="text-xs text-green-600 font-medium">✅ Received</p>
              </div>
            </div>
            <p className="text-[10px] text-green-600/80 mt-1">Delivery confirmed</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Active Filter Indicator */}
      {activeFilter !== 'all' && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <span className="text-sm text-blue-700">
            Showing: <strong className="capitalize">{activeFilter.replace('_', ' ')}</strong> orders ({filteredOrders.length})
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setActiveFilter('all')}
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
          >
            Show All Orders
          </Button>
        </div>
      )}

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
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">
                {activeFilter === 'all' 
                  ? 'No orders yet' 
                  : `No ${activeFilter.replace('_', ' ')} orders`}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {activeFilter === 'all' 
                  ? 'Your confirmed orders will appear here'
                  : 'Try selecting a different filter above'}
              </p>
              {activeFilter !== 'all' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => setActiveFilter('all')}
                >
                  Show All Orders
                </Button>
              )}
            </div>
          ) : filteredOrders.map((order) => {
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
                    
                    <div className="flex items-center gap-3">
                      {/* Mini Status Timeline - Always Visible */}
                      <div className="hidden sm:flex items-center gap-1">
                        {/* Confirmed/Pending */}
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          ['pending', 'confirmed', 'dispatched', 'in_transit', 'delivered', 'received', 'verified'].includes(order.status)
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-400'
                        }`}>✓</div>
                        <div className={`w-4 h-0.5 ${
                          ['dispatched', 'in_transit', 'delivered', 'received', 'verified'].includes(order.status) ||
                          (order.delivery_provider_id && ['pending', 'confirmed'].includes(order.status))
                            ? 'bg-green-500'
                            : 'bg-gray-200'
                        }`} />
                        {/* Dispatched */}
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          ['dispatched', 'in_transit', 'delivered', 'received', 'verified'].includes(order.status)
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-200 text-gray-400'
                        }`}>📦</div>
                        <div className={`w-4 h-0.5 ${
                          ['in_transit', 'delivered', 'received', 'verified'].includes(order.status)
                            ? 'bg-green-500'
                            : 'bg-gray-200'
                        }`} />
                        {/* In Transit */}
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          ['in_transit', 'delivered', 'received', 'verified'].includes(order.status)
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-200 text-gray-400'
                        }`}>🚚</div>
                        <div className={`w-4 h-0.5 ${
                          ['delivered', 'received', 'verified'].includes(order.status)
                            ? 'bg-green-500'
                            : 'bg-gray-200'
                        }`} />
                        {/* Delivered */}
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          ['delivered', 'received', 'verified'].includes(order.status)
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 text-gray-400'
                        }`}>✅</div>
                      </div>
                      
                      {/* Progress Bar - Hidden on mobile */}
                      <div className="hidden lg:block w-24">
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
                      
                      {/* Status Badge */}
                      <Badge className={`${getStatusColor(order.status)} px-3 py-1 whitespace-nowrap`}>
                        {getStatusIcon(order.status)}
                        <span className="ml-1">{getStatusLabel(order)}</span>
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
                      {/* Order Status Timeline */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="font-medium text-sm text-gray-600 mb-3">Order Status Timeline</p>
                        <div className="flex items-center justify-between">
                          {/* Step 1: Pending/Confirmed */}
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              ['pending', 'confirmed', 'dispatched', 'in_transit', 'delivered', 'received', 'verified'].includes(order.status)
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-200 text-gray-400'
                            }`}>
                              <CheckCircle className="h-5 w-5" />
                            </div>
                            <span className="text-xs mt-1 font-medium">Accepted</span>
                            {order.delivery_provider_id || order.delivery_provider_name ? (
                              <span className="text-[10px] text-green-600 mt-0.5 font-medium">
                                To be delivered by: {order.delivery_provider_name || 'Provider'}
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-500 mt-0.5">Awaiting Provider</span>
                            )}
                          </div>
                          
                          {/* Line */}
                          <div className={`flex-1 h-1 mx-2 ${
                            ['dispatched', 'in_transit', 'delivered', 'received', 'verified'].includes(order.status) ||
                            (order.delivery_provider_id && ['pending', 'confirmed'].includes(order.status))
                              ? 'bg-green-500'
                              : 'bg-gray-200'
                          }`} />
                          
                          {/* Step 2: Dispatched */}
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              ['dispatched', 'in_transit', 'delivered', 'received', 'verified'].includes(order.status)
                                ? 'bg-orange-500 text-white'
                                : 'bg-gray-200 text-gray-400'
                            }`}>
                              <Package className="h-5 w-5" />
                            </div>
                            <span className="text-xs mt-1 font-medium">Dispatched</span>
                            <span className="text-[10px] text-gray-500">QR Scanned</span>
                          </div>
                          
                          {/* Line */}
                          <div className={`flex-1 h-1 mx-2 ${
                            ['in_transit', 'delivered', 'received', 'verified'].includes(order.status)
                              ? 'bg-green-500'
                              : 'bg-gray-200'
                          }`} />
                          
                          {/* Step 3: In Transit */}
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              ['in_transit', 'delivered', 'received', 'verified'].includes(order.status)
                                ? 'bg-purple-500 text-white animate-pulse'
                                : 'bg-gray-200 text-gray-400'
                            }`}>
                              <Truck className="h-5 w-5" />
                            </div>
                            <span className="text-xs mt-1 font-medium">In Transit</span>
                            <span className="text-[10px] text-gray-500">Being Tracked</span>
                          </div>
                          
                          {/* Line */}
                          <div className={`flex-1 h-1 mx-2 ${
                            ['delivered', 'received', 'verified'].includes(order.status)
                              ? 'bg-green-500'
                              : 'bg-gray-200'
                          }`} />
                          
                          {/* Step 4: Delivered/Received */}
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              ['delivered', 'received', 'verified'].includes(order.status)
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-200 text-gray-400'
                            }`}>
                              <CheckCircle className="h-5 w-5" />
                            </div>
                            <span className="text-xs mt-1 font-medium">Delivered</span>
                            <span className="text-[10px] text-gray-500">QR Received</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Delivery Info */}
                      <div className="space-y-3">
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                          <div>
                            <p className="font-medium">Delivery Address</p>
                            <p className="text-gray-600">{order.delivery_address}</p>
                          </div>
                        </div>
                        
                        {/* Delivery Provider Info */}
                        {(order.delivery_provider_id || order.delivery_provider_name) && (
                          <div className="flex items-start gap-2 text-sm bg-blue-50 p-3 rounded-lg border border-blue-200">
                            <Truck className="h-4 w-4 text-blue-600 mt-0.5" />
                            <div>
                              <p className="font-medium text-blue-900">Delivery Provider</p>
                              <p className="text-blue-700">{order.delivery_provider_name || 'Assigned Provider'}</p>
                              {order.delivery_provider_phone && (
                                <p className="text-xs text-blue-600 mt-1">Phone: {order.delivery_provider_phone}</p>
                              )}
                            </div>
                          </div>
                        )}
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
                                  <span className="ml-2">{getItemStatusLabel(item.status)}</span>
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
      {scanEvents.length > 0 && (() => {
        // Group scans by order
        const scansByOrder = new Map<string, ScanEvent[]>();
        const ungroupedScans: ScanEvent[] = [];
        
        scanEvents.forEach(scan => {
          if (scan.purchase_order_id && scan.po_number) {
            const key = `${scan.purchase_order_id}|${scan.po_number}`;
            if (!scansByOrder.has(key)) {
              scansByOrder.set(key, []);
            }
            scansByOrder.get(key)!.push(scan);
          } else {
            ungroupedScans.push(scan);
          }
        });
        
        // Sort orders by most recent scan
        const sortedOrders = Array.from(scansByOrder.entries()).sort((a, b) => {
          const aLatest = new Date(a[1][0].scanned_at).getTime();
          const bLatest = new Date(b[1][0].scanned_at).getTime();
          return bLatest - aLatest;
        });
        
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-purple-600" />
                Recent Scan Activity
              </CardTitle>
              <CardDescription>Real-time updates on your material scans</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {/* Grouped by Order */}
                {sortedOrders.map(([orderKey, scans]) => {
                  const [orderId, poNumber] = orderKey.split('|');
                  const sortedScans = scans.sort((a, b) => 
                    new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime()
                  );
                  
                  return (
                    <div key={orderKey} className="space-y-2">
                      <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                        <Package className="h-4 w-4 text-blue-600" />
                        <p className="text-sm font-semibold text-gray-700">Order: {poNumber}</p>
                        <Badge variant="outline" className="text-xs">
                          {scans.length} {scans.length === 1 ? 'scan' : 'scans'}
                        </Badge>
                      </div>
                      <div className="space-y-2 pl-4">
                        {sortedScans.slice(0, 5).map((scan) => (
                          <div 
                            key={scan.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <Badge className={
                                scan.scan_type === 'dispatch' ? 'bg-blue-100 text-blue-800' :
                                scan.scan_type === 'receiving' ? 'bg-green-100 text-green-800' :
                                'bg-purple-100 text-purple-800'
                              }>
                                {scan.scan_type}
                              </Badge>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{scan.qr_code}</p>
                                {scan.material_type && (
                                  <p className="text-xs text-gray-500 truncate">{scan.material_type}</p>
                                )}
                                <p className="text-xs text-gray-500">
                                  {format(new Date(scan.scanned_at), 'MMM dd, HH:mm')}
                                </p>
                              </div>
                            </div>
                            {scan.material_condition && (
                              <Badge variant="outline" className="ml-2">{scan.material_condition}</Badge>
                            )}
                          </div>
                        ))}
                        {sortedScans.length > 5 && (
                          <p className="text-xs text-gray-500 pl-3">
                            +{sortedScans.length - 5} more scans for this order
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {/* Ungrouped scans (if any) */}
                {ungroupedScans.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-gray-200">
                    <div className="flex items-center gap-2 pb-2">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <p className="text-sm font-semibold text-gray-700">Other Scans</p>
                    </div>
                    <div className="space-y-2 pl-4">
                      {ungroupedScans.slice(0, 5).map((scan) => (
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
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })()}

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


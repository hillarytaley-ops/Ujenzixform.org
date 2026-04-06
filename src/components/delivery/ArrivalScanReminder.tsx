import { readPersistedAuthRawStringSync } from '@/utils/supabaseAccessToken';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  MapPin, 
  Package, 
  CheckCircle, 
  QrCode, 
  Scan, 
  AlertTriangle,
  Truck,
  Clock,
  Camera,
  ArrowRight,
  Bell,
  Navigation
} from 'lucide-react';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OrderItem {
  id: string;
  qr_code: string;
  material_name: string;
  quantity: number;
  unit: string;
  category: string;
  status: string;
  dispatch_scanned_at?: string;
  receive_scanned_at?: string;
}

interface DeliveryOrder {
  id: string;
  po_number: string;
  project_name?: string;
  delivery_address: string;
  total_amount: number;
  buyer_name?: string;
  buyer_phone?: string;
  items: OrderItem[];
}

interface ArrivalScanReminderProps {
  deliveryId: string;
  orderId?: string;
  onScanComplete?: () => void;
  onNavigateToScanner?: () => void;
  isDarkMode?: boolean;
}

export const ArrivalScanReminder: React.FC<ArrivalScanReminderProps> = ({
  deliveryId,
  orderId,
  onScanComplete,
  onNavigateToScanner,
  isDarkMode = false
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<DeliveryOrder | null>(null);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails(orderId);
    } else if (deliveryId) {
      fetchDeliveryOrderDetails(deliveryId);
    }
  }, [deliveryId, orderId]);

  const fetchOrderDetails = async (orderIdToFetch: string) => {
    setLoading(true);
    try {
      let accessToken = SUPABASE_ANON_KEY;
      try {
        const stored = readPersistedAuthRawStringSync();
        if (stored) {
          const parsed = JSON.parse(stored);
          accessToken = parsed.access_token || SUPABASE_ANON_KEY;
        }
      } catch (e) {}

      // Fetch order details
      const orderResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${orderIdToFetch}&select=*`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
          }
        }
      );

      if (!orderResponse.ok) throw new Error('Failed to fetch order');
      const orderData = await orderResponse.json();
      
      if (!orderData || orderData.length === 0) {
        setLoading(false);
        return;
      }

      const orderInfo = orderData[0];

      // Fetch material items for this order
      const itemsResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/material_items?purchase_order_id=eq.${orderIdToFetch}&select=*`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
          }
        }
      );

      if (!itemsResponse.ok) throw new Error('Failed to fetch items');
      const itemsData = await itemsResponse.json();

      // Get buyer info
      let buyerName = 'Customer';
      let buyerPhone = '';
      if (orderInfo.buyer_id) {
        try {
          const profileResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?id=eq.${orderInfo.buyer_id}&select=full_name,phone`,
            {
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken}`,
              }
            }
          );
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            if (profileData && profileData.length > 0) {
              buyerName = profileData[0].full_name || 'Customer';
              buyerPhone = profileData[0].phone || '';
            }
          }
        } catch (e) {}
      }

      const items: OrderItem[] = itemsData.map((item: any) => ({
        id: item.id,
        qr_code: item.qr_code,
        material_name: item.material_name || item.material_type || 'Unknown Material',
        quantity: item.quantity || 1,
        unit: item.unit || 'pcs',
        category: item.category || 'General',
        status: item.status || 'pending',
        dispatch_scanned_at: item.dispatch_scanned_at,
        receive_scanned_at: item.receive_scanned_at
      }));

      const scanned = items.filter(i => i.receive_scanned_at).length;
      setScannedCount(scanned);
      setTotalItems(items.length);

      setOrder({
        id: orderInfo.id,
        po_number: orderInfo.po_number,
        project_name: orderInfo.project_name,
        delivery_address: orderInfo.delivery_address,
        total_amount: orderInfo.total_amount,
        buyer_name: buyerName,
        buyer_phone: buyerPhone,
        items
      });

    } catch (error) {
      console.error('Error fetching order details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load order details',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryOrderDetails = async (deliveryIdToFetch: string) => {
    setLoading(true);
    try {
      let accessToken = SUPABASE_ANON_KEY;
      try {
        const stored = readPersistedAuthRawStringSync();
        if (stored) {
          const parsed = JSON.parse(stored);
          accessToken = parsed.access_token || SUPABASE_ANON_KEY;
        }
      } catch (e) {}

      // Fetch delivery request to get the order ID
      const deliveryResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/delivery_requests?id=eq.${deliveryIdToFetch}&select=*`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
          }
        }
      );

      if (!deliveryResponse.ok) throw new Error('Failed to fetch delivery');
      const deliveryData = await deliveryResponse.json();
      
      if (!deliveryData || deliveryData.length === 0) {
        setLoading(false);
        return;
      }

      const delivery = deliveryData[0];
      
      // If delivery has a purchase_order_id, fetch that order's details
      if (delivery.purchase_order_id) {
        await fetchOrderDetails(delivery.purchase_order_id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching delivery order:', error);
      setLoading(false);
    }
  };

  const triggerArrivalReminder = () => {
    setShowReminderDialog(true);
    
    // Vibrate on mobile devices
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
    
    // Play alert sound
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 600;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      oscillator.start();
      setTimeout(() => {
        oscillator.frequency.value = 800;
        setTimeout(() => {
          oscillator.frequency.value = 1000;
          setTimeout(() => oscillator.stop(), 150);
        }, 150);
      }, 150);
    } catch (e) {}
  };

  const handleStartScanning = () => {
    setShowReminderDialog(false);
    if (onNavigateToScanner) {
      onNavigateToScanner();
    }
  };

  const progressPercentage = totalItems > 0 ? (scannedCount / totalItems) * 100 : 0;
  const allScanned = scannedCount === totalItems && totalItems > 0;

  if (loading) {
    return (
      <Card className={isDarkMode ? 'bg-gray-800 border-gray-700' : ''}>
        <CardContent className="py-8 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Loading delivery details...</p>
        </CardContent>
      </Card>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <>
      {/* Arrival Scan Status Card */}
      <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : ''} ${!allScanned ? 'border-orange-300 bg-orange-50/50' : 'border-green-300 bg-green-50/50'}`}>
        <CardHeader className="pb-3">
          <CardTitle className={`flex items-center justify-between text-lg ${isDarkMode ? 'text-white' : ''}`}>
            <div className="flex items-center gap-2">
              {allScanned ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <QrCode className="h-5 w-5 text-orange-600" />
              )}
              Delivery Scan Status
            </div>
            <Badge className={allScanned ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'}>
              {scannedCount}/{totalItems} Scanned
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Order Info */}
          <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-white'} border ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Order #{order.po_number}
              </span>
              {order.project_name && (
                <Badge variant="outline" className="text-xs">
                  {order.project_name}
                </Badge>
              )}
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {order.delivery_address}
              </p>
            </div>
            {order.buyer_name && (
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Customer: {order.buyer_name}
              </p>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Scanning Progress</span>
              <span className={`font-medium ${allScanned ? 'text-green-600' : 'text-orange-600'}`}>
                {progressPercentage.toFixed(0)}%
              </span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
          </div>

          {/* Items List */}
          <div className="space-y-2">
            <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Expected Items ({totalItems}):
            </p>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {order.items.map((item) => (
                <div 
                  key={item.id}
                  className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                    item.receive_scanned_at 
                      ? (isDarkMode ? 'bg-green-900/30 border-green-700' : 'bg-green-50 border-green-200')
                      : (isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200')
                  } border`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {item.receive_scanned_at ? (
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <Package className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className={`font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {item.material_name}
                      </p>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {item.quantity} {item.unit} • {item.category}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    {item.receive_scanned_at ? (
                      <Badge className="bg-green-500 text-white text-xs">✓ Scanned</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs font-mono">
                        {item.qr_code?.slice(-8) || 'N/A'}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          {!allScanned ? (
            <div className="space-y-2">
              <Button 
                onClick={triggerArrivalReminder}
                className="w-full bg-orange-600 hover:bg-orange-700 h-12"
              >
                <Bell className="h-5 w-5 mr-2" />
                I've Arrived - Start Scanning
              </Button>
              <p className={`text-xs text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Tap when you arrive at the delivery location to scan materials
              </p>
            </div>
          ) : (
            <Alert className="bg-green-100 border-green-300">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">All Items Scanned!</AlertTitle>
              <AlertDescription className="text-green-700">
                All {totalItems} items have been successfully scanned and confirmed.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Arrival Reminder Dialog */}
      <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
        <DialogContent className={`max-w-md ${isDarkMode ? 'bg-gray-800 text-white' : ''}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="bg-orange-100 p-2 rounded-full">
                <Scan className="h-6 w-6 text-orange-600" />
              </div>
              📍 You've Arrived!
            </DialogTitle>
            <DialogDescription className={isDarkMode ? 'text-gray-400' : ''}>
              Time to scan and confirm delivery of materials
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Order Summary */}
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-blue-50'} border ${isDarkMode ? 'border-gray-600' : 'border-blue-200'}`}>
              <h4 className={`font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-blue-900'}`}>
                Order #{order.po_number}
              </h4>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-blue-700'}`}>
                📦 {totalItems} items to scan
              </p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-blue-700'}`}>
                📍 {order.delivery_address}
              </p>
            </div>

            {/* Instructions */}
            <Alert className={isDarkMode ? 'bg-yellow-900/30 border-yellow-700' : 'bg-yellow-50 border-yellow-200'}>
              <AlertTriangle className={`h-4 w-4 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
              <AlertTitle className={isDarkMode ? 'text-yellow-300' : 'text-yellow-800'}>
                Important: Scan All Items
              </AlertTitle>
              <AlertDescription className={`text-sm ${isDarkMode ? 'text-yellow-200' : 'text-yellow-700'}`}>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Scan each item's QR code as you unload</li>
                  <li>Verify quantities match the order</li>
                  <li>Report any damaged items immediately</li>
                  <li>Get customer signature after all items are scanned</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Pending Items Preview */}
            <div className="space-y-2">
              <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Items to Scan ({totalItems - scannedCount} remaining):
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {order.items.filter(i => !i.receive_scanned_at).slice(0, 5).map((item) => (
                  <div 
                    key={item.id}
                    className={`flex items-center gap-2 p-2 rounded text-sm ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}
                  >
                    <QrCode className="h-4 w-4 text-orange-500" />
                    <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{item.material_name}</span>
                    <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      ({item.quantity} {item.unit})
                    </span>
                  </div>
                ))}
                {order.items.filter(i => !i.receive_scanned_at).length > 5 && (
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-center`}>
                    +{order.items.filter(i => !i.receive_scanned_at).length - 5} more items...
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowReminderDialog(false)}
              className="w-full sm:w-auto"
            >
              Scan Later
            </Button>
            <Button 
              onClick={handleStartScanning}
              className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700"
            >
              <Camera className="h-4 w-4 mr-2" />
              Open Scanner
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ArrivalScanReminder;

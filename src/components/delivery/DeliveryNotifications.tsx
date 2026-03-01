// COMPLETELY RESTRUCTURED: Simple, clear approach - ONE notification per purchase_order_id
// This replaces the complex deduplication logic with a straightforward approach

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Bell, BellOff, Volume2, VolumeX, Vibrate, 
  Package, Truck, AlertTriangle, CheckCircle, X,
  Clock, MapPin, DollarSign, Star, RefreshCw,
  Check, XCircle, Loader2, Copy, Navigation, ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Notification {
  id: string;
  type: 'new_delivery' | 'status_update' | 'payment' | 'rating' | 'urgent' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high';
  status?: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  materialType?: string;
  quantity?: string;
  estimatedCost?: number;
  purchase_order_id?: string; // CRITICAL for deduplication
  delivery_request_id?: string; // The actual delivery_request ID for accepting
}

interface NotificationSettings {
  pushEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  newDeliveryAlerts: boolean;
  statusUpdates: boolean;
  paymentNotifications: boolean;
  ratingNotifications: boolean;
  urgentOnly: boolean;
}

interface DeliveryNotificationsProps {
  userId: string;
  onNotificationClick?: (notification: Notification) => void;
  onAcceptDelivery?: (requestId: string) => void;
  onRejectDelivery?: (requestId: string) => void;
}

export const DeliveryNotifications: React.FC<DeliveryNotificationsProps> = ({
  userId,
  onNotificationClick,
  onAcceptDelivery,
  onRejectDelivery
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const acceptingRef = useRef<string | null>(null);
  const [settings, setSettings] = useState<NotificationSettings>({
    pushEnabled: false,
    soundEnabled: true,
    vibrationEnabled: true,
    newDeliveryAlerts: true,
    statusUpdates: true,
    paymentNotifications: true,
    ratingNotifications: true,
    urgentOnly: false
  });
  const [showSettings, setShowSettings] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Helper to get auth headers
  const getAuthHeaders = () => {
    const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
    
    try {
      const stored = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      let accessToken = '';
      if (stored) {
        const parsed = JSON.parse(stored);
        accessToken = parsed.access_token || '';
      }
      
      const headers: Record<string, string> = {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      
      return { url: SUPABASE_URL, headers };
    } catch (e) {
      return {
        url: 'https://wuuyjjpgzgeimiptuuws.supabase.co',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo',
          'Content-Type': 'application/json'
        }
      };
    }
  };

  // COMPLETELY RESTRUCTURED: Simple, clear logic
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 RESTRUCTURED: Loading notifications...');
      
      const { url, headers } = getAuthHeaders();
      const finalNotifications: Notification[] = [];
      const seenPurchaseOrderIds = new Set<string>(); // Track which purchase_orders we've already added
      
      // STEP 1: Fetch ALL delivery_requests (these are the primary source)
      const drResponse = await fetch(
        `${url}/rest/v1/delivery_requests?order=created_at.desc&limit=100&select=*`,
        { headers, cache: 'no-store' }
      );
      
      let deliveryRequests: any[] = [];
      if (drResponse.ok) {
        deliveryRequests = await drResponse.json();
        console.log(`✅ Loaded ${deliveryRequests.length} delivery_requests`);
      }
      
      // STEP 2: Process delivery_requests - ONE notification per purchase_order_id
      const deliveryRequestsByPO = new Map<string, any>();
      const deliveryRequestsByKey = new Map<string, any>(); // For NULL purchase_order_id cases
      let duplicatesRemoved = 0;
      let nullPORequests = 0;
      const poIdCounts = new Map<string, number>(); // Track how many times each PO ID appears
      
      // First pass: count occurrences of each purchase_order_id
      deliveryRequests.forEach((dr: any) => {
        if (dr.purchase_order_id) {
          poIdCounts.set(dr.purchase_order_id, (poIdCounts.get(dr.purchase_order_id) || 0) + 1);
        }
      });
      
      // Log any purchase_order_ids that appear multiple times
      poIdCounts.forEach((count, poId) => {
        if (count > 1) {
          console.log(`⚠️ DUPLICATE DETECTED: purchase_order_id ${poId} appears ${count} times!`);
        }
      });
      
      deliveryRequests.forEach((dr: any) => {
        if (dr.purchase_order_id) {
          // If we haven't seen this purchase_order_id, add it
          if (!deliveryRequestsByPO.has(dr.purchase_order_id)) {
            deliveryRequestsByPO.set(dr.purchase_order_id, dr);
            seenPurchaseOrderIds.add(dr.purchase_order_id);
          } else {
            // Duplicate found! Keep the best one
            duplicatesRemoved++;
            const existing = deliveryRequestsByPO.get(dr.purchase_order_id);
            const existingScore = (existing.status === 'accepted' || existing.status === 'assigned' ? 10 : 0) +
                                 (existing.provider_id ? 5 : 0) +
                                 (new Date(existing.created_at).getTime() / 1000000);
            const newScore = (dr.status === 'accepted' || dr.status === 'assigned' ? 10 : 0) +
                            (dr.provider_id ? 5 : 0) +
                            (new Date(dr.created_at).getTime() / 1000000);
            if (newScore > existingScore) {
              deliveryRequestsByPO.set(dr.purchase_order_id, dr);
              console.log(`🔄 Replaced duplicate for PO ${dr.purchase_order_id} (better score) - DR IDs: ${existing.id} → ${dr.id}`);
            } else {
              console.log(`🗑️ Removed duplicate for PO ${dr.purchase_order_id} (keeping existing) - DR ID: ${dr.id}`);
            }
          }
        } else {
          // NULL purchase_order_id - deduplicate by builder_id + delivery_address + material_type + same hour
          nullPORequests++;
          const key = `${dr.builder_id || 'no-builder'}|${(dr.delivery_address || '').toLowerCase().trim()}|${(dr.material_type || '').toLowerCase().trim()}|${dr.created_at ? new Date(dr.created_at).toISOString().slice(0, 13) : 'no-date'}`;
          
          if (!deliveryRequestsByKey.has(key)) {
            deliveryRequestsByKey.set(key, dr);
          } else {
            // Duplicate found for NULL PO case
            duplicatesRemoved++;
            const existing = deliveryRequestsByKey.get(key);
            const existingTime = new Date(existing.created_at).getTime();
            const newTime = new Date(dr.created_at).getTime();
            if (newTime > existingTime) {
              deliveryRequestsByKey.set(key, dr);
              console.log(`🔄 Replaced duplicate NULL PO request (newer): ${key} - DR IDs: ${existing.id} → ${dr.id}`);
            } else {
              console.log(`🗑️ Removed duplicate NULL PO request (keeping older): ${key} - DR ID: ${dr.id}`);
            }
          }
        }
      });
      
      const totalUnique = deliveryRequestsByPO.size + deliveryRequestsByKey.size;
      console.log(`🔍 Deduplicated delivery_requests: ${deliveryRequests.length} → ${totalUnique} unique (removed ${duplicatesRemoved} duplicates, ${nullPORequests} had NULL purchase_order_id)`);
      
      // STEP 3: Create notifications from unique delivery_requests
      for (const [poId, dr] of deliveryRequestsByPO.entries()) {
        finalNotifications.push({
          id: dr.id,
          type: 'new_delivery',
          title: dr.status === 'pending' ? '🚚 New Delivery Request!' : `Delivery ${dr.status}`,
          message: `${dr.material_type || 'Materials'} delivery to ${dr.delivery_address || 'Unknown location'}`,
          timestamp: new Date(dr.created_at),
          read: dr.status !== 'pending',
          priority: dr.priority_level === 'urgent' || dr.status === 'pending' ? 'high' : 'medium',
          actionUrl: `/delivery-dashboard?request=${dr.id}`,
          status: dr.status,
          pickupAddress: dr.pickup_address || dr.pickup_location || '',
          deliveryAddress: dr.delivery_address || dr.delivery_location || '',
          materialType: dr.material_type || '',
          quantity: dr.quantity || '',
          estimatedCost: dr.estimated_cost || dr.budget_range || 0,
          purchase_order_id: poId, // CRITICAL
          delivery_request_id: dr.id // For accepting
        });
      }
      
      // Also add notifications from NULL purchase_order_id requests (deduplicated)
      for (const [key, dr] of deliveryRequestsByKey.entries()) {
        finalNotifications.push({
          id: dr.id,
          type: 'new_delivery',
          title: dr.status === 'pending' ? '🚚 New Delivery Request!' : `Delivery ${dr.status}`,
          message: `${dr.material_type || 'Materials'} delivery to ${dr.delivery_address || 'Unknown location'}`,
          timestamp: new Date(dr.created_at),
          read: dr.status !== 'pending',
          priority: dr.priority_level === 'urgent' || dr.status === 'pending' ? 'high' : 'medium',
          actionUrl: `/delivery-dashboard?request=${dr.id}`,
          status: dr.status,
          pickupAddress: dr.pickup_address || dr.pickup_location || '',
          deliveryAddress: dr.delivery_address || dr.delivery_location || '',
          materialType: dr.material_type || '',
          quantity: dr.quantity || '',
          estimatedCost: dr.estimated_cost || dr.budget_range || 0,
          purchase_order_id: undefined, // NULL purchase_order_id
          delivery_request_id: dr.id // For accepting
        });
      }
      
      // STEP 4: Fetch purchase_orders that DON'T have a delivery_request yet
      const poResponse = await fetch(
        `${url}/rest/v1/purchase_orders?status=in.(quote_accepted,order_created,awaiting_delivery_request,delivery_requested,awaiting_delivery_provider,delivery_assigned,ready_for_dispatch)&order=created_at.desc&limit=100&select=*`,
        { headers, cache: 'no-store' }
      );
      
      if (poResponse.ok) {
        const purchaseOrders = await poResponse.json();
        console.log(`✅ Loaded ${purchaseOrders.length} purchase_orders`);
        
        // Only add purchase_orders that DON'T have a delivery_request
        purchaseOrders.forEach((po: any) => {
          if (!seenPurchaseOrderIds.has(po.id) && (po.delivery_required || po.delivery_address)) {
            const materialType = po.items && po.items.length > 0
              ? po.items.map((item: any) => item.material_name || item.name).join(', ')
              : 'Construction Materials';
            
            finalNotifications.push({
              id: `po-${po.id}`,
              type: 'new_delivery',
              title: '🚚 New Delivery Request!',
              message: `${materialType} delivery to ${po.delivery_address || 'Unknown location'}`,
              timestamp: new Date(po.delivery_requested_at || po.order_created_at || po.created_at),
              read: false,
              priority: 'high',
              actionUrl: `/delivery-dashboard?order=${po.id}`,
              status: 'pending',
              pickupAddress: 'Supplier location',
              deliveryAddress: po.delivery_address || '',
              materialType: materialType,
              quantity: po.items?.length || 1,
              estimatedCost: po.total_amount || 0,
              purchase_order_id: po.id, // CRITICAL
              delivery_request_id: undefined // No delivery_request yet
            });
            
            seenPurchaseOrderIds.add(po.id);
          }
        });
      }
      
      // STEP 5: FINAL DEDUPLICATION - Ensure absolutely no duplicates by purchase_order_id
      const absolutelyFinal: Notification[] = [];
      const finalSeenPOIds = new Set<string>();
      const finalSeenIds = new Set<string>();
      
      // Sort by timestamp first
      finalNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      finalNotifications.forEach((notif) => {
        if (notif.purchase_order_id) {
          if (!finalSeenPOIds.has(notif.purchase_order_id)) {
            finalSeenPOIds.add(notif.purchase_order_id);
            absolutelyFinal.push(notif);
          } else {
            console.log(`🚫 FINAL FILTER: Removed duplicate notification for PO ${notif.purchase_order_id} (ID: ${notif.id})`);
          }
        } else if (!finalSeenIds.has(notif.id)) {
          finalSeenIds.add(notif.id);
          absolutelyFinal.push(notif);
        } else {
          console.log(`🚫 FINAL FILTER: Removed duplicate notification (ID: ${notif.id})`);
        }
      });
      
      // Log all purchase_order_ids to help debug
      const poIds = absolutelyFinal.map(n => n.purchase_order_id).filter(Boolean);
      const duplicatePOIds = poIds.filter((id, index) => poIds.indexOf(id) !== index);
      if (duplicatePOIds.length > 0) {
        console.error(`🚨 CRITICAL: Found duplicate purchase_order_ids in final array:`, duplicatePOIds);
      }
      
      console.log(`✅ FINAL: ${finalNotifications.length} → ${absolutelyFinal.length} absolutely unique notifications (removed ${finalNotifications.length - absolutelyFinal.length} final duplicates)`);
      console.log(`📊 Final notification breakdown: ${poIds.length} with purchase_order_id, ${absolutelyFinal.length - poIds.length} without`);
      
      setNotifications(absolutelyFinal);
      setUnreadCount(absolutelyFinal.filter(n => !n.read).length);
      
    } catch (error: any) {
      console.error('❌ Error loading notifications:', error.message || error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Accept delivery handler
  const handleAcceptDelivery = async (requestId: string) => {
    if (acceptingRef.current === requestId || acceptingId === requestId) {
      console.log('🛑 Already accepting, ignoring');
      return;
    }
    
    acceptingRef.current = requestId;
    setAcceptingId(requestId);
    
    let providerId = userId;
    if (!providerId) {
      try {
        const stored = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (stored) {
          const parsed = JSON.parse(stored);
          providerId = parsed.user?.id || '';
        }
      } catch (e) {}
    }
    
    if (!providerId) {
      toast({
        title: 'Error',
        description: 'User not authenticated',
        variant: 'destructive'
      });
      acceptingRef.current = null;
      setAcceptingId(null);
      return;
    }
    
    const trackingNumber = 'TRK-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-' + 
      Math.random().toString(36).substring(2, 7).toUpperCase();
    
    try {
      const { url, headers } = getAuthHeaders();
      
      // First check current state
      const checkResponse = await fetch(
        `${url}/rest/v1/delivery_requests?id=eq.${requestId}&select=id,status,provider_id,purchase_order_id`,
        { headers, cache: 'no-store' }
      );
      
      if (checkResponse.ok) {
        const current = await checkResponse.json();
        if (current && current.length > 0) {
          const dr = current[0];
          if (dr.provider_id === providerId && dr.status === 'accepted') {
            console.log('✅ Already accepted by this provider');
            toast({
              title: '✅ Already Accepted',
              description: 'This delivery was already accepted.',
            });
            loadNotifications();
            return;
          }
          if (dr.provider_id && dr.provider_id !== providerId) {
            throw new Error('This delivery has already been accepted by another provider');
          }
        }
      }
      
      // Update delivery request - try with provider_id null first, then with provider_id matching
      let updateResponse = await fetch(
        `${url}/rest/v1/delivery_requests?id=eq.${requestId}&status=in.(pending,assigned)&provider_id=is.null`,
        {
          method: 'PATCH',
          headers: { ...headers, 'Prefer': 'return=representation' },
          body: JSON.stringify({
            provider_id: providerId,
            status: 'accepted',
            tracking_number: trackingNumber,
            accepted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        }
      );
      
      let result: any[] = [];
      if (updateResponse.ok) {
        result = await updateResponse.json().catch(() => []);
      }
      
      // If that didn't work (no rows updated), try with provider_id matching this provider
      if (!updateResponse.ok || result.length === 0) {
        const queryParams2 = new URLSearchParams({
          id: `eq.${requestId}`,
          status: `in.(pending,assigned)`,
          provider_id: `eq.${providerId}`
        });
        
        updateResponse = await fetch(
          `${url}/rest/v1/delivery_requests?${queryParams2.toString()}`,
          {
            method: 'PATCH',
            headers: { ...headers, 'Prefer': 'return=representation' },
            body: JSON.stringify({
              provider_id: providerId,
              status: 'accepted',
              tracking_number: trackingNumber,
              accepted_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          }
        );
        
        if (updateResponse.ok) {
          result = await updateResponse.json().catch(() => []);
        }
      }
      
      if (updateResponse.ok && result && result.length > 0) {
        toast({
          title: '✅ Delivery Accepted!',
          description: `Tracking: ${trackingNumber}`,
        });
        loadNotifications();
      } else {
        const errorText = await updateResponse.text().catch(() => 'Unknown error');
        let errorMessage = 'Failed to accept delivery';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('❌ Error accepting delivery:', error);
      toast({
        title: 'Error',
        description: error.message || 'Could not accept delivery',
        variant: 'destructive'
      });
    } finally {
      setTimeout(() => {
        acceptingRef.current = null;
        setAcceptingId(null);
      }, 2000);
    }
  };

  // Load on mount and set up real-time
  useEffect(() => {
    loadNotifications();
    
    const subscription = supabase
      .channel('delivery-notifications-realtime')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'delivery_requests' },
        () => loadNotifications()
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'delivery_requests' },
        () => loadNotifications()
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'purchase_orders' },
        () => loadNotifications()
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'purchase_orders' },
        () => loadNotifications()
      )
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [loadNotifications]);

  // Render function (simplified)
  const formatTime = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Badge className="bg-red-500 text-white">{unreadCount}</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={loadNotifications}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button variant="ghost" size="sm" onClick={() => {
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
          }}>
            <Check className="h-4 w-4" /> Mark all read
          </Button>
        </div>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-12 w-12 text-teal-500 mx-auto mb-3 animate-spin" />
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8">
            <BellOff className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No active delivery requests</p>
          </div>
        ) : (
          notifications.map((notification, index) => {
            // Use purchase_order_id as key if available, otherwise use id
            // This ensures only ONE notification per purchase_order_id is rendered
            const uniqueKey = notification.purchase_order_id 
              ? `po-${notification.purchase_order_id}` 
              : `notif-${notification.id}`;
            
            return (
              <div
                key={uniqueKey}
                className={`p-3 rounded-lg border ${
                  notification.read 
                    ? 'bg-white border-gray-200' 
                    : 'bg-teal-50 border-teal-200'
                }`}
              >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-medium text-sm">{notification.title}</p>
                  {notification.materialType && (
                    <p className="text-xs text-gray-600 mt-1">
                      {notification.materialType} {notification.quantity && `(${notification.quantity})`}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="text-xs">
                  {notification.priority}
                </Badge>
              </div>

              {notification.pickupAddress && (
                <div className="bg-green-50 rounded p-2 mb-2">
                  <p className="text-xs font-semibold text-green-700">📦 PICKUP</p>
                  <p className="text-xs text-green-800">{notification.pickupAddress}</p>
                </div>
              )}

              {notification.deliveryAddress && (
                <div className="bg-orange-50 rounded p-2 mb-2">
                  <p className="text-xs font-semibold text-orange-700">🚚 DELIVERY</p>
                  <p className="text-xs text-orange-800">{notification.deliveryAddress}</p>
                </div>
              )}

              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (notification.pickupAddress && notification.deliveryAddress) {
                      window.open(`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(notification.pickupAddress)}&destination=${encodeURIComponent(notification.deliveryAddress)}`, '_blank');
                    }
                  }}
                  className="flex-1"
                >
                  <Navigation className="h-4 w-4 mr-1" />
                  Start Navigation
                </Button>
                {notification.status === 'pending' && notification.delivery_request_id && (
                  <Button
                    size="sm"
                    onClick={() => handleAcceptDelivery(notification.delivery_request_id!)}
                    disabled={acceptingId === notification.delivery_request_id}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {acceptingId === notification.delivery_request_id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Accepting...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Accept
                      </>
                    )}
                  </Button>
                )}
              </div>

              <p className="text-xs text-gray-400 mt-2 text-right">
                {formatTime(notification.timestamp)}
              </p>
            </div>
            );
          })
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
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
  status?: string; // The actual delivery status (pending, assigned, in_transit, etc.)
  pickupAddress?: string;
  deliveryAddress?: string;
  materialType?: string;
  quantity?: string;
  estimatedCost?: number;
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
  const { toast } = useToast();

  // Request notification permission
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast({
        title: "Not supported",
        description: "Push notifications are not supported in this browser",
        variant: "destructive"
      });
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setSettings(prev => ({ ...prev, pushEnabled: true }));
      toast({
        title: "Notifications enabled",
        description: "You'll receive push notifications for deliveries",
      });
      
      // Register service worker for push notifications
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          console.log('Service Worker ready for push notifications');
        } catch (error) {
          console.error('Service Worker error:', error);
        }
      }
    } else {
      toast({
        title: "Permission denied",
        description: "Enable notifications in browser settings",
        variant: "destructive"
      });
    }
  };

  // Send local notification
  const sendLocalNotification = (notification: Notification) => {
    if (settings.pushEnabled && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: notification.id,
        requireInteraction: notification.priority === 'high'
      });
    }

    if (settings.soundEnabled) {
      playNotificationSound(notification.priority);
    }

    if (settings.vibrationEnabled && navigator.vibrate) {
      const pattern = notification.priority === 'high' ? [200, 100, 200] : [100];
      navigator.vibrate(pattern);
    }
  };

  // Play notification sound
  const playNotificationSound = (priority: string) => {
    const audio = new Audio(
      priority === 'high' 
        ? '/sounds/urgent-notification.mp3' 
        : '/sounds/notification.mp3'
    );
    audio.volume = 0.5;
    audio.play().catch(console.error);
  };

  const [loading, setLoading] = useState(true);

  // Helper to get auth token from localStorage
  const getAuthHeaders = () => {
    const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
    
    let accessToken = SUPABASE_ANON_KEY;
    try {
      const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        if (parsed.access_token) {
          accessToken = parsed.access_token;
        }
      }
    } catch (e) {
      console.warn('Could not get auth token from localStorage');
    }
    
    return {
      url: SUPABASE_URL,
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    };
  };

  // Fetch supplier address by ID
  const fetchSupplierAddress = async (supplierId: string): Promise<string> => {
    try {
      const { url, headers } = getAuthHeaders();
      const response = await fetch(
        `${url}/rest/v1/suppliers?id=eq.${supplierId}&select=company_name,address,location`,
        { headers, cache: 'no-store' }
      );
      if (response.ok) {
        const suppliers = await response.json();
        if (suppliers?.[0]) {
          const s = suppliers[0];
          // Return the actual address, or company name + location, or just company name
          return s.address || (s.location ? `${s.company_name}, ${s.location}` : s.company_name) || 'Supplier location';
        }
      }
    } catch (e) {
      console.warn('Could not fetch supplier address');
    }
    return 'Supplier location';
  };

  // Fetch real delivery requests from database
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔔 DeliveryNotifications: Starting to load notifications...');
      const allNotifications: Notification[] = [];
      const supplierAddressCache: Record<string, string> = {};

      const { url, headers } = getAuthHeaders();

      // Fetch ALL delivery requests using direct REST API (bypasses potential RLS issues)
      // Focus on pending requests that delivery providers should see
      try {
        const reqResponse = await fetch(
          `${url}/rest/v1/delivery_requests?order=created_at.desc&limit=50`,
          { headers, cache: 'no-store' }
        );
        
        if (reqResponse.ok) {
          const deliveryRequests = await reqResponse.json();
          console.log('📦 delivery_requests query result:', { data: deliveryRequests, count: deliveryRequests?.length });
          
          if (deliveryRequests && deliveryRequests.length > 0) {
            // Fetch supplier addresses for requests that have supplier_id
            const supplierIds = [...new Set(deliveryRequests.filter((r: any) => r.supplier_id).map((r: any) => r.supplier_id))];
            if (supplierIds.length > 0) {
              try {
                const suppliersResponse = await fetch(
                  `${url}/rest/v1/suppliers?id=in.(${supplierIds.join(',')})&select=id,company_name,address,location`,
                  { headers, cache: 'no-store' }
                );
                if (suppliersResponse.ok) {
                  const suppliers = await suppliersResponse.json();
                  suppliers.forEach((s: any) => {
                    supplierAddressCache[s.id] = s.address || (s.location ? `${s.company_name}, ${s.location}` : s.company_name) || 'Supplier location';
                  });
                }
              } catch (e) {
                console.warn('Could not batch fetch supplier addresses');
              }
            }

            deliveryRequests.forEach((req: any) => {
              // Determine the pickup address - use supplier address from cache, or existing pickup_address
              let pickupAddr = req.pickup_address || req.pickup_location || '';
              if (req.supplier_id && supplierAddressCache[req.supplier_id]) {
                pickupAddr = supplierAddressCache[req.supplier_id];
              }
              // If pickup address is generic "Supplier location", try to enrich it
              if (pickupAddr === 'Supplier location' && req.supplier_name) {
                pickupAddr = `${req.supplier_name} - Pickup`;
              }

              allNotifications.push({
                id: req.id,
                type: 'new_delivery',
                title: req.status === 'pending' ? '🚚 New Delivery Request!' : `Delivery ${req.status}`,
                message: `${req.material_type || 'Materials'} delivery to ${req.delivery_address || 'Unknown location'}`,
                timestamp: new Date(req.created_at),
                read: req.status !== 'pending',
                priority: req.priority_level === 'urgent' || req.status === 'pending' ? 'high' : 'medium',
                actionUrl: `/delivery-dashboard?request=${req.id}`,
                status: req.status,
                pickupAddress: pickupAddr,
                deliveryAddress: req.delivery_address || req.delivery_location || '',
                materialType: req.material_type || '',
                quantity: req.quantity || '',
                estimatedCost: req.estimated_cost || req.budget_range || 0
              });
            });
            console.log(`✅ Loaded ${deliveryRequests.length} delivery_requests`);
          } else {
            console.log('⚠️ No delivery_requests found in database');
          }
        } else {
          console.error('❌ delivery_requests fetch failed:', reqResponse.status, reqResponse.statusText);
        }
      } catch (e: any) {
        console.error('❌ Error fetching delivery_requests:', e.message);
      }

      // Fetch from deliveries table using REST API
      try {
        const delResponse = await fetch(
          `${url}/rest/v1/deliveries?order=created_at.desc&limit=50`,
          { headers, cache: 'no-store' }
        );
        
        if (delResponse.ok) {
          const deliveries = await delResponse.json();
          console.log('📦 deliveries query result:', { data: deliveries, count: deliveries?.length });

          if (deliveries && deliveries.length > 0) {
            deliveries.forEach((del: any) => {
              // Avoid duplicates
              if (!allNotifications.find(n => n.id === del.id)) {
                let pickupAddr = del.pickup_address || del.pickup_location || '';
                if (del.supplier_id && supplierAddressCache[del.supplier_id]) {
                  pickupAddr = supplierAddressCache[del.supplier_id];
                }

                allNotifications.push({
                  id: del.id,
                  type: del.status === 'pending' ? 'new_delivery' : 'status_update',
                  title: del.status === 'pending' ? '🚚 New Delivery Request!' : `Delivery ${del.status?.replace('_', ' ') || 'update'}`,
                  message: `${del.material_type || 'Materials'} to ${del.delivery_address || 'Unknown'}`,
                  timestamp: new Date(del.created_at),
                  read: del.status !== 'pending',
                  priority: del.urgency === 'urgent' || del.status === 'pending' ? 'high' : 'medium',
                  actionUrl: `/delivery-dashboard?delivery=${del.id}`,
                  status: del.status,
                  pickupAddress: pickupAddr,
                  deliveryAddress: del.delivery_address || del.delivery_location || '',
                  materialType: del.material_type || '',
                  quantity: del.quantity || '',
                  estimatedCost: del.estimated_cost || 0
                });
              }
            });
            console.log(`✅ Loaded ${deliveries.length} deliveries`);
          } else {
            console.log('⚠️ No deliveries found');
          }
        } else {
          console.error('❌ deliveries fetch failed:', delResponse.status, delResponse.statusText);
        }
      } catch (e: any) {
        console.error('❌ Error fetching deliveries:', e.message);
      }

      // Fetch from delivery_notifications table using REST API
      try {
        const notifResponse = await fetch(
          `${url}/rest/v1/delivery_notifications?order=created_at.desc&limit=50`,
          { headers, cache: 'no-store' }
        );
        
        if (notifResponse.ok) {
          const notifications = await notifResponse.json();
          console.log('📦 delivery_notifications query result:', { data: notifications, count: notifications?.length });

          if (notifications && notifications.length > 0) {
            notifications.forEach((notif: any) => {
              // Avoid duplicates
              if (!allNotifications.find(n => n.id === notif.id || n.id === notif.request_id)) {
                const materials = notif.material_details || [];
                let pickupAddr = notif.pickup_address || notif.pickup_location || '';
                if (notif.supplier_id && supplierAddressCache[notif.supplier_id]) {
                  pickupAddr = supplierAddressCache[notif.supplier_id];
                }

                allNotifications.push({
                  id: notif.id,
                  type: 'new_delivery',
                  title: notif.status === 'pending' ? '🚚 New Delivery Request!' : `Delivery ${notif.status?.replace('_', ' ') || 'update'}`,
                  message: `${materials[0]?.name || notif.material_type || 'Materials'} to ${notif.delivery_address || 'Unknown'}`,
                  timestamp: new Date(notif.created_at),
                  read: notif.status !== 'pending',
                  priority: notif.priority_level === 'urgent' || notif.status === 'pending' ? 'high' : 'medium',
                  actionUrl: `/delivery-dashboard?notification=${notif.id}`,
                  status: notif.status,
                  pickupAddress: pickupAddr,
                  deliveryAddress: notif.delivery_address || notif.delivery_location || '',
                  materialType: materials[0]?.name || notif.material_type || '',
                  quantity: notif.quantity || '',
                  estimatedCost: notif.estimated_cost || 0
                });
              }
            });
            console.log(`✅ Loaded ${notifications.length} delivery_notifications`);
          } else {
            console.log('⚠️ No delivery_notifications found');
          }
        } else {
          console.error('❌ delivery_notifications fetch failed:', notifResponse.status, notifResponse.statusText);
        }
      } catch (e: any) {
        console.error('❌ Error fetching delivery_notifications:', e.message);
      }

      // Sort by timestamp descending
      allNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      console.log(`🔔 FINAL: Total notifications loaded: ${allNotifications.length}`, allNotifications);
      setNotifications(allNotifications);
      setUnreadCount(allNotifications.filter(n => !n.read).length);
    } catch (error: any) {
      console.error('❌ Error loading notifications:', error.message || error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load notifications on mount and set up real-time subscription
  useEffect(() => {
    loadNotifications();

    // Set up real-time subscription for new delivery requests
    const requestsSubscription = supabase
      .channel('delivery-requests-notifications')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'delivery_requests' }, 
        (payload: any) => {
          console.log('🔔 New delivery request received:', payload.new);
          const newNotification: Notification = {
            id: payload.new.id,
            type: 'new_delivery',
            title: '🚚 New Delivery Request!',
            message: `${payload.new.material_type || 'Materials'} to ${payload.new.delivery_address || 'Unknown'}`,
            timestamp: new Date(payload.new.created_at || Date.now()),
            read: false,
            priority: payload.new.priority_level === 'urgent' ? 'high' : 'medium',
            actionUrl: `/delivery-dashboard?request=${payload.new.id}`,
            status: payload.new.status || 'pending',
            pickupAddress: payload.new.pickup_address || payload.new.pickup_location || '',
            deliveryAddress: payload.new.delivery_address || payload.new.delivery_location || '',
            materialType: payload.new.material_type || '',
            quantity: payload.new.quantity || '',
            estimatedCost: payload.new.estimated_cost || 0
          };
          
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Show toast
          toast({
            title: '🚚 New Delivery Request!',
            description: newNotification.message,
            duration: 10000,
          });

          // Play sound and browser notification
          if (settings.soundEnabled) {
            playNotificationSound('high');
          }
          if (settings.pushEnabled) {
            sendLocalNotification(newNotification);
          }
        }
      )
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'deliveries' }, 
        (payload: any) => {
          console.log('🔔 New delivery received:', payload.new);
          const newNotification: Notification = {
            id: payload.new.id,
            type: 'new_delivery',
            title: '🚚 New Delivery Request!',
            message: `${payload.new.material_type || 'Materials'} to ${payload.new.delivery_address || 'Unknown'}`,
            timestamp: new Date(payload.new.created_at || Date.now()),
            read: false,
            priority: payload.new.urgency === 'urgent' ? 'high' : 'medium',
            actionUrl: `/delivery-dashboard?delivery=${payload.new.id}`
          };
          
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          toast({
            title: '🚚 New Delivery Request!',
            description: newNotification.message,
            duration: 10000,
          });
        }
      )
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'delivery_notifications' }, 
        (payload: any) => {
          console.log('🔔 New delivery notification received:', payload.new);
          const materials = payload.new.material_details || [];
          const newNotification: Notification = {
            id: payload.new.id,
            type: 'new_delivery',
            title: '🚚 New Delivery Request!',
            message: `${materials[0]?.name || 'Materials'} to ${payload.new.delivery_address || 'Unknown'}`,
            timestamp: new Date(payload.new.created_at || Date.now()),
            read: false,
            priority: payload.new.priority_level === 'urgent' ? 'high' : 'medium',
            actionUrl: `/delivery-dashboard?notification=${payload.new.id}`
          };
          
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          toast({
            title: '🚚 New Delivery Request!',
            description: newNotification.message,
            duration: 10000,
          });
        }
      )
      .subscribe();

    return () => {
      requestsSubscription.unsubscribe();
    };
  }, [loadNotifications, settings.soundEnabled, settings.pushEnabled, toast]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_delivery': return <Package className="h-5 w-5 text-blue-500" />;
      case 'status_update': return <Truck className="h-5 w-5 text-teal-500" />;
      case 'payment': return <DollarSign className="h-5 w-5 text-green-500" />;
      case 'rating': return <Star className="h-5 w-5 text-yellow-500" />;
      case 'urgent': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default: return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const deleteNotification = (id: string) => {
    const notification = notifications.find(n => n.id === id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (notification && !notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  // Accept a delivery request - SINGLE CLICK
  const handleAcceptDelivery = async (requestId: string) => {
    // Prevent double-click - check if already accepting ANY request
    if (acceptingId) {
      console.log('🛑 Already processing an accept request, ignoring click');
      return;
    }
    
    // Validate userId before making request
    let providerId = userId;
    if (!providerId || providerId === '') {
      // Try to get from localStorage as fallback
      try {
        const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          providerId = parsed.user?.id || '';
        }
      } catch (e) {}
    }
    
    if (!providerId || providerId === '') {
      console.error('❌ handleAcceptDelivery: No valid userId available');
      toast({
        title: 'Error',
        description: 'User not authenticated. Please refresh the page.',
        variant: 'destructive'
      });
      return;
    }
    
    console.log('🚚 handleAcceptDelivery: START - Accepting with providerId:', providerId, 'requestId:', requestId);
    
    // Set accepting state IMMEDIATELY to disable button
    setAcceptingId(requestId);
    
    // Generate tracking number upfront
    const trackingNumber = 'TRK-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-' + 
      Math.random().toString(36).substring(2, 7).toUpperCase();
    
    try {
      const { url, headers } = getAuthHeaders();
      
      console.log('🚚 Making PATCH request to update delivery_requests...');
      
      // Update the delivery request to assign this provider
      const response = await fetch(
        `${url}/rest/v1/delivery_requests?id=eq.${requestId}`,
        {
          method: 'PATCH',
          headers: { ...headers, 'Prefer': 'return=representation' },
          body: JSON.stringify({
            provider_id: providerId,
            status: 'accepted',
            tracking_number: trackingNumber,
            updated_at: new Date().toISOString()
          })
        }
      );
      
      console.log('🚚 PATCH response status:', response.status);
      
      if (response.ok) {
        const result = await response.json().catch(() => []);
        console.log('✅ Delivery accepted successfully:', result);
        
        // NOW remove from notifications list (after confirmed success)
        setNotifications(prev => prev.filter(n => n.id !== requestId));
        setUnreadCount(prev => Math.max(0, prev - 1));
        
        toast({
          title: '✅ Delivery Accepted!',
          description: `Tracking: ${trackingNumber}. Check Active tab for details.`,
        });
        
        // Call parent callback if provided
        if (onAcceptDelivery) onAcceptDelivery(requestId);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Accept failed:', response.status, errorData);
        throw new Error(errorData.message || errorData.details || `Server error: ${response.status}`);
      }
    } catch (error: any) {
      console.error('❌ Error accepting delivery:', error);
      toast({
        title: 'Error',
        description: error.message || 'Could not accept delivery. Please try again.',
        variant: 'destructive'
      });
    } finally {
      console.log('🚚 handleAcceptDelivery: END - clearing acceptingId');
      setAcceptingId(null);
    }
  };

  // Reject/decline a delivery request (just removes from view)
  const handleRejectDelivery = async (requestId: string) => {
    setRejectingId(requestId);
    try {
      // Just remove from local notifications - don't update database
      // This allows other providers to still see and accept it
      setNotifications(prev => prev.filter(n => n.id !== requestId));
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      toast({
        title: 'Delivery Declined',
        description: 'Request removed from your list. Other providers can still accept it.',
      });
      
      if (onRejectDelivery) onRejectDelivery(requestId);
    } catch (error: any) {
      console.error('Error rejecting delivery:', error);
      toast({
        title: 'Error',
        description: 'Could not decline delivery.',
        variant: 'destructive'
      });
    } finally {
      setRejectingId(null);
    }
  };

  const formatTime = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  // Copy address to clipboard
  const copyAddress = async (address: string, label: string) => {
    try {
      await navigator.clipboard.writeText(address);
      toast({
        title: '📋 Copied!',
        description: `${label} address copied to clipboard`,
        duration: 2000
      });
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Could not copy address',
        variant: 'destructive'
      });
    }
  };

  // Open address in Google Maps
  const openInMaps = (address: string) => {
    // Check if address contains coordinates
    const coordMatch = address.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
    
    let mapsUrl: string;
    if (coordMatch) {
      // If coordinates found, use them directly
      const [, lat, lng] = coordMatch;
      mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    } else {
      // Otherwise, search for the address
      mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    }
    
    window.open(mapsUrl, '_blank');
  };

  // Open navigation with both pickup and delivery
  const openNavigation = (pickup: string, delivery: string) => {
    // Try to extract coordinates or use address
    const getCoordOrAddress = (addr: string) => {
      const coordMatch = addr.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
      if (coordMatch) {
        return `${coordMatch[1]},${coordMatch[2]}`;
      }
      return encodeURIComponent(addr);
    };

    const pickupParam = getCoordOrAddress(pickup);
    const deliveryParam = getCoordOrAddress(delivery);
    
    // Google Maps directions URL with waypoints
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=My+Location&waypoints=${pickupParam}&destination=${deliveryParam}&travelmode=driving`;
    window.open(mapsUrl, '_blank');
  };

  const updateSetting = (key: keyof NotificationSettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-teal-600" />
            Notifications
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white">{unreadCount}</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={loadNotifications}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              {showSettings ? 'Hide' : 'Settings'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Notification Settings */}
        {showSettings && (
          <div className="p-4 bg-gray-50 rounded-lg space-y-4 mb-4">
            <h4 className="font-semibold text-sm">Notification Settings</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="push" className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Push Notifications
                </Label>
                <Switch
                  id="push"
                  checked={settings.pushEnabled}
                  onCheckedChange={() => {
                    if (!settings.pushEnabled) {
                      requestNotificationPermission();
                    } else {
                      updateSetting('pushEnabled', false);
                    }
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="sound" className="flex items-center gap-2">
                  {settings.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  Sound
                </Label>
                <Switch
                  id="sound"
                  checked={settings.soundEnabled}
                  onCheckedChange={(v) => updateSetting('soundEnabled', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="vibration" className="flex items-center gap-2">
                  <Vibrate className="h-4 w-4" />
                  Vibration
                </Label>
                <Switch
                  id="vibration"
                  checked={settings.vibrationEnabled}
                  onCheckedChange={(v) => updateSetting('vibrationEnabled', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="urgent" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Urgent Only
                </Label>
                <Switch
                  id="urgent"
                  checked={settings.urgentOnly}
                  onCheckedChange={(v) => updateSetting('urgentOnly', v)}
                />
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <h5 className="text-sm font-medium mb-3">Notification Types</h5>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="newDelivery" className="text-sm">New Deliveries</Label>
                  <Switch
                    id="newDelivery"
                    checked={settings.newDeliveryAlerts}
                    onCheckedChange={(v) => updateSetting('newDeliveryAlerts', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="status" className="text-sm">Status Updates</Label>
                  <Switch
                    id="status"
                    checked={settings.statusUpdates}
                    onCheckedChange={(v) => updateSetting('statusUpdates', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="payment" className="text-sm">Payments</Label>
                  <Switch
                    id="payment"
                    checked={settings.paymentNotifications}
                    onCheckedChange={(v) => updateSetting('paymentNotifications', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="ratings" className="text-sm">Ratings</Label>
                  <Switch
                    id="ratings"
                    checked={settings.ratingNotifications}
                    onCheckedChange={(v) => updateSetting('ratingNotifications', v)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-12 w-12 text-teal-500 mx-auto mb-3 animate-spin" />
              <p className="text-gray-500">Loading delivery requests...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8">
              <BellOff className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No active delivery requests</p>
              <p className="text-xs text-gray-400 mt-2">New requests will appear here in real-time</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg border transition-colors ${
                  notification.read 
                    ? 'bg-white border-gray-200' 
                    : 'bg-teal-50 border-teal-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm truncate">{notification.title}</p>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getPriorityColor(notification.priority)}`}
                      >
                        {notification.priority}
                      </Badge>
                    </div>
                    
                    {/* Material and quantity info */}
                    {notification.materialType && (
                      <p className="text-sm text-gray-700 font-medium flex items-center gap-1 mb-1">
                        <Package className="h-3.5 w-3.5 text-blue-500" />
                        {notification.materialType}
                        {notification.quantity && <span className="text-gray-500">({notification.quantity})</span>}
                      </p>
                    )}
                    
                    {/* Pickup Address */}
                    {notification.pickupAddress && (
                      <div className="bg-green-50 rounded-md p-2 mb-2 border border-green-100">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-green-700 mb-0.5 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              📦 PICKUP
                            </p>
                            <p className="text-sm text-green-800 break-words">{notification.pickupAddress}</p>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyAddress(notification.pickupAddress!, 'Pickup');
                              }}
                              className="p-1.5 bg-green-100 hover:bg-green-200 rounded text-green-700 transition-colors"
                              title="Copy pickup address"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openInMaps(notification.pickupAddress!);
                              }}
                              className="p-1.5 bg-green-100 hover:bg-green-200 rounded text-green-700 transition-colors"
                              title="Open in Google Maps"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Delivery Address */}
                    {notification.deliveryAddress && (
                      <div className="bg-orange-50 rounded-md p-2 mb-2 border border-orange-100">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-orange-700 mb-0.5 flex items-center gap-1">
                              <Truck className="h-3 w-3" />
                              🏠 DELIVERY
                            </p>
                            <p className="text-sm text-orange-800 break-words">{notification.deliveryAddress}</p>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyAddress(notification.deliveryAddress!, 'Delivery');
                              }}
                              className="p-1.5 bg-orange-100 hover:bg-orange-200 rounded text-orange-700 transition-colors"
                              title="Copy delivery address"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openInMaps(notification.deliveryAddress!);
                              }}
                              className="p-1.5 bg-orange-100 hover:bg-orange-200 rounded text-orange-700 transition-colors"
                              title="Open in Google Maps"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Start Navigation Button - shows when both addresses available */}
                    {notification.pickupAddress && notification.deliveryAddress && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openNavigation(notification.pickupAddress!, notification.deliveryAddress!);
                        }}
                        className="w-full mb-2 py-2 px-3 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-colors"
                      >
                        <Navigation className="h-4 w-4" />
                        Start Navigation (Pickup → Delivery)
                      </button>
                    )}
                    
                    {/* Estimated cost */}
                    {notification.estimatedCost && notification.estimatedCost > 0 && (
                      <p className="text-sm text-gray-600 flex items-center gap-1 mb-1">
                        <DollarSign className="h-3.5 w-3.5 text-green-600" />
                        Est. KES {notification.estimatedCost.toLocaleString()}
                      </p>
                    )}
                    
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(notification.timestamp)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    className="flex-shrink-0 p-1 hover:bg-gray-200 rounded"
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
                
                {/* Single Accept Button - Show for pending delivery requests */}
                {notification.status === 'pending' && (
                  <Button
                    size="sm"
                    className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      console.log('🔘 Accept button clicked for:', notification.id, 'acceptingId:', acceptingId);
                      if (!acceptingId) {
                        handleAcceptDelivery(notification.id);
                      }
                    }}
                    disabled={!!acceptingId}
                  >
                    {acceptingId === notification.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Accepting...
                      </>
                    ) : acceptingId ? (
                      <>
                        <Clock className="h-4 w-4 mr-2" />
                        Please Wait...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Accept This Delivery
                      </>
                    )}
                  </Button>
                )}
                
                {/* Status indicator for non-pending deliveries */}
                {notification.status && notification.status !== 'pending' && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        notification.status === 'assigned' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        notification.status === 'in_transit' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        notification.status === 'delivered' ? 'bg-green-50 text-green-700 border-green-200' :
                        'bg-gray-50 text-gray-700 border-gray-200'
                      }`}
                    >
                      Status: {notification.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DeliveryNotifications;





import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Bell, BellOff, Volume2, VolumeX, Vibrate, 
  Package, Truck, AlertTriangle, CheckCircle, X,
  Clock, MapPin, DollarSign, Star, RefreshCw
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
}

export const DeliveryNotifications: React.FC<DeliveryNotificationsProps> = ({
  userId,
  onNotificationClick
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
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

  // Fetch real delivery requests from database
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔔 DeliveryNotifications: Starting to load notifications...');
      const allNotifications: Notification[] = [];

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
            deliveryRequests.forEach((req: any) => {
              allNotifications.push({
                id: req.id,
                type: 'new_delivery',
                title: req.status === 'pending' ? '🚚 New Delivery Request!' : `Delivery ${req.status}`,
                message: `${req.material_type || 'Materials'} delivery to ${req.delivery_address || 'Unknown location'}`,
                timestamp: new Date(req.created_at),
                read: req.status !== 'pending',
                priority: req.priority_level === 'urgent' || req.status === 'pending' ? 'high' : 'medium',
                actionUrl: `/delivery-dashboard?request=${req.id}`
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
                allNotifications.push({
                  id: del.id,
                  type: del.status === 'pending' ? 'new_delivery' : 'status_update',
                  title: del.status === 'pending' ? '🚚 New Delivery Request!' : `Delivery ${del.status?.replace('_', ' ') || 'update'}`,
                  message: `${del.material_type || 'Materials'} to ${del.delivery_address || 'Unknown'}`,
                  timestamp: new Date(del.created_at),
                  read: del.status !== 'pending',
                  priority: del.urgency === 'urgent' || del.status === 'pending' ? 'high' : 'medium',
                  actionUrl: `/delivery-dashboard?delivery=${del.id}`
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
                allNotifications.push({
                  id: notif.id,
                  type: 'new_delivery',
                  title: '🚚 New Delivery Request!',
                  message: `${materials[0]?.name || notif.material_type || 'Materials'} to ${notif.delivery_address || 'Unknown'}`,
                  timestamp: new Date(notif.created_at),
                  read: notif.status !== 'pending',
                  priority: notif.priority_level === 'urgent' || notif.status === 'pending' ? 'high' : 'medium',
                  actionUrl: `/delivery-dashboard?notification=${notif.id}`
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
            actionUrl: `/delivery-dashboard?request=${payload.new.id}`
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

  const formatTime = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
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
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                  notification.read 
                    ? 'bg-white border-gray-200' 
                    : 'bg-teal-50 border-teal-200'
                }`}
                onClick={() => {
                  markAsRead(notification.id);
                  onNotificationClick?.(notification);
                }}
              >
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
                  <p className="text-sm text-gray-600 line-clamp-2">{notification.message}</p>
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
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DeliveryNotifications;





/**
 * Push Notification Manager Component
 * Handles push notification subscription and permissions
 */

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface NotificationPreferences {
  orderUpdates: boolean;
  deliveryAlerts: boolean;
  quoteResponses: boolean;
  promotions: boolean;
  systemAlerts: boolean;
}

export const PushNotificationManager: React.FC = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    orderUpdates: true,
    deliveryAlerts: true,
    quoteResponses: true,
    promotions: false,
    systemAlerts: true
  });
  const { toast } = useToast();

  useEffect(() => {
    // Check current permission status
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Check if already subscribed
    checkSubscription();
    
    // Load preferences from localStorage
    const savedPrefs = localStorage.getItem('notification-preferences');
    if (savedPrefs) {
      setPreferences(JSON.parse(savedPrefs));
    }
  }, []);

  const checkSubscription = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (error) {
        console.error('Error checking subscription:', error);
      }
    }
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast({
        title: 'Not Supported',
        description: 'Your browser does not support notifications.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        await subscribeToNotifications();
        toast({
          title: '🔔 Notifications Enabled!',
          description: 'You will now receive important updates.'
        });
      } else if (result === 'denied') {
        toast({
          title: 'Notifications Blocked',
          description: 'Please enable notifications in your browser settings.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Permission error:', error);
      toast({
        title: 'Error',
        description: 'Failed to enable notifications.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // You would normally get this from your server
      // For now, we'll use a placeholder VAPID key
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      
      if (!vapidPublicKey) {
        console.log('VAPID key not configured - push notifications will be simulated');
        setIsSubscribed(true);
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // Save subscription to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('push_subscriptions')
          .upsert({
            user_id: user.id,
            subscription: JSON.stringify(subscription),
            created_at: new Date().toISOString()
          });
      }

      setIsSubscribed(true);
    } catch (error) {
      console.error('Subscription error:', error);
    }
  };

  const unsubscribeFromNotifications = async () => {
    setIsLoading(true);
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
          await subscription.unsubscribe();
          
          // Remove from database
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('user_id', user.id);
          }
        }
      }

      setIsSubscribed(false);
      toast({
        title: 'Notifications Disabled',
        description: 'You will no longer receive push notifications.'
      });
    } catch (error) {
      console.error('Unsubscribe error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    localStorage.setItem('notification-preferences', JSON.stringify(newPrefs));
  };

  const sendTestNotification = () => {
    if (permission === 'granted') {
      new Notification('MradiPro Test', {
        body: 'Notifications are working! 🎉',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'test-notification'
      });
    }
  };

  // Helper function to convert VAPID key
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Stay updated with real-time alerts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Permission Status */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
          <div className="flex items-center gap-3">
            {permission === 'granted' ? (
              <div className="p-2 rounded-full bg-green-100">
                <Bell className="h-5 w-5 text-green-600" />
              </div>
            ) : permission === 'denied' ? (
              <div className="p-2 rounded-full bg-red-100">
                <BellOff className="h-5 w-5 text-red-600" />
              </div>
            ) : (
              <div className="p-2 rounded-full bg-yellow-100">
                <Bell className="h-5 w-5 text-yellow-600" />
              </div>
            )}
            <div>
              <p className="font-medium">
                {permission === 'granted' 
                  ? 'Notifications Enabled' 
                  : permission === 'denied' 
                  ? 'Notifications Blocked' 
                  : 'Notifications Not Set'}
              </p>
              <p className="text-sm text-muted-foreground">
                {permission === 'granted' 
                  ? isSubscribed ? 'You are subscribed to push notifications' : 'Click to subscribe'
                  : permission === 'denied' 
                  ? 'Enable in browser settings' 
                  : 'Click to enable notifications'}
              </p>
            </div>
          </div>
          
          {permission === 'granted' ? (
            <Button
              variant={isSubscribed ? 'outline' : 'default'}
              onClick={isSubscribed ? unsubscribeFromNotifications : subscribeToNotifications}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isSubscribed ? (
                'Unsubscribe'
              ) : (
                'Subscribe'
              )}
            </Button>
          ) : permission !== 'denied' ? (
            <Button onClick={requestPermission} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Enable'
              )}
            </Button>
          ) : null}
        </div>

        {/* Notification Preferences */}
        {permission === 'granted' && (
          <div className="space-y-4">
            <h4 className="font-medium">Notification Preferences</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="orderUpdates">Order Updates</Label>
                  <p className="text-sm text-muted-foreground">Status changes for your orders</p>
                </div>
                <Switch
                  id="orderUpdates"
                  checked={preferences.orderUpdates}
                  onCheckedChange={(v) => updatePreference('orderUpdates', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="deliveryAlerts">Delivery Alerts</Label>
                  <p className="text-sm text-muted-foreground">Real-time delivery tracking</p>
                </div>
                <Switch
                  id="deliveryAlerts"
                  checked={preferences.deliveryAlerts}
                  onCheckedChange={(v) => updatePreference('deliveryAlerts', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="quoteResponses">Quote Responses</Label>
                  <p className="text-sm text-muted-foreground">When suppliers respond to quotes</p>
                </div>
                <Switch
                  id="quoteResponses"
                  checked={preferences.quoteResponses}
                  onCheckedChange={(v) => updatePreference('quoteResponses', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="promotions">Promotions</Label>
                  <p className="text-sm text-muted-foreground">Special offers and discounts</p>
                </div>
                <Switch
                  id="promotions"
                  checked={preferences.promotions}
                  onCheckedChange={(v) => updatePreference('promotions', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="systemAlerts">System Alerts</Label>
                  <p className="text-sm text-muted-foreground">Important system notifications</p>
                </div>
                <Switch
                  id="systemAlerts"
                  checked={preferences.systemAlerts}
                  onCheckedChange={(v) => updatePreference('systemAlerts', v)}
                />
              </div>
            </div>

            {/* Test Button */}
            <Button variant="outline" onClick={sendTestNotification} className="w-full">
              Send Test Notification
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PushNotificationManager;


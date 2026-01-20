import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Package, Truck, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  isPushSupported,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getNotificationPreferences,
  setNotificationPreferences,
  NotificationPreferences
} from '@/services/pushNotifications';

export const NotificationSettings: React.FC = () => {
  const { toast } = useToast();
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [preferences, setPreferences] = useState<NotificationPreferences>(getNotificationPreferences());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSupported(isPushSupported());
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const handleEnableNotifications = async () => {
    setLoading(true);
    try {
      const perm = await requestNotificationPermission();
      setPermission(perm);
      
      if (perm === 'granted') {
        await subscribeToPush();
        updatePreference('enabled', true);
        toast({
          title: 'Notifications Enabled',
          description: 'You will now receive push notifications.',
        });
      } else {
        toast({
          title: 'Permission Denied',
          description: 'Please enable notifications in your browser settings.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to enable notifications.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setLoading(true);
    try {
      await unsubscribeFromPush();
      updatePreference('enabled', false);
      toast({
        title: 'Notifications Disabled',
        description: 'You will no longer receive push notifications.',
      });
    } catch (error) {
      console.error('Failed to disable notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    setNotificationPreferences(updated);
  };

  if (!supported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5 text-gray-400" />
            Notifications Not Supported
          </CardTitle>
          <CardDescription>
            Your browser doesn't support push notifications. Try using a modern browser like Chrome, Firefox, or Edge.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Notification Settings
        </CardTitle>
        <CardDescription>
          Manage how you receive notifications about orders and deliveries.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Permission Status */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-3">
            {permission === 'granted' ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : permission === 'denied' ? (
              <BellOff className="h-5 w-5 text-red-500" />
            ) : (
              <Bell className="h-5 w-5 text-yellow-500" />
            )}
            <div>
              <p className="font-medium">Push Notifications</p>
              <p className="text-sm text-muted-foreground">
                {permission === 'granted' 
                  ? 'Notifications are enabled' 
                  : permission === 'denied'
                  ? 'Notifications are blocked'
                  : 'Notifications not yet enabled'}
              </p>
            </div>
          </div>
          <Badge 
            variant={permission === 'granted' ? 'default' : 'secondary'}
            className={permission === 'granted' ? 'bg-green-500' : ''}
          >
            {permission}
          </Badge>
        </div>

        {/* Enable/Disable Button */}
        {permission !== 'denied' && (
          <Button
            onClick={preferences.enabled ? handleDisableNotifications : handleEnableNotifications}
            disabled={loading}
            variant={preferences.enabled ? 'outline' : 'default'}
            className="w-full"
          >
            {loading ? (
              'Processing...'
            ) : preferences.enabled ? (
              <>
                <BellOff className="h-4 w-4 mr-2" />
                Disable Notifications
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Enable Notifications
              </>
            )}
          </Button>
        )}

        {permission === 'denied' && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="h-4 w-4 inline mr-2" />
              Notifications are blocked. Please enable them in your browser settings to receive updates.
            </p>
          </div>
        )}

        {/* Notification Categories */}
        {preferences.enabled && permission === 'granted' && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium">Notification Categories</h4>
            
            {/* Scan Events */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-blue-500" />
                <div>
                  <Label htmlFor="scan-events">Scan Events</Label>
                  <p className="text-sm text-muted-foreground">
                    Material dispatch, transit, and receiving updates
                  </p>
                </div>
              </div>
              <Switch
                id="scan-events"
                checked={preferences.scanEvents}
                onCheckedChange={(checked) => updatePreference('scanEvents', checked)}
              />
            </div>

            {/* Order Updates */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-green-500" />
                <div>
                  <Label htmlFor="order-updates">Order Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Order confirmations and delivery status
                  </p>
                </div>
              </div>
              <Switch
                id="order-updates"
                checked={preferences.orderUpdates}
                onCheckedChange={(checked) => updatePreference('orderUpdates', checked)}
              />
            </div>

            {/* System Alerts */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <div>
                  <Label htmlFor="system-alerts">System Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Important system notifications and alerts
                  </p>
                </div>
              </div>
              <Switch
                id="system-alerts"
                checked={preferences.systemAlerts}
                onCheckedChange={(checked) => updatePreference('systemAlerts', checked)}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;


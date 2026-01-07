import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MonitoringAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  status: string;
  created_at: string;
  target_user_id?: string;
  target_role?: string;
}

interface NotificationPreferences {
  push_enabled: boolean;
  email_enabled: boolean;
  alert_camera_offline: boolean;
  alert_delivery_arrived: boolean;
  alert_security_breach: boolean;
  // Add other preferences as needed
}

export const useMonitoringAlerts = () => {
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  // Fetch alerts for current user
  const fetchAlerts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('monitoring_alerts')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      setAlerts(data || []);
      setUnreadCount((data || []).filter(a => a.status === 'active').length);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch user notification preferences
  const fetchPreferences = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setPreferences(data);
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  }, []);

  // Update notification preferences
  const updatePreferences = async (newPrefs: Partial<NotificationPreferences>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...newPrefs,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      setPreferences(prev => prev ? { ...prev, ...newPrefs } : null);
      toast.success('Notification preferences updated');
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to update preferences');
    }
  };

  // Acknowledge an alert
  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('monitoring_alerts')
        .update({
          status: 'acknowledged',
          acknowledged_by: user?.id,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;
      
      setAlerts(prev => prev.map(a => 
        a.id === alertId ? { ...a, status: 'acknowledged' } : a
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast.error('Failed to acknowledge alert');
    }
  };

  // Dismiss an alert
  const dismissAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('monitoring_alerts')
        .update({ status: 'dismissed' })
        .eq('id', alertId);

      if (error) throw error;
      
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error dismissing alert:', error);
      toast.error('Failed to dismiss alert');
    }
  };

  // Show browser notification
  const showBrowserNotification = useCallback((alert: MonitoringAlert) => {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      new Notification(alert.title, {
        body: alert.message,
        icon: '/favicon.ico',
        tag: alert.id,
        requireInteraction: alert.severity === 'critical' || alert.severity === 'emergency'
      });
    }
  }, []);

  // Request notification permission
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('This browser does not support notifications');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      toast.success('Notifications enabled!');
      return true;
    } else {
      toast.error('Notification permission denied');
      return false;
    }
  };

  // Register push token (for mobile)
  const registerPushToken = async (token: string, platform: 'web' | 'ios' | 'android') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          push_token: token,
          push_platform: platform,
          push_enabled: true,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      toast.success('Push notifications registered');
    } catch (error) {
      console.error('Error registering push token:', error);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    fetchAlerts();
    fetchPreferences();

    // Subscribe to new alerts
    const channel = supabase
      .channel('user_alerts')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'monitoring_alerts'
      }, (payload) => {
        const newAlert = payload.new as MonitoringAlert;
        
        // Check if this alert is for the current user
        setAlerts(prev => [newAlert, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Show toast notification
        const toastType = newAlert.severity === 'critical' || newAlert.severity === 'emergency' 
          ? 'error' : 'info';
        
        toast[toastType](newAlert.title, {
          description: newAlert.message,
          duration: newAlert.severity === 'critical' ? 10000 : 5000
        });
        
        // Show browser notification if enabled
        if (preferences?.push_enabled) {
          showBrowserNotification(newAlert);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAlerts, fetchPreferences, preferences?.push_enabled, showBrowserNotification]);

  return {
    alerts,
    unreadCount,
    loading,
    preferences,
    fetchAlerts,
    acknowledgeAlert,
    dismissAlert,
    updatePreferences,
    requestNotificationPermission,
    registerPushToken
  };
};

export default useMonitoringAlerts;















import { supabase } from '@/integrations/supabase/client';

// VAPID keys would be generated and stored securely
// For production, use environment variables
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string; icon?: string }>;
}

// Check if push notifications are supported
export const isPushSupported = (): boolean => {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isPushSupported()) {
    console.warn('Push notifications not supported');
    return 'denied';
  }
  
  const permission = await Notification.requestPermission();
  console.log('🔔 Notification permission:', permission);
  return permission;
};

// Get or create push subscription
export const subscribeToPush = async (): Promise<PushSubscription | null> => {
  try {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return null;
    }
    
    const registration = await navigator.serviceWorker.ready;
    
    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Create new subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
      
      console.log('🔔 New push subscription created');
      
      // Save subscription to database
      await saveSubscription(subscription);
    }
    
    return subscription;
  } catch (error) {
    console.error('Failed to subscribe to push:', error);
    return null;
  }
};

// Save subscription to Supabase
const saveSubscription = async (subscription: PushSubscription): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  const subscriptionData = subscription.toJSON();
  
  // Store in user's profile or a separate push_subscriptions table
  // For now, we'll use localStorage as a fallback
  localStorage.setItem(`push_subscription_${user.id}`, JSON.stringify(subscriptionData));
  
  console.log('🔔 Subscription saved for user:', user.id);
};

// Unsubscribe from push
export const unsubscribeFromPush = async (): Promise<boolean> => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      console.log('🔔 Unsubscribed from push notifications');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to unsubscribe:', error);
    return false;
  }
};

// Show local notification (fallback when push isn't available)
export const showLocalNotification = async (payload: NotificationPayload): Promise<void> => {
  if (!isPushSupported()) return;
  
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;
  
  const registration = await navigator.serviceWorker.ready;
  
  await registration.showNotification(payload.title, {
    body: payload.body,
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/badge-72x72.png',
    tag: payload.tag,
    data: payload.data,
    actions: payload.actions,
    vibrate: [200, 100, 200],
    requireInteraction: true
  });
};

// Scan event notification types
type ScanEventType = 'dispatched' | 'in_transit' | 'received' | 'verified';

interface ScanEventNotification {
  eventType: ScanEventType;
  materialType: string;
  qrCode: string;
  scannedBy?: string;
  location?: string;
  timestamp: string;
}

// Get notification content based on scan event type
const getScanNotificationContent = (event: ScanEventNotification): NotificationPayload => {
  const baseData = {
    qrCode: event.qrCode,
    timestamp: event.timestamp
  };
  
  switch (event.eventType) {
    case 'dispatched':
      return {
        title: '📦 Material Dispatched!',
        body: `${event.materialType} has been dispatched from the supplier.`,
        tag: `dispatch-${event.qrCode}`,
        data: { ...baseData, action: 'view_order' },
        actions: [
          { action: 'view', title: 'View Order' },
          { action: 'track', title: 'Track Delivery' }
        ]
      };
      
    case 'in_transit':
      return {
        title: '🚚 Material In Transit',
        body: `${event.materialType} is on its way to your location.`,
        tag: `transit-${event.qrCode}`,
        data: { ...baseData, action: 'track' },
        actions: [
          { action: 'track', title: 'Track Location' }
        ]
      };
      
    case 'received':
      return {
        title: '✅ Material Received!',
        body: `${event.materialType} has been received at the destination.`,
        tag: `received-${event.qrCode}`,
        data: { ...baseData, action: 'verify' },
        actions: [
          { action: 'verify', title: 'Verify Quality' },
          { action: 'report', title: 'Report Issue' }
        ]
      };
      
    case 'verified':
      return {
        title: '🎉 Material Verified!',
        body: `${event.materialType} has been verified and approved.`,
        tag: `verified-${event.qrCode}`,
        data: { ...baseData, action: 'complete' }
      };
      
    default:
      return {
        title: '📋 Scan Update',
        body: `Status update for ${event.materialType}`,
        tag: `scan-${event.qrCode}`,
        data: baseData
      };
  }
};

// Notify about scan event
export const notifyScanEvent = async (event: ScanEventNotification): Promise<void> => {
  const content = getScanNotificationContent(event);
  await showLocalNotification(content);
};

// Subscribe to real-time scan events for a user
export const subscribeToScanEvents = (
  userId: string,
  onScanEvent: (event: ScanEventNotification) => void
): (() => void) => {
  const channel = supabase
    .channel(`scan_events_${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'qr_scan_events'
      },
      async (payload) => {
        console.log('🔔 New scan event:', payload);
        
        // Get material details
        const { data: material } = await supabase
          .from('material_items')
          .select('material_type, qr_code')
          .eq('id', payload.new.material_item_id)
          .single();
        
        if (material) {
          const event: ScanEventNotification = {
            eventType: payload.new.event_type as ScanEventType,
            materialType: material.material_type,
            qrCode: material.qr_code,
            scannedBy: payload.new.scanned_by,
            location: payload.new.location,
            timestamp: payload.new.created_at
          };
          
          // Trigger callback
          onScanEvent(event);
          
          // Show notification
          await notifyScanEvent(event);
        }
      }
    )
    .subscribe();
  
  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
};

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}

// Notification preferences hook
export interface NotificationPreferences {
  enabled: boolean;
  scanEvents: boolean;
  orderUpdates: boolean;
  systemAlerts: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  scanEvents: true,
  orderUpdates: true,
  systemAlerts: true
};

export const getNotificationPreferences = (): NotificationPreferences => {
  const stored = localStorage.getItem('notification_preferences');
  return stored ? JSON.parse(stored) : DEFAULT_PREFERENCES;
};

export const setNotificationPreferences = (prefs: Partial<NotificationPreferences>): void => {
  const current = getNotificationPreferences();
  const updated = { ...current, ...prefs };
  localStorage.setItem('notification_preferences', JSON.stringify(updated));
};

export default {
  isPushSupported,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  showLocalNotification,
  notifyScanEvent,
  subscribeToScanEvents,
  getNotificationPreferences,
  setNotificationPreferences
};


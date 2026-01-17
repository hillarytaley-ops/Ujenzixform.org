/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   🔔 NOTIFICATION SERVICE - Email, SMS & Push Notifications                         ║
 * ║                                                                                      ║
 * ║   Created: December 27, 2025                                                         ║
 * ║   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
 * ║                                                                                      ║
 * ║   FEATURES:                                                                          ║
 * ║   ┌─────────────────────────────────────────────────────────────────────────────┐   ║
 * ║   │  ✅ Email notifications via Supabase Edge Functions                         │   ║
 * ║   │  ✅ SMS notifications via Africa's Talking integration                      │   ║
 * ║   │  ✅ Push notifications via Web Push API                                     │   ║
 * ║   │  ✅ In-app notifications via Supabase Realtime                              │   ║
 * ║   │  ✅ Notification preferences management                                      │   ║
 * ║   │  ✅ Notification templates for common events                                 │   ║
 * ║   └─────────────────────────────────────────────────────────────────────────────┘   ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import { supabase } from '@/integrations/supabase/client';

// Notification types
export type NotificationType = 
  | 'order_created'
  | 'order_confirmed'
  | 'order_shipped'
  | 'order_delivered'
  | 'quote_received'
  | 'quote_accepted'
  | 'payment_received'
  | 'delivery_assigned'
  | 'delivery_update'
  | 'new_message'
  | 'price_alert'
  | 'stock_alert';

export interface Notification {
  id?: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  created_at?: string;
  channels?: ('email' | 'sms' | 'push' | 'in_app')[];
}

export interface NotificationPreferences {
  user_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  order_updates: boolean;
  quote_updates: boolean;
  delivery_updates: boolean;
  marketing: boolean;
  quiet_hours_start?: string; // e.g., "22:00"
  quiet_hours_end?: string;   // e.g., "07:00"
}

// Notification templates
const NOTIFICATION_TEMPLATES: Record<NotificationType, { title: string; message: string }> = {
  order_created: {
    title: '📦 Order Created',
    message: 'Your order #{orderNumber} has been created successfully.'
  },
  order_confirmed: {
    title: '✅ Order Confirmed',
    message: 'Your order #{orderNumber} has been confirmed by the supplier.'
  },
  order_shipped: {
    title: '🚚 Order Shipped',
    message: 'Your order #{orderNumber} is on its way! Track delivery in the app.'
  },
  order_delivered: {
    title: '🎉 Order Delivered',
    message: 'Your order #{orderNumber} has been delivered. Thank you for shopping with UjenziXform!'
  },
  quote_received: {
    title: '💰 Quote Received',
    message: 'You have received a quote for your request #{orderNumber}. Total: KES {amount}'
  },
  quote_accepted: {
    title: '✅ Quote Accepted',
    message: 'Your quote for order #{orderNumber} has been accepted by the builder.'
  },
  payment_received: {
    title: '💳 Payment Received',
    message: 'Payment of KES {amount} received for order #{orderNumber}.'
  },
  delivery_assigned: {
    title: '🚛 Delivery Assigned',
    message: 'A delivery provider has been assigned to your order #{orderNumber}.'
  },
  delivery_update: {
    title: '📍 Delivery Update',
    message: '{message}'
  },
  new_message: {
    title: '💬 New Message',
    message: 'You have a new message from {senderName}.'
  },
  price_alert: {
    title: '🏷️ Price Alert',
    message: 'Price dropped! {productName} is now KES {newPrice} (was KES {oldPrice}).'
  },
  stock_alert: {
    title: '📢 Stock Alert',
    message: '{productName} is now back in stock!'
  }
};

export class NotificationService {
  private static vapidPublicKey = 'YOUR_VAPID_PUBLIC_KEY'; // Configure in production

  /**
   * Send notification through all enabled channels
   */
  static async send(
    userId: string,
    type: NotificationType,
    data: Record<string, any> = {},
    channels?: ('email' | 'sms' | 'push' | 'in_app')[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get user preferences
      const preferences = await this.getPreferences(userId);
      
      // Get template
      const template = NOTIFICATION_TEMPLATES[type];
      const title = this.interpolate(template.title, data);
      const message = this.interpolate(template.message, data);

      // Determine which channels to use
      const enabledChannels = channels || this.getEnabledChannels(preferences, type);

      // Check quiet hours
      if (this.isQuietHours(preferences)) {
        // Only send in-app during quiet hours
        enabledChannels.splice(0, enabledChannels.length, 'in_app');
      }

      // Send through each channel
      const results = await Promise.allSettled([
        enabledChannels.includes('email') ? this.sendEmail(userId, title, message, data) : Promise.resolve(),
        enabledChannels.includes('sms') ? this.sendSMS(userId, message) : Promise.resolve(),
        enabledChannels.includes('push') ? this.sendPush(userId, title, message, data) : Promise.resolve(),
        enabledChannels.includes('in_app') ? this.createInAppNotification(userId, type, title, message, data) : Promise.resolve()
      ]);

      // Log notification
      await this.logNotification(userId, type, title, message, enabledChannels);

      return { success: true };
    } catch (error: any) {
      console.error('Error sending notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send email notification
   */
  private static async sendEmail(
    userId: string,
    subject: string,
    body: string,
    data: Record<string, any>
  ): Promise<void> {
    try {
      // Get user email
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();

      if (!profile?.email) return;

      // Send via Supabase Edge Function
      await supabase.functions.invoke('send-email', {
        body: {
          to: profile.email,
          subject: `UjenziXform: ${subject}`,
          html: this.generateEmailHTML(subject, body, data),
          text: body
        }
      });

      console.log('📧 Email sent to:', profile.email);
    } catch (error) {
      console.error('Email send error:', error);
    }
  }

  /**
   * Send SMS notification
   */
  private static async sendSMS(userId: string, message: string): Promise<void> {
    try {
      // Get user phone
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', userId)
        .single();

      if (!profile?.phone) return;

      // Format phone for Kenya (+254)
      let phone = profile.phone.replace(/\s/g, '');
      if (phone.startsWith('0')) {
        phone = '+254' + phone.substring(1);
      } else if (!phone.startsWith('+')) {
        phone = '+254' + phone;
      }

      // Send via Supabase Edge Function (Africa's Talking integration)
      await supabase.functions.invoke('send-sms', {
        body: {
          to: phone,
          message: `UjenziXform: ${message}`
        }
      });

      console.log('📱 SMS sent to:', phone);
    } catch (error) {
      console.error('SMS send error:', error);
    }
  }

  /**
   * Send push notification
   */
  private static async sendPush(
    userId: string,
    title: string,
    body: string,
    data: Record<string, any>
  ): Promise<void> {
    try {
      // Get user's push subscription
      const { data: subscription } = await supabase
        .from('push_subscriptions')
        .select('subscription')
        .eq('user_id', userId)
        .single();

      if (!subscription?.subscription) return;

      // Send via Supabase Edge Function
      await supabase.functions.invoke('send-push', {
        body: {
          subscription: subscription.subscription,
          payload: {
            title,
            body,
            icon: '/UjenziXform-logo.png',
            badge: '/UjenziXform-favicon.svg',
            data: {
              url: data.url || '/',
              ...data
            }
          }
        }
      });

      console.log('🔔 Push notification sent');
    } catch (error) {
      console.error('Push send error:', error);
    }
  }

  /**
   * Create in-app notification
   */
  private static async createInAppNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data: Record<string, any>
  ): Promise<void> {
    try {
      await supabase.from('notifications').insert({
        user_id: userId,
        type,
        title,
        message,
        data,
        read: false,
        created_at: new Date().toISOString()
      } as any);

      console.log('📬 In-app notification created');
    } catch (error) {
      console.error('In-app notification error:', error);
    }
  }

  /**
   * Get user's notifications
   */
  static async getNotifications(
    userId: string,
    options?: { unreadOnly?: boolean; limit?: number }
  ): Promise<Notification[]> {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (options?.unreadOnly) {
        query = query.eq('read', false);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data } = await query;
      return (data || []) as any;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<void> {
    try {
      await supabase
        .from('notifications')
        .update({ read: true } as any)
        .eq('id', notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(userId: string): Promise<void> {
    try {
      await supabase
        .from('notifications')
        .update({ read: true } as any)
        .eq('user_id', userId)
        .eq('read', false);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  /**
   * Get notification preferences
   */
  static async getPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const { data } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (data) return data as any;

      // Return defaults
      return {
        user_id: userId,
        email_enabled: true,
        sms_enabled: true,
        push_enabled: true,
        in_app_enabled: true,
        order_updates: true,
        quote_updates: true,
        delivery_updates: true,
        marketing: false
      };
    } catch (error) {
      // Return defaults on error
      return {
        user_id: userId,
        email_enabled: true,
        sms_enabled: true,
        push_enabled: true,
        in_app_enabled: true,
        order_updates: true,
        quote_updates: true,
        delivery_updates: true,
        marketing: false
      };
    }
  }

  /**
   * Update notification preferences
   */
  static async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        } as any);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Subscribe to push notifications
   */
  static async subscribeToPush(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return { success: false, error: 'Push notifications not supported' };
      }

      const registration = await navigator.serviceWorker.ready;
      
      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return { success: false, error: 'Notification permission denied' };
      }

      // Subscribe
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      // Save subscription to database
      await supabase.from('push_subscriptions').upsert({
        user_id: userId,
        subscription: JSON.stringify(subscription),
        created_at: new Date().toISOString()
      } as any);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  static async unsubscribeFromPush(userId: string): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }

      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId);
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
    }
  }

  // Helper methods
  private static interpolate(template: string, data: Record<string, any>): string {
    return template.replace(/\{(\w+)\}/g, (_, key) => data[key] || `{${key}}`);
  }

  private static getEnabledChannels(
    prefs: NotificationPreferences,
    type: NotificationType
  ): ('email' | 'sms' | 'push' | 'in_app')[] {
    const channels: ('email' | 'sms' | 'push' | 'in_app')[] = [];

    // Check if notification type is enabled
    const isOrderType = type.startsWith('order_');
    const isQuoteType = type.startsWith('quote_');
    const isDeliveryType = type.startsWith('delivery_');

    if (isOrderType && !prefs.order_updates) return ['in_app'];
    if (isQuoteType && !prefs.quote_updates) return ['in_app'];
    if (isDeliveryType && !prefs.delivery_updates) return ['in_app'];

    if (prefs.email_enabled) channels.push('email');
    if (prefs.sms_enabled) channels.push('sms');
    if (prefs.push_enabled) channels.push('push');
    if (prefs.in_app_enabled) channels.push('in_app');

    return channels.length > 0 ? channels : ['in_app'];
  }

  private static isQuietHours(prefs: NotificationPreferences): boolean {
    if (!prefs.quiet_hours_start || !prefs.quiet_hours_end) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = prefs.quiet_hours_start.split(':').map(Number);
    const [endHour, endMin] = prefs.quiet_hours_end.split(':').map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime < endTime) {
      return currentTime >= startTime && currentTime < endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime < endTime;
    }
  }

  private static async logNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    channels: string[]
  ): Promise<void> {
    try {
      await supabase.from('notification_logs').insert({
        user_id: userId,
        type,
        title,
        message,
        channels,
        created_at: new Date().toISOString()
      } as any);
    } catch (error) {
      // Silent fail for logging
    }
  }

  private static generateEmailHTML(
    title: string,
    body: string,
    data: Record<string, any>
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 32px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); border-radius: 12px 12px 0 0;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td>
                          <img src="https://UjenziXform.com/UjenziXform-logo.png" alt="UjenziXform" style="height: 40px; width: auto;">
                        </td>
                        <td align="right">
                          <span style="color: #ffffff; font-size: 14px;">Kenya's Construction Platform</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 32px;">
                    <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #18181b;">
                      ${title}
                    </h1>
                    <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #52525b;">
                      ${body}
                    </p>
                    ${data.url ? `
                    <a href="${data.url}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 500;">
                      View Details
                    </a>
                    ` : ''}
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 32px; background-color: #f4f4f5; border-radius: 0 0 12px 12px;">
                    <p style="margin: 0; font-size: 12px; color: #71717a; text-align: center;">
                      © ${new Date().getFullYear()} UjenziXform. Connecting Kenya's Construction Industry.
                      <br>
                      <a href="https://UjenziXform.com/unsubscribe" style="color: #2563eb;">Unsubscribe</a> | 
                      <a href="https://UjenziXform.com/preferences" style="color: #2563eb;">Notification Preferences</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  private static urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

export default NotificationService;









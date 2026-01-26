/**
 * Notification Service
 * Handles SMS and WhatsApp notifications via Africa's Talking API
 * 
 * SETUP REQUIRED:
 * 1. Create account at https://africastalking.com
 * 2. Get API Key and Username
 * 3. Add to environment variables:
 *    - VITE_AFRICASTALKING_USERNAME
 *    - VITE_AFRICASTALKING_API_KEY
 *    - VITE_AFRICASTALKING_SENDER_ID (optional)
 * 
 * For WhatsApp:
 * 1. Apply for WhatsApp Business API access
 * 2. Or use Twilio WhatsApp API as alternative
 */

import { supabase } from '@/integrations/supabase/client';

// Types
export interface SMSMessage {
  to: string | string[];
  message: string;
  from?: string;
}

export interface WhatsAppMessage {
  to: string;
  message: string;
  templateId?: string;
  templateParams?: Record<string, string>;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  smsTemplate: string;
  whatsappTemplate: string;
  variables: string[];
}

// Notification Templates
export const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  ORDER_CONFIRMED: {
    id: 'order_confirmed',
    name: 'Order Confirmed',
    smsTemplate: 'MradiPro: Your order #{orderNumber} has been confirmed! Total: KES {amount}. Track at: {trackingUrl}',
    whatsappTemplate: '🎉 *Order Confirmed!*\n\nOrder: #{orderNumber}\nTotal: KES {amount}\n\nTrack your order: {trackingUrl}',
    variables: ['orderNumber', 'amount', 'trackingUrl']
  },
  QUOTE_RECEIVED: {
    id: 'quote_received',
    name: 'Quote Received',
    smsTemplate: 'MradiPro: New quote received from {supplierName}! Amount: KES {amount}. Review at: {reviewUrl}',
    whatsappTemplate: '📋 *New Quote Received!*\n\nFrom: {supplierName}\nAmount: KES {amount}\n\nReview: {reviewUrl}',
    variables: ['supplierName', 'amount', 'reviewUrl']
  },
  DELIVERY_UPDATE: {
    id: 'delivery_update',
    name: 'Delivery Update',
    smsTemplate: 'MradiPro: Delivery update for #{trackingNumber} - Status: {status}. {message}',
    whatsappTemplate: '🚚 *Delivery Update*\n\nTracking: #{trackingNumber}\nStatus: {status}\n\n{message}',
    variables: ['trackingNumber', 'status', 'message']
  },
  DELIVERY_ASSIGNED: {
    id: 'delivery_assigned',
    name: 'Delivery Assigned',
    smsTemplate: 'MradiPro: Driver {driverName} ({driverPhone}) is on the way! ETA: {eta}',
    whatsappTemplate: '🚛 *Driver Assigned!*\n\nDriver: {driverName}\nPhone: {driverPhone}\nETA: {eta}\n\nTrack live: {trackingUrl}',
    variables: ['driverName', 'driverPhone', 'eta', 'trackingUrl']
  },
  QUOTE_REQUEST: {
    id: 'quote_request',
    name: 'Quote Request (for Suppliers)',
    smsTemplate: 'MradiPro: New quote request from {builderName}! {itemCount} items. Respond at: {responseUrl}',
    whatsappTemplate: '📩 *New Quote Request!*\n\nFrom: {builderName}\nItems: {itemCount}\n\nRespond now: {responseUrl}',
    variables: ['builderName', 'itemCount', 'responseUrl']
  },
  PAYMENT_RECEIVED: {
    id: 'payment_received',
    name: 'Payment Received',
    smsTemplate: 'MradiPro: Payment of KES {amount} received for order #{orderNumber}. Thank you!',
    whatsappTemplate: '✅ *Payment Received!*\n\nAmount: KES {amount}\nOrder: #{orderNumber}\n\nThank you for your business!',
    variables: ['amount', 'orderNumber']
  },
  WELCOME: {
    id: 'welcome',
    name: 'Welcome Message',
    smsTemplate: 'Welcome to MradiPro, {name}! Your account is ready. Start exploring: {appUrl}',
    whatsappTemplate: '👋 *Welcome to MradiPro!*\n\nHi {name},\n\nYour account is ready. Explore construction materials from verified suppliers.\n\nGet started: {appUrl}',
    variables: ['name', 'appUrl']
  },
  OTP: {
    id: 'otp',
    name: 'OTP Verification',
    smsTemplate: 'MradiPro: Your verification code is {otp}. Valid for 10 minutes. Do not share.',
    whatsappTemplate: '🔐 *Verification Code*\n\nYour code: *{otp}*\n\nValid for 10 minutes.\n⚠️ Never share this code.',
    variables: ['otp']
  }
};

class NotificationService {
  private apiUsername: string;
  private apiKey: string;
  private senderId: string;
  private baseUrl: string;

  constructor() {
    this.apiUsername = import.meta.env.VITE_AFRICASTALKING_USERNAME || '';
    this.apiKey = import.meta.env.VITE_AFRICASTALKING_API_KEY || '';
    this.senderId = import.meta.env.VITE_AFRICASTALKING_SENDER_ID || 'MradiPro';
    this.baseUrl = 'https://api.africastalking.com/version1';
  }

  /**
   * Format phone number to E.164 format for Kenya
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Handle different formats
    if (cleaned.startsWith('0')) {
      // Convert 07XXXXXXXX to +254XXXXXXXX
      cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('7')) {
      // Convert 7XXXXXXXX to +254XXXXXXXX
      cleaned = '254' + cleaned;
    } else if (!cleaned.startsWith('254')) {
      // Assume it's already in correct format or add Kenya code
      cleaned = '254' + cleaned;
    }
    
    return '+' + cleaned;
  }

  /**
   * Replace template variables with actual values
   */
  private processTemplate(template: string, variables: Record<string, string>): string {
    let processed = template;
    for (const [key, value] of Object.entries(variables)) {
      processed = processed.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    return processed;
  }

  /**
   * Send SMS via Africa's Talking API
   */
  async sendSMS(message: SMSMessage): Promise<NotificationResult> {
    if (!this.apiKey || !this.apiUsername) {
      console.log('📱 SMS (simulated):', message);
      return {
        success: true,
        messageId: 'simulated-' + Date.now(),
        error: 'API not configured - message simulated'
      };
    }

    try {
      const recipients = Array.isArray(message.to) 
        ? message.to.map(p => this.formatPhoneNumber(p)).join(',')
        : this.formatPhoneNumber(message.to);

      const response = await fetch(`${this.baseUrl}/messaging`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'apiKey': this.apiKey
        },
        body: new URLSearchParams({
          username: this.apiUsername,
          to: recipients,
          message: message.message,
          from: message.from || this.senderId
        })
      });

      const data = await response.json();

      if (data.SMSMessageData?.Recipients?.[0]?.status === 'Success') {
        // Log to database
        await this.logNotification('sms', recipients, message.message, true);
        
        return {
          success: true,
          messageId: data.SMSMessageData.Recipients[0].messageId
        };
      } else {
        throw new Error(data.SMSMessageData?.Recipients?.[0]?.status || 'Unknown error');
      }
    } catch (error: any) {
      console.error('SMS Error:', error);
      await this.logNotification('sms', message.to.toString(), message.message, false, error.message);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send WhatsApp message
   * Note: Requires WhatsApp Business API approval
   */
  async sendWhatsApp(message: WhatsAppMessage): Promise<NotificationResult> {
    // WhatsApp Business API typically requires a backend service
    // For now, we'll use a fallback to SMS or simulate
    console.log('📱 WhatsApp (simulated):', message);
    
    // Log the attempt
    await this.logNotification('whatsapp', message.to, message.message, true, 'Simulated');
    
    return {
      success: true,
      messageId: 'whatsapp-simulated-' + Date.now(),
      error: 'WhatsApp API not configured - message simulated'
    };
  }

  /**
   * Send notification using a template
   */
  async sendTemplateNotification(
    templateId: string,
    recipient: string,
    variables: Record<string, string>,
    channel: 'sms' | 'whatsapp' | 'both' = 'sms'
  ): Promise<NotificationResult> {
    const template = NOTIFICATION_TEMPLATES[templateId];
    
    if (!template) {
      return {
        success: false,
        error: `Template ${templateId} not found`
      };
    }

    const results: NotificationResult[] = [];

    if (channel === 'sms' || channel === 'both') {
      const smsMessage = this.processTemplate(template.smsTemplate, variables);
      results.push(await this.sendSMS({ to: recipient, message: smsMessage }));
    }

    if (channel === 'whatsapp' || channel === 'both') {
      const whatsappMessage = this.processTemplate(template.whatsappTemplate, variables);
      results.push(await this.sendWhatsApp({ to: recipient, message: whatsappMessage }));
    }

    return {
      success: results.every(r => r.success),
      messageId: results.map(r => r.messageId).join(','),
      error: results.find(r => r.error)?.error
    };
  }

  /**
   * Send order confirmation notification
   */
  async sendOrderConfirmation(
    phone: string,
    orderNumber: string,
    amount: number,
    trackingUrl: string
  ): Promise<NotificationResult> {
    return this.sendTemplateNotification('ORDER_CONFIRMED', phone, {
      orderNumber,
      amount: amount.toLocaleString(),
      trackingUrl
    });
  }

  /**
   * Send quote received notification
   */
  async sendQuoteNotification(
    phone: string,
    supplierName: string,
    amount: number,
    reviewUrl: string
  ): Promise<NotificationResult> {
    return this.sendTemplateNotification('QUOTE_RECEIVED', phone, {
      supplierName,
      amount: amount.toLocaleString(),
      reviewUrl
    });
  }

  /**
   * Send delivery update notification
   */
  async sendDeliveryUpdate(
    phone: string,
    trackingNumber: string,
    status: string,
    message: string
  ): Promise<NotificationResult> {
    return this.sendTemplateNotification('DELIVERY_UPDATE', phone, {
      trackingNumber,
      status,
      message
    });
  }

  /**
   * Send delivery assigned notification
   */
  async sendDeliveryAssigned(
    phone: string,
    driverName: string,
    driverPhone: string,
    eta: string,
    trackingUrl: string
  ): Promise<NotificationResult> {
    return this.sendTemplateNotification('DELIVERY_ASSIGNED', phone, {
      driverName,
      driverPhone,
      eta,
      trackingUrl
    });
  }

  /**
   * Send quote request notification to supplier
   */
  async sendQuoteRequest(
    phone: string,
    builderName: string,
    itemCount: number,
    responseUrl: string
  ): Promise<NotificationResult> {
    return this.sendTemplateNotification('QUOTE_REQUEST', phone, {
      builderName,
      itemCount: itemCount.toString(),
      responseUrl
    });
  }

  /**
   * Send welcome message to new user
   */
  async sendWelcome(
    phone: string,
    name: string,
    appUrl: string = 'https://mradipro.com'
  ): Promise<NotificationResult> {
    return this.sendTemplateNotification('WELCOME', phone, {
      name,
      appUrl
    });
  }

  /**
   * Send OTP verification code
   */
  async sendOTP(phone: string, otp: string): Promise<NotificationResult> {
    return this.sendTemplateNotification('OTP', phone, { otp });
  }

  /**
   * Log notification to database
   */
  private async logNotification(
    channel: string,
    recipient: string,
    message: string,
    success: boolean,
    error?: string
  ): Promise<void> {
    try {
      await supabase.from('notification_logs').insert({
        channel,
        recipient,
        message: message.substring(0, 500), // Truncate long messages
        success,
        error,
        created_at: new Date().toISOString()
      });
    } catch (e) {
      console.error('Failed to log notification:', e);
    }
  }

  /**
   * Get notification history for a user
   */
  async getNotificationHistory(userId: string, limit: number = 50): Promise<any[]> {
    try {
      const { data } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      return data || [];
    } catch (error) {
      console.error('Error fetching notification history:', error);
      return [];
    }
  }

  /**
   * Check if API is configured
   */
  isConfigured(): boolean {
    return !!(this.apiKey && this.apiUsername);
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;

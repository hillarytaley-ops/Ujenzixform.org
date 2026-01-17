/**
 * ============================================================
 * UjenziXform SMS Notification Service
 * ============================================================
 * 
 * This service handles SMS notifications via Africa's Talking API.
 * Supports transactional SMS, bulk SMS, and delivery reports.
 * 
 * SETUP REQUIRED:
 * 1. Register at https://africastalking.com
 * 2. Create an app and get API credentials
 * 3. Add credentials to environment variables
 * 
 * Alternative Providers Supported:
 * - Africa's Talking (Primary - recommended for Kenya)
 * - Twilio (International)
 * - Infobip
 * 
 * Environment Variables Needed:
 * - VITE_SMS_PROVIDER (africastalking | twilio)
 * - VITE_AFRICASTALKING_API_KEY
 * - VITE_AFRICASTALKING_USERNAME
 * - VITE_AFRICASTALKING_SENDER_ID
 * - VITE_SMS_ENV (sandbox | production)
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================
// TYPES & INTERFACES
// ============================================================

export interface SMSConfig {
  provider: 'africastalking' | 'twilio';
  apiKey: string;
  username: string;
  senderId: string;
  environment: 'sandbox' | 'production';
}

export interface SMSRequest {
  to: string | string[];     // Phone number(s) - format: +254XXXXXXXXX
  message: string;           // SMS content (max 160 chars for single SMS)
  userId?: string;           // Optional user ID for tracking
  category?: SMSCategory;    // Type of SMS for analytics
}

export type SMSCategory = 
  | 'order_confirmation'
  | 'delivery_update'
  | 'payment_confirmation'
  | 'otp_verification'
  | 'marketing'
  | 'alert'
  | 'reminder'
  | 'general';

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  recipients?: SMSRecipient[];
  cost?: string;
  error?: string;
}

export interface SMSRecipient {
  number: string;
  status: 'Success' | 'Failed' | 'Rejected';
  statusCode: number;
  cost: string;
  messageId: string;
}

export interface SMSRecord {
  id: string;
  user_id?: string;
  phone_number: string;
  message: string;
  category: SMSCategory;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  message_id?: string;
  cost?: string;
  provider: string;
  error_message?: string;
  created_at: string;
  delivered_at?: string;
}

// ============================================================
// SMS TEMPLATES
// ============================================================

export const SMS_TEMPLATES = {
  // Order notifications
  ORDER_PLACED: (orderId: string, total: number) => 
    `UjenziXform: Your order #${orderId} for KES ${total.toLocaleString()} has been placed. Track at UjenziXform.co.ke/tracking`,
  
  ORDER_CONFIRMED: (orderId: string) =>
    `UjenziXform: Order #${orderId} confirmed! Supplier is preparing your materials. We'll notify you when ready.`,
  
  ORDER_SHIPPED: (orderId: string, trackingNo: string) =>
    `UjenziXform: Order #${orderId} is on the way! Track: ${trackingNo}. Driver will call on arrival.`,
  
  ORDER_DELIVERED: (orderId: string) =>
    `UjenziXform: Order #${orderId} delivered! Please confirm receipt in the app. Thank you for using UjenziXform!`,

  // Delivery notifications
  DELIVERY_ASSIGNED: (driverName: string, phone: string) =>
    `UjenziXform: ${driverName} will deliver your order. Driver: ${phone}. Track live in app.`,
  
  DELIVERY_NEARBY: (minutes: number) =>
    `UjenziXform: Your delivery arrives in ~${minutes} mins! Please be ready to receive.`,
  
  DELIVERY_ARRIVED: (code: string) =>
    `UjenziXform: Driver has arrived! Confirmation code: ${code}. Show this to the driver.`,

  // Payment notifications
  PAYMENT_RECEIVED: (amount: number, receipt: string) =>
    `UjenziXform: Payment of KES ${amount.toLocaleString()} received. Receipt: ${receipt}. Thank you!`,
  
  PAYMENT_FAILED: (orderId: string) =>
    `UjenziXform: Payment for order #${orderId} failed. Please retry or contact support.`,

  // OTP & Verification
  OTP_CODE: (code: string) =>
    `UjenziXform: Your verification code is ${code}. Valid for 10 minutes. Do not share this code.`,
  
  WELCOME: (name: string) =>
    `Welcome to UjenziXform, ${name}! Kenya's #1 construction materials platform. Start ordering at UjenziXform.co.ke`,

  // Monitoring alerts
  MONITORING_ALERT: (project: string, alert: string) =>
    `UjenziXform Alert: ${project} - ${alert}. View cameras at UjenziXform.co.ke/monitoring`,

  // Quote notifications
  QUOTE_RECEIVED: (supplier: string, amount: number) =>
    `UjenziXform: New quote from ${supplier} for KES ${amount.toLocaleString()}. View in app to accept.`,
  
  QUOTE_EXPIRING: (supplier: string, hours: number) =>
    `UjenziXform: Quote from ${supplier} expires in ${hours} hours. Accept now to lock in price!`,
};

// ============================================================
// SMS SERVICE CLASS
// ============================================================

class SMSService {
  private config: SMSConfig;
  private baseUrl: string;

  constructor() {
    this.config = {
      provider: (import.meta.env.VITE_SMS_PROVIDER as 'africastalking' | 'twilio') || 'africastalking',
      apiKey: import.meta.env.VITE_AFRICASTALKING_API_KEY || '',
      username: import.meta.env.VITE_AFRICASTALKING_USERNAME || 'sandbox',
      senderId: import.meta.env.VITE_AFRICASTALKING_SENDER_ID || 'UjenziXform',
      environment: (import.meta.env.VITE_SMS_ENV as 'sandbox' | 'production') || 'sandbox',
    };

    this.baseUrl = this.config.environment === 'production'
      ? 'https://api.africastalking.com/version1'
      : 'https://api.sandbox.africastalking.com/version1';
  }

  // ============================================================
  // SEND SMS
  // ============================================================

  /**
   * Send SMS to one or more recipients
   */
  async send(request: SMSRequest): Promise<SMSResponse> {
    try {
      // Format phone numbers
      const recipients = Array.isArray(request.to) 
        ? request.to.map(p => this.formatPhoneNumber(p)).filter(Boolean)
        : [this.formatPhoneNumber(request.to)].filter(Boolean);

      if (recipients.length === 0) {
        return { success: false, error: 'No valid phone numbers provided' };
      }

      // Validate message length
      if (request.message.length > 918) { // Max 6 concatenated SMS
        return { success: false, error: 'Message too long. Maximum 918 characters.' };
      }

      // Send via Africa's Talking
      const response = await this.sendViaAfricasTalking(recipients as string[], request.message);

      // Save to database
      for (const number of recipients) {
        await this.saveSMSRecord({
          user_id: request.userId,
          phone_number: number as string,
          message: request.message,
          category: request.category || 'general',
          status: response.success ? 'sent' : 'failed',
          message_id: response.messageId,
          cost: response.cost,
          provider: this.config.provider,
          error_message: response.error,
        });
      }

      return response;
    } catch (error: any) {
      console.error('[SMSService] Send error:', error);
      return { success: false, error: error.message || 'Failed to send SMS' };
    }
  }

  /**
   * Send via Africa's Talking API
   */
  private async sendViaAfricasTalking(to: string[], message: string): Promise<SMSResponse> {
    try {
      const formData = new URLSearchParams();
      formData.append('username', this.config.username);
      formData.append('to', to.join(','));
      formData.append('message', message);
      
      if (this.config.senderId && this.config.environment === 'production') {
        formData.append('from', this.config.senderId);
      }

      const response = await fetch(`${this.baseUrl}/messaging`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'apiKey': this.config.apiKey,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.SMSMessageData?.Recipients) {
        const recipients: SMSRecipient[] = data.SMSMessageData.Recipients.map((r: any) => ({
          number: r.number,
          status: r.status,
          statusCode: r.statusCode,
          cost: r.cost,
          messageId: r.messageId,
        }));

        const allSuccess = recipients.every(r => r.status === 'Success');

        return {
          success: allSuccess,
          messageId: recipients[0]?.messageId,
          recipients,
          cost: data.SMSMessageData.Message?.split('KES ')[1]?.split(' ')[0],
        };
      }

      return {
        success: false,
        error: data.SMSMessageData?.Message || 'Unknown error',
      };
    } catch (error: any) {
      console.error('[SMSService] Africa\'s Talking error:', error);
      return { success: false, error: error.message };
    }
  }

  // ============================================================
  // CONVENIENCE METHODS
  // ============================================================

  /**
   * Send order confirmation SMS
   */
  async sendOrderConfirmation(phone: string, orderId: string, total: number, userId?: string): Promise<SMSResponse> {
    return this.send({
      to: phone,
      message: SMS_TEMPLATES.ORDER_PLACED(orderId, total),
      userId,
      category: 'order_confirmation',
    });
  }

  /**
   * Send delivery update SMS
   */
  async sendDeliveryUpdate(phone: string, orderId: string, trackingNo: string, userId?: string): Promise<SMSResponse> {
    return this.send({
      to: phone,
      message: SMS_TEMPLATES.ORDER_SHIPPED(orderId, trackingNo),
      userId,
      category: 'delivery_update',
    });
  }

  /**
   * Send payment confirmation SMS
   */
  async sendPaymentConfirmation(phone: string, amount: number, receipt: string, userId?: string): Promise<SMSResponse> {
    return this.send({
      to: phone,
      message: SMS_TEMPLATES.PAYMENT_RECEIVED(amount, receipt),
      userId,
      category: 'payment_confirmation',
    });
  }

  /**
   * Send OTP code
   */
  async sendOTP(phone: string, code: string): Promise<SMSResponse> {
    return this.send({
      to: phone,
      message: SMS_TEMPLATES.OTP_CODE(code),
      category: 'otp_verification',
    });
  }

  /**
   * Send welcome message
   */
  async sendWelcome(phone: string, name: string, userId?: string): Promise<SMSResponse> {
    return this.send({
      to: phone,
      message: SMS_TEMPLATES.WELCOME(name),
      userId,
      category: 'general',
    });
  }

  /**
   * Send monitoring alert
   */
  async sendMonitoringAlert(phone: string, project: string, alert: string, userId?: string): Promise<SMSResponse> {
    return this.send({
      to: phone,
      message: SMS_TEMPLATES.MONITORING_ALERT(project, alert),
      userId,
      category: 'alert',
    });
  }

  /**
   * Send bulk SMS (e.g., for marketing)
   */
  async sendBulk(phones: string[], message: string, category: SMSCategory = 'marketing'): Promise<SMSResponse> {
    return this.send({
      to: phones,
      message,
      category,
    });
  }

  // ============================================================
  // DATABASE OPERATIONS
  // ============================================================

  /**
   * Save SMS record to database
   */
  private async saveSMSRecord(record: Partial<SMSRecord>): Promise<void> {
    try {
      const { error } = await supabase
        .from('sms_logs')
        .insert({
          ...record,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('[SMSService] Failed to save SMS record:', error);
      }
    } catch (error) {
      console.error('[SMSService] Database error:', error);
    }
  }

  /**
   * Get SMS history for a user
   */
  async getSMSHistory(userId: string): Promise<SMSRecord[]> {
    try {
      const { data, error } = await supabase
        .from('sms_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[SMSService] Failed to get SMS history:', error);
      return [];
    }
  }

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  /**
   * Format phone number to international format (+254XXXXXXXXX)
   */
  private formatPhoneNumber(phone: string): string | null {
    // Remove all non-digits except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // Remove leading +
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }

    // Handle different formats
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
      cleaned = '254' + cleaned;
    } else if (!cleaned.startsWith('254')) {
      return null;
    }

    // Validate length
    if (cleaned.length !== 12) {
      return null;
    }

    return '+' + cleaned;
  }

  /**
   * Check if SMS service is configured
   */
  isConfigured(): boolean {
    return !!(this.config.apiKey && this.config.username);
  }

  /**
   * Get current environment
   */
  getEnvironment(): string {
    return this.config.environment;
  }

  /**
   * Calculate SMS cost estimate
   */
  estimateCost(message: string, recipientCount: number): { segments: number; cost: number } {
    // Calculate number of SMS segments
    const singleSmsLength = 160;
    const multipartSmsLength = 153;
    
    let segments: number;
    if (message.length <= singleSmsLength) {
      segments = 1;
    } else {
      segments = Math.ceil(message.length / multipartSmsLength);
    }

    // Kenya SMS cost (approximate): KES 0.80 per segment
    const costPerSegment = 0.80;
    const cost = segments * recipientCount * costPerSegment;

    return { segments, cost };
  }
}

// ============================================================
// EXPORT SINGLETON INSTANCE
// ============================================================

export const smsService = new SMSService();

// ============================================================
// REACT HOOK FOR SMS
// ============================================================

import { useState, useCallback } from 'react';

export interface UseSMSReturn {
  sendSMS: (request: SMSRequest) => Promise<SMSResponse>;
  sendOrderSMS: (phone: string, orderId: string, total: number) => Promise<SMSResponse>;
  sendDeliverySMS: (phone: string, orderId: string, trackingNo: string) => Promise<SMSResponse>;
  sendOTP: (phone: string, code: string) => Promise<SMSResponse>;
  loading: boolean;
  error: string | null;
  isConfigured: boolean;
}

export function useSMS(): UseSMSReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendSMS = useCallback(async (request: SMSRequest): Promise<SMSResponse> => {
    setLoading(true);
    setError(null);

    try {
      const response = await smsService.send(request);
      if (!response.success) {
        setError(response.error || 'SMS failed');
      }
      return response;
    } catch (err: any) {
      const errorMsg = err.message || 'SMS failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  const sendOrderSMS = useCallback(async (phone: string, orderId: string, total: number): Promise<SMSResponse> => {
    return sendSMS({
      to: phone,
      message: SMS_TEMPLATES.ORDER_PLACED(orderId, total),
      category: 'order_confirmation',
    });
  }, [sendSMS]);

  const sendDeliverySMS = useCallback(async (phone: string, orderId: string, trackingNo: string): Promise<SMSResponse> => {
    return sendSMS({
      to: phone,
      message: SMS_TEMPLATES.ORDER_SHIPPED(orderId, trackingNo),
      category: 'delivery_update',
    });
  }, [sendSMS]);

  const sendOTPCode = useCallback(async (phone: string, code: string): Promise<SMSResponse> => {
    return sendSMS({
      to: phone,
      message: SMS_TEMPLATES.OTP_CODE(code),
      category: 'otp_verification',
    });
  }, [sendSMS]);

  return {
    sendSMS,
    sendOrderSMS,
    sendDeliverySMS,
    sendOTP: sendOTPCode,
    loading,
    error,
    isConfigured: smsService.isConfigured(),
  };
}

export default smsService;













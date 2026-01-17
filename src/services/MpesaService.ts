/**
 * ============================================================
 * UjenziXform M-Pesa Integration Service
 * ============================================================
 * 
 * This service handles M-Pesa payments via Safaricom's Daraja API.
 * Supports STK Push (Lipa Na M-Pesa), B2C, and C2B transactions.
 * 
 * SETUP REQUIRED:
 * 1. Register at https://developer.safaricom.co.ke
 * 2. Create an app and get credentials
 * 3. Add credentials to environment variables
 * 
 * Environment Variables Needed:
 * - VITE_MPESA_CONSUMER_KEY
 * - VITE_MPESA_CONSUMER_SECRET
 * - VITE_MPESA_SHORTCODE
 * - VITE_MPESA_PASSKEY
 * - VITE_MPESA_CALLBACK_URL
 * - VITE_MPESA_ENV (sandbox | production)
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================
// TYPES & INTERFACES
// ============================================================

export interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  shortCode: string;
  passKey: string;
  callbackUrl: string;
  environment: 'sandbox' | 'production';
}

export interface STKPushRequest {
  phoneNumber: string;      // Format: 254XXXXXXXXX
  amount: number;           // Amount in KES
  accountReference: string; // e.g., Order ID, Invoice number
  description: string;      // Transaction description
  userId?: string;          // Optional user ID for tracking
}

export interface STKPushResponse {
  success: boolean;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  responseCode?: string;
  responseDescription?: string;
  customerMessage?: string;
  error?: string;
}

export interface PaymentStatus {
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  resultCode?: string;
  resultDesc?: string;
  mpesaReceiptNumber?: string;
  transactionDate?: string;
  phoneNumber?: string;
  amount?: number;
}

export interface PaymentRecord {
  id: string;
  user_id: string;
  order_id?: string;
  checkout_request_id: string;
  merchant_request_id: string;
  phone_number: string;
  amount: number;
  account_reference: string;
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  mpesa_receipt_number?: string;
  transaction_date?: string;
  result_code?: string;
  result_desc?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// M-PESA SERVICE CLASS
// ============================================================

class MpesaService {
  private config: MpesaConfig;
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    // Load configuration from environment variables
    this.config = {
      consumerKey: import.meta.env.VITE_MPESA_CONSUMER_KEY || '',
      consumerSecret: import.meta.env.VITE_MPESA_CONSUMER_SECRET || '',
      shortCode: import.meta.env.VITE_MPESA_SHORTCODE || '174379', // Sandbox default
      passKey: import.meta.env.VITE_MPESA_PASSKEY || '',
      callbackUrl: import.meta.env.VITE_MPESA_CALLBACK_URL || '',
      environment: (import.meta.env.VITE_MPESA_ENV as 'sandbox' | 'production') || 'sandbox',
    };

    // Set base URL based on environment
    this.baseUrl = this.config.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  // ============================================================
  // AUTHENTICATION
  // ============================================================

  /**
   * Get OAuth access token from M-Pesa API
   * Token is cached and refreshed when expired
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const credentials = btoa(`${this.config.consumerKey}:${this.config.consumerSecret}`);
      
      const response = await fetch(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${credentials}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Auth failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      this.accessToken = data.access_token;
      // Token expires in 1 hour, refresh 5 minutes early
      this.tokenExpiry = new Date(Date.now() + 55 * 60 * 1000);
      
      return this.accessToken;
    } catch (error) {
      console.error('[MpesaService] Failed to get access token:', error);
      throw new Error('Failed to authenticate with M-Pesa');
    }
  }

  // ============================================================
  // STK PUSH (Lipa Na M-Pesa)
  // ============================================================

  /**
   * Initiate STK Push payment
   * This triggers a payment prompt on the customer's phone
   */
  async initiateSTKPush(request: STKPushRequest): Promise<STKPushResponse> {
    try {
      // Validate phone number format
      const phone = this.formatPhoneNumber(request.phoneNumber);
      if (!phone) {
        return { success: false, error: 'Invalid phone number format. Use 254XXXXXXXXX' };
      }

      // Validate amount
      if (request.amount < 1) {
        return { success: false, error: 'Amount must be at least KES 1' };
      }

      const accessToken = await this.getAccessToken();
      const timestamp = this.getTimestamp();
      const password = this.generatePassword(timestamp);

      const payload = {
        BusinessShortCode: this.config.shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(request.amount), // M-Pesa requires whole numbers
        PartyA: phone,
        PartyB: this.config.shortCode,
        PhoneNumber: phone,
        CallBackURL: this.config.callbackUrl,
        AccountReference: request.accountReference.substring(0, 12), // Max 12 chars
        TransactionDesc: request.description.substring(0, 13), // Max 13 chars
      };

      const response = await fetch(`${this.baseUrl}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.ResponseCode === '0') {
        // Save payment record to database
        await this.savePaymentRecord({
          user_id: request.userId || 'anonymous',
          checkout_request_id: data.CheckoutRequestID,
          merchant_request_id: data.MerchantRequestID,
          phone_number: phone,
          amount: request.amount,
          account_reference: request.accountReference,
          description: request.description,
          status: 'pending',
        });

        return {
          success: true,
          checkoutRequestId: data.CheckoutRequestID,
          merchantRequestId: data.MerchantRequestID,
          responseCode: data.ResponseCode,
          responseDescription: data.ResponseDescription,
          customerMessage: data.CustomerMessage,
        };
      } else {
        return {
          success: false,
          responseCode: data.ResponseCode,
          responseDescription: data.ResponseDescription,
          error: data.errorMessage || data.ResponseDescription,
        };
      }
    } catch (error: any) {
      console.error('[MpesaService] STK Push error:', error);
      return {
        success: false,
        error: error.message || 'Failed to initiate payment',
      };
    }
  }

  /**
   * Query STK Push transaction status
   */
  async querySTKStatus(checkoutRequestId: string): Promise<PaymentStatus> {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = this.getTimestamp();
      const password = this.generatePassword(timestamp);

      const payload = {
        BusinessShortCode: this.config.shortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      };

      const response = await fetch(`${this.baseUrl}/mpesa/stkpushquery/v1/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.ResultCode === '0') {
        return {
          status: 'completed',
          resultCode: data.ResultCode,
          resultDesc: data.ResultDesc,
        };
      } else if (data.ResultCode === '1032') {
        return {
          status: 'cancelled',
          resultCode: data.ResultCode,
          resultDesc: 'Transaction cancelled by user',
        };
      } else {
        return {
          status: 'failed',
          resultCode: data.ResultCode,
          resultDesc: data.ResultDesc,
        };
      }
    } catch (error: any) {
      console.error('[MpesaService] Status query error:', error);
      return {
        status: 'pending',
        resultDesc: 'Unable to query status',
      };
    }
  }

  // ============================================================
  // DATABASE OPERATIONS
  // ============================================================

  /**
   * Save payment record to database
   */
  private async savePaymentRecord(record: Partial<PaymentRecord>): Promise<void> {
    try {
      const { error } = await supabase
        .from('mpesa_payments')
        .insert({
          ...record,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('[MpesaService] Failed to save payment record:', error);
      }
    } catch (error) {
      console.error('[MpesaService] Database error:', error);
    }
  }

  /**
   * Update payment status after callback
   */
  async updatePaymentStatus(
    checkoutRequestId: string, 
    status: PaymentStatus
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('mpesa_payments')
        .update({
          status: status.status,
          mpesa_receipt_number: status.mpesaReceiptNumber,
          transaction_date: status.transactionDate,
          result_code: status.resultCode,
          result_desc: status.resultDesc,
          updated_at: new Date().toISOString(),
        })
        .eq('checkout_request_id', checkoutRequestId);

      if (error) {
        console.error('[MpesaService] Failed to update payment status:', error);
      }
    } catch (error) {
      console.error('[MpesaService] Database error:', error);
    }
  }

  /**
   * Get payment history for a user
   */
  async getPaymentHistory(userId: string): Promise<PaymentRecord[]> {
    try {
      const { data, error } = await supabase
        .from('mpesa_payments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[MpesaService] Failed to get payment history:', error);
      return [];
    }
  }

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  /**
   * Format phone number to M-Pesa format (254XXXXXXXXX)
   */
  private formatPhoneNumber(phone: string): string | null {
    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '');

    // Handle different formats
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
      cleaned = '254' + cleaned;
    } else if (!cleaned.startsWith('254')) {
      return null;
    }

    // Validate length (should be 12 digits: 254 + 9 digits)
    if (cleaned.length !== 12) {
      return null;
    }

    return cleaned;
  }

  /**
   * Generate timestamp in M-Pesa format (YYYYMMDDHHmmss)
   */
  private getTimestamp(): string {
    const now = new Date();
    return now.toISOString()
      .replace(/[-:T]/g, '')
      .substring(0, 14);
  }

  /**
   * Generate password for STK Push
   */
  private generatePassword(timestamp: string): string {
    const data = this.config.shortCode + this.config.passKey + timestamp;
    return btoa(data);
  }

  /**
   * Check if M-Pesa is configured
   */
  isConfigured(): boolean {
    return !!(
      this.config.consumerKey &&
      this.config.consumerSecret &&
      this.config.passKey &&
      this.config.callbackUrl
    );
  }

  /**
   * Get current environment
   */
  getEnvironment(): string {
    return this.config.environment;
  }
}

// ============================================================
// EXPORT SINGLETON INSTANCE
// ============================================================

export const mpesaService = new MpesaService();

// ============================================================
// REACT HOOK FOR M-PESA PAYMENTS
// ============================================================

import { useState, useCallback } from 'react';

export interface UseMpesaReturn {
  initiatePayment: (request: STKPushRequest) => Promise<STKPushResponse>;
  checkStatus: (checkoutRequestId: string) => Promise<PaymentStatus>;
  loading: boolean;
  error: string | null;
  isConfigured: boolean;
}

export function useMpesa(): UseMpesaReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiatePayment = useCallback(async (request: STKPushRequest): Promise<STKPushResponse> => {
    setLoading(true);
    setError(null);

    try {
      const response = await mpesaService.initiateSTKPush(request);
      
      if (!response.success) {
        setError(response.error || 'Payment failed');
      }
      
      return response;
    } catch (err: any) {
      const errorMsg = err.message || 'Payment failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  const checkStatus = useCallback(async (checkoutRequestId: string): Promise<PaymentStatus> => {
    setLoading(true);
    
    try {
      return await mpesaService.querySTKStatus(checkoutRequestId);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    initiatePayment,
    checkStatus,
    loading,
    error,
    isConfigured: mpesaService.isConfigured(),
  };
}

export default mpesaService;













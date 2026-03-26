import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PaymentProvider {
  id: string;
  name: string;
  type: 'mobile_money' | 'bank' | 'card' | 'digital_wallet';
  enabled: boolean;
  config: any;
}

interface PaymentRequest {
  amount: number;
  currency: string;
  provider: string;
  phoneNumber?: string;
  reference: string;
  description: string;
}

export const usePaymentIntegrations = () => {
  const [providers] = useState<PaymentProvider[]>([
    {
      id: 'mpesa',
      name: 'M-Pesa',
      type: 'mobile_money',
      enabled: true,
      config: {}
    },
    {
      id: 'airtel_money',
      name: 'Airtel Money',
      type: 'mobile_money',
      enabled: true,
      config: {}
    },
    {
      id: 'equity_bank',
      name: 'Equity Bank',
      type: 'bank',
      enabled: true,
      config: {}
    },
    {
      id: 'kcb',
      name: 'KCB Bank',
      type: 'bank',
      enabled: true,
      config: {}
    },
    {
      id: 'paypal',
      name: 'PayPal',
      type: 'digital_wallet',
      enabled: true,
      config: {}
    }
  ]);

  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);

  // ADMIN ONLY: Payment processing is restricted to administrators
  const processPayment = useCallback(async (request: PaymentRequest) => {
    try {
      // Check admin status first
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        throw new Error('Payment processing is restricted to administrators only');
      }

      const provider = providers.find(p => p.id === request.provider);
      if (!provider) {
        throw new Error('Payment provider not found');
      }

      // Use secure edge function for payment processing (admin-only)
      const { data: result, error } = await supabase.functions.invoke('process-payment', {
        body: {
          amount: request.amount,
          currency: request.currency,
          provider: request.provider,
          phoneNumber: request.phoneNumber,
          reference: request.reference,
          description: request.description
        }
      });

      if (error) throw error;
      return result;

    } catch (error) {
      console.error('Payment processing failed:', error);
      throw error;
    }
  }, [providers]);

  const processMobileMoneyPayment = async (provider: PaymentProvider, request: PaymentRequest, paymentId: string) => {
    // Simulate M-Pesa STK Push
    if (provider.id === 'mpesa') {
      return await simulateMpesaPayment(request, paymentId);
    }
    
    // Simulate Airtel Money
    if (provider.id === 'airtel_money') {
      return await simulateAirtelMoneyPayment(request, paymentId);
    }

    if (provider.type === 'mobile_money') {
      return await simulateGenericMobileMoneyPayment(provider, request, paymentId);
    }

    throw new Error('Mobile money provider not implemented');
  };

  const processBankPayment = async (provider: PaymentProvider, request: PaymentRequest, paymentId: string) => {
    // Simulate bank transfer
    return {
      success: Math.random() > 0.1, // 90% success rate
      transactionId: `BNK_${Date.now()}`,
      response: {
        bankCode: provider.id,
        accountNumber: '****1234',
        transferMode: 'instant'
      }
    };
  };

  const processDigitalWalletPayment = async (provider: PaymentProvider, request: PaymentRequest, paymentId: string) => {
    // Simulate digital wallet payment
    return {
      success: Math.random() > 0.05, // 95% success rate
      transactionId: `DW_${Date.now()}`,
      response: {
        walletType: provider.id,
        confirmationCode: Math.random().toString(36).substr(2, 9).toUpperCase()
      }
    };
  };

  const simulateMpesaPayment = async (request: PaymentRequest, paymentId: string) => {
    // Simulate M-Pesa STK Push
    return new Promise<any>((resolve) => {
      setTimeout(() => {
        const success = Math.random() > 0.15; // 85% success rate
        resolve({
          success,
          transactionId: success ? `MP${Date.now()}` : null,
          response: {
            merchantRequestID: `mer_${Date.now()}`,
            checkoutRequestID: `ws_CO_${Date.now()}`,
            responseCode: success ? '0' : '1',
            responseDescription: success ? 'Success' : 'Payment failed',
            customerMessage: success ? 'Payment successful' : 'Payment was declined'
          }
        });
      }, 3000); // 3 second delay to simulate processing
    });
  };

  const simulateAirtelMoneyPayment = async (request: PaymentRequest, paymentId: string) => {
    return new Promise<any>((resolve) => {
      setTimeout(() => {
        const success = Math.random() > 0.2; // 80% success rate
        resolve({
          success,
          transactionId: success ? `AM${Date.now()}` : null,
          response: {
            transactionId: success ? `AM${Date.now()}` : null,
            status: success ? 'SUCCESS' : 'FAILED',
            message: success ? 'Transaction successful' : 'Insufficient balance'
          }
        });
      }, 2000);
    });
  };

  /** Sandbox-style path for other mobile wallets until a live integration exists */
  const simulateGenericMobileMoneyPayment = async (
    provider: PaymentProvider,
    request: PaymentRequest,
    paymentId: string
  ) => {
    return new Promise<any>((resolve) => {
      setTimeout(() => {
        const success = Math.random() > 0.2;
        resolve({
          success,
          simulated: true,
          transactionId: success ? `MM_${provider.id}_${Date.now()}` : null,
          response: {
            provider: provider.id,
            reference: request.reference,
            paymentId,
            status: success ? 'SUCCESS' : 'FAILED',
            message: success
              ? 'Simulated mobile money success (configure provider integration for production)'
              : 'Simulated decline',
          },
        });
      }, 2000);
    });
  };

  // ADMIN ONLY: Payment history access is restricted to administrators
  const getPaymentHistory = useCallback(async () => {
    try {
      // Check admin status first
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        console.warn('Payment history access restricted to administrators');
        return [];
      }

      // Use secure function to get payment history
      const { data, error } = await supabase.rpc('get_payment_secure', { payment_uuid: null });
      
      if (error) throw error;
      setPaymentHistory(data || []);
      return data;
    } catch (error) {
      console.error('Failed to fetch payment history:', error);
      return [];
    }
  }, []);

  // ADMIN ONLY: Payment validation is restricted to administrators
  const validatePayment = useCallback(async (transactionId: string) => {
    try {
      // Check admin status first
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        console.warn('Payment validation access restricted to administrators');
        return null;
      }

      // For transaction validation, we'd need to search by transaction_id
      // This would require a separate secure function
      console.warn('Payment validation by transaction ID requires additional secure function implementation');
      return null;
    } catch (error) {
      console.error('Payment validation failed:', error);
      return null;
    }
  }, []);

  return {
    providers,
    paymentHistory,
    processPayment,
    getPaymentHistory,
    validatePayment
  };
};
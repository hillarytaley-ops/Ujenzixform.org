import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PaymentProvider {
  id: string;
  name: string;
  type: 'card' | 'bank' | 'digital_wallet';
  enabled: boolean;
  config: Record<string, unknown>;
}

interface PaymentRequest {
  amount: number;
  currency: string;
  provider: string;
  phoneNumber?: string;
  reference: string;
  description: string;
}

/**
 * Admin-oriented payment helpers. Checkout for customers uses Paystack via
 * `useKenyanPayments` + `KenyanPaymentGateway` (VITE_PAYSTACK_PUBLIC_KEY).
 * Verify server-side secret: PAYSTACK_SECRET_KEY on `verify-paystack` function.
 */
export const usePaymentIntegrations = () => {
  const [providers] = useState<PaymentProvider[]>([
    {
      id: 'paystack',
      name: 'Paystack',
      type: 'card',
      enabled: true,
      config: {},
    },
  ]);

  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);

  const processPayment = useCallback(async (request: PaymentRequest) => {
    try {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        throw new Error('Payment processing is restricted to administrators only');
      }

      const provider = providers.find((p) => p.id === request.provider);
      if (!provider) {
        throw new Error('Payment provider not found');
      }

      if (request.provider === 'paystack') {
        const { data, error } = await supabase.functions.invoke('verify-paystack', {
          body: { reference: request.reference },
        });
        if (error) throw error;
        if (!data?.success) {
          throw new Error(data?.error || data?.message || 'Paystack verification failed');
        }
        return data;
      }

      const { data: result, error } = await supabase.functions.invoke('process-payment', {
        body: {
          amount: request.amount,
          currency: request.currency,
          provider: request.provider,
          phoneNumber: request.phoneNumber,
          reference: request.reference,
          description: request.description,
        },
      });

      if (error) throw error;
      return result;
    } catch (error) {
      console.error('Payment processing failed:', error);
      throw error;
    }
  }, [providers]);

  const getPaymentHistory = useCallback(async () => {
    try {
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

      const { data, error } = await supabase.rpc('get_payment_secure', { payment_uuid: null });

      if (error) throw error;
      setPaymentHistory(data || []);
      return data;
    } catch (error) {
      console.error('Failed to fetch payment history:', error);
      return [];
    }
  }, []);

  const validatePayment = useCallback(async (transactionId: string) => {
    try {
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

      console.warn('Payment validation by transaction ID requires Paystack reference; use verify-paystack with reference');
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
    validatePayment,
  };
};

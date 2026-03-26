import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { PaystackCurrency } from '@/lib/paystack';

interface KenyanPaymentProvider {
  id: string;
  name: string;
  type: 'paystack' | 'mobile_money' | 'bank' | 'sacco' | 'microfinance';
  enabled: boolean;
  logo?: string;
  shortcode?: string;
  ussdCode?: string;
  minimumAmount: number;
  maximumAmount: number;
  fees: {
    fixed: number;
    percentage: number;
  };
}

interface PaymentRequest {
  amount: number;
  currency: string;
  provider: string;
  phoneNumber?: string;
  accountNumber?: string;
  reference: string;
  description: string;
  recipientName?: string;
}

interface PaymentResult {
  success: boolean;
  transactionId?: string;
  reference?: string;
  message: string;
  fees?: number;
  estimatedDelivery?: string;
}

const PAYSTACK_CURRENCIES: PaystackCurrency[] = ['KES', 'NGN', 'GHS', 'ZAR', 'USD'];

function toPaystackCurrency(code: string): PaystackCurrency {
  const c = (code || 'KES').toUpperCase() as PaystackCurrency;
  return PAYSTACK_CURRENCIES.includes(c) ? c : 'KES';
}

export const useKenyanPayments = () => {
  const { toast } = useToast();

  const [providers] = useState<KenyanPaymentProvider[]>([
    {
      id: 'paystack',
      name: 'Paystack',
      type: 'paystack',
      enabled: true,
      minimumAmount: 10,
      maximumAmount: 10000000,
      fees: { fixed: 0, percentage: 0 },
    },
  ]);

  const calculateFees = useCallback((amount: number, provider: KenyanPaymentProvider): number => {
    return provider.fees.fixed + (amount * provider.fees.percentage) / 100;
  }, []);

  const validatePhoneNumber = useCallback((phoneNumber: string): boolean => {
    const kenyanPhoneRegex = /^(\+254|254|0)?(7[0-9]{8}|1[0-9]{8})$/;
    return kenyanPhoneRegex.test(phoneNumber.replace(/\s+/g, ''));
  }, []);

  const formatKenyanPhone = useCallback((phoneNumber: string): string => {
    let cleaned = phoneNumber.replace(/\s+/g, '').replace(/\+/g, '');

    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
      cleaned = '254' + cleaned;
    }

    return '+' + cleaned;
  }, []);

  const processPaystackPayment = async (
    _provider: KenyanPaymentProvider,
    request: PaymentRequest,
    totalAmount: number,
    paymentRowId: string
  ): Promise<PaymentResult> => {
    const { getPaystackPublicKey, openPaystackCheckout } = await import('@/lib/paystack');
    const pk = getPaystackPublicKey();
    if (!pk) {
      return {
        success: false,
        message:
          'Paystack is not configured. Add VITE_PAYSTACK_PUBLIC_KEY to your environment and redeploy.',
      };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    let email = user?.email?.trim() || '';

    if (!email && user?.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', user.id)
        .maybeSingle();
      email = ((profile as { email?: string } | null)?.email || '').trim();
    }

    if (!email) {
      return {
        success: false,
        message: 'Your account needs an email address to pay with Paystack. Update your profile or sign in with email.',
      };
    }

    const safeRef = request.reference.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
    const paystackRef = `${safeRef}_${paymentRowId.replace(/-/g, '').slice(0, 12)}`;

    const currency = toPaystackCurrency(request.currency);

    return new Promise((resolve) => {
      let settled = false;
      const finish = (r: PaymentResult) => {
        if (settled) return;
        settled = true;
        resolve(r);
      };

      openPaystackCheckout({
        publicKey: pk,
        email,
        amountMajor: totalAmount,
        currency,
        reference: paystackRef,
        metadata: {
          payment_row_id: paymentRowId,
          internal_reference: request.reference,
        },
        onSuccess: async (verifiedRef) => {
          try {
            const { data, error } = await supabase.functions.invoke('verify-paystack', {
              body: { reference: verifiedRef },
            });
            if (error) {
              finish({ success: false, message: error.message || 'Could not verify payment' });
              return;
            }
            if (!data?.success) {
              finish({
                success: false,
                message: data?.message || data?.error || 'Payment verification failed',
              });
              return;
            }
            finish({
              success: true,
              transactionId: data.transactionId,
              reference: verifiedRef,
              message: 'Payment completed successfully.',
            });
          } catch (e) {
            finish({
              success: false,
              message: e instanceof Error ? e.message : 'Verification failed',
            });
          }
        },
        onClose: () => {
          finish({ success: false, message: 'Payment window closed before completion.' });
        },
      }).catch((e) => {
        finish({
          success: false,
          message: e instanceof Error ? e.message : 'Paystack could not start',
        });
      });
    });
  };

  const processPayment = useCallback(
    async (request: PaymentRequest): Promise<PaymentResult> => {
      try {
        const provider = providers.find((p) => p.id === request.provider);
        if (!provider) {
          throw new Error('Payment provider not supported');
        }

        if (request.amount < provider.minimumAmount || request.amount > provider.maximumAmount) {
          throw new Error(
            `Amount must be between ${request.currency} ${provider.minimumAmount.toLocaleString()} and ${request.currency} ${provider.maximumAmount.toLocaleString()}`
          );
        }

        if (provider.type === 'mobile_money' && request.phoneNumber) {
          if (!validatePhoneNumber(request.phoneNumber)) {
            throw new Error('Please enter a valid Kenyan phone number');
          }
          request.phoneNumber = formatKenyanPhone(request.phoneNumber);
        }

        const fees = calculateFees(request.amount, provider);
        const totalAmount = request.amount + fees;

        const encryptedPhoneNumber = request.phoneNumber;

        const { data: payment, error } = await supabase
          .from('payments')
          .insert({
            amount: request.amount,
            currency: request.currency || 'KES',
            provider: request.provider,
            phone_number: encryptedPhoneNumber,
            reference: request.reference,
            description: request.description.trim(),
            status: 'pending',
          })
          .select()
          .single();

        if (error) throw error;

        let result: PaymentResult;

        switch (provider.type) {
          case 'paystack':
            result = await processPaystackPayment(provider, request, totalAmount, payment.id);
            break;
          default:
            throw new Error('This payment method is not enabled. Use Paystack.');
        }

        await supabase
          .from('payments')
          .update({
            status: result.success ? 'completed' : 'failed',
            transaction_id: result.transactionId,
            provider_response: {
              message: result.message,
              fees,
              totalAmount,
              reference: result.reference,
            },
          })
          .eq('id', payment.id);

        if (result.success) {
          toast({
            title: 'Payment successful',
            description: result.message,
          });
        } else {
          toast({
            title: 'Payment not completed',
            description: result.message,
            variant: 'destructive',
          });
        }

        return { ...result, fees };
      } catch (error: unknown) {
        console.error('Payment processing failed:', error);
        const msg = error instanceof Error ? error.message : 'Payment processing failed';
        toast({
          title: 'Payment error',
          description: msg,
          variant: 'destructive',
        });

        return {
          success: false,
          message: msg,
        };
      }
    },
    [providers, calculateFees, validatePhoneNumber, formatKenyanPhone, toast]
  );

  const getPaymentMethods = useCallback(
    (amount: number) => {
      return providers.filter(
        (p) => p.enabled && amount >= p.minimumAmount && amount <= p.maximumAmount
      );
    },
    [providers]
  );

  const getRecommendedMethod = useCallback(
    (amount: number): KenyanPaymentProvider | null => {
      const available = getPaymentMethods(amount);
      return available.find((p) => p.type === 'paystack') || available[0] || null;
    },
    [getPaymentMethods]
  );

  return {
    providers,
    processPayment,
    calculateFees,
    validatePhoneNumber,
    formatKenyanPhone,
    getPaymentMethods,
    getRecommendedMethod,
  };
};

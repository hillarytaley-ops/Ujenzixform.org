import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Shield, CheckCircle, Zap } from 'lucide-react';
import { PaystackCheckout } from '@/components/payment/PaystackCheckout';

export interface PaymentGatewayProps {
  amount: number;
  currency?: 'KES' | 'USD' | 'EUR' | 'GBP';
  description: string;
  orderId: string;
  onSuccess: (paymentDetails: unknown) => void;
  onCancel?: () => void;
  /** React Router path after Paystack verifies payment (default /home). */
  successNavigateTo?: string;
}

/**
 * Hosted Paystack checkout replaces legacy M-Pesa, card form, and Stripe/PayPal tabs.
 * Success is finalized on `/payment/paystack-callback`; parent `onSuccess` is not invoked
 * after redirect (read `sessionStorage.ujenzi_paystack_last_success` or `location.state`).
 */
export const PaymentGateway: React.FC<PaymentGatewayProps> = ({
  amount,
  currency = 'KES',
  description,
  orderId,
  onSuccess: _onSuccess,
  onCancel,
  successNavigateTo,
}) => {
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-6 w-6 text-green-600" />
          Secure payment
        </CardTitle>
        <CardDescription>
          Pay with Paystack (cards, M-Pesa, and other methods enabled on your Paystack account).
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Order</div>
              <div className="font-medium">{orderId}</div>
              <div className="text-sm text-muted-foreground mt-1">{description}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {currency} {amount.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <PaystackCheckout
          amount={amount}
          currency={currency}
          description={description}
          orderId={orderId}
          successNavigateTo={successNavigateTo}
          onCancel={onCancel}
        />

        <div className="mt-8 pt-6 border-t flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Shield className="h-4 w-4 text-green-600" />
            Paystack hosted checkout
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Verified on return
          </span>
          <span className="flex items-center gap-1">
            <Zap className="h-4 w-4 text-orange-600" />
            PCI scope reduced
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

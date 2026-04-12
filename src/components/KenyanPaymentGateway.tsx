import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard } from "lucide-react";
import { PaystackCheckout } from "@/components/payment/PaystackCheckout";

interface KenyanPaymentGatewayProps {
  amount: number;
  currency?: string;
  description: string;
  reference: string;
  onPaymentSuccess: (result: unknown) => void;
  onPaymentFailure: (error: unknown) => void;
  recipientName?: string;
}

/**
 * Kenyan checkout is routed through Paystack hosted payment (cards, M-Pesa, etc.).
 * Success is handled on return from Paystack; legacy callbacks are not fired after redirect.
 */
const KenyanPaymentGateway: React.FC<KenyanPaymentGatewayProps> = ({
  amount,
  currency = "KES",
  description,
  reference,
  onPaymentSuccess: _onPaymentSuccess,
  onPaymentFailure: _onPaymentFailure,
  recipientName,
}) => {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5" />
          <span>Checkout</span>
        </CardTitle>
        <CardDescription>
          {recipientName ? `Paying ${recipientName} · ` : null}
          Secure payment via Paystack
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center mb-4 text-sm text-muted-foreground">
          {currency} {amount.toLocaleString()} — {description}
        </div>
        <PaystackCheckout amount={amount} currency={currency} description={description} orderId={reference} />
      </CardContent>
    </Card>
  );
};

export default KenyanPaymentGateway;

import React, { useState } from 'react';
import { usePaystackPayment } from 'react-paystack';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  CreditCard,
  Smartphone,
  Lock,
  CheckCircle,
  Shield,
  Zap,
  Loader2,
  Building2,
  Banknote
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Paystack Public Key - Replace with your actual key
const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

export interface PaystackPaymentProps {
  amount: number; // Amount in KES (will be converted to kobo/cents)
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  orderId: string;
  orderDescription?: string;
  onSuccess: (reference: PaystackSuccessResponse) => void;
  onClose?: () => void;
  metadata?: Record<string, any>;
}

export interface PaystackSuccessResponse {
  reference: string;
  trans: string;
  status: string;
  message: string;
  transaction: string;
  trxref: string;
}

export const PaystackPayment: React.FC<PaystackPaymentProps> = ({
  amount,
  email,
  firstName = '',
  lastName = '',
  phone = '',
  orderId,
  orderDescription = 'UjenziPro Purchase',
  onSuccess,
  onClose,
  metadata = {}
}) => {
  const { toast } = useToast();
  const [customerEmail, setCustomerEmail] = useState(email);
  const [customerPhone, setCustomerPhone] = useState(phone);
  const [isProcessing, setIsProcessing] = useState(false);

  // Paystack expects amount in kobo (smallest currency unit)
  // For KES, 1 KES = 100 cents
  const amountInKobo = Math.round(amount * 100);

  // Generate unique reference
  const reference = `UJP-${orderId}-${Date.now()}`;

  // Paystack configuration
  const config = {
    reference,
    email: customerEmail,
    amount: amountInKobo,
    publicKey: PAYSTACK_PUBLIC_KEY,
    currency: 'KES',
    channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'] as const,
    metadata: {
      custom_fields: [
        {
          display_name: 'Order ID',
          variable_name: 'order_id',
          value: orderId
        },
        {
          display_name: 'Customer Name',
          variable_name: 'customer_name',
          value: `${firstName} ${lastName}`.trim() || 'Customer'
        },
        {
          display_name: 'Phone',
          variable_name: 'phone',
          value: customerPhone
        }
      ],
      ...metadata
    }
  };

  // Initialize Paystack payment
  const initializePayment = usePaystackPayment(config);

  // Handle successful payment
  const handleSuccess = (response: PaystackSuccessResponse) => {
    console.log('✅ Paystack Payment Success:', response);
    setIsProcessing(false);
    
    toast({
      title: '✅ Payment Successful!',
      description: `Transaction Reference: ${response.reference}`,
    });

    onSuccess(response);
  };

  // Handle payment close/cancel
  const handleClose = () => {
    console.log('Payment dialog closed');
    setIsProcessing(false);
    
    toast({
      title: 'Payment Cancelled',
      description: 'You can try again when ready.',
      variant: 'default'
    });

    onClose?.();
  };

  // Initiate payment
  const handlePayNow = () => {
    if (!customerEmail || !customerEmail.includes('@')) {
      toast({
        title: 'Email Required',
        description: 'Please enter a valid email address',
        variant: 'destructive'
      });
      return;
    }

    setIsProcessing(true);
    
    // Open Paystack checkout
    initializePayment({
      onSuccess: handleSuccess,
      onClose: handleClose
    });
  };

  return (
    <Card className="w-full max-w-lg mx-auto border-2 border-green-100">
      <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50">
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 bg-green-600 rounded-lg">
            <Lock className="h-5 w-5 text-white" />
          </div>
          Secure Checkout
        </CardTitle>
        <CardDescription>
          Powered by Paystack - Africa's leading payment gateway
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {/* Order Summary */}
        <div className="bg-gray-50 rounded-xl p-4 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Order ID</span>
            <span className="font-mono text-sm">{orderId}</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Description</span>
            <span className="text-sm">{orderDescription}</span>
          </div>
          <Separator className="my-3" />
          <div className="flex items-center justify-between">
            <span className="font-semibold">Total Amount</span>
            <span className="text-2xl font-bold text-green-600">
              KES {amount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Customer Details */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="email" className="flex items-center gap-2">
              Email Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="mt-1"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Receipt will be sent to this email
            </p>
          </div>

          <div>
            <Label htmlFor="phone" className="flex items-center gap-2">
              Phone Number (Optional)
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+254 7XX XXX XXX"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              For M-Pesa and mobile money payments
            </p>
          </div>
        </div>

        {/* Payment Methods Available */}
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Available Payment Methods
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 text-sm">
              <CreditCard className="h-4 w-4 text-blue-600" />
              <span>Visa/Mastercard</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Smartphone className="h-4 w-4 text-green-600" />
              <span>M-Pesa</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-purple-600" />
              <span>Bank Transfer</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Banknote className="h-4 w-4 text-orange-600" />
              <span>USSD</span>
            </div>
          </div>
        </div>

        {/* Pay Button */}
        <Button
          className="w-full py-6 text-lg font-semibold bg-green-600 hover:bg-green-700"
          onClick={handlePayNow}
          disabled={isProcessing || !customerEmail}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Opening Secure Checkout...
            </>
          ) : (
            <>
              <Lock className="h-5 w-5 mr-2" />
              Pay KES {amount.toLocaleString()}
            </>
          )}
        </Button>

        {/* Security Badges */}
        <div className="flex items-center justify-center gap-4 flex-wrap pt-4 border-t">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="h-4 w-4 text-green-600" />
            <span>SSL Secured</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-4 w-4 text-blue-600" />
            <span>PCI Compliant</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Verified by Paystack</span>
          </div>
        </div>

        {/* Paystack Badge */}
        <div className="text-center">
          <Badge variant="outline" className="text-xs">
            <Zap className="h-3 w-3 mr-1" />
            Secured by Paystack
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

// Inline Payment Button Component (for quick integration)
export const PaystackButton: React.FC<{
  amount: number;
  email: string;
  orderId: string;
  onSuccess: (reference: PaystackSuccessResponse) => void;
  onClose?: () => void;
  buttonText?: string;
  className?: string;
  disabled?: boolean;
}> = ({
  amount,
  email,
  orderId,
  onSuccess,
  onClose,
  buttonText,
  className = '',
  disabled = false
}) => {
  const amountInKobo = Math.round(amount * 100);
  const reference = `UJP-${orderId}-${Date.now()}`;

  const config = {
    reference,
    email,
    amount: amountInKobo,
    publicKey: PAYSTACK_PUBLIC_KEY,
    currency: 'KES',
    channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'] as const,
  };

  const initializePayment = usePaystackPayment(config);

  const handleClick = () => {
    initializePayment({
      onSuccess,
      onClose: onClose || (() => {})
    });
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || !email}
      className={`bg-green-600 hover:bg-green-700 ${className}`}
    >
      <Lock className="h-4 w-4 mr-2" />
      {buttonText || `Pay KES ${amount.toLocaleString()}`}
    </Button>
  );
};

export default PaystackPayment;

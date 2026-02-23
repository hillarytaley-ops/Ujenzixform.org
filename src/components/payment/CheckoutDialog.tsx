import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  CreditCard,
  Smartphone,
  MapPin,
  Calendar,
  Package,
  Truck,
  Lock,
  CheckCircle,
  Shield,
  Loader2,
  Building2,
  Banknote,
  ArrowRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CartItem } from '@/contexts/CartContext';
// import { PaystackPayment, PaystackSuccessResponse } from './PaystackPayment'; // Uncomment for production
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';

// ============================================================
// TEST MODE: Set to false to enable real Paystack payments
// ============================================================
const TEST_MODE = true;

// Type for Paystack response (needed even in test mode)
interface PaystackSuccessResponse {
  reference: string;
  trans: string;
  status: string;
  message: string;
  transaction: string;
  trxref: string;
}

interface CheckoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  totalAmount: number;
  onOrderComplete: (orderId: string, paymentReference: string) => void;
}

type CheckoutStep = 'details' | 'payment' | 'confirmation';

export const CheckoutDialog: React.FC<CheckoutDialogProps> = ({
  isOpen,
  onClose,
  items,
  totalAmount,
  onOrderComplete
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState<CheckoutStep>('details');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [poNumber, setPoNumber] = useState<string>('');
  
  // Customer details
  const [customerDetails, setCustomerDetails] = useState({
    email: '',
    phone: '',
    firstName: '',
    lastName: '',
    deliveryAddress: '',
    deliveryNotes: '',
    deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  // Load user data on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCustomerDetails(prev => ({
            ...prev,
            email: user.email || '',
            phone: user.phone || user.user_metadata?.phone || '',
            firstName: user.user_metadata?.first_name || user.user_metadata?.full_name?.split(' ')[0] || '',
            lastName: user.user_metadata?.last_name || user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || ''
          }));
        }
      } catch (err) {
        console.error('Error loading user data:', err);
      }
    };
    
    if (isOpen) {
      loadUserData();
    }
  }, [isOpen]);

  // Create order before payment
  const handleProceedToPayment = async () => {
    // Validate required fields
    if (!customerDetails.email || !customerDetails.deliveryAddress) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in your email and delivery address.',
        variant: 'destructive'
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Get session
      let userId: string | null = null;
      let accessToken: string | null = null;
      
      try {
        const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          userId = parsed.user?.id;
          accessToken = parsed.access_token;
        }
      } catch (e) {
        console.warn('Could not parse stored session');
      }

      if (!userId || !accessToken) {
        toast({
          title: 'Sign in required',
          description: 'Please sign in to complete your purchase.',
          variant: 'destructive'
        });
        setIsProcessing(false);
        return;
      }

      // Generate PO number
      const newPoNumber = `PO-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      setPoNumber(newPoNumber);

      // Find a valid supplier
      let supplierId: string | null = null;
      
      const itemWithSupplier = items.find(item => 
        item.supplier_id && 
        item.supplier_id !== 'admin-catalog' && 
        item.supplier_id !== 'general' &&
        item.supplier_id.length === 36
      );
      
      if (itemWithSupplier?.supplier_id) {
        supplierId = itemWithSupplier.supplier_id;
      } else {
        // Get first available supplier
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/suppliers?select=id&limit=1`,
          { headers: { 'apikey': SUPABASE_ANON_KEY } }
        );
        if (response.ok) {
          const suppliers = await response.json();
          if (suppliers && suppliers.length > 0) {
            supplierId = suppliers[0].id;
          }
        }
      }

      if (!supplierId) {
        supplierId = userId; // Fallback
      }

      // Create purchase order with 'pending_payment' status
      const orderPayload = {
        po_number: newPoNumber,
        buyer_id: userId,
        supplier_id: supplierId,
        total_amount: totalAmount,
        delivery_address: customerDetails.deliveryAddress,
        delivery_date: customerDetails.deliveryDate,
        project_name: `Purchase - ${new Date().toLocaleDateString()}`,
        status: 'pending_payment', // Will be updated to 'confirmed' after payment
        items: items.map(item => ({
          material_id: item.id,
          material_name: item.name,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price
        })),
        notes: customerDetails.deliveryNotes
      };

      const orderResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/purchase_orders`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(orderPayload)
        }
      );

      if (!orderResponse.ok) {
        throw new Error('Failed to create order');
      }

      const orderData = await orderResponse.json();
      const createdOrder = Array.isArray(orderData) ? orderData[0] : orderData;
      
      setOrderId(createdOrder.id);
      setStep('payment');
      
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create order. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle successful Paystack payment
  const handlePaymentSuccess = async (response: PaystackSuccessResponse) => {
    console.log('✅ Payment successful:', response);
    
    try {
      // Get session for API calls
      let accessToken: string | null = null;
      try {
        const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          accessToken = parsed.access_token;
        }
      } catch (e) {
        console.warn('Could not parse stored session');
      }

      // Update order status to 'confirmed'
      if (orderId && accessToken) {
        await fetch(
          `${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${orderId}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'confirmed' })
          }
        );

        // Record payment in payments table
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await fetch(
            `${SUPABASE_URL}/rest/v1/payments`,
            {
              method: 'POST',
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                user_id: user.id,
                purchase_order_id: orderId,
                amount: totalAmount,
                currency: 'KES',
                paystack_reference: response.reference,
                paystack_transaction_id: response.trans || response.transaction,
                status: 'success',
                customer_email: customerDetails.email,
                customer_name: `${customerDetails.firstName} ${customerDetails.lastName}`.trim(),
                customer_phone: customerDetails.phone,
                gateway_response: response.message || 'Approved',
                paid_at: new Date().toISOString()
              })
            }
          );
        }
      }

      setStep('confirmation');
      
      toast({
        title: '🎉 Payment Successful!',
        description: `Your order ${poNumber} has been confirmed.`,
      });

      // Notify parent component
      onOrderComplete(orderId || '', response.reference);
      
    } catch (error) {
      console.error('Error updating order after payment:', error);
      // Payment was successful, so still show confirmation
      setStep('confirmation');
    }
  };

  // Handle payment close/cancel
  const handlePaymentClose = () => {
    toast({
      title: 'Payment Cancelled',
      description: 'You can complete payment later from your orders.',
      variant: 'default'
    });
  };

  // Reset dialog state when closed
  const handleClose = () => {
    setStep('details');
    setOrderId(null);
    setPoNumber('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'details' && (
              <>
                <MapPin className="h-5 w-5 text-blue-600" />
                Delivery Details
              </>
            )}
            {step === 'payment' && (
              <>
                <CreditCard className="h-5 w-5 text-green-600" />
                Secure Payment
              </>
            )}
            {step === 'confirmation' && (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                Order Confirmed!
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === 'details' && 'Enter your delivery information to proceed'}
            {step === 'payment' && 'Complete your payment securely with Paystack'}
            {step === 'confirmation' && `Order ${poNumber} has been successfully placed`}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {/* Step 1: Delivery Details */}
          {step === 'details' && (
            <div className="space-y-6 py-4">
              {/* Order Summary */}
              <div className="bg-gray-50 rounded-xl p-4 border">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Order Summary ({items.length} items)
                </h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">{item.name} × {item.quantity}</span>
                      <span className="font-medium">KES {(item.unit_price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <Separator className="my-3" />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-green-600">KES {totalAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Customer Details */}
              <div className="space-y-4">
                <h3 className="font-semibold">Contact Information</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={customerDetails.firstName}
                      onChange={(e) => setCustomerDetails(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={customerDetails.lastName}
                      onChange={(e) => setCustomerDetails(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerDetails.email}
                    onChange={(e) => setCustomerDetails(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={customerDetails.phone}
                    onChange={(e) => setCustomerDetails(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+254 7XX XXX XXX"
                  />
                </div>
              </div>

              {/* Delivery Details */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Delivery Information
                </h3>

                <div>
                  <Label htmlFor="address">
                    Delivery Address <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="address"
                    value={customerDetails.deliveryAddress}
                    onChange={(e) => setCustomerDetails(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                    placeholder="Enter your full delivery address including city, area, and any landmarks"
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="deliveryDate">Preferred Delivery Date</Label>
                  <Input
                    id="deliveryDate"
                    type="date"
                    value={customerDetails.deliveryDate}
                    onChange={(e) => setCustomerDetails(prev => ({ ...prev, deliveryDate: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Delivery Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={customerDetails.deliveryNotes}
                    onChange={(e) => setCustomerDetails(prev => ({ ...prev, deliveryNotes: e.target.value }))}
                    placeholder="Any special instructions for delivery..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Proceed Button */}
              <Button
                className="w-full py-6 text-lg bg-green-600 hover:bg-green-700"
                onClick={handleProceedToPayment}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Creating Order...
                  </>
                ) : (
                  <>
                    Proceed to Payment
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Step 2: Payment */}
          {step === 'payment' && orderId && (
            <div className="py-4">
              {TEST_MODE ? (
                // ============================================================
                // TEST MODE: Simulated Payment UI
                // ============================================================
                <div className="space-y-6">
                  <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 text-center">
                    <Badge className="bg-yellow-500 text-white mb-2">🧪 TEST MODE</Badge>
                    <p className="text-yellow-800 font-medium">
                      Paystack is disabled for testing. Click below to simulate payment.
                    </p>
                  </div>

                  {/* Order Summary */}
                  <div className="bg-gray-50 rounded-xl p-4 border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Order ID</span>
                      <span className="font-mono text-sm">{orderId.slice(0, 8)}...</span>
                    </div>
                    <Separator className="my-3" />
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Total Amount</span>
                      <span className="text-2xl font-bold text-green-600">
                        KES {totalAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Simulated Payment Methods */}
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Select Payment Method (Simulated)
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 text-sm p-2 bg-white rounded border">
                        <CreditCard className="h-4 w-4 text-blue-600" />
                        <span>Card</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm p-2 bg-white rounded border">
                        <Smartphone className="h-4 w-4 text-green-600" />
                        <span>M-Pesa</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm p-2 bg-white rounded border">
                        <Building2 className="h-4 w-4 text-purple-600" />
                        <span>Bank Transfer</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm p-2 bg-white rounded border">
                        <Banknote className="h-4 w-4 text-orange-600" />
                        <span>USSD</span>
                      </div>
                    </div>
                  </div>

                  {/* Simulate Payment Button */}
                  <Button
                    className="w-full py-6 text-lg font-semibold bg-green-600 hover:bg-green-700"
                    onClick={async () => {
                      setIsProcessing(true);
                      
                      // Simulate payment processing delay
                      await new Promise(resolve => setTimeout(resolve, 2000));
                      
                      // Generate fake payment reference
                      const fakeReference = `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
                      
                      // Call the success handler with simulated response
                      handlePaymentSuccess({
                        reference: fakeReference,
                        trans: `TXN-${Date.now()}`,
                        status: 'success',
                        message: 'Test payment approved',
                        transaction: `TXN-${Date.now()}`,
                        trxref: fakeReference
                      });
                      
                      setIsProcessing(false);
                    }}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Processing Test Payment...
                      </>
                    ) : (
                      <>
                        <Lock className="h-5 w-5 mr-2" />
                        Simulate Payment - KES {totalAmount.toLocaleString()}
                      </>
                    )}
                  </Button>

                  {/* Security Note */}
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                    <Shield className="h-4 w-4" />
                    <span>Test Mode - No real payment will be processed</span>
                  </div>
                </div>
              ) : (
                // ============================================================
                // PRODUCTION MODE: Real Paystack Payment
                // Uncomment PaystackPayment import at top of file
                // ============================================================
                <div className="text-center py-8">
                  <p className="text-gray-500">Paystack integration disabled. Set TEST_MODE to false.</p>
                </div>
                /* 
                <PaystackPayment
                  amount={totalAmount}
                  email={customerDetails.email}
                  firstName={customerDetails.firstName}
                  lastName={customerDetails.lastName}
                  phone={customerDetails.phone}
                  orderId={orderId}
                  orderDescription={`UjenziPro Order ${poNumber}`}
                  onSuccess={handlePaymentSuccess}
                  onClose={handlePaymentClose}
                  metadata={{
                    po_number: poNumber,
                    delivery_address: customerDetails.deliveryAddress,
                    delivery_date: customerDetails.deliveryDate,
                    items_count: items.length
                  }}
                />
                */
              )}
              
              <div className="mt-4 text-center">
                <Button
                  variant="ghost"
                  onClick={() => setStep('details')}
                  className="text-gray-500"
                >
                  ← Back to Details
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 'confirmation' && (
            <div className="py-8 text-center space-y-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-green-600 mb-2">
                  Thank You for Your Order!
                </h3>
                <p className="text-gray-600">
                  Your order <span className="font-mono font-bold">{poNumber}</span> has been confirmed.
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 text-left max-w-md mx-auto">
                <h4 className="font-semibold mb-3">Order Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order Number</span>
                    <span className="font-mono">{poNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Items</span>
                    <span>{items.length} items</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Paid</span>
                    <span className="font-bold text-green-600">KES {totalAmount.toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery To</span>
                    <span className="text-right max-w-[200px] truncate">{customerDetails.deliveryAddress}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expected By</span>
                    <span>{new Date(customerDetails.deliveryDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 max-w-md mx-auto">
                <h4 className="font-semibold text-blue-800 mb-2">What's Next?</h4>
                <ul className="text-sm text-blue-700 space-y-1 text-left">
                  <li>✓ You'll receive a confirmation email shortly</li>
                  <li>✓ The supplier will prepare your order</li>
                  <li>✓ Track your delivery in your dashboard</li>
                </ul>
              </div>

              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleClose}
              >
                Continue Shopping
              </Button>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutDialog;

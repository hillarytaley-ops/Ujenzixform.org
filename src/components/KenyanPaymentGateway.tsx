import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useKenyanPayments } from "@/hooks/useKenyanPayments";
import { useToast } from "@/hooks/use-toast";
import { Smartphone, Building2, CreditCard, AlertCircle, CheckCircle, Clock, Info } from "lucide-react";

interface KenyanPaymentGatewayProps {
  amount: number;
  currency?: string;
  description: string;
  reference: string;
  onPaymentSuccess: (result: any) => void;
  onPaymentFailure: (error: any) => void;
  recipientName?: string;
}

const KenyanPaymentGateway: React.FC<KenyanPaymentGatewayProps> = ({
  amount,
  currency = 'KES',
  description,
  reference,
  onPaymentSuccess,
  onPaymentFailure,
  recipientName
}) => {
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'select' | 'details' | 'confirm' | 'processing' | 'complete'>('select');
  const [paymentResult, setPaymentResult] = useState<any>(null);

  const { 
    providers, 
    processPayment, 
    calculateFees, 
    validatePhoneNumber, 
    formatKenyanPhone,
    getPaymentMethods,
    getRecommendedMethod 
  } = useKenyanPayments();

  const { toast } = useToast();

  const availableMethods = getPaymentMethods(amount);
  const recommendedMethod = getRecommendedMethod(amount);

  useEffect(() => {
    if (recommendedMethod && !selectedProvider) {
      setSelectedProvider(recommendedMethod.id);
    }
  }, [recommendedMethod, selectedProvider]);

  const selectedProviderData = providers.find(p => p.id === selectedProvider);
  const fees = selectedProviderData ? calculateFees(amount, selectedProviderData) : 0;
  const totalAmount = amount + fees;

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    setStep('details');
  };

  const handleDetailsSubmit = () => {
    if (!selectedProviderData) return;

    // Validate required fields
    if (selectedProviderData.type === 'mobile_money' && !phoneNumber) {
      toast({
        title: "Phone Number Required",
        description: "Please enter your phone number for mobile money payment",
        variant: "destructive"
      });
      return;
    }

    if (selectedProviderData.type === 'mobile_money' && !validatePhoneNumber(phoneNumber)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid Kenyan phone number",
        variant: "destructive"
      });
      return;
    }

    if (selectedProviderData.type === 'bank' && !accountNumber) {
      toast({
        title: "Account Number Required",
        description: "Please enter your account number for bank payment",
        variant: "destructive"
      });
      return;
    }

    setStep('confirm');
  };

  const handlePayment = async () => {
    if (!selectedProviderData) return;

    setIsProcessing(true);
    setStep('processing');

    try {
      const paymentRequest = {
        amount,
        currency,
        provider: selectedProvider,
        phoneNumber: selectedProviderData.type === 'mobile_money' ? formatKenyanPhone(phoneNumber) : undefined,
        accountNumber: selectedProviderData.type === 'bank' ? accountNumber : undefined,
        reference,
        description,
        recipientName
      };

      const result = await processPayment(paymentRequest);
      
      setPaymentResult(result);
      
      if (result.success) {
        setStep('complete');
        onPaymentSuccess(result);
      } else {
        onPaymentFailure(result);
        setStep('confirm'); // Go back to allow retry
      }
    } catch (error) {
      onPaymentFailure(error);
      setStep('confirm');
    } finally {
      setIsProcessing(false);
    }
  };

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'mobile_money':
        return <Smartphone className="h-5 w-5" />;
      case 'bank':
        return <Building2 className="h-5 w-5" />;
      case 'sacco':
      case 'microfinance':
        return <Building2 className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  };

  const getProviderTypeLabel = (type: string) => {
    switch (type) {
      case 'mobile_money':
        return 'Mobile Money';
      case 'bank':
        return 'Bank Transfer';
      case 'sacco':
        return 'SACCO';
      case 'microfinance':
        return 'Microfinance';
      default:
        return 'Payment';
    }
  };

  const renderProviderSelection = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-foreground">Choose Payment Method</h3>
        <p className="text-muted-foreground">
          Pay KES {amount.toLocaleString()} for {description}
        </p>
        {recommendedMethod && (
          <Badge className="mt-2 bg-kenyan-green text-white">
            Recommended: {recommendedMethod.name}
          </Badge>
        )}
      </div>

      <div className="grid gap-3">
        {availableMethods.map((provider) => (
          <Card 
            key={provider.id} 
            className={`cursor-pointer transition-colors hover:bg-accent/50 ${
              selectedProvider === provider.id ? 'ring-2 ring-primary bg-accent/30' : ''
            }`}
            onClick={() => handleProviderSelect(provider.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getProviderIcon(provider.type)}
                  <div>
                    <div className="font-medium text-foreground">{provider.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {getProviderTypeLabel(provider.type)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">
                    Fee: KES {calculateFees(amount, provider).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Limit: KES {provider.minimumAmount.toLocaleString()} - {provider.maximumAmount.toLocaleString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {availableMethods.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No payment methods available for this amount. Please contact support.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  const renderDetailsForm = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-foreground">Payment Details</h3>
        <p className="text-muted-foreground">
          {selectedProviderData?.name} - {getProviderTypeLabel(selectedProviderData?.type || '')}
        </p>
      </div>

      {selectedProviderData?.type === 'mobile_money' && (
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="0712345678"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="text-base"
          />
          <p className="text-xs text-muted-foreground">
            Enter your {selectedProviderData.name} registered phone number
          </p>
          {selectedProviderData.ussdCode && (
            <p className="text-xs text-muted-foreground">
              USSD: {selectedProviderData.ussdCode}
            </p>
          )}
        </div>
      )}

      {selectedProviderData?.type === 'bank' && (
        <div className="space-y-2">
          <Label htmlFor="account">Account Number</Label>
          <Input
            id="account"
            type="text"
            placeholder="Enter account number"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            className="text-base"
          />
          <p className="text-xs text-muted-foreground">
            Enter your {selectedProviderData.name} account number
          </p>
        </div>
      )}

      <div className="bg-muted/50 p-4 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          <span>Amount:</span>
          <span>KES {amount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Transaction Fee:</span>
          <span>KES {fees.toLocaleString()}</span>
        </div>
        <Separator />
        <div className="flex justify-between font-medium">
          <span>Total:</span>
          <span>KES {totalAmount.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex space-x-2">
        <Button 
          variant="outline" 
          onClick={() => setStep('select')}
          className="flex-1"
        >
          Back
        </Button>
        <Button 
          onClick={handleDetailsSubmit}
          className="flex-1 bg-kenyan-green hover:bg-kenyan-green/90 text-white"
        >
          Continue
        </Button>
      </div>
    </div>
  );

  const renderConfirmation = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-foreground">Confirm Payment</h3>
        <p className="text-muted-foreground">Please review your payment details</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payment Method:</span>
            <span className="font-medium">{selectedProviderData?.name}</span>
          </div>
          {phoneNumber && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone Number:</span>
              <span className="font-medium">{phoneNumber}</span>
            </div>
          )}
          {accountNumber && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Account:</span>
              <span className="font-medium">{accountNumber}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount:</span>
            <span className="font-medium">KES {amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fee:</span>
            <span className="font-medium">KES {fees.toLocaleString()}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold text-lg">
            <span>Total:</span>
            <span>KES {totalAmount.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {selectedProviderData?.type === 'mobile_money' 
            ? `You will receive a payment prompt on ${phoneNumber}. Enter your PIN to complete the transaction.`
            : `Your payment will be processed through ${selectedProviderData?.name}. This may take a few minutes.`
          }
        </AlertDescription>
      </Alert>

      <div className="flex space-x-2">
        <Button 
          variant="outline" 
          onClick={() => setStep('details')}
          className="flex-1"
          disabled={isProcessing}
        >
          Back
        </Button>
        <Button 
          onClick={handlePayment}
          className="flex-1 bg-primary hover:bg-primary/90"
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            'Confirm Payment'
          )}
        </Button>
      </div>
    </div>
  );

  const renderProcessing = () => (
    <div className="text-center space-y-4">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
      <h3 className="text-xl font-semibold text-foreground">Processing Payment</h3>
      <p className="text-muted-foreground">
        Please wait while we process your payment...
      </p>
      {selectedProviderData?.type === 'mobile_money' && (
        <Alert>
          <Smartphone className="h-4 w-4" />
          <AlertDescription>
            Check your phone for the payment prompt and enter your PIN to complete the transaction.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  const renderComplete = () => (
    <div className="text-center space-y-4">
      <CheckCircle className="h-16 w-16 text-kenyan-green mx-auto" />
      <h3 className="text-xl font-semibold text-foreground">Payment Successful!</h3>
      <p className="text-muted-foreground">{paymentResult?.message}</p>
      
      {paymentResult?.transactionId && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transaction ID:</span>
                <span className="font-mono">{paymentResult.transactionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reference:</span>
                <span className="font-mono">{paymentResult.reference}</span>
              </div>
              {paymentResult.estimatedDelivery && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated Delivery:</span>
                  <span>{paymentResult.estimatedDelivery}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5" />
          <span>Kenyan Payment Gateway</span>
        </CardTitle>
        <CardDescription>
          Secure payments across Kenya
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'select' && renderProviderSelection()}
        {step === 'details' && renderDetailsForm()}
        {step === 'confirm' && renderConfirmation()}
        {step === 'processing' && renderProcessing()}
        {step === 'complete' && renderComplete()}
      </CardContent>
    </Card>
  );
};

export default KenyanPaymentGateway;

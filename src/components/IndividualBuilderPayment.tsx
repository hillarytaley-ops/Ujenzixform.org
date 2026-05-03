import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Shield, CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface DeliveryNote {
  id: string;
  delivery_note_number: string;
  purchase_order_id: string;
  supplier_id: string;
  dispatch_date: string;
  expected_delivery_date: string;
  po_number?: string;
  supplier_name?: string;
  total_amount?: number;
}

interface PaymentMethod {
  id: string;
  payment_method: string;
  payment_details: any;
  is_default: boolean;
}

const IndividualBuilderPayment = () => {
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<DeliveryNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  
  // Payment form states
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [bankDetails, setBankDetails] = useState({
    bankName: '',
    accountNumber: '',
    accountName: ''
  });

  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userProfile) {
      fetchDeliveryNotes();
      fetchPaymentMethods();
    }
  }, [userProfile]);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        
        // SECURITY: Explicit column selection - exclude sensitive data
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, user_type')
          .eq('user_id', user.id)
          .single();
        
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    }
  };

  const fetchDeliveryNotes = async () => {
    try {
      setLoading(true);

      // Fetch purchase orders for this individual builder
      const { data: purchaseOrders, error: poError } = await supabase
        .from('purchase_orders')
        .select('id, po_number, total_amount, supplier_id')
        .eq('buyer_id', userProfile.id)
        .eq('status', 'delivered'); // Only delivered orders can be paid

      if (poError) throw poError;

      if (!purchaseOrders || purchaseOrders.length === 0) {
        setDeliveryNotes([]);
        return;
      }

      const poIds = purchaseOrders.map(po => po.id);

      // Fetch delivery notes that haven't been paid yet
      const { data: deliveryNotesData, error } = await supabase
        .from('delivery_notes')
        .select(`
          *,
          delivery_acknowledgements!left(id, payment_status)
        `)
        .in('purchase_order_id', poIds)
        .or('delivery_acknowledgements.id.is.null,delivery_acknowledgements.payment_status.neq.paid')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enhance with PO and supplier details
      const notesWithDetails = await Promise.all(
        (deliveryNotesData || []).map(async (note) => {
          const po = purchaseOrders.find(p => p.id === note.purchase_order_id);
          
          const { data: supplier } = await supabase
            .from('suppliers')
            .select('company_name')
            .eq('id', po?.supplier_id)
            .single();

          return {
            ...note,
            po_number: po?.po_number || 'Unknown PO',
            total_amount: po?.total_amount || 0,
            supplier_name: supplier?.company_name || 'Unknown Supplier'
          };
        })
      );

      setDeliveryNotes(notesWithDetails);
    } catch (error) {
      console.error('Error fetching delivery notes:', error);
      toast({
        title: "Error",
        description: "Failed to fetch delivery notes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_preferences')
        .select('*')
        .eq('user_id', userProfile.id)
        .order('is_default', { ascending: false });

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  };

  const savePaymentMethod = async () => {
    if (!newPaymentMethod || !bankDetails.bankName || !bankDetails.accountNumber) {
      toast({
        title: "Validation Error",
        description: "Please fill in all payment method details.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Set all existing methods as non-default if this is the first one
      if (paymentMethods.length === 0) {
        await supabase
          .from('payment_preferences')
          .update({ is_default: false })
          .eq('user_id', userProfile.id);
      }

      const { error } = await supabase
        .from('payment_preferences')
        .insert({
          user_id: userProfile.id,
          payment_method: newPaymentMethod,
          payment_details: {
            bank_name: bankDetails.bankName,
            account_number: bankDetails.accountNumber,
            account_name: bankDetails.accountName
          },
          is_default: paymentMethods.length === 0
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment method saved successfully.",
      });

      fetchPaymentMethods();
      setNewPaymentMethod('');
      setBankDetails({ bankName: '', accountNumber: '', accountName: '' });
      setShowPaymentForm(false);
    } catch (error) {
      console.error('Error saving payment method:', error);
      toast({
        title: "Error",
        description: "Failed to save payment method.",
        variant: "destructive",
      });
    }
  };

  const processPayment = async () => {
    if (!selectedNote || !paymentMethod) {
      toast({
        title: "Validation Error",
        description: "Please select a delivery note and payment method.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      // Create or update acknowledgment record with payment
      const { error } = await supabase
        .from('delivery_acknowledgements')
        .upsert({
          delivery_note_id: selectedNote.id,
          acknowledger_id: userProfile.id,
          acknowledged_by: userProfile.full_name || user.email,
          digital_signature: 'Individual builder - immediate payment',
          comments: 'Immediate payment by individual builder',
          payment_method: paymentMethod,
          payment_reference: paymentReference,
          payment_status: 'paid'
        });

      if (error) throw error;

      // Send notification to supplier
      await supabase.functions.invoke('send-grn-notification', {
        body: {
          type: 'payment_completed',
          delivery_note_id: selectedNote.id,
          payer_name: userProfile.full_name || user.email,
          po_number: selectedNote.po_number,
          supplier_id: selectedNote.supplier_id,
          amount: selectedNote.total_amount
        }
      });

      toast({
        title: "Payment Successful!",
        description: "Your payment has been processed successfully.",
      });

      // Reset form
      setSelectedNote(null);
      setPaymentMethod('');
      setPaymentReference('');

      // Refresh data
      fetchDeliveryNotes();

    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Payment Failed",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Check if user is an individual builder (not professional/company)
  if (!userProfile || userProfile.role !== 'builder' || userProfile.is_professional || userProfile.user_type === 'company') {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>This section is for individual builders only.</p>
            <p className="text-sm mt-2">CO/Contractors and companies use the "Acknowledge & Pay" tab.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <CreditCard className="h-5 w-5" />
            Individual Builder Payment
          </CardTitle>
          <CardDescription className="text-blue-700">
            As an individual builder, you can pay for your delivered items immediately without formal acknowledgment procedures.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Delivery Notes for Payment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Items Ready for Payment
          </CardTitle>
          <CardDescription>
            Select delivered items to make immediate payment
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading items...</p>
            </div>
          ) : deliveryNotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No items pending payment.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {deliveryNotes.map((note) => (
                <Card 
                  key={note.id} 
                  className={`cursor-pointer transition-colors ${
                    selectedNote?.id === note.id ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => setSelectedNote(note)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{note.delivery_note_number}</h4>
                        <p className="text-sm text-muted-foreground">
                          PO: {note.po_number} | Supplier: {note.supplier_name}
                        </p>
                        <p className="text-lg font-bold text-primary">
                          KSh {note.total_amount?.toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Payment Due
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Form */}
      {selectedNote && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Pay for: {selectedNote.delivery_note_number}
            </CardTitle>
            <CardDescription>
              Amount: KSh {selectedNote.total_amount?.toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Payment Method Selection */}
            <div className="space-y-4">
              <Label>Payment Method</Label>
              {paymentMethods.length > 0 ? (
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.id} value={method.payment_method}>
                        {method.payment_method} 
                        {method.is_default && ' (Default)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No payment methods configured. Add one below.
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPaymentForm(!showPaymentForm)}
                className="w-full"
              >
                {showPaymentForm ? 'Hide' : 'Add Payment Method'}
              </Button>
            </div>

            {/* Add Payment Method Form */}
            {showPaymentForm && (
              <Card className="border-dashed">
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="paymentType">Payment Type</Label>
                    <Select value={newPaymentMethod} onValueChange={setNewPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="mobile_banking">Mobile Banking</SelectItem>
                        <SelectItem value="cash">Cash Payment</SelectItem>
                        <SelectItem value="check">Check Payment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bankName">Bank/Payment Provider</Label>
                      <Input
                        id="bankName"
                        value={bankDetails.bankName}
                        onChange={(e) => setBankDetails(prev => ({ ...prev, bankName: e.target.value }))}
                        placeholder="e.g., KCB, M-Shamba, Equity Bank"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">Account/Phone Number</Label>
                      <Input
                        id="accountNumber"
                        value={bankDetails.accountNumber}
                        onChange={(e) => setBankDetails(prev => ({ ...prev, accountNumber: e.target.value }))}
                        placeholder="Account or mobile number"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accountName">Account/Holder Name</Label>
                    <Input
                      id="accountName"
                      value={bankDetails.accountName}
                      onChange={(e) => setBankDetails(prev => ({ ...prev, accountName: e.target.value }))}
                      placeholder="Your name or business name"
                    />
                  </div>

                  <Button onClick={savePaymentMethod} className="w-full">
                    Save Payment Method
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Payment Reference */}
            {paymentMethod && (
              <div className="space-y-2">
                <Label htmlFor="paymentReference">Payment Reference</Label>
                <Input
                  id="paymentReference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Transaction ID, receipt number, or reference"
                  required
                />
              </div>
            )}

            {/* Security Notice */}
            <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
              <Shield className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="text-sm text-green-800">
                <p className="font-medium">Secure Payment:</p>
                <p>Your payment information is encrypted and your transaction will be recorded securely.</p>
              </div>
            </div>

            {/* Pay Button */}
            <Button
              onClick={processPayment}
              disabled={submitting || !selectedNote || !paymentMethod || !paymentReference}
              className="w-full"
              size="lg"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing Payment...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay KSh {selectedNote?.total_amount?.toLocaleString()}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default IndividualBuilderPayment;
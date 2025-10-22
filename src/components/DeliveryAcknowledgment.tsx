import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { FileSignature, CreditCard, Shield, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import SignatureCanvas from 'react-signature-canvas';

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
  payment_details?: any;
  is_default: boolean;
  has_encrypted_details?: boolean;
  created_at?: string;
  user_id?: string;
}

const DeliveryAcknowledgment = () => {
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<DeliveryNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  
  // Form states
  const [comments, setComments] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [bankDetails, setBankDetails] = useState({
    bankName: '',
    accountNumber: '',
    accountName: ''
  });

  const signatureRef = useRef<SignatureCanvas>(null);
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
          .select('id, user_id, full_name, company_name, user_type, is_professional')
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

      // Fetch purchase orders for this builder
      const { data: purchaseOrders, error: poError } = await supabase
        .from('purchase_orders')
        .select('id, po_number, total_amount, supplier_id')
        .eq('buyer_id', userProfile.id)
        .eq('status', 'delivered'); // Only delivered orders can be acknowledged

      if (poError) throw poError;

      if (!purchaseOrders || purchaseOrders.length === 0) {
        setDeliveryNotes([]);
        return;
      }

      const poIds = purchaseOrders.map(po => po.id);

      // Fetch delivery notes that haven't been acknowledged yet
      const { data: deliveryNotesData, error } = await supabase
        .from('delivery_notes')
        .select(`
          *,
          delivery_acknowledgements!left(id)
        `)
        .in('purchase_order_id', poIds)
        .is('delivery_acknowledgements.id', null) // Only unacknowledged notes
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
      // Payment preferences are now admin-only
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userProfile.user_id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        console.warn('Payment preferences access restricted to administrators');
        setPaymentMethods([]);
        toast({
          title: "Payment Methods Restricted",
          description: "Payment method access is now restricted to administrators for security.",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase.rpc('get_payment_preferences_secure', {
        user_uuid: userProfile.user_id
      });
      
      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      setPaymentMethods([]);
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
      // Check admin access first
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userProfile.user_id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        toast({
          title: "Access Restricted",
          description: "Payment method management is restricted to administrators for security compliance.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Payment Method Restricted",
        description: "Payment method creation is now admin-only for security. Contact administrator for payment setup.",
        variant: "destructive"
      });

      setNewPaymentMethod('');
      setBankDetails({ bankName: '', accountNumber: '', accountName: '' });
    } catch (error) {
      console.error('Error saving payment method:', error);
      toast({
        title: "Error",
        description: "Failed to save payment method.",
        variant: "destructive"
      });
    }
  };

  const handleAcknowledgment = async () => {
    if (!selectedNote || !signatureRef.current) {
      toast({
        title: "Validation Error",
        description: "Please select a delivery note and provide signature.",
        variant: "destructive",
      });
      return;
    }

    if (signatureRef.current.isEmpty()) {
      toast({
        title: "Signature Required",
        description: "Please provide your digital signature.",
        variant: "destructive",
      });
      return;
    }

    if (!paymentMethod) {
      toast({
        title: "Payment Method Required",
        description: "Please select a payment method.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      // Get signature data
      const signatureData = signatureRef.current.toDataURL();

      // Create acknowledgment record with payment information
      const { error } = await supabase
        .from('delivery_acknowledgements')
        .insert({
          delivery_note_id: selectedNote.id,
          acknowledger_id: userProfile.id,
          acknowledged_by: userProfile.full_name || user.email,
          digital_signature: signatureData,
          comments: comments,
          payment_method: paymentMethod,
          payment_reference: paymentReference,
          payment_status: 'pending'
        });

      if (error) throw error;

      // Send notification to supplier
      await supabase.functions.invoke('send-grn-notification', {
        body: {
          type: 'delivery_acknowledged',
          delivery_note_id: selectedNote.id,
          acknowledger_name: userProfile.full_name || user.email,
          po_number: selectedNote.po_number,
          supplier_id: selectedNote.supplier_id
        }
      });

      toast({
        title: "Success",
        description: "Delivery acknowledged and payment initiated successfully.",
      });

      // Reset form
      setSelectedNote(null);
      setComments('');
      setPaymentMethod('');
      setPaymentReference('');
      signatureRef.current?.clear();
      setShowPaymentForm(false);

      // Refresh data
      fetchDeliveryNotes();

    } catch (error) {
      console.error('Error acknowledging delivery:', error);
      toast({
        title: "Error",
        description: "Failed to acknowledge delivery.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!userProfile || userProfile.role !== 'builder' || (!userProfile.is_professional && userProfile.user_type !== 'company')) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Access restricted to professional builders and companies only.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Notice */}
      <Card className="border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Shield className="h-5 w-5" />
            Secure Delivery Acknowledgment
          </CardTitle>
          <CardDescription>
            Your digital signature and payment information are encrypted and protected. 
            All transactions are logged for security purposes.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Delivery Notes Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            Pending Acknowledgments
          </CardTitle>
          <CardDescription>
            Select a delivery note to acknowledge receipt and process payment
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading delivery notes...</p>
            </div>
          ) : deliveryNotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pending delivery acknowledgments.</p>
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
                        <p className="text-sm font-medium text-primary">
                          Amount: KSh {note.total_amount?.toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Acknowledgment Form */}
      {selectedNote && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Acknowledge & Pay: {selectedNote.delivery_note_number}
            </CardTitle>
            <CardDescription>
              Confirm receipt of goods and process payment securely
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Comments */}
            <div className="space-y-2">
              <Label htmlFor="comments">Delivery Comments (Optional)</Label>
              <Textarea
                id="comments"
                placeholder="Add any comments about the delivery condition..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
              />
            </div>

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
                {showPaymentForm ? 'Hide' : 'Add New Payment Method'}
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
                        <SelectItem value="check">Check Payment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bankName">Bank Name</Label>
                      <Input
                        id="bankName"
                        value={bankDetails.bankName}
                        onChange={(e) => setBankDetails(prev => ({ ...prev, bankName: e.target.value }))}
                        placeholder="e.g., Kenya Commercial Bank"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">Account Number</Label>
                      <Input
                        id="accountNumber"
                        value={bankDetails.accountNumber}
                        onChange={(e) => setBankDetails(prev => ({ ...prev, accountNumber: e.target.value }))}
                        placeholder="Your account number"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accountName">Account Name</Label>
                    <Input
                      id="accountName"
                      value={bankDetails.accountName}
                      onChange={(e) => setBankDetails(prev => ({ ...prev, accountName: e.target.value }))}
                      placeholder="Account holder name"
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
                <Label htmlFor="paymentReference">Payment Reference (Optional)</Label>
                <Input
                  id="paymentReference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Transaction reference or check number"
                />
              </div>
            )}

            {/* Digital Signature */}
            <div className="space-y-2">
              <Label>Digital Signature *</Label>
              <div className="border rounded-md p-4 bg-muted/50">
                <SignatureCanvas
                  ref={signatureRef}
                  canvasProps={{
                    width: 400,
                    height: 200,
                    className: 'signature-canvas w-full border rounded bg-white'
                  }}
                />
                <div className="flex justify-between mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => signatureRef.current?.clear()}
                  >
                    Clear Signature
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Sign above to acknowledge receipt
                  </p>
                </div>
              </div>
            </div>

            {/* Security Warning */}
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Security Notice:</p>
                <p>Your signature and payment details are encrypted and stored securely. This acknowledgment is legally binding.</p>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleAcknowledgment}
              disabled={submitting || !selectedNote || !paymentMethod}
              className="w-full"
              size="lg"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Acknowledge Delivery & Process Payment
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DeliveryAcknowledgment;
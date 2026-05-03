import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { FileSignature, Shield, AlertTriangle, CheckCircle2 } from "lucide-react";
import SignatureCanvas from 'react-signature-canvas';
import { ResponsiveSignatureCanvas } from '@/components/ui/ResponsiveSignatureCanvas';

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
  is_signed?: boolean;
}

const DeliveryNoteSigning = () => {
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<DeliveryNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [comments, setComments] = useState('');

  const signatureRef = useRef<SignatureCanvas>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userProfile) {
      fetchDeliveryNotes();
    }
  }, [userProfile]);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // SECURITY: Explicit column selection - exclude sensitive data
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, company_name')
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
        .in('status', ['confirmed', 'dispatched']);

      if (poError) throw poError;

      if (!purchaseOrders || purchaseOrders.length === 0) {
        setDeliveryNotes([]);
        return;
      }

      const poIds = purchaseOrders.map(po => po.id);

      // Fetch delivery notes that need signing
      const { data: deliveryNotesData, error } = await supabase
        .from('delivery_notes')
        .select(`
          *,
          delivery_note_signatures!left(id)
        `)
        .in('purchase_order_id', poIds)
        .is('delivery_note_signatures.id', null) // Only unsigned notes
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
            supplier_name: supplier?.company_name || 'Unknown Supplier',
            is_signed: false
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

  const handleSignDeliveryNote = async () => {
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

    try {
      setSigning(true);

      // Get signature data
      const signatureData = signatureRef.current.toDataURL();

      // Create signature record
      const { error } = await supabase
        .from('delivery_note_signatures')
        .insert({
          delivery_note_id: selectedNote.id,
          signer_id: userProfile.id,
          signature_data: signatureData
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Delivery note signed successfully. You can now proceed with payment.",
      });

      // Reset form
      setSelectedNote(null);
      setComments('');
      signatureRef.current?.clear();

      // Refresh data
      fetchDeliveryNotes();

    } catch (error) {
      console.error('Error signing delivery note:', error);
      toast({
        title: "Error",
        description: "Failed to sign delivery note.",
        variant: "destructive",
      });
    } finally {
      setSigning(false);
    }
  };

  if (!userProfile || userProfile.role !== 'builder' || (!userProfile.is_professional && userProfile.user_type !== 'company')) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Access restricted to COs/contractors and companies only.</p>
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
            Secure Delivery Note Signing
          </CardTitle>
          <CardDescription>
            Digital signatures are legally binding and encrypted for security. 
            Sign delivery notes before processing payments to suppliers.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Delivery Notes Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            Delivery Notes Requiring Signature
          </CardTitle>
          <CardDescription>
            CO/Contractors and companies must sign delivery notes before payment
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
              <p>No delivery notes requiring signature.</p>
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
                        <p className="text-xs text-muted-foreground">
                          Expected Delivery: {new Date(note.expected_delivery_date).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Unsigned
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signing Form */}
      {selectedNote && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-primary" />
              Sign Delivery Note: {selectedNote.delivery_note_number}
            </CardTitle>
            <CardDescription>
              By signing this delivery note, you confirm receipt of goods as described
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Delivery Details */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Delivery Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">PO Number:</span>
                  <p className="font-medium">{selectedNote.po_number}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Supplier:</span>
                  <p className="font-medium">{selectedNote.supplier_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Amount:</span>
                  <p className="font-medium">KSh {selectedNote.total_amount?.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Dispatch Date:</span>
                  <p className="font-medium">{new Date(selectedNote.dispatch_date).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Comments */}
            <div className="space-y-2">
              <Label htmlFor="comments">Comments (Optional)</Label>
              <Textarea
                id="comments"
                placeholder="Add any comments about the delivery..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
              />
            </div>

            {/* Digital Signature */}
            <div className="space-y-2">
              <Label>Digital Signature *</Label>
              <div className="border rounded-lg p-4 bg-white">
                <ResponsiveSignatureCanvas
                  ref={signatureRef}
                  active={!!selectedNote}
                  minHeight={200}
                  className="rounded"
                />
                <div className="flex justify-between mt-2">
                  <p className="text-xs text-muted-foreground">
                    Draw your signature above
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => signatureRef.current?.clear()}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </div>

            {/* Security Warning */}
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-800">Legal Notice</h4>
                  <p className="text-sm text-yellow-700">
                    Your digital signature constitutes legal acceptance of the delivery as described in the delivery note. 
                    This action cannot be undone and may have legal implications.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button 
              onClick={handleSignDeliveryNote}
              disabled={signing}
              className="w-full"
              size="lg"
            >
              <FileSignature className="h-4 w-4 mr-2" />
              {signing ? "Signing..." : "Sign Delivery Note"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DeliveryNoteSigning;
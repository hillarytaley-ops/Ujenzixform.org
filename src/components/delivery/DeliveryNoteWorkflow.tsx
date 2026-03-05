import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileSignature, CheckCircle2, XCircle, AlertTriangle, Package,
  ClipboardCheck, Receipt, CreditCard, Loader2, Eye, Send
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';

interface DeliveryNote {
  id: string;
  dn_number: string;
  purchase_order_id: string;
  builder_id: string;
  supplier_id: string;
  delivery_address: string;
  delivery_date: string;
  items: any[];
  status: string;
  builder_signature?: string;
  builder_signed_at?: string;
  inspection_verified?: boolean;
  builder_decision?: 'accepted' | 'rejected' | null;
  rejection_reason?: string;
  purchase_order?: {
    po_number?: string;
    total_amount?: number;
  };
  supplier?: {
    company_name?: string;
  };
}

interface DeliveryNoteWorkflowProps {
  builderId: string;
  onComplete?: () => void;
}

export const DeliveryNoteWorkflow: React.FC<DeliveryNoteWorkflowProps> = ({
  builderId,
  onComplete
}) => {
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [selectedDN, setSelectedDN] = useState<DeliveryNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [showInspectionDialog, setShowInspectionDialog] = useState(false);
  const signatureRef = useRef<SignatureCanvas>(null);
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const { toast } = useToast();

  // Fetch pending delivery notes
  const fetchDeliveryNotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('delivery_notes')
        .select(`
          *,
          purchase_order:purchase_orders(po_number, total_amount),
          supplier:suppliers(company_name)
        `)
        .eq('builder_id', builderId)
        .in('status', ['pending_signature', 'signed', 'forwarded_to_supplier', 'inspection_pending'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeliveryNotes(data || []);
    } catch (error: any) {
      console.error('Error fetching delivery notes:', error);
      toast({
        title: "Error",
        description: "Failed to load delivery notes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (builderId) {
      fetchDeliveryNotes();
    }
  }, [builderId]);

  // Sign delivery note
  const handleSignDN = async () => {
    if (!selectedDN || !signatureRef.current) return;

    const isEmpty = signatureRef.current.isEmpty();
    if (isEmpty) {
      toast({
        title: "Signature Required",
        description: "Please provide your signature",
        variant: "destructive",
      });
      return;
    }

    try {
      setSigning(true);
      const signatureData = signatureRef.current.toDataURL('image/png');

      const { error } = await supabase
        .from('delivery_notes')
        .update({
          builder_signature: signatureData,
          builder_signed_at: new Date().toISOString(),
          builder_signed_by: builderId,
          status: 'signed',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedDN.id);

      if (error) throw error;

      // Forward to supplier
      const { error: forwardError } = await supabase
        .from('delivery_notes')
        .update({
          status: 'forwarded_to_supplier',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedDN.id);

      if (forwardError) throw forwardError;

      toast({
        title: "Delivery Note Signed",
        description: "DN has been forwarded to supplier. Please proceed with inspection.",
      });

      setShowSignatureDialog(false);
      signatureRef.current.clear();
      
      // Update status to inspection_pending
      await supabase
        .from('delivery_notes')
        .update({
          status: 'inspection_pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedDN.id);

      fetchDeliveryNotes();
    } catch (error: any) {
      console.error('Error signing DN:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to sign delivery note",
        variant: "destructive",
      });
    } finally {
      setSigning(false);
    }
  };

  // Handle inspection and acceptance/rejection
  const handleInspectionDecision = async (decision: 'accepted' | 'rejected') => {
    if (!selectedDN) return;

    if (decision === 'rejected' && !rejectionReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    try {
      setInspecting(true);

      const updateData: any = {
        inspection_verified: true,
        inspection_verified_at: new Date().toISOString(),
        inspection_notes: inspectionNotes || null,
        builder_decision: decision,
        builder_decision_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (decision === 'rejected') {
        updateData.status = 'rejected';
        updateData.rejection_reason = rejectionReason;
        
        // Notify supplier and admin
        await notifyRejection(selectedDN);
      } else {
        updateData.status = 'accepted';
        // GRN will be auto-created by trigger
      }

      const { error } = await supabase
        .from('delivery_notes')
        .update(updateData)
        .eq('id', selectedDN.id);

      if (error) throw error;

      toast({
        title: decision === 'accepted' ? "Materials Accepted" : "Materials Rejected",
        description: decision === 'accepted' 
          ? "GRN will be generated automatically. Supplier will be notified."
          : "Supplier and admin have been notified of the rejection.",
      });

      setShowInspectionDialog(false);
      setInspectionNotes('');
      setRejectionReason('');
      fetchDeliveryNotes();
      
      if (onComplete) onComplete();
    } catch (error: any) {
      console.error('Error processing inspection:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process inspection",
        variant: "destructive",
      });
    } finally {
      setInspecting(false);
    }
  };

  // Notify supplier and admin of rejection
  const notifyRejection = async (dn: DeliveryNote) => {
    try {
      // Create notification for supplier
      await supabase
        .from('notifications')
        .insert({
          user_id: dn.supplier_id,
          type: 'delivery_rejection',
          title: 'Delivery Rejected',
          message: `Delivery Note ${dn.dn_number} has been rejected by the builder. Reason: ${rejectionReason}`,
          metadata: { delivery_note_id: dn.id, purchase_order_id: dn.purchase_order_id }
        });

      // Create alert for admin
      await supabase
        .from('admin_alerts')
        .insert({
          type: 'delivery_rejection',
          title: 'Delivery Rejection Alert',
          message: `Delivery Note ${dn.dn_number} (PO: ${dn.purchase_order?.po_number}) has been rejected.`,
          severity: 'high',
          metadata: { 
            delivery_note_id: dn.id, 
            purchase_order_id: dn.purchase_order_id,
            builder_id: dn.builder_id,
            supplier_id: dn.supplier_id,
            rejection_reason: rejectionReason
          }
        });
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending_signature: { label: 'Pending Signature', variant: 'secondary' },
      signed: { label: 'Signed', variant: 'default' },
      forwarded_to_supplier: { label: 'Forwarded to Supplier', variant: 'default' },
      inspection_pending: { label: 'Inspection Required', variant: 'secondary' },
      inspection_completed: { label: 'Inspection Completed', variant: 'default' },
      accepted: { label: 'Accepted', variant: 'default' },
      rejected: { label: 'Rejected', variant: 'destructive' }
    };

    const statusInfo = statusMap[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading delivery notes...</p>
        </CardContent>
      </Card>
    );
  }

  if (deliveryNotes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">No delivery notes pending action</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Delivery Notes</h3>
          <p className="text-sm text-gray-500">Sign and verify your deliveries</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchDeliveryNotes}>
          Refresh
        </Button>
      </div>

      {deliveryNotes.map((dn) => (
        <Card key={dn.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{dn.dn_number}</CardTitle>
                <CardDescription>
                  PO: {dn.purchase_order?.po_number || 'N/A'} • 
                  Supplier: {dn.supplier?.company_name || 'N/A'}
                </CardDescription>
              </div>
              {getStatusBadge(dn.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-gray-500">Delivery Address</Label>
                  <p>{dn.delivery_address}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Delivery Date</Label>
                  <p>{new Date(dn.delivery_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Total Amount</Label>
                  <p>KES {Number(dn.purchase_order?.total_amount || 0).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Items</Label>
                  <p>{Array.isArray(dn.items) ? dn.items.length : 0} items</p>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                {dn.status === 'pending_signature' && (
                  <Button
                    onClick={() => {
                      setSelectedDN(dn);
                      setShowSignatureDialog(true);
                    }}
                    className="flex-1"
                  >
                    <FileSignature className="h-4 w-4 mr-2" />
                    Sign Delivery Note
                  </Button>
                )}

                {dn.status === 'inspection_pending' && (
                  <Button
                    onClick={() => {
                      setSelectedDN(dn);
                      setShowInspectionDialog(true);
                    }}
                    variant="default"
                    className="flex-1"
                  >
                    <ClipboardCheck className="h-4 w-4 mr-2" />
                    Verify & Inspect
                  </Button>
                )}

                {dn.status === 'accepted' && (
                  <Button variant="outline" className="flex-1" disabled>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Accepted - GRN Generated
                  </Button>
                )}

                {dn.status === 'rejected' && (
                  <Button variant="outline" className="flex-1" disabled>
                    <XCircle className="h-4 w-4 mr-2" />
                    Rejected
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Signature Dialog */}
      <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sign Delivery Note</DialogTitle>
            <DialogDescription>
              Please sign the delivery note to acknowledge receipt of materials
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-white">
              <SignatureCanvas
                ref={signatureRef}
                canvasProps={{
                  width: 600,
                  height: 200,
                  className: 'signature-canvas border rounded w-full'
                }}
              />
              <div className="flex justify-between mt-2">
                <p className="text-xs text-gray-500">Draw your signature above</p>
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
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your signature is legally binding. By signing, you acknowledge receipt of the materials listed.
              </AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowSignatureDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSignDN}
                disabled={signing}
                className="flex-1"
              >
                {signing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signing...
                  </>
                ) : (
                  <>
                    <FileSignature className="h-4 w-4 mr-2" />
                    Sign & Forward
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inspection Dialog */}
      <Dialog open={showInspectionDialog} onOpenChange={setShowInspectionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Inspect & Verify Materials</DialogTitle>
            <DialogDescription>
              Please verify that all materials have been received and are in good condition
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Inspection Notes (Optional)</Label>
              <Textarea
                placeholder="Add any notes about the condition of materials, packaging, etc."
                value={inspectionNotes}
                onChange={(e) => setInspectionNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Alert>
              <ClipboardCheck className="h-4 w-4" />
              <AlertDescription>
                Please carefully inspect all materials before accepting. If materials are damaged or incorrect, please reject and provide a reason.
              </AlertDescription>
            </Alert>

            <div>
              <Label>Rejection Reason (if rejecting)</Label>
              <Textarea
                placeholder="Please provide a detailed reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className={selectedDN?.builder_decision === 'rejected' ? '' : 'opacity-50'}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="destructive"
                onClick={() => handleInspectionDecision('rejected')}
                disabled={inspecting || !rejectionReason.trim()}
                className="flex-1"
              >
                {inspecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Materials
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleInspectionDecision('accepted')}
                disabled={inspecting}
                className="flex-1"
              >
                {inspecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Accept Materials
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

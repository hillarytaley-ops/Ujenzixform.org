import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
import { ResponsiveSignatureCanvas } from '@/components/ui/ResponsiveSignatureCanvas';
import { sortSupplyChainDocsNewestFirst } from '@/utils/sortSupplyChainDocs';

/** Cap rows returned — avoids huge payloads and keeps queries within DB statement limits. */
const DN_WORKFLOW_LIST_LIMIT = 500;

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
  /**
   * auth.users.id — used for builder_signed_by (FK) and to match delivery_notes.builder_id
   * when PO.buyer_id stored the session user id.
   */
  builderAuthUserId: string;
  /** profiles.id — matches delivery_notes.builder_id when PO.buyer_id stored profile row id */
  builderProfileId?: string | null;
  onComplete?: () => void;
}

function uniqueBuilderIds(
  authId: string | undefined,
  profileId?: string | null
): string[] {
  return [...new Set([authId, profileId].filter(Boolean))] as string[];
}

const INSPECTION_STATEMENT_PRESETS: { id: string; label: string; text: string }[] = [
  {
    id: 'standards',
    label: 'Meets standards',
    text: 'I have reviewed these items and certify that they meet the required standards as per the delivery note / invoice.',
  },
  {
    id: 'complete_ok',
    label: 'Complete & good condition',
    text: 'All listed materials were received in full, match the delivery note, and are in acceptable condition for use on site.',
  },
  {
    id: 'minor_variation',
    label: 'Minor variation noted',
    text: 'Materials accepted subject to minor packaging or batch variation noted; no impact on specified grade or quantity for the order.',
  },
  {
    id: 'received_site',
    label: 'Received on site',
    text: 'Goods received on site as described. Quantities checked against the delivery note and accepted.',
  },
];

const REJECTION_REASON_PRESETS: { id: string; label: string; text: string }[] = [
  {
    id: 'damaged',
    label: 'Damaged goods',
    text: 'Rejected: materials arrived damaged or unsuitable for use. Details to follow with photos if required.',
  },
  {
    id: 'wrong_items',
    label: 'Wrong items / qty',
    text: 'Rejected: wrong product specification or quantity does not match the purchase order / delivery note.',
  },
  {
    id: 'incomplete',
    label: 'Incomplete delivery',
    text: 'Rejected: delivery incomplete — missing line items compared to the delivery note.',
  },
  {
    id: 'quality',
    label: 'Quality not acceptable',
    text: 'Rejected: quality of materials does not meet agreed specification or samples.',
  },
  {
    id: 'late',
    label: 'Late / failed delivery',
    text: 'Rejected: delivery failed agreed timing or site access; materials not accepted in current state.',
  },
];

export const DeliveryNoteWorkflow: React.FC<DeliveryNoteWorkflowProps> = ({
  builderAuthUserId,
  builderProfileId,
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
  /** First fetch shows skeleton; later runs (e.g. profile id resolved) refresh without blanking the panel. */
  const dnFetchGenerationRef = useRef(0);

  // Fetch pending delivery notes (no nested embeds — avoids PostgREST 400 when FK hints are missing from schema cache)
  const fetchDeliveryNotes = async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    try {
      if (!silent) setLoading(true);
      const builderIds = uniqueBuilderIds(builderAuthUserId, builderProfileId);
      if (builderIds.length === 0) {
        setDeliveryNotes([]);
        return;
      }

      const { data: rows, error } = await supabase
        .from('delivery_notes')
        .select('*')
        .in('builder_id', builderIds)
        .in('status', ['pending_signature', 'signed', 'forwarded_to_supplier', 'inspection_pending'])
        .order('created_at', { ascending: false })
        .limit(DN_WORKFLOW_LIST_LIMIT);

      if (error) throw error;
      const list = rows || [];
      if (list.length === 0) {
        setDeliveryNotes([]);
        return;
      }

      const poIds = [...new Set(list.map((r) => r.purchase_order_id).filter(Boolean))];
      const supplierIds = [...new Set(list.map((r) => r.supplier_id).filter(Boolean))];

      const [poRes, supRes] = await Promise.all([
        poIds.length
          ? supabase.from('purchase_orders').select('id, po_number, total_amount').in('id', poIds)
          : Promise.resolve({ data: [] as { id: string; po_number?: string; total_amount?: number }[], error: null }),
        supplierIds.length
          ? supabase.from('suppliers').select('id, company_name').in('id', supplierIds)
          : Promise.resolve({ data: [] as { id: string; company_name?: string }[], error: null }),
      ]);

      if (poRes.error) throw poRes.error;
      if (supRes.error) throw supRes.error;

      const poById = Object.fromEntries((poRes.data || []).map((p) => [p.id, p]));
      const supById = Object.fromEntries((supRes.data || []).map((s) => [s.id, s]));

      const enriched: DeliveryNote[] = list.map((r: any) => {
        const po = poById[r.purchase_order_id];
        const sup = supById[r.supplier_id];
        return {
          ...r,
          purchase_order: po
            ? { po_number: po.po_number, total_amount: po.total_amount ?? undefined }
            : undefined,
          supplier: sup ? { company_name: sup.company_name ?? undefined } : undefined,
        };
      });

      setDeliveryNotes(
        sortSupplyChainDocsNewestFirst(enriched as unknown as Record<string, unknown>[]) as DeliveryNote[]
      );
    } catch (error: any) {
      console.error('Error fetching delivery notes:', error);
      const code = error?.code as string | undefined;
      const msg = String(error?.message || '');
      const timedOut = code === '57014' || /timeout/i.test(msg);
      toast({
        title: timedOut ? 'Delivery notes timed out' : 'Error',
        description: timedOut
          ? 'The list took too long to load. Try Refresh, or ask your admin to run the latest Supabase migration (delivery_notes index).'
          : 'Failed to load delivery notes',
        variant: 'destructive',
      });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    dnFetchGenerationRef.current = 0;
  }, [builderAuthUserId]);

  useEffect(() => {
    if (!(builderAuthUserId || builderProfileId)) {
      setDeliveryNotes([]);
      setLoading(false);
      return;
    }
    const silent = dnFetchGenerationRef.current > 0;
    dnFetchGenerationRef.current += 1;
    void fetchDeliveryNotes({ silent });
  }, [builderAuthUserId, builderProfileId]);

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
          builder_signed_by: builderAuthUserId,
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

      void fetchDeliveryNotes({ silent: true });
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
      void fetchDeliveryNotes({ silent: true });

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

  const showInitialLoad = loading && deliveryNotes.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Delivery Notes</h3>
          <p className="text-sm text-gray-500">Sign and verify your deliveries</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => void fetchDeliveryNotes({ silent: true })}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
        </Button>
      </div>

      {showInitialLoad && (
        <div className="space-y-3" aria-busy="true" aria-label="Loading delivery notes">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="space-y-3 py-6">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full max-w-md" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-10 w-36" />
                  <Skeleton className="h-10 w-32" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!showInitialLoad && deliveryNotes.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No delivery notes pending action</p>
          </CardContent>
        </Card>
      )}

      {!showInitialLoad &&
        deliveryNotes.length > 0 &&
        deliveryNotes.map((dn) => (
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

              <div className="flex flex-wrap gap-2 pt-4 border-t">
                {dn.status === 'pending_signature' && (
                  <Button
                    onClick={() => {
                      setSelectedDN(dn);
                      setShowSignatureDialog(true);
                    }}
                    className="w-auto min-w-0 !bg-orange-500 text-white hover:!bg-orange-600"
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
                    className="w-auto min-w-0 !bg-orange-500 text-white hover:!bg-orange-600"
                  >
                    <ClipboardCheck className="h-4 w-4 mr-2" />
                    Verify & Inspect
                  </Button>
                )}

                {dn.status === 'accepted' && (
                  <Button variant="outline" className="w-auto min-w-0" disabled>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Accepted - GRN Generated
                  </Button>
                )}

                {dn.status === 'rejected' && (
                  <Button variant="outline" className="w-auto min-w-0" disabled>
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
              <ResponsiveSignatureCanvas
                ref={signatureRef}
                active={showSignatureDialog}
                minHeight={200}
                className="rounded"
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
      <Dialog
        open={showInspectionDialog}
        onOpenChange={(open) => {
          setShowInspectionDialog(open);
          if (!open) {
            setInspectionNotes('');
            setRejectionReason('');
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Inspect & Verify Materials</DialogTitle>
            <DialogDescription>
              Choose a quick statement or write your own notes. Use Reject with a reason if anything does not match the order.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Quick statements (accept)</Label>
              <p className="text-xs text-muted-foreground">
                Tap one to fill the box — you can still edit the text.
              </p>
              <div className="flex flex-wrap gap-2">
                {INSPECTION_STATEMENT_PRESETS.map((p) => (
                  <Button
                    key={p.id}
                    type="button"
                    variant={inspectionNotes === p.text ? 'default' : 'outline'}
                    size="sm"
                    className="h-auto max-w-full whitespace-normal py-2 text-left text-xs sm:text-sm"
                    onClick={() => setInspectionNotes(p.text)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="inspection-notes">Inspection notes (optional)</Label>
              <Textarea
                id="inspection-notes"
                placeholder="Add any notes about the condition of materials, packaging, etc."
                value={inspectionNotes}
                onChange={(e) => setInspectionNotes(e.target.value)}
                rows={4}
              />
            </div>

            <Alert>
              <ClipboardCheck className="h-4 w-4" />
              <AlertDescription>
                Inspect everything before you accept. To reject, pick a reason below (or type your own) — the Reject button stays off until a reason is filled.
              </AlertDescription>
            </Alert>

            <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <Label className="text-destructive">Reject — quick reasons</Label>
              <p className="text-xs text-muted-foreground">
                Select a reason to enable <strong>Reject</strong>, or type in the box.
              </p>
              <div className="flex flex-wrap gap-2">
                {REJECTION_REASON_PRESETS.map((p) => (
                  <Button
                    key={p.id}
                    type="button"
                    variant={rejectionReason === p.text ? 'destructive' : 'outline'}
                    size="sm"
                    className="h-auto max-w-full whitespace-normal border-destructive/40 py-2 text-left text-xs sm:text-sm"
                    onClick={() => setRejectionReason(p.text)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="rejection-reason">Rejection reason (required to reject)</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Required if you reject — use a quick reason above or describe the issue here."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-2">
              <Button
                type="button"
                onClick={() => handleInspectionDecision('accepted')}
                disabled={inspecting}
                className="w-full !bg-green-600 text-white hover:!bg-green-700"
              >
                {inspecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Accept materials
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => handleInspectionDecision('rejected')}
                disabled={inspecting || !rejectionReason.trim()}
                className="w-full"
                title={!rejectionReason.trim() ? 'Choose or enter a rejection reason first' : undefined}
              >
                {inspecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject materials
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

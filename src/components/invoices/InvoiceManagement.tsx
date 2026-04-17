import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import {
  Receipt,
  Edit,
  CreditCard,
  Loader2,
  Send,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { sortSupplyChainDocsNewestFirst } from '@/utils/sortSupplyChainDocs';
import { PaystackCheckout } from '@/components/payment/PaystackCheckout';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

interface Invoice {
  id: string;
  invoice_number: string;
  purchase_order_id: string;
  grn_id?: string;
  supplier_id: string;
  builder_id: string;
  items: any[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  invoice_date: string;
  due_date: string;
  status: string;
  payment_status: string;
  is_editable: boolean;
  acknowledged_at?: string;
  created_at?: string;
  notes?: string | null;
  purchase_order?: {
    po_number?: string;
  };
  supplier?: {
    company_name?: string;
  };
}

interface InvoiceManagementProps {
  userId: string;
  userRole: 'builder' | 'supplier' | 'admin';
  /** public.suppliers.id — passed to list_invoices_for_supplier RPC */
  supplierRecordId?: string | null;
  /** profiles.id — match invoices / PO buyer_id when stored as profile row id (same as delivery notes) */
  builderProfileId?: string | null;
}

export const InvoiceManagement: React.FC<InvoiceManagementProps> = ({
  userId,
  userRole,
  supplierRecordId,
  builderProfileId,
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);
  /** Which invoice row is running the async “acknowledge then open pay” flow */
  const [payNowBusyId, setPayNowBusyId] = useState<string | null>(null);
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  /** Prevents double-launch when `payInvoice` stays in URL across re-renders. */
  const payInvoiceUrlHandledRef = useRef<string | null>(null);
  /** First fetch per user shows skeleton; later fetches (e.g. profile id resolved) refresh without blanking. */
  const invoiceFetchGenerationRef = useRef(0);

  // Form state for editing
  const [editedItems, setEditedItems] = useState<any[]>([]);
  const [editedSubtotal, setEditedSubtotal] = useState(0);
  const [editedTax, setEditedTax] = useState(0);
  const [editedDiscount, setEditedDiscount] = useState(0);
  const [editedTotal, setEditedTotal] = useState(0);
  const [editedNotes, setEditedNotes] = useState('');

  const fetchInvoices = async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    try {
      if (!silent) setLoading(true);

      const invoiceSelect = `
          *,
          purchase_order:purchase_orders(po_number),
          supplier:suppliers(company_name)
        `;

      // Supplier: prefer RPC with p_supplier_id when dashboard resolved suppliers.id.
      if (userRole === 'supplier') {
        const rpcArgs =
          supplierRecordId != null && supplierRecordId !== ''
            ? { p_supplier_id: supplierRecordId }
            : ({} as Record<string, string>);
        const rpc = await supabase.rpc('list_invoices_for_supplier', rpcArgs);
        let base: any[] = [];
        if (!rpc.error && Array.isArray(rpc.data)) {
          base = rpc.data;
        } else {
          if (rpc.error) {
            console.warn('list_invoices_for_supplier RPC unavailable, using direct select:', rpc.error.message);
          }
          const { data, error } = await supabase
            .from('invoices')
            .select(invoiceSelect)
            .order('created_at', { ascending: false });
          if (error) throw error;
          setInvoices(
            sortSupplyChainDocsNewestFirst((data || []) as unknown as Record<string, unknown>[]) as Invoice[]
          );
          return;
        }

        const poIds = [...new Set(base.map((i) => i.purchase_order_id).filter(Boolean))];
        const supIds = [...new Set(base.map((i) => i.supplier_id).filter(Boolean))];
        const [poRes, supRes] = await Promise.all([
          poIds.length
            ? supabase.from('purchase_orders').select('id, po_number').in('id', poIds)
            : Promise.resolve({ data: [] as { id: string; po_number?: string }[], error: null }),
          supIds.length
            ? supabase.from('suppliers').select('id, company_name').in('id', supIds)
            : Promise.resolve({ data: [] as { id: string; company_name?: string }[], error: null }),
        ]);
        if (poRes.error) throw poRes.error;
        if (supRes.error) throw supRes.error;
        const poById = Object.fromEntries((poRes.data || []).map((p) => [p.id, p]));
        const supById = Object.fromEntries((supRes.data || []).map((s) => [s.id, s]));
        const enriched = base.map((inv) => ({
          ...inv,
          purchase_order: poById[inv.purchase_order_id]
            ? { po_number: poById[inv.purchase_order_id].po_number }
            : undefined,
          supplier: supById[inv.supplier_id]
            ? { company_name: supById[inv.supplier_id].company_name }
            : undefined,
        })) as Invoice[];
        setInvoices(
          sortSupplyChainDocsNewestFirst(enriched as unknown as Record<string, unknown>[]) as Invoice[]
        );
        return;
      }

      if (userRole === 'builder') {
        const builderKeys = [...new Set([userId, builderProfileId].filter(Boolean))] as string[];

        const [{ data: byBuilderId, error: e1 }, { data: myOrders, error: e2 }] = await Promise.all([
          supabase.from('invoices').select(invoiceSelect).in('builder_id', builderKeys),
          supabase.from('purchase_orders').select('id').in('buyer_id', builderKeys),
        ]);
        if (e1) throw e1;
        if (e2) throw e2;

        const poIds = (myOrders || []).map((p) => p.id).filter(Boolean);
        let byPo: Invoice[] = [];
        if (poIds.length > 0) {
          const { data: invPo, error: e3 } = await supabase
            .from('invoices')
            .select(invoiceSelect)
            .in('purchase_order_id', poIds);
          if (e3) throw e3;
          byPo = (invPo || []) as Invoice[];
        }

        const merged = new Map<string, Invoice>();
        for (const inv of [...(byBuilderId || []), ...byPo] as Invoice[]) {
          merged.set(inv.id, inv);
        }
        const list = sortSupplyChainDocsNewestFirst(
          Array.from(merged.values()) as unknown as Record<string, unknown>[]
        ) as Invoice[];
        setInvoices(list);
        return;
      }

      const { data, error } = await supabase
        .from('invoices')
        .select(invoiceSelect)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(
        sortSupplyChainDocsNewestFirst((data || []) as unknown as Record<string, unknown>[]) as Invoice[]
      );
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      toast({
        title: "Error",
        description: "Failed to load invoices",
        variant: "destructive",
      });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    invoiceFetchGenerationRef.current = 0;
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const silent = invoiceFetchGenerationRef.current > 0;
    invoiceFetchGenerationRef.current += 1;
    void fetchInvoices({ silent });
  }, [userId, userRole, supplierRecordId, builderProfileId]);

  const builderPayPrompt = useMemo(() => {
    if (userRole !== 'builder') {
      return { needAcknowledge: [] as Invoice[], needPayment: [] as Invoice[] };
    }
    const unpaid = (i: Invoice) => (i.payment_status || 'pending') !== 'paid';
    const needAcknowledge = invoices.filter(
      (i) => i.status === 'sent' && !i.acknowledged_at && unpaid(i)
    );
    const needPayment = invoices.filter(
      (i) =>
        unpaid(i) && (i.status === 'acknowledged' || !!i.acknowledged_at)
    );
    return { needAcknowledge, needPayment };
  }, [invoices, userRole]);

  const handleEditInvoice = (invoice: Invoice) => {
    if (!invoice.is_editable) {
      toast({
        title: "Cannot Edit",
        description: "This invoice is no longer editable",
        variant: "destructive",
      });
      return;
    }

    setEditingInvoice(invoice);
    setEditedItems(Array.isArray(invoice.items) ? [...invoice.items] : []);
    setEditedSubtotal(invoice.subtotal);
    setEditedTax(invoice.tax_amount);
    setEditedDiscount(invoice.discount_amount);
    setEditedTotal(invoice.total_amount);
    setEditedNotes(invoice.notes || '');
    setShowEditDialog(true);
  };

  const calculateTotal = () => {
    const total = editedSubtotal + editedTax - editedDiscount;
    setEditedTotal(total);
  };

  useEffect(() => {
    calculateTotal();
  }, [editedSubtotal, editedTax, editedDiscount]);

  const handleSaveInvoice = async () => {
    if (!editingInvoice) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('invoices')
        .update({
          items: editedItems,
          subtotal: editedSubtotal,
          tax_amount: editedTax,
          discount_amount: editedDiscount,
          total_amount: editedTotal,
          notes: editedNotes,
          last_edited_at: new Date().toISOString(),
          last_edited_by: userId,
          status: 'sent', // Mark as sent when supplier edits
          updated_at: new Date().toISOString()
        })
        .eq('id', editingInvoice.id);

      if (error) throw error;

      const poId = editingInvoice.purchase_order_id;
      const firstTimeSent = editingInvoice.status !== 'sent';
      if (userRole === 'supplier' && firstTimeSent && poId) {
        const { data: poRow } = await supabase
          .from('purchase_orders')
          .select('delivery_provider_id, po_number')
          .eq('id', poId)
          .maybeSingle();
        const providerUid = poRow?.delivery_provider_id as string | undefined;
        if (providerUid) {
          const poLabel = poRow?.po_number ? ` #${poRow.po_number}` : '';
          const { error: nErr } = await supabase.from('notifications').insert({
            user_id: providerUid,
            type: 'invoice_pay_builder_prompt',
            title: 'Pay the professional builder now',
            message: `Invoice ${editingInvoice.invoice_number} was forwarded to the builder for order${poLabel}. Complete payment to the builder immediately (per your delivery agreement).`,
            priority: 'urgent',
            data: {
              invoice_id: editingInvoice.id,
              purchase_order_id: poId,
              invoice_number: editingInvoice.invoice_number,
            },
            action_url: '/delivery-dashboard?tab=pay',
            action_label: 'Open Pay tab',
          });
          if (nErr) {
            console.warn('Invoice forward: could not notify delivery provider:', nErr.message);
          }
        }
      }

      toast({
        title: "Invoice Updated",
        description: "Invoice has been updated and sent to builder",
      });

      setShowEditDialog(false);
      void fetchInvoices({ silent: true });
    } catch (error: any) {
      console.error('Error saving invoice:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save invoice",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  /** Builder: one obvious “Pay now” — acknowledges supplier invoice if needed, then opens Paystack / record dialog */
  const handlePayNowClick = async (invoice: Invoice) => {
    if (userRole !== 'builder') return;
    if ((invoice.payment_status || 'pending') === 'paid') return;

    const st = String(invoice.status || '').toLowerCase();
    if (st === 'draft' || st === 'cancelled') {
      toast({
        title: 'Not payable yet',
        description: 'This invoice is still a draft or was cancelled.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setAcknowledging(true);
      setPayNowBusyId(invoice.id);

      let next = { ...invoice };

      if (invoice.status === 'sent' && !invoice.acknowledged_at) {
        const ackAt = new Date().toISOString();
        const { error } = await supabase
          .from('invoices')
          .update({
            acknowledged_at: ackAt,
            acknowledged_by: userId,
            status: 'acknowledged',
            updated_at: ackAt,
          })
          .eq('id', invoice.id);

        if (error) throw error;
        next = { ...invoice, acknowledged_at: ackAt, status: 'acknowledged' };
      }

      setPaymentReference('');
      setPayInvoice(next);
      void fetchInvoices({ silent: true });
      toast({
        title: 'Pay now',
        description: 'Use Paystack below or record a payment you already sent to the supplier.',
      });
    } catch (error: unknown) {
      console.error('Pay now / acknowledge:', error);
      toast({
        title: 'Could not start payment',
        description: error instanceof Error ? error.message : 'Try again or contact support.',
        variant: 'destructive',
      });
    } finally {
      setAcknowledging(false);
      setPayNowBusyId(null);
    }
  };

  /** Deep link: ?tab=invoices&payInvoice=<uuid> (e.g. from Orders row). */
  useEffect(() => {
    if (userRole !== 'builder' || loading) return;
    const invId = searchParams.get('payInvoice');
    if (!invId) {
      payInvoiceUrlHandledRef.current = null;
      return;
    }
    if (payInvoiceUrlHandledRef.current === invId) return;
    const match = invoices.find((i) => i.id === invId);
    if (!match) return;

    payInvoiceUrlHandledRef.current = invId;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('payInvoice');
        return next;
      },
      { replace: true }
    );
    void handlePayNowClick(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot deep link; handler identity changes each render
  }, [userRole, loading, invoices, searchParams, setSearchParams]);

  const handleRecordPayment = async () => {
    if (!payInvoice) return;
    try {
      setRecordingPayment(true);
      const ref = paymentReference.trim();
      const stamp = new Date().toISOString();
      const line = ref
        ? `\n[${stamp}] Builder marked paid — reference: ${ref}`
        : `\n[${stamp}] Builder marked paid`;
      const nextNotes = `${payInvoice.notes || ''}${line}`.trim();

      const { error } = await supabase
        .from('invoices')
        .update({
          payment_status: 'paid',
          notes: nextNotes,
          updated_at: stamp,
        })
        .eq('id', payInvoice.id);

      if (error) throw error;

      toast({
        title: "Payment recorded",
        description: "This invoice is marked paid. Your supplier can see the update on their side.",
      });
      setPayInvoice(null);
      setPaymentReference('');
      void fetchInvoices({ silent: true });
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast({
        title: "Could not record payment",
        description: error.message || "Update failed. Try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setRecordingPayment(false);
    }
  };

  const getStatusBadge = (status: string, paymentStatus: string) => {
    const paid = (paymentStatus || '') === 'paid';
    if (paid) {
      return <Badge variant="default" className="bg-green-500">Paid</Badge>;
    }
    const workflow =
      status === 'acknowledged' ? (
        <Badge variant="default" className="bg-blue-500">Acknowledged</Badge>
      ) : status === 'sent' ? (
        <Badge variant="secondary">Sent</Badge>
      ) : (
        <Badge variant="outline">{status}</Badge>
      );
    return (
      <div className="flex flex-row flex-wrap items-center justify-end gap-1 shrink-0">
        <Badge variant="destructive" className="font-semibold">
          Unpaid
        </Badge>
        {workflow}
      </div>
    );
  };

  const showInitialLoad = loading && invoices.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Supplier invoices (pay here)</h3>
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => void fetchInvoices({ silent: true })}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
        </Button>
      </div>

      {showInitialLoad && (
        <div className="space-y-3" aria-busy="true" aria-label="Loading invoices">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="space-y-3 py-6">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full max-w-md" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-10 w-28" />
                  <Skeleton className="h-10 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!showInitialLoad && (
        <>
          {userRole === 'builder' &&
            (builderPayPrompt.needAcknowledge.length > 0 ||
              builderPayPrompt.needPayment.length > 0) && (
              <Alert className="border-amber-500/60 bg-amber-50 text-amber-950 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertTitle className="text-amber-950 dark:text-amber-50">
                  Pay suppliers without delay
                </AlertTitle>
                <AlertDescription className="space-y-2 text-amber-900/90 dark:text-amber-100/90">
                  {builderPayPrompt.needAcknowledge.length > 0 && (
                    <p>
                      <strong>{builderPayPrompt.needAcknowledge.length}</strong> invoice
                      {builderPayPrompt.needAcknowledge.length === 1 ? ' was' : 's were'} forwarded by your
                      supplier{builderPayPrompt.needAcknowledge.length === 1 ? '' : 's'}. Tap the green{" "}
                      <strong>Pay now</strong> button on each row (we acknowledge for you if needed, then you pay).
                    </p>
                  )}
                  {builderPayPrompt.needPayment.length > 0 && (
                    <p>
                      <strong>{builderPayPrompt.needPayment.length}</strong> invoice
                      {builderPayPrompt.needPayment.length === 1 ? ' is' : 's are'} ready for payment — complete
                      transfer (M-Pesa, bank, etc.) per your agreement, then tap <strong>Pay now</strong> for Paystack or
                      to record it.
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}

          {invoices.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground text-sm">
                No invoices yet.
              </CardContent>
            </Card>
          ) : null}

          {invoices.map((invoice) => (
        <Card key={invoice.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{invoice.invoice_number}</CardTitle>
                <p className="text-sm text-gray-500">
                  PO: {invoice.purchase_order?.po_number || 'N/A'} •{' '}
                  {invoice.supplier?.company_name || 'Supplier'}
                </p>
                {userRole === 'builder' && invoice.payment_status !== 'paid' && (
                  <p className="mt-2 text-sm font-medium text-amber-800 dark:text-amber-200">
                    {String(invoice.status || '').toLowerCase() === 'draft' ? (
                      <>
                        This invoice is still a <strong>draft</strong> on the supplier side.{" "}
                        <strong>Pay now</strong> unlocks when they send it to you.
                      </>
                    ) : (
                      <>
                        Tap <strong>Pay now</strong> to pay with Paystack or record a transfer you already made.
                      </>
                    )}
                  </p>
                )}
              </div>
              {getStatusBadge(invoice.status, invoice.payment_status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Invoice Date</p>
                  <p className="font-medium">{new Date(invoice.invoice_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">Due Date</p>
                  <p className="font-medium">{new Date(invoice.due_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">Subtotal</p>
                  <p className="font-medium">KES {Number(invoice.subtotal).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">Total Amount</p>
                  <p className="font-medium text-lg">KES {Number(invoice.total_amount).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex flex-row flex-wrap items-center gap-2 overflow-x-auto pt-4 border-t sm:flex-nowrap sm:overflow-visible">
                {userRole === 'supplier' && invoice.is_editable && (
                  <Button
                    variant="outline"
                    onClick={() => handleEditInvoice(invoice)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Invoice
                  </Button>
                )}
                
                {userRole === 'builder' &&
                  (invoice.payment_status || 'pending') !== 'paid' &&
                  String(invoice.status || '').toLowerCase() !== 'cancelled' && (
                    <Button
                      type="button"
                      className="min-w-[130px] shrink-0 bg-emerald-600 px-3 py-5 text-sm font-bold text-white shadow-md hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300 disabled:text-emerald-950/70 disabled:hover:bg-emerald-300 sm:min-w-[160px] sm:px-4 sm:py-5 sm:text-base"
                      onClick={() => void handlePayNowClick(invoice)}
                      disabled={
                        ['draft'].includes(String(invoice.status || '').toLowerCase()) ||
                        (acknowledging && payNowBusyId === invoice.id)
                      }
                      title={
                        String(invoice.status || '').toLowerCase() === 'draft'
                          ? 'Supplier must send this invoice before you can pay.'
                          : undefined
                      }
                    >
                      {acknowledging && payNowBusyId === invoice.id ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Opening…
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-5 w-5 mr-2" />
                          Pay now
                        </>
                      )}
                    </Button>
                  )}

                <Button variant="outline" type="button" className="min-w-[120px] shrink-0">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
          ))}
        </>
      )}

      <Dialog
        open={!!payInvoice}
        onOpenChange={(open) => {
          if (!open) {
            setPayInvoice(null);
            setPaymentReference('');
          }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Settle this invoice</DialogTitle>
            <DialogDescription>
              Pay with Paystack (card, M-Pesa, bank, etc. — whatever your Paystack business has enabled), or record a
              payment you already made directly to the supplier.
            </DialogDescription>
          </DialogHeader>
          {payInvoice && (
            <div className="space-y-4 py-2">
              <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                <p className="font-medium">{payInvoice.invoice_number}</p>
                <p className="text-muted-foreground">
                  {payInvoice.supplier?.company_name || 'Supplier'} ·{' '}
                  <span className="font-semibold text-foreground">
                    KES {Number(payInvoice.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </p>
              </div>

              <PaystackCheckout
                amount={Number(payInvoice.total_amount)}
                currency="KES"
                description={`Invoice ${payInvoice.invoice_number} — ${payInvoice.supplier?.company_name || 'Supplier'}`}
                orderId={`inv_${payInvoice.id}`}
                successNavigateTo="/professional-builder-dashboard?tab=invoices"
                onCancel={() => {
                  setPayInvoice(null);
                  setPaymentReference('');
                }}
              />

              <Separator className="my-2" />
              <p className="text-center text-xs text-muted-foreground">Paid directly to the supplier?</p>

              <div className="space-y-2">
                <Label htmlFor="pay-ref">Payment reference (optional)</Label>
                <Input
                  id="pay-ref"
                  placeholder="e.g. M-Pesa confirmation code"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setPayInvoice(null);
                setPaymentReference('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700"
              disabled={recordingPayment}
              onClick={() => void handleRecordPayment()}
            >
              {recordingPayment ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  I've paid — record payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Invoice Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Invoice</DialogTitle>
            <DialogDescription>
              Update invoice details. Changes will be sent to the builder.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Subtotal (KES)</Label>
              <Input
                type="number"
                value={editedSubtotal}
                onChange={(e) => setEditedSubtotal(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Tax Amount (KES)</Label>
              <Input
                type="number"
                value={editedTax}
                onChange={(e) => setEditedTax(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Discount Amount (KES)</Label>
              <Input
                type="number"
                value={editedDiscount}
                onChange={(e) => setEditedDiscount(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Total Amount (KES)</Label>
              <Input
                type="number"
                value={editedTotal}
                disabled
                className="font-bold"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={editedNotes}
                onChange={(e) => setEditedNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveInvoice}
                disabled={saving}
                className="flex-1"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Save & Send
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

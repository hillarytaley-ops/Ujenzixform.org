import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileText, Package, Receipt, Loader2, Eye, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { InvoiceManagement } from '@/components/invoices/InvoiceManagement';
import { useToast } from '@/hooks/use-toast';
import { openDeliveryNotePdfWindow } from '@/utils/deliveryNoteDocument';
import { MobileHorizontalScroll } from '@/components/ui/mobile-horizontal-scroll';
import { sortSupplyChainDocsNewestFirst } from '@/utils/sortSupplyChainDocs';

interface SupplierInvoiceHubProps {
  userId: string;
  supplierRecordId: string | null;
  isDarkMode: boolean;
  textColor: string;
  mutedText: string;
  cardBg: string;
}

function humanizeStatus(status: string | undefined) {
  if (!status) return '—';
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

type DeliveryNoteGroup = 'pending_signature' | 'accepted' | 'rejected_or_cancelled' | 'other';

/** Supplier-facing buckets: pending builder sign-off vs accepted / in supplier workflow. */
function getDeliveryNoteGroup(
  dn: Record<string, unknown>,
  signatureFallbackByDnId: Record<string, { signature: string; signedAt: string }>
): DeliveryNoteGroup {
  const st = String(dn.status ?? '').toLowerCase();
  const decision = String(dn.builder_decision ?? '').toLowerCase();
  if (decision === 'rejected' || st === 'cancelled') return 'rejected_or_cancelled';

  const pendingLike = new Set([
    'pending_signature',
    'pending_approval',
    'draft',
    'pending',
  ]);
  if (pendingLike.has(st)) return 'pending_signature';

  const acceptedStatuses = new Set([
    'signed',
    'forwarded_to_supplier',
    'inspection_pending',
    'delivered',
    'completed',
    'approved',
  ]);
  if (decision === 'accepted' || acceptedStatuses.has(st)) return 'accepted';

  const dnId = String(dn.id ?? '');
  const hasColSig = typeof dn.builder_signature === 'string' && String(dn.builder_signature).trim().length > 0;
  const hasFallback = Boolean(dnId && signatureFallbackByDnId[dnId]?.signature);
  if (hasColSig || hasFallback) return 'accepted';

  return 'other';
}

const DN_GROUP_SECTIONS: { key: DeliveryNoteGroup; title: string }[] = [
  { key: 'pending_signature', title: 'Pending signature' },
  { key: 'accepted', title: 'Accepted / signed off' },
  { key: 'rejected_or_cancelled', title: 'Rejected or cancelled' },
  { key: 'other', title: 'Other statuses' },
];

export const SupplierInvoiceHub: React.FC<SupplierInvoiceHubProps> = ({
  userId,
  supplierRecordId,
  isDarkMode,
  textColor,
  mutedText,
  cardBg,
}) => {
  const { toast } = useToast();
  const [subTab, setSubTab] = useState('invoices');
  const [dnLoading, setDnLoading] = useState(false);
  const [grnLoading, setGrnLoading] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState<any[]>([]);
  const [grns, setGrns] = useState<any[]>([]);
  const [poById, setPoById] = useState<Record<string, string>>({});
  const [poItemsById, setPoItemsById] = useState<Record<string, unknown[]>>({});
  const [builderLabelByKey, setBuilderLabelByKey] = useState<Record<string, string>>({});
  const [signatureFallbackByDnId, setSignatureFallbackByDnId] = useState<
    Record<string, { signature: string; signedAt: string }>
  >({});
  const [grnUpdatingId, setGrnUpdatingId] = useState<string | null>(null);
  const [supplierCompanyName, setSupplierCompanyName] = useState('');
  const [dnFileDownloadingId, setDnFileDownloadingId] = useState<string | null>(null);

  /** RPC with p_supplier_id = dashboard suppliers.id; refetch when supplierRecordId resolves (was missing from deps before). */
  const loadDeliveryNotes = useCallback(async () => {
    if (!supplierRecordId) {
      setDeliveryNotes([]);
      setPoById({});
      setPoItemsById({});
      setBuilderLabelByKey({});
      setSignatureFallbackByDnId({});
      setDnLoading(false);
      return;
    }
    setDnLoading(true);
    try {
      const rpc = await supabase.rpc('list_delivery_notes_for_supplier', {
        p_supplier_id: supplierRecordId,
      });
      let list: any[] = [];
      if (!rpc.error && Array.isArray(rpc.data)) {
        list = rpc.data;
      } else {
        if (rpc.error) {
          const msg = rpc.error.message || '';
          const missingFn =
            msg.includes('Could not find the function') ||
            (msg.includes('function') && msg.includes('does not exist'));
          if (missingFn) {
            toast({
              title: 'Database update required',
              description:
                'Run migration 20260329350000 in Supabase SQL (list_delivery_notes_for_supplier with p_supplier_id).',
              variant: 'destructive',
            });
          }
          console.warn('list_delivery_notes_for_supplier RPC unavailable, using direct select:', rpc.error.message);
        }
        const { data: rows, error } = await supabase
          .from('delivery_notes')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        list = rows || [];
      }
      setDeliveryNotes(sortSupplyChainDocsNewestFirst(list as Record<string, unknown>[]) as any[]);

      const builderKeys = [...new Set(list.map((r: any) => r.builder_id).filter(Boolean))];
      let labelMap: Record<string, string> = {};
      if (builderKeys.length > 0) {
        const [byId, byUser] = await Promise.all([
          supabase.from('profiles').select('id, user_id, full_name, company_name').in('id', builderKeys),
          supabase.from('profiles').select('id, user_id, full_name, company_name').in('user_id', builderKeys),
        ]);
        const add = (p: { id?: string; user_id?: string; full_name?: string | null; company_name?: string | null }) => {
          const label = (p.company_name || p.full_name || '').trim() || 'Builder';
          if (p.id) labelMap[p.id] = label;
          if (p.user_id) labelMap[p.user_id] = label;
        };
        (byId.data || []).forEach(add);
        (byUser.data || []).forEach(add);
      }
      setBuilderLabelByKey(labelMap);

      const dnIds = [...new Set(list.map((r: any) => r.id).filter(Boolean))];
      let sigByDnId: Record<string, { signature: string; signedAt: string }> = {};
      if (dnIds.length > 0) {
        const { data: sigRows, error: sigErr } = await supabase
          .from('delivery_note_signatures')
          .select('delivery_note_id, signature_data, signed_at')
          .in('delivery_note_id', dnIds)
          .order('signed_at', { ascending: false });
        if (!sigErr && sigRows) {
          for (const r of sigRows) {
            const id = r.delivery_note_id as string;
            if (!id || sigByDnId[id]) continue;
            sigByDnId[id] = {
              signature: r.signature_data as string,
              signedAt: r.signed_at as string,
            };
          }
        }
      }
      setSignatureFallbackByDnId(sigByDnId);

      const poIds = [...new Set(list.map((r) => r.purchase_order_id).filter(Boolean))];
      if (poIds.length === 0) {
        setPoById({});
        setPoItemsById({});
        return;
      }
      const { data: pos, error: poErr } = await supabase
        .from('purchase_orders')
        .select('id, po_number, items')
        .in('id', poIds);
      if (poErr) throw poErr;
      const poRows = pos || [];
      setPoById(Object.fromEntries(poRows.map((p: any) => [p.id, p.po_number || '—'])));
      setPoItemsById(
        Object.fromEntries(
          poRows.map((p: any) => [p.id, Array.isArray(p.items) ? p.items : []])
        )
      );
    } catch (e: any) {
      console.error('Supplier DN fetch:', e);
      toast({
        title: 'Could not load delivery notes',
        description: e?.message || 'Try again later.',
        variant: 'destructive',
      });
      setDeliveryNotes([]);
      setPoById({});
      setPoItemsById({});
      setBuilderLabelByKey({});
      setSignatureFallbackByDnId({});
    } finally {
      setDnLoading(false);
    }
  }, [toast, supplierRecordId]);

  useEffect(() => {
    if (!supplierRecordId) {
      setSupplierCompanyName('');
      return;
    }
    void supabase
      .from('suppliers')
      .select('company_name')
      .eq('id', supplierRecordId)
      .single()
      .then(({ data, error }) => {
        if (!error && data?.company_name) setSupplierCompanyName(data.company_name);
        else setSupplierCompanyName('');
      });
  }, [supplierRecordId]);

  const printDeliveryNotePdf = (dn: Record<string, unknown>) => {
    const poId = String(dn.purchase_order_id || '');
    const builderKey = dn.builder_id != null ? String(dn.builder_id) : '';
    const dnId = String(dn.id || '');
    const altSig = dnId ? signatureFallbackByDnId[dnId] : undefined;
    const hasColSig =
      typeof dn.builder_signature === 'string' && dn.builder_signature.trim().length > 0;
    const merged: Record<string, unknown> = { ...dn };
    if (!hasColSig && altSig?.signature) {
      merged.builder_signature = altSig.signature;
      merged.builder_signed_at = merged.builder_signed_at || altSig.signedAt;
    }
    const opened = openDeliveryNotePdfWindow(
      merged,
      {
        poNumber: poById[poId] || undefined,
        supplierName: supplierCompanyName || undefined,
        builderDisplayName: builderKey ? builderLabelByKey[builderKey] : undefined,
        purchaseOrderItems: poId ? poItemsById[poId] : undefined,
      },
      {
        onPopUpBlocked: () =>
          toast({
            title: 'Pop-up blocked',
            description: 'Allow pop-ups for this site to open the delivery note and save as PDF.',
            variant: 'destructive',
          }),
      }
    );
    if (opened) {
      toast({
        title: 'Delivery note opened',
        description: 'Use Print → Save as PDF in your browser to download.',
      });
    }
  };

  const downloadDeliveryNoteUpload = async (dn: Record<string, unknown>) => {
    const path = typeof dn.file_path === 'string' ? dn.file_path.trim() : '';
    if (!path) {
      toast({
        title: 'No uploaded file',
        description: 'This delivery note has no attachment in storage. Use PDF for the generated document.',
        variant: 'destructive',
      });
      return;
    }
    const id = String(dn.id);
    setDnFileDownloadingId(id);
    try {
      const { data, error } = await supabase.storage.from('delivery-notes').download(path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      const name =
        typeof dn.file_name === 'string' && dn.file_name.trim()
          ? dn.file_name.trim()
          : `DN_${dn.delivery_note_number || dn.dn_number || id}.pdf`;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'Download started', description: name });
    } catch (e: any) {
      console.error('DN file download:', e);
      toast({
        title: 'Download failed',
        description: e?.message || 'Could not fetch the file from storage.',
        variant: 'destructive',
      });
    } finally {
      setDnFileDownloadingId(null);
    }
  };

  const loadGrns = useCallback(async () => {
    if (!supplierRecordId) {
      setGrns([]);
      setGrnLoading(false);
      return;
    }
    setGrnLoading(true);
    try {
      const rpc = await supabase.rpc('list_goods_received_notes_for_supplier', {
        p_supplier_id: supplierRecordId,
      });
      let rows: any[] = [];
      if (!rpc.error && Array.isArray(rpc.data)) {
        rows = rpc.data;
      } else {
        if (rpc.error) {
          const msg = rpc.error.message || '';
          if (
            msg.includes('Could not find the function') ||
            (msg.includes('function') && msg.includes('does not exist'))
          ) {
            toast({
              title: 'Database update required',
              description:
                'Run migration 20260329350000 (list_goods_received_notes_for_supplier) in Supabase SQL.',
              variant: 'destructive',
            });
          }
          console.warn('list_goods_received_notes_for_supplier RPC unavailable, using direct select:', rpc.error.message);
        }
        const { data, error } = await supabase
          .from('goods_received_notes')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        rows = data || [];
      }
      setGrns(sortSupplyChainDocsNewestFirst(rows as Record<string, unknown>[]) as any[]);
    } catch (e: any) {
      console.error('Supplier GRN fetch:', e);
      toast({
        title: 'Could not load GRNs',
        description: e?.message || 'Try again later.',
        variant: 'destructive',
      });
      setGrns([]);
    } finally {
      setGrnLoading(false);
    }
  }, [toast, supplierRecordId]);

  useEffect(() => {
    if (!supplierRecordId) return;
    if (subTab === 'delivery-notes') void loadDeliveryNotes();
    if (subTab === 'grn') void loadGrns();
  }, [subTab, supplierRecordId, loadDeliveryNotes, loadGrns]);

  // Preload when suppliers.id is known (async on parent dashboard — without this, fetch ran once with no id).
  useEffect(() => {
    if (!supplierRecordId) return;
    void loadDeliveryNotes();
    void loadGrns();
  }, [supplierRecordId, loadDeliveryNotes, loadGrns]);

  const groupedDeliveryNotes = useMemo(() => {
    const buckets: Record<DeliveryNoteGroup, any[]> = {
      pending_signature: [],
      accepted: [],
      rejected_or_cancelled: [],
      other: [],
    };
    for (const dn of deliveryNotes) {
      const g = getDeliveryNoteGroup(dn as Record<string, unknown>, signatureFallbackByDnId);
      buckets[g].push(dn);
    }
    (Object.keys(buckets) as DeliveryNoteGroup[]).forEach((k) => {
      buckets[k] = sortSupplyChainDocsNewestFirst(buckets[k] as Record<string, unknown>[]) as any[];
    });
    return buckets;
  }, [deliveryNotes, signatureFallbackByDnId]);

  const markGrnViewed = async (id: string) => {
    setGrnUpdatingId(id);
    try {
      const rpc = await supabase.rpc('mark_grn_viewed_by_supplier', {
        p_grn_id: id,
        ...(supplierRecordId ? { p_supplier_id: supplierRecordId } : {}),
      });
      if (rpc.error) {
        const msg = rpc.error.message || '';
        const missingFn =
          msg.includes('Could not find the function') ||
          (msg.includes('function') && msg.includes('does not exist'));
        if (missingFn) {
          const { data, error } = await supabase
            .from('goods_received_notes')
            .update({
              status: 'viewed_by_supplier',
              updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('status', 'generated')
            .select('id');
          if (error) throw error;
          if (!data?.length) {
            throw new Error(
              'No row updated (apply migrations through 20260329380000 or check GRN status).'
            );
          }
        } else {
          throw rpc.error;
        }
      }
      toast({
        title: 'Marked as viewed',
        description: 'GRN status updated. An invoice may be generated for the builder.',
      });
      await loadGrns();
    } catch (e: any) {
      console.error('markGrnViewed:', e);
      toast({
        title: 'Update failed',
        description: e?.message || 'Check permissions or try again.',
        variant: 'destructive',
      });
    } finally {
      setGrnUpdatingId(null);
    }
  };

  if (!supplierRecordId) {
    return (
      <Card className={cardBg}>
        <CardHeader>
          <CardTitle className={textColor}>Invoice & documents</CardTitle>
          <CardDescription className={mutedText}>
            Your supplier profile must be linked before invoices, delivery notes, and GRNs appear here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={cardBg}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${textColor}`}>
          <Receipt className="h-5 w-5 text-orange-500" />
          Invoice
        </CardTitle>
        <CardDescription className={mutedText}>
          Receive and send invoices, review delivery notes forwarded by builders, and acknowledge goods received notes
          (GRN).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={subTab} onValueChange={setSubTab} className="space-y-4">
          <TabsList
            className={`grid h-auto w-full grid-cols-1 gap-2 p-1 sm:grid-cols-3 ${
              isDarkMode ? 'bg-slate-900' : 'bg-muted'
            }`}
          >
            <TabsTrigger value="invoices" className="gap-2">
              <Receipt className="h-4 w-4 shrink-0" />
              Invoices
            </TabsTrigger>
            <TabsTrigger value="delivery-notes" className="gap-2">
              <FileText className="h-4 w-4 shrink-0" />
              Delivery notes
            </TabsTrigger>
            <TabsTrigger value="grn" className="gap-2">
              <Package className="h-4 w-4 shrink-0" />
              GRN
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="mt-0 space-y-4">
            <p className={`text-sm ${mutedText}`}>
              Invoices tied to your supplier account: edit and send when marked editable.
            </p>
            <InvoiceManagement
              userId={userId}
              userRole="supplier"
              supplierRecordId={supplierRecordId}
            />
          </TabsContent>

          <TabsContent value="delivery-notes" className="mt-0">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className={`text-sm ${mutedText}`}>
                Grouped by builder progress: pending signature vs accepted. Professional builder names come from their
                profile; use PDF for the full signed note.
              </p>
              <Button variant="outline" size="sm" onClick={() => loadDeliveryNotes()} disabled={dnLoading}>
                Refresh
              </Button>
            </div>
            {dnLoading ? (
              <div className={`flex items-center justify-center py-12 ${mutedText}`}>
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                Loading…
              </div>
            ) : deliveryNotes.length === 0 ? (
              <div className={`rounded-lg border py-10 text-center text-sm ${mutedText}`}>
                No delivery notes yet.
              </div>
            ) : (
              <div className="space-y-8">
                {DN_GROUP_SECTIONS.map(({ key, title }) => {
                  const rows = groupedDeliveryNotes[key];
                  if (!rows.length) return null;
                  return (
                    <div key={key} className="space-y-2">
                      <h4 className={`text-sm font-semibold tracking-tight ${textColor}`}>
                        {title}{' '}
                        <span className={`font-normal ${mutedText}`}>({rows.length})</span>
                      </h4>
                      <div className="rounded-md border overflow-hidden">
                        <MobileHorizontalScroll>
                          <Table className="min-w-[760px] w-full">
                          <TableHeader>
                            <TableRow className={isDarkMode ? 'border-slate-600' : ''}>
                              <TableHead>DN</TableHead>
                              <TableHead>PO</TableHead>
                              <TableHead>Professional builder</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Delivery date</TableHead>
                              <TableHead>Updated</TableHead>
                              <TableHead className="text-right w-[1%] whitespace-nowrap">Document</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rows.map((dn) => {
                              const builderKey =
                                dn.builder_id != null && dn.builder_id !== ''
                                  ? String(dn.builder_id)
                                  : '';
                              const builderName = builderKey
                                ? builderLabelByKey[builderKey] || '—'
                                : '—';
                              const fileLabel =
                                typeof dn.file_name === 'string' && dn.file_name.trim()
                                  ? dn.file_name.trim()
                                  : null;
                              return (
                                <TableRow key={dn.id}>
                                  <TableCell className="font-mono text-sm">
                                    {dn.dn_number || dn.delivery_note_number || '—'}
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">
                                    {poById[dn.purchase_order_id] || '—'}
                                  </TableCell>
                                  <TableCell className={`max-w-[200px] ${textColor}`}>
                                    <span className="line-clamp-2 font-medium" title={builderName}>
                                      {builderName}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary">{humanizeStatus(dn.status)}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    {dn.delivery_date
                                      ? new Date(dn.delivery_date).toLocaleDateString()
                                      : '—'}
                                  </TableCell>
                                  <TableCell className={`text-sm ${mutedText}`}>
                                    {dn.updated_at
                                      ? new Date(dn.updated_at).toLocaleString()
                                      : '—'}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex flex-col items-end gap-1">
                                      {fileLabel ? (
                                        <span
                                          className={`max-w-[180px] truncate text-left text-xs ${mutedText}`}
                                          title={fileLabel}
                                        >
                                          {fileLabel}
                                        </span>
                                      ) : null}
                                      <div className="flex flex-wrap items-center justify-end gap-1">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="h-8"
                                          onClick={() => printDeliveryNotePdf(dn as Record<string, unknown>)}
                                        >
                                          <FileText className="mr-1 h-3.5 w-3.5" />
                                          PDF
                                        </Button>
                                        {typeof dn.file_path === 'string' && dn.file_path.trim() ? (
                                          <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            className="h-8"
                                            disabled={dnFileDownloadingId === dn.id}
                                            onClick={() => downloadDeliveryNoteUpload(dn as Record<string, unknown>)}
                                            title="Download uploaded file"
                                          >
                                            {dnFileDownloadingId === dn.id ? (
                                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                              <Download className="h-3.5 w-3.5" />
                                            )}
                                          </Button>
                                        ) : null}
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                        </MobileHorizontalScroll>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="grn" className="mt-0">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className={`text-sm ${mutedText}`}>
                Goods received notes after a builder accepts delivery. Mark as viewed to continue the invoice workflow.
              </p>
              <Button variant="outline" size="sm" onClick={() => loadGrns()} disabled={grnLoading}>
                Refresh
              </Button>
            </div>
            {grnLoading ? (
              <div className={`flex items-center justify-center py-12 ${mutedText}`}>
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                Loading…
              </div>
            ) : grns.length === 0 ? (
              <div className={`rounded-lg border py-10 text-center text-sm ${mutedText}`}>
                No GRNs yet.
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <MobileHorizontalScroll>
                  <Table className="min-w-[520px] w-full">
                  <TableHeader>
                    <TableRow className={isDarkMode ? 'border-slate-600' : ''}>
                      <TableHead>GRN #</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grns.map((g) => (
                      <TableRow key={g.id}>
                        <TableCell className="font-mono text-sm">{g.grn_number || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{humanizeStatus(g.status)}</Badge>
                        </TableCell>
                        <TableCell>
                          {g.received_date
                            ? new Date(g.received_date).toLocaleDateString()
                            : '—'}
                        </TableCell>
                        <TableCell className="relative z-10 text-right">
                          {g.status === 'generated' && (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={grnUpdatingId === g.id}
                              onClick={(ev) => {
                                ev.preventDefault();
                                ev.stopPropagation();
                                void markGrnViewed(g.id);
                              }}
                            >
                              {grnUpdatingId === g.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Eye className="mr-1 h-4 w-4" />
                                  Mark viewed
                                </>
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </MobileHorizontalScroll>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SupplierInvoiceHub;

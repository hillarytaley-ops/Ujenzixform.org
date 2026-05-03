import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
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
import { supabase, isAbortLikeSupabaseError } from '@/integrations/supabase/client';
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
import { chunkArray } from '@/utils/performance';
import {
  buildEtimsReceiptKvRows,
  extractEtimsSalesItems,
  lineAmount,
  lineItemCode,
  lineQty,
  pickEtimsTotalAmountKes,
} from '@/lib/etims/formatEtimsReceiptForUi';
import { PaystackCheckout, isPaystackTestModeBanner } from '@/components/payment/PaystackCheckout';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  builderHubListFetchWithTimeout,
  fetchBuilderHubInvoices,
  invalidateBuilderInvoicesHub,
  patchHubInvoices,
  peekHubInvoices,
  subscribeBuilderHubCache,
  SUPPLIER_DOC_LIST_FETCH_TIMEOUT_MS,
} from '@/lib/builderInvoicesHubCache';

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
    etims_verification_url?: string | null;
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

function invoiceIsPaid(i: Invoice): boolean {
  return String(i.payment_status || '').toLowerCase() === 'paid';
}

/** Merge integrator-style keys into `etims_item_code` for a single editable field. */
function normalizeInvoiceItemForEdit(raw: unknown): Record<string, unknown> {
  const it =
    raw && typeof raw === 'object' && raw !== null ? ({ ...(raw as Record<string, unknown>) }) : {};
  const c1 = it.etims_item_code;
  const c2 = it.itemCode;
  const c3 = it.item_code;
  const pick =
    typeof c1 === 'string' && c1.trim()
      ? c1.trim()
      : typeof c2 === 'string' && c2.trim()
        ? c2.trim()
        : typeof c3 === 'string' && c3.trim()
          ? c3.trim()
          : '';
  if (pick) it.etims_item_code = pick;
  else delete it.etims_item_code;
  delete it.itemCode;
  delete it.item_code;
  return it;
}

function invoiceLineLabel(line: Record<string, unknown>, index: number): string {
  const d =
    line.description ?? line.material_name ?? line.name ?? line.material_type ?? line.item_name;
  if (typeof d === 'string' && d.trim()) return d.trim();
  return `Line ${index + 1}`;
}

function isHttpsOrHttpUrl(s: string): boolean {
  try {
    const u = new URL(s.trim());
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Shows the integrator/KRA verification page inside the app (iframe).
 * We cannot "extract" HTML into our DOM from third-party URLs without their API; embedding is the supported pattern.
 */
function KraEtimsReceiptEmbed({ url }: { url: string }) {
  const trimmed = url.trim();
  if (!trimmed || !isHttpsOrHttpUrl(trimmed)) {
    return (
      <p className="text-sm text-muted-foreground">
        This receipt address cannot be previewed here. If it is not a normal web link, open it from your integrator or
        KRA portal directly.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <div className="relative w-full overflow-hidden rounded-md border border-border bg-white shadow-inner dark:bg-slate-950">
        <iframe
          title="KRA eTIMS verification receipt"
          src={trimmed}
          className="h-[min(70vh,560px)] min-h-[320px] w-full border-0 sm:min-h-[380px]"
          referrerPolicy="no-referrer-when-downgrade"
          allow="clipboard-write"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        In-app preview. If the frame stays blank, the tax site may block embedding; your eTIMS submission is still valid on
        KRA or your OSCU.
      </p>
    </div>
  );
}

/** KES amount for Paystack when there is no supplier invoice row yet (PO total or eTIMS JSON). */
function resolvePoStandalonePayAmountKes(po: {
  total_amount?: number | null;
  etims_response: unknown | null;
}): number | null {
  const fromDb = po.total_amount != null ? Number(po.total_amount) : NaN;
  if (Number.isFinite(fromDb) && fromDb > 0) return Math.round(fromDb * 100) / 100;
  const fromJson = pickEtimsTotalAmountKes(po.etims_response);
  if (fromJson != null && fromJson > 0) return Math.round(fromJson * 100) / 100;
  return null;
}

/** Stored integrator JSON + optional KRA page button; iframe only under optional details (often blocked). */
function KraEtimsReceiptPanel({
  poNumber,
  verificationUrl,
  etimsResponse,
  traderInvoiceNoDb,
  etimsSubmittedAt,
}: {
  poNumber: string;
  verificationUrl: string | null | undefined;
  etimsResponse: unknown;
  traderInvoiceNoDb?: string | null;
  etimsSubmittedAt?: string | null;
}) {
  const url = (verificationUrl || '').trim();
  const kv = useMemo(() => buildEtimsReceiptKvRows(etimsResponse), [etimsResponse]);
  const salesLines = useMemo(() => extractEtimsSalesItems(etimsResponse), [etimsResponse]);
  const hasStoredPayload =
    etimsResponse != null &&
    typeof etimsResponse === 'object' &&
    Object.keys(etimsResponse as Record<string, unknown>).length > 0;

  return (
    <div className="space-y-3 rounded-lg border border-sky-200/70 bg-white/95 p-3 text-slate-900 shadow-sm dark:border-sky-900/50 dark:bg-slate-950/80 dark:text-slate-100">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-800 dark:text-sky-200">
          eTIMS receipt (stored from integrator)
        </p>
        <p className="text-xs text-muted-foreground dark:text-slate-400">PO {poNumber}</p>
      </div>
      {etimsSubmittedAt ? (
        <p className="text-xs text-muted-foreground dark:text-slate-400">
          Submitted{' '}
          {new Date(etimsSubmittedAt).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </p>
      ) : null}
      {traderInvoiceNoDb?.trim() ? (
        <p className="text-sm">
          <span className="text-muted-foreground dark:text-slate-400">Trader invoice no. </span>
          <span className="font-mono font-medium text-foreground">{traderInvoiceNoDb.trim()}</span>
        </p>
      ) : null}

      {!hasStoredPayload ? (
        <p className="text-sm text-amber-900 dark:text-amber-200">
          Receipt details were not found on this order in the database. If you have a verification link, open the KRA
          / OSCU page below.
        </p>
      ) : (
        <>
          <dl className="space-y-2 text-sm">
            {kv.map(({ label, value }, idx) => (
              <div key={`${label}-${idx}`}>
                <dt className="text-muted-foreground dark:text-slate-400">{label}</dt>
                <dd className="mt-0.5 min-w-0 break-all font-mono text-xs text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
          {salesLines.length > 0 ? (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 dark:bg-muted/30">
                  <tr>
                    <th className="px-2 py-1.5 font-medium">Item code</th>
                    <th className="px-2 py-1.5 font-medium">Qty</th>
                    <th className="px-2 py-1.5 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {salesLines.map((row, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-2 py-1 font-mono">{lineItemCode(row)}</td>
                      <td className="px-2 py-1">{lineQty(row)}</td>
                      <td className="px-2 py-1">{lineAmount(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <details className="rounded-md border border-border bg-muted/20 p-2 text-xs dark:bg-muted/10">
            <summary className="cursor-pointer font-medium text-foreground">Full integrator response (JSON)</summary>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded bg-muted/50 p-2 font-mono text-[10px] leading-relaxed dark:bg-muted/20">
              {JSON.stringify(etimsResponse, null, 2)}
            </pre>
          </details>
        </>
      )}

      {url && isHttpsOrHttpUrl(url) ? (
        <div className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            type="button"
            variant="default"
            size="sm"
            className="w-fit bg-sky-700 text-white hover:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-500"
            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
          >
            Open KRA verification page
          </Button>
          <p className="text-[11px] text-muted-foreground dark:text-slate-400">
            Official tax portal view (new tab). In-app iframe is often blocked by KRA.
          </p>
        </div>
      ) : null}

      {url && isHttpsOrHttpUrl(url) ? (
        <details className="text-xs text-muted-foreground dark:text-slate-400">
          <summary className="cursor-pointer select-none text-foreground/90 dark:text-slate-300">
            Try embedded preview (optional — may be blank)
          </summary>
          <div className="mt-2">
            <KraEtimsReceiptEmbed url={url} />
          </div>
        </details>
      ) : null}
    </div>
  );
}

export const InvoiceManagement: React.FC<InvoiceManagementProps> = ({
  userId,
  userRole,
  supplierRecordId,
  builderProfileId,
}) => {
  /** Builder + supplier: split list so paid rows are not mixed with unpaid Pay now rows */
  const [invoicePaymentListTab, setInvoicePaymentListTab] = useState<'unpaid' | 'paid'>('unpaid');
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    if (userRole !== 'builder') return [];
    const raw = peekHubInvoices(userId, builderProfileId ?? undefined);
    return (raw as Invoice[]) ?? [];
  });
  const [listReady, setListReady] = useState(() => {
    if (userRole !== 'builder') return false;
    return peekHubInvoices(userId, builderProfileId ?? undefined) !== null;
  });
  const [loading, setLoading] = useState(() => userRole !== 'builder');
  const [refreshing, setRefreshing] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);
  /** Which invoice row is running the async “acknowledge then open pay” flow */
  const [payNowBusyId, setPayNowBusyId] = useState<string | null>(null);
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
  /** Paystack checkout for PO with eTIMS but no supplier invoice yet (`order_id` = `etims_po_<uuid>`). */
  const [paystackEtimsPo, setPaystackEtimsPo] = useState<{
    poId: string;
    poNumber: string;
    amount: number;
  } | null>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);
  const { toast } = useToast();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  /** When true (VITE_PAYSTACK_TEST_MODE), builders can open Paystack on draft rows for sandbox testing. */
  const paystackSandbox = useMemo(() => isPaystackTestModeBanner(), []);
  /** Prevents double-launch when `payInvoice` stays in URL across re-renders. */
  const payInvoiceUrlHandledRef = useRef<string | null>(null);
  /** First fetch per user shows skeleton; later fetches (e.g. profile id resolved) refresh without blanking. */
  const invoiceFetchGenerationRef = useRef(0);
  /** Latest fetcher for Realtime / visibility handlers (avoid stale closures). */
  const fetchInvoicesRef = useRef<(opts?: { silent?: boolean }) => Promise<void>>(async () => {});

  /** PO rows with eTIMS / Paystack fields — builder (by buyer_id) or supplier (by supplier_id). */
  type BuilderEtimsReceiptPo = {
    id: string;
    po_number: string;
    total_amount: number | null;
    etims_verification_url: string | null;
    etims_response: unknown | null;
    etims_trader_invoice_no: string | null;
    etims_submitted_at: string | null;
    builder_etims_paystack_paid_at: string | null;
    builder_etims_paystack_reference: string | null;
  };
  const [builderEtimsReceipts, setBuilderEtimsReceipts] = useState<BuilderEtimsReceiptPo[]>([]);
  const [builderEtimsReceiptsLoading, setBuilderEtimsReceiptsLoading] = useState(false);
  const [supplierEtimsReceipts, setSupplierEtimsReceipts] = useState<BuilderEtimsReceiptPo[]>([]);
  const [supplierEtimsReceiptsLoading, setSupplierEtimsReceiptsLoading] = useState(false);
  /** supplier_id values that belong to this dashboard — for Realtime PO filter */
  const supplierEtimsSupplierIdsRef = useRef<Set<string>>(new Set());

  useLayoutEffect(() => {
    if (userRole !== 'builder') return;
    const hit = peekHubInvoices(userId, builderProfileId ?? undefined);
    if (hit !== null) {
      setInvoices(hit as Invoice[]);
      setListReady(true);
    }
  }, [userRole, userId, builderProfileId]);

  useEffect(() => {
    if (userRole !== 'builder') return;
    return subscribeBuilderHubCache(() => {
      const raw = peekHubInvoices(userId, builderProfileId ?? undefined);
      if (raw === null) {
        void fetchInvoices({ silent: true });
        return;
      }
      setInvoices((raw as Invoice[]) ?? []);
      setListReady(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchInvoices identity changes; hub event should refetch
  }, [userRole, userId, builderProfileId]);

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
      if (userRole === 'builder' && silent) setRefreshing(true);
      if (!silent && userRole === 'builder') {
        const hit = peekHubInvoices(userId, builderProfileId ?? undefined);
        if (hit !== null) {
          setInvoices(hit as Invoice[]);
          setListReady(true);
          return;
        }
      }
      if (!silent && userRole !== 'builder') setLoading(true);

      const invoiceSelect = `
          *,
          purchase_order:purchase_orders(po_number, etims_verification_url),
          supplier:suppliers(company_name)
        `;

      // Supplier: prefer RPC with p_supplier_id when dashboard resolved suppliers.id.
      if (userRole === 'supplier') {
        await builderHubListFetchWithTimeout(
          (async () => {
            const rpcArgs =
              supplierRecordId != null && supplierRecordId !== ''
                ? { p_supplier_id: supplierRecordId }
                : ({} as Record<string, string>);
            let rpc = await supabase.rpc('list_invoices_for_supplier', rpcArgs);
            if (rpc.error && isAbortLikeSupabaseError(rpc.error)) {
              await new Promise((r) => setTimeout(r, 200));
              rpc = await supabase.rpc('list_invoices_for_supplier', rpcArgs);
            }
            let base: any[] = [];
            if (!rpc.error && Array.isArray(rpc.data)) {
              base = rpc.data;
            } else {
              if (rpc.error && !isAbortLikeSupabaseError(rpc.error)) {
                console.warn(
                  'list_invoices_for_supplier RPC unavailable, using direct select:',
                  rpc.error.message
                );
              }
              let invQ = supabase
                .from('invoices')
                .select(invoiceSelect)
                .order('created_at', { ascending: false })
                .limit(500);
              if (supplierRecordId) {
                const { data: srow } = await supabase
                  .from('suppliers')
                  .select('user_id')
                  .eq('id', supplierRecordId)
                  .maybeSingle();
                const su = (srow?.user_id as string | undefined)?.trim();
                const sidOr = [...new Set([supplierRecordId, userId, su].filter(Boolean))] as string[];
                if (sidOr.length === 1) {
                  invQ = invQ.eq('supplier_id', sidOr[0]);
                } else {
                  invQ = invQ.or(sidOr.map((id) => `supplier_id.eq.${id}`).join(','));
                }
              }
              const { data, error } = await invQ;
              if (error) throw error;
              setInvoices(
                sortSupplyChainDocsNewestFirst((data || []) as unknown as Record<string, unknown>[]) as Invoice[]
              );
              return;
            }

            const poIds = [...new Set(base.map((i) => i.purchase_order_id).filter(Boolean))];
            const supIds = [...new Set(base.map((i) => i.supplier_id).filter(Boolean))];
            const [poChunkRows, supChunkRows] = await Promise.all([
              Promise.all(
                chunkArray(poIds, 80).map((chunk) =>
                  supabase.from('purchase_orders').select('id, po_number, etims_verification_url').in('id', chunk)
                )
              ),
              Promise.all(
                chunkArray(supIds, 80).map((chunk) =>
                  supabase.from('suppliers').select('id, company_name').in('id', chunk)
                )
              ),
            ]);
            const poMerged: { id: string; po_number?: string; etims_verification_url?: string | null }[] = [];
            for (const poRes of poChunkRows) {
              if (poRes.error) throw poRes.error;
              if (poRes.data?.length) poMerged.push(...poRes.data);
            }
            const supMerged: { id: string; company_name?: string }[] = [];
            for (const supRes of supChunkRows) {
              if (supRes.error) throw supRes.error;
              if (supRes.data?.length) supMerged.push(...supRes.data);
            }
            const poById = Object.fromEntries(poMerged.map((p) => [p.id, p]));
            const supById = Object.fromEntries(supMerged.map((s) => [s.id, s]));
            const enriched = base.map((inv) => ({
              ...inv,
              purchase_order: poById[inv.purchase_order_id]
                ? {
                    po_number: poById[inv.purchase_order_id].po_number,
                    etims_verification_url: poById[inv.purchase_order_id].etims_verification_url ?? null,
                  }
                : undefined,
              supplier: supById[inv.supplier_id]
                ? { company_name: supById[inv.supplier_id].company_name }
                : undefined,
            })) as Invoice[];
            setInvoices(
              sortSupplyChainDocsNewestFirst(enriched as unknown as Record<string, unknown>[]) as Invoice[]
            );
          })(),
          'supplier_invoice_list_timeout',
          SUPPLIER_DOC_LIST_FETCH_TIMEOUT_MS
        );
        return;
      }

      if (userRole === 'builder') {
        const list = (await builderHubListFetchWithTimeout(
          fetchBuilderHubInvoices(userId, builderProfileId ?? undefined),
          'invoice_fetch_timeout'
        )) as Invoice[];
        setInvoices(list);
        patchHubInvoices(userId, builderProfileId ?? undefined, list);
        return;
      }

      const { data, error } = await supabase
        .from('invoices')
        .select(invoiceSelect)
        .order('created_at', { ascending: false })
        .limit(800);

      if (error) throw error;
      setInvoices(
        sortSupplyChainDocsNewestFirst((data || []) as unknown as Record<string, unknown>[]) as Invoice[]
      );
    } catch (error: any) {
      if (error?.name === 'AbortError' || /aborted/i.test(String(error?.message || ''))) {
        return;
      }
      const msg = String(error?.message || '');
      if (msg.includes('invoice_fetch_timeout') || msg.includes('supplier_invoice_list_timeout')) {
        toast({
          title: 'Invoices are taking too long',
          description: 'Try Refresh. If this keeps happening, ask your admin to check invoices / purchase_orders performance on Supabase.',
          variant: 'destructive',
        });
        setInvoices([]);
        return;
      }
      console.error('Error fetching invoices:', error);
      const code = error?.code as string | undefined;
      const timedOut = code === '57014' || /timeout/i.test(msg);
      toast({
        title: timedOut ? 'Invoices timed out' : 'Error',
        description: timedOut
          ? 'Too many rows or a slow network. Try Refresh; your admin can add DB indexes on invoices / purchase_orders.'
          : 'Failed to load invoices',
        variant: 'destructive',
      });
    } finally {
      if (userRole === 'builder') {
        if (silent) setRefreshing(false);
        setListReady(true);
      } else {
        setLoading(false);
        setListReady(true);
      }
    }
  };

  fetchInvoicesRef.current = fetchInvoices;

  const loadBuilderEtimsReceipts = useCallback(async () => {
    if (userRole !== 'builder' || !userId) {
      setBuilderEtimsReceipts([]);
      setBuilderEtimsReceiptsLoading(false);
      return;
    }
    setBuilderEtimsReceiptsLoading(true);
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(
        'id, po_number, total_amount, etims_verification_url, etims_response, etims_trader_invoice_no, etims_submitted_at, builder_etims_paystack_paid_at, builder_etims_paystack_reference'
      )
      .eq('buyer_id', userId)
      .or(
        'etims_verification_url.not.is.null,etims_response.not.is.null,etims_submitted_at.not.is.null,builder_etims_paystack_paid_at.not.is.null'
      )
      .order('updated_at', { ascending: false })
      .limit(30);
    if (error) {
      console.warn('[eTIMS] Builder receipt list:', error.message);
      setBuilderEtimsReceipts([]);
    } else {
      setBuilderEtimsReceipts((data ?? []) as BuilderEtimsReceiptPo[]);
    }
    setBuilderEtimsReceiptsLoading(false);
  }, [userRole, userId]);

  const loadSupplierEtimsReceipts = useCallback(async () => {
    if (userRole !== 'supplier' || !userId || !supplierRecordId) {
      supplierEtimsSupplierIdsRef.current = new Set();
      setSupplierEtimsReceipts([]);
      setSupplierEtimsReceiptsLoading(false);
      return;
    }
    setSupplierEtimsReceiptsLoading(true);
    const { data: srow } = await supabase
      .from('suppliers')
      .select('user_id')
      .eq('id', supplierRecordId)
      .maybeSingle();
    const su = (srow?.user_id as string | undefined)?.trim();
    const sidOr = [...new Set([supplierRecordId, userId, su].filter(Boolean))] as string[];
    supplierEtimsSupplierIdsRef.current = new Set(sidOr);

    let poQ = supabase
      .from('purchase_orders')
      .select(
        'id, po_number, total_amount, etims_verification_url, etims_response, etims_trader_invoice_no, etims_submitted_at, builder_etims_paystack_paid_at, builder_etims_paystack_reference'
      )
      .or(
        'etims_verification_url.not.is.null,etims_response.not.is.null,etims_submitted_at.not.is.null,builder_etims_paystack_paid_at.not.is.null'
      )
      .order('updated_at', { ascending: false })
      .limit(40);

    if (sidOr.length === 1) {
      poQ = poQ.eq('supplier_id', sidOr[0]);
    } else {
      poQ = poQ.or(sidOr.map((id) => `supplier_id.eq.${id}`).join(','));
    }

    const { data, error } = await poQ;
    if (error) {
      console.warn('[eTIMS] Supplier receipt list:', error.message);
      setSupplierEtimsReceipts([]);
    } else {
      setSupplierEtimsReceipts((data ?? []) as BuilderEtimsReceiptPo[]);
    }
    setSupplierEtimsReceiptsLoading(false);
  }, [userRole, userId, supplierRecordId]);

  useEffect(() => {
    invoiceFetchGenerationRef.current = 0;
  }, [userId, userRole, supplierRecordId, builderProfileId]);

  useEffect(() => {
    if (!userId) return;
    const silent = invoiceFetchGenerationRef.current > 0;
    invoiceFetchGenerationRef.current += 1;
    void fetchInvoices({ silent });
  }, [userId, userRole, supplierRecordId, builderProfileId]);

  useEffect(() => {
    void loadBuilderEtimsReceipts();
  }, [loadBuilderEtimsReceipts]);

  useEffect(() => {
    void loadSupplierEtimsReceipts();
  }, [loadSupplierEtimsReceipts]);

  /** After Paystack redirect, bust hub cache and reload so Unpaid / Paid tabs reflect `payment_status` immediately. */
  useEffect(() => {
    if (userRole !== 'builder' || !userId) return;
    const st = location.state as { paystackVerified?: boolean } | null | undefined;
    if (!st?.paystackVerified) return;
    invalidateBuilderInvoicesHub(userId, builderProfileId ?? undefined);
    void fetchInvoices({ silent: true });
    void loadBuilderEtimsReceipts();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot refresh when returning from /payment/paystack-callback
  }, [userRole, userId, builderProfileId, location.state]);

  useEffect(() => {
    if (userRole !== 'builder' || !userId) return;
    const channel = supabase
      .channel(`builder-etims-pos-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'purchase_orders' },
        (payload) => {
          const bid = (payload.new as { buyer_id?: string } | undefined)?.buyer_id;
          if (bid === userId) void loadBuilderEtimsReceipts();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userRole, userId, loadBuilderEtimsReceipts]);

  /** Supplier: keep Unpaid / Paid in sync when the builder pays or invoices change (RLS scopes events). */
  useEffect(() => {
    if (userRole !== 'supplier' || !userId) return;
    const channel = supabase
      .channel(`supplier-invoice-sync-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices' },
        () => {
          void fetchInvoicesRef.current({ silent: true });
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userRole, userId]);

  useEffect(() => {
    if (userRole !== 'supplier') return;
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        void fetchInvoicesRef.current({ silent: true });
        void loadSupplierEtimsReceipts();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [userRole, loadSupplierEtimsReceipts]);

  /** Supplier: refetch eTIMS PO slice when linked orders change (RLS limits events). */
  useEffect(() => {
    if (userRole !== 'supplier' || !userId || !supplierRecordId) return;
    const channel = supabase
      .channel(`supplier-etims-pos-${userId}-${supplierRecordId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'purchase_orders' },
        (payload) => {
          const sid = (payload.new as { supplier_id?: string } | undefined)?.supplier_id;
          if (sid && supplierEtimsSupplierIdsRef.current.has(sid)) {
            void loadSupplierEtimsReceipts();
          }
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userRole, userId, supplierRecordId, loadSupplierEtimsReceipts]);

  const showBuilderSupplierPaymentTabs = userRole === 'builder' || userRole === 'supplier';

  const displayInvoices = useMemo(() => {
    if (!showBuilderSupplierPaymentTabs) return invoices;
    if (invoicePaymentListTab === 'paid') return invoices.filter(invoiceIsPaid);
    return invoices.filter((i) => !invoiceIsPaid(i));
  }, [invoices, showBuilderSupplierPaymentTabs, invoicePaymentListTab]);

  /** KRA link from embedded PO row (hub fetch) or builder receipt list fallback */
  const etimsUrlForInvoice = useCallback(
    (inv: Invoice) => {
      const fromEmbed = inv.purchase_order?.etims_verification_url?.trim();
      if (fromEmbed) return fromEmbed;
      const row = builderEtimsReceipts.find((p) => p.id === inv.purchase_order_id);
      return row?.etims_verification_url?.trim() || null;
    },
    [builderEtimsReceipts]
  );

  /** Receipt exists but no supplier invoice row for this PO yet — show its own row under Unpaid only.
   *  If *any* non-cancelled invoice exists for the PO, hide this card: eTIMS belongs on that invoice row (avoids Unpaid duplicate after pay). */
  const builderUnpaidEtimsStandalone = useMemo(() => {
    if (userRole !== 'builder' || invoicePaymentListTab !== 'unpaid') return [];
    return builderEtimsReceipts.filter((po) => {
      if (po.builder_etims_paystack_paid_at) return false;
      const poKey = String(po.id);
      const hasInvoiceRowForPo = invoices.some(
        (i) =>
          String(i.purchase_order_id || '') === poKey &&
          String(i.status || '').toLowerCase() !== 'cancelled'
      );
      if (hasInvoiceRowForPo) return false;
      const url = po.etims_verification_url?.trim();
      const hasResp =
        po.etims_response != null &&
        typeof po.etims_response === 'object' &&
        Object.keys(po.etims_response as Record<string, unknown>).length > 0;
      const hasEvidence = Boolean(url || hasResp || po.etims_submitted_at);
      return hasEvidence;
    });
  }, [userRole, invoicePaymentListTab, builderEtimsReceipts, invoices]);

  /** eTIMS-only POs where builder completed Paystack (test) — full receipt under Paid tab */
  const builderEtimsPaidStandalone = useMemo(() => {
    if (userRole !== 'builder') return [];
    return builderEtimsReceipts.filter((po) => Boolean(po.builder_etims_paystack_paid_at));
  }, [userRole, builderEtimsReceipts]);

  /** Supplier: same PO-level eTIMS as builder sees for this supplier’s orders (read-only mirror). */
  const supplierUnpaidEtimsStandalone = useMemo(() => {
    if (userRole !== 'supplier' || invoicePaymentListTab !== 'unpaid') return [];
    return supplierEtimsReceipts.filter((po) => {
      if (po.builder_etims_paystack_paid_at) return false;
      const poKey = String(po.id);
      const hasInvoiceRowForPo = invoices.some(
        (i) =>
          String(i.purchase_order_id || '') === poKey &&
          String(i.status || '').toLowerCase() !== 'cancelled'
      );
      if (hasInvoiceRowForPo) return false;
      const url = po.etims_verification_url?.trim();
      const hasResp =
        po.etims_response != null &&
        typeof po.etims_response === 'object' &&
        Object.keys(po.etims_response as Record<string, unknown>).length > 0;
      const hasEvidence = Boolean(url || hasResp || po.etims_submitted_at);
      return hasEvidence;
    });
  }, [userRole, invoicePaymentListTab, supplierEtimsReceipts, invoices]);

  const supplierEtimsPaidStandalone = useMemo(() => {
    if (userRole !== 'supplier') return [];
    return supplierEtimsReceipts.filter((po) => Boolean(po.builder_etims_paystack_paid_at));
  }, [userRole, supplierEtimsReceipts]);

  const displayInvoicesTotalAmount = useMemo(
    () =>
      displayInvoices.reduce((sum, inv) => {
        const n = Number(inv.total_amount);
        return sum + (Number.isFinite(n) ? n : 0);
      }, 0),
    [displayInvoices]
  );

  const builderPayPrompt = useMemo(() => {
    if (userRole !== 'builder') {
      return { needAcknowledge: [] as Invoice[], needPayment: [] as Invoice[] };
    }
    const unpaid = (i: Invoice) => !invoiceIsPaid(i);
    const needAcknowledge = invoices.filter((i) => {
      const st = String(i.status || '').toLowerCase();
      return st === 'sent' && !i.acknowledged_at && unpaid(i);
    });
    const needPayment = invoices.filter((i) => {
      const st = String(i.status || '').toLowerCase();
      return unpaid(i) && (st === 'acknowledged' || !!i.acknowledged_at);
    });
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
    setEditedItems(
      Array.isArray(invoice.items) ? invoice.items.map((row) => normalizeInvoiceItemForEdit(row)) : [],
    );
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

      const itemsToSave = editedItems.map((row) => {
        if (!row || typeof row !== 'object') return row;
        const o = { ...(row as Record<string, unknown>) };
        const e = o.etims_item_code;
        if (typeof e === 'string' && !e.trim()) {
          delete o.etims_item_code;
          delete o.itemCode;
          delete o.item_code;
        }
        return o;
      });

      const { error } = await supabase
        .from('invoices')
        .update({
          items: itemsToSave,
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
    if (invoiceIsPaid(invoice)) return;

    const st = String(invoice.status || '').toLowerCase();
    if (st === 'cancelled') {
      toast({
        title: 'Not payable yet',
        description: 'This invoice was cancelled.',
        variant: 'destructive',
      });
      return;
    }
    if (st === 'draft' && !paystackSandbox) {
      toast({
        title: 'Not payable yet',
        description:
          'This invoice is still a draft on the supplier side. Ask them to send it, or set VITE_PAYSTACK_TEST_MODE=true to test Paystack on drafts.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setAcknowledging(true);
      setPayNowBusyId(invoice.id);
      setPaystackEtimsPo(null);

      let next = { ...invoice };

      if (String(invoice.status || '').toLowerCase() === 'sent' && !invoice.acknowledged_at) {
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
        description: paystackSandbox && String(invoice.status || '').toLowerCase() === 'draft'
          ? 'Paystack test mode: paying a draft is for sandbox only. Use Paystack below or record a payment.'
          : 'Use Paystack below or record a payment you already sent to the supplier.',
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
    if (userRole !== 'builder' || !listReady) return;
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
  }, [userRole, listReady, invoices, searchParams, setSearchParams]);

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
    const st = String(status || '').toLowerCase();
    const workflow =
      st === 'acknowledged' ? (
        <Badge variant="default" className="bg-blue-500">Acknowledged</Badge>
      ) : st === 'sent' ? (
        <Badge variant="secondary">Sent</Badge>
      ) : (
        <Badge variant="outline">{status || '—'}</Badge>
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

  const supplierBlockingLoad = userRole !== 'builder' && loading && invoices.length === 0;
  const builderListLoading = userRole === 'builder' && !listReady;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Supplier invoices (pay here)</h3>
        <Button
          variant="outline"
          size="sm"
          disabled={
            userRole === 'builder' ? refreshing && invoices.length > 0 : loading && invoices.length > 0
          }
          onClick={() => {
            void fetchInvoices({ silent: true });
            void loadBuilderEtimsReceipts();
            void loadSupplierEtimsReceipts();
          }}
        >
          {userRole === 'builder' ? (
            refreshing && invoices.length > 0 ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Refresh'
            )
          ) : loading && invoices.length > 0 ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Refresh'
          )}
        </Button>
      </div>

      {userRole === 'builder' && (builderEtimsReceiptsLoading || builderEtimsReceipts.length > 0) && (
        <Alert className="border-sky-200 bg-sky-50/70 dark:border-sky-900 dark:bg-sky-950/35">
          <Receipt className="h-4 w-4 text-sky-700 dark:text-sky-300" />
          <AlertTitle className="text-foreground">KRA eTIMS receipt (integrator)</AlertTitle>
          <AlertDescription className="text-xs text-muted-foreground">
            <p>
              eTIMS appears on the <strong className="text-foreground">supplier invoice</strong> row when you have one.
              If you only have a KRA receipt card (no invoice yet), use <strong className="text-foreground">Pay now</strong>{' '}
              there to pay the PO / eTIMS total; once an invoice row exists, use <strong className="text-foreground">Pay now</strong>{' '}
              on that row so the supplier invoice is marked paid.
            </p>
            {builderEtimsReceiptsLoading ? <p className="mt-1">Loading receipt links…</p> : null}
          </AlertDescription>
        </Alert>
      )}

      {userRole === 'supplier' && (supplierEtimsReceiptsLoading || supplierEtimsReceipts.length > 0) && (
        <Alert className="border-sky-200 bg-sky-50/70 dark:border-sky-900 dark:bg-sky-950/35">
          <Receipt className="h-4 w-4 text-sky-700 dark:text-sky-300" />
          <AlertTitle className="text-foreground">KRA eTIMS on your purchase orders</AlertTitle>
          <AlertDescription className="text-xs text-muted-foreground">
            <p>
              When a professional builder submits eTIMS for an order tied to your supplier account, the receipt appears
              here until a <strong className="text-foreground">supplier invoice</strong> row exists for that PO. The
              builder pays from their dashboard; you can issue and send your invoice when ready.
            </p>
            {supplierEtimsReceiptsLoading ? <p className="mt-1">Loading receipt links…</p> : null}
          </AlertDescription>
        </Alert>
      )}

      {showBuilderSupplierPaymentTabs && (
        <Tabs
          value={invoicePaymentListTab}
          onValueChange={(v) => setInvoicePaymentListTab(v === 'paid' ? 'paid' : 'unpaid')}
          className="w-full"
        >
          <TabsList className="grid h-auto w-full max-w-md grid-cols-2 gap-1 p-1 sm:gap-2">
            <TabsTrigger value="unpaid" className="text-xs sm:text-sm">
              Unpaid
            </TabsTrigger>
            <TabsTrigger value="paid" className="text-xs sm:text-sm">
              Paid
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {supplierBlockingLoad && (
        <div
          className="flex items-center gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-4 text-sm text-muted-foreground"
          aria-busy="true"
          aria-label="Loading invoices"
        >
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <span>Loading supplier invoices…</span>
        </div>
      )}

      {builderListLoading && (
        <div
          className="flex items-center gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-8 text-sm text-muted-foreground"
          aria-busy="true"
          aria-label="Loading invoices"
        >
          <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
          <span>Loading supplier invoices…</span>
        </div>
      )}

      {(userRole === 'builder' || !supplierBlockingLoad) && (
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

          {listReady &&
          displayInvoices.length === 0 &&
          !(
            userRole === 'builder' &&
            invoicePaymentListTab === 'unpaid' &&
            (builderUnpaidEtimsStandalone.length > 0 || builderEtimsReceiptsLoading)
          ) &&
          !(
            userRole === 'builder' &&
            invoicePaymentListTab === 'paid' &&
            builderEtimsPaidStandalone.length > 0
          ) &&
          !(
            userRole === 'supplier' &&
            invoicePaymentListTab === 'unpaid' &&
            (supplierUnpaidEtimsStandalone.length > 0 || supplierEtimsReceiptsLoading)
          ) &&
          !(
            userRole === 'supplier' &&
            invoicePaymentListTab === 'paid' &&
            supplierEtimsPaidStandalone.length > 0
          ) ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground text-sm">
                {invoices.length > 0 && showBuilderSupplierPaymentTabs ? (
                  <>
                    No {invoicePaymentListTab === 'paid' ? 'paid' : 'unpaid'} invoices in this tab.
                    {invoicePaymentListTab === 'unpaid' && invoices.some(invoiceIsPaid) ? (
                      <span className="block mt-2">Switch to the Paid tab to see settled invoices.</span>
                    ) : null}
                    {invoicePaymentListTab === 'paid' && invoices.some((i) => !invoiceIsPaid(i)) ? (
                      <span className="block mt-2">Switch to the Unpaid tab to see invoices still awaiting payment.</span>
                    ) : null}
                  </>
                ) : (
                  'No invoices yet.'
                )}
              </CardContent>
            </Card>
          ) : null}

          {userRole === 'builder' &&
            invoicePaymentListTab === 'paid' &&
            builderEtimsPaidStandalone.length > 0 && (
              <div className="mb-4 space-y-3">
                {builderEtimsPaidStandalone.map((po) => {
                  const url = (po.etims_verification_url || '').trim();
                  return (
                    <Card key={`etims-paid-${po.id}`} className="border-emerald-200/70 dark:border-emerald-900/45">
                      <CardHeader>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <CardTitle className="text-base">KRA eTIMS receipt</CardTitle>
                            <p className="text-sm text-muted-foreground">PO {po.po_number}</p>
                            {po.builder_etims_paystack_paid_at ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Paid{' '}
                                {new Date(po.builder_etims_paystack_paid_at).toLocaleString(undefined, {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })}
                                {po.builder_etims_paystack_reference
                                  ? ` · Paystack ref ${po.builder_etims_paystack_reference}`
                                  : ''}
                              </p>
                            ) : null}
                          </div>
                          <Badge className="h-fit w-fit shrink-0 bg-green-600 text-white hover:bg-green-600">
                            Paid (Paystack)
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <KraEtimsReceiptPanel
                          poNumber={po.po_number}
                          verificationUrl={url || null}
                          etimsResponse={po.etims_response}
                          traderInvoiceNoDb={po.etims_trader_invoice_no}
                          etimsSubmittedAt={po.etims_submitted_at}
                        />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

          {userRole === 'supplier' &&
            invoicePaymentListTab === 'paid' &&
            supplierEtimsPaidStandalone.length > 0 && (
              <div className="mb-4 space-y-3">
                {supplierEtimsPaidStandalone.map((po) => {
                  const url = (po.etims_verification_url || '').trim();
                  return (
                    <Card key={`supplier-etims-paid-${po.id}`} className="border-emerald-200/70 dark:border-emerald-900/45">
                      <CardHeader>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <CardTitle className="text-base">KRA eTIMS receipt</CardTitle>
                            <p className="text-sm text-muted-foreground">PO {po.po_number}</p>
                            {po.builder_etims_paystack_paid_at ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Builder paid (Paystack){' '}
                                {new Date(po.builder_etims_paystack_paid_at).toLocaleString(undefined, {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })}
                                {po.builder_etims_paystack_reference
                                  ? ` · ref ${po.builder_etims_paystack_reference}`
                                  : ''}
                              </p>
                            ) : null}
                          </div>
                          <Badge className="h-fit w-fit shrink-0 bg-green-600 text-white hover:bg-green-600">
                            Paid (Paystack)
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <KraEtimsReceiptPanel
                          poNumber={po.po_number}
                          verificationUrl={url || null}
                          etimsResponse={po.etims_response}
                          traderInvoiceNoDb={po.etims_trader_invoice_no}
                          etimsSubmittedAt={po.etims_submitted_at}
                        />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

          {userRole === 'supplier' &&
            invoicePaymentListTab === 'unpaid' &&
            (supplierEtimsReceiptsLoading || supplierUnpaidEtimsStandalone.length > 0) && (
              <div className="space-y-3">
                {supplierEtimsReceiptsLoading && supplierUnpaidEtimsStandalone.length === 0 ? (
                  <Card>
                    <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                      Loading KRA receipt links…
                    </CardContent>
                  </Card>
                ) : null}
                {supplierUnpaidEtimsStandalone.map((po) => {
                  const url = (po.etims_verification_url || '').trim();
                  return (
                    <Card key={`supplier-etims-${po.id}`} className="border-sky-200/60 dark:border-sky-900/50">
                      <CardHeader>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <CardTitle className="text-base">KRA eTIMS receipt</CardTitle>
                            <p className="text-sm text-muted-foreground">PO {po.po_number}</p>
                            <p className="mt-2 text-xs text-muted-foreground">
                              The professional builder has eTIMS data on file for this order. Payment is completed from
                              their dashboard. When you are ready, create and send your supplier invoice for this PO so
                              it appears in the list above and links payment to your invoice.
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <KraEtimsReceiptPanel
                          poNumber={po.po_number}
                          verificationUrl={url || null}
                          etimsResponse={po.etims_response}
                          traderInvoiceNoDb={po.etims_trader_invoice_no}
                          etimsSubmittedAt={po.etims_submitted_at}
                        />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

          {userRole === 'builder' &&
            invoicePaymentListTab === 'unpaid' &&
            (builderEtimsReceiptsLoading || builderUnpaidEtimsStandalone.length > 0) && (
              <div className="space-y-3">
                {builderEtimsReceiptsLoading && builderUnpaidEtimsStandalone.length === 0 ? (
                  <Card>
                    <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                      Loading KRA receipt links…
                    </CardContent>
                  </Card>
                ) : null}
                {builderUnpaidEtimsStandalone.map((po) => {
                  const url = (po.etims_verification_url || '').trim();
                  const payAmt = resolvePoStandalonePayAmountKes(po);
                  const canPayStandalone =
                    userRole === 'builder' && payAmt != null && payAmt > 0;
                  return (
                    <Card key={`etims-${po.id}`} className="border-sky-200/60 dark:border-sky-900/50">
                      <CardHeader>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <CardTitle className="text-base">KRA eTIMS receipt</CardTitle>
                            <p className="text-sm text-muted-foreground">PO {po.po_number}</p>
                            <p className="mt-2 text-xs text-muted-foreground">
                              No supplier invoice row yet for this order. Use <strong className="text-foreground">Pay now</strong>{' '}
                              to pay the PO / eTIMS total via Paystack. When your supplier sends an invoice, use{' '}
                              <strong className="text-foreground">Pay now</strong> on that row instead (that flow marks
                              the supplier invoice paid).
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="lg"
                            disabled={!canPayStandalone}
                            className={`shrink-0 font-bold text-white ${
                              canPayStandalone
                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                : 'cursor-not-allowed bg-emerald-600/40'
                            }`}
                            title={
                              canPayStandalone
                                ? 'Open Paystack checkout for this purchase order (no supplier invoice row yet).'
                                : 'Need a positive total on the purchase order or in the eTIMS receipt JSON to pay here.'
                            }
                            onClick={() => {
                              if (!canPayStandalone || payAmt == null) return;
                              setPaystackEtimsPo({ poId: po.id, poNumber: po.po_number, amount: payAmt });
                            }}
                          >
                            <CreditCard className="mr-2 h-5 w-5 shrink-0 opacity-90" />
                            Pay now
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <KraEtimsReceiptPanel
                          poNumber={po.po_number}
                          verificationUrl={url || null}
                          etimsResponse={po.etims_response}
                          traderInvoiceNoDb={po.etims_trader_invoice_no}
                          etimsSubmittedAt={po.etims_submitted_at}
                        />
                        <p className="text-xs text-muted-foreground">
                          {canPayStandalone ? (
                            <>
                              Amount: <strong className="text-foreground">KES {payAmt!.toLocaleString()}</strong>
                              {paystackSandbox ? (
                                <> · Paystack test mode (sandbox keys).</>
                              ) : null}
                            </>
                          ) : (
                            <>
                              Set a positive total on the PO or ensure the eTIMS JSON includes a total so{' '}
                              <strong className="text-foreground">Pay now</strong> can run. Tap{' '}
                              <strong className="text-foreground">Refresh</strong> after your supplier sends an invoice
                              to pay on that row.
                            </>
                          )}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

          {displayInvoices.map((invoice) => {
            const rowStatus = String(invoice.status || '').toLowerCase();
            const kraEtimsUrl = etimsUrlForInvoice(invoice);
            const poEtimsRow =
              userRole === 'builder' ? builderEtimsReceipts.find((p) => p.id === invoice.purchase_order_id) : undefined;
            const etimsStoredObj = poEtimsRow?.etims_response;
            const hasEtimsStoredPayload =
              etimsStoredObj != null &&
              typeof etimsStoredObj === 'object' &&
              Object.keys(etimsStoredObj as Record<string, unknown>).length > 0;
            const showBuilderEtimsReceiptPanel =
              userRole === 'builder' && (Boolean(kraEtimsUrl?.trim()) || hasEtimsStoredPayload);
            const showBuilderPayNow =
              userRole === 'builder' &&
              !invoiceIsPaid(invoice) &&
              rowStatus !== 'cancelled' &&
              (rowStatus !== 'draft' || paystackSandbox);

            return (
              <Card key={invoice.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{invoice.invoice_number}</CardTitle>
                      <p className="text-sm text-gray-500">
                        PO: {invoice.purchase_order?.po_number || 'N/A'} •{' '}
                        {invoice.supplier?.company_name || 'Supplier'}
                      </p>
                      {userRole === 'builder' && !invoiceIsPaid(invoice) && (
                        <p className="mt-2 text-sm font-medium text-amber-800 dark:text-amber-200">
                          {rowStatus === 'draft' ? (
                            paystackSandbox ? (
                              <>
                                <strong>Paystack test mode:</strong> you can use <strong>Pay now</strong> on this draft
                                to run Paystack sandbox only. In production, the supplier must send the invoice first.
                              </>
                            ) : (
                              <>
                                This invoice is still a <strong>draft</strong> on the supplier side. Payment unlocks
                                when they send it to you.
                              </>
                            )
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
                    {showBuilderEtimsReceiptPanel ? (
                      <KraEtimsReceiptPanel
                        poNumber={invoice.purchase_order?.po_number || invoice.purchase_order_id}
                        verificationUrl={kraEtimsUrl || poEtimsRow?.etims_verification_url}
                        etimsResponse={poEtimsRow?.etims_response ?? null}
                        traderInvoiceNoDb={poEtimsRow?.etims_trader_invoice_no}
                        etimsSubmittedAt={poEtimsRow?.etims_submitted_at}
                      />
                    ) : null}
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
                        <Button variant="outline" onClick={() => handleEditInvoice(invoice)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Invoice
                        </Button>
                      )}

                      {showBuilderPayNow && (
                        <Button
                          type="button"
                          className="relative z-10 min-w-[130px] shrink-0 bg-emerald-600 px-3 py-5 text-sm font-bold text-white shadow-md hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300 disabled:text-emerald-950/70 disabled:hover:bg-emerald-300 sm:min-w-[160px] sm:px-4 sm:py-5 sm:text-base"
                          onClick={() => void handlePayNowClick(invoice)}
                          disabled={acknowledging && payNowBusyId === invoice.id}
                        >
                          {acknowledging && payNowBusyId === invoice.id ? (
                            <>
                              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                              Opening…
                            </>
                          ) : (
                            <>
                              <CreditCard className="h-5 w-5 mr-2" />
                              Pay Now
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
            );
          })}

          {displayInvoices.length > 0 && (
            <div
              className="flex flex-col gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              role="region"
              aria-label="Invoice list total"
            >
              <p className="text-sm text-muted-foreground">
                {showBuilderSupplierPaymentTabs ? (
                  invoicePaymentListTab === 'paid' ? (
                    <>
                      <span className="font-medium text-foreground">Paid invoices</span> — subtotal for{' '}
                      {displayInvoices.length} invoice{displayInvoices.length === 1 ? '' : 's'} in this tab
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-foreground">Unpaid invoices</span> — subtotal for{' '}
                      {displayInvoices.length} invoice{displayInvoices.length === 1 ? '' : 's'} in this tab
                    </>
                  )
                ) : (
                  <>
                    <span className="font-medium text-foreground">Total</span> — {displayInvoices.length} invoice
                    {displayInvoices.length === 1 ? '' : 's'}
                  </>
                )}
              </p>
              <p className="text-lg font-bold tabular-nums sm:text-xl">
                KES{' '}
                {displayInvoicesTotalAmount.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </p>
            </div>
          )}
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

      <Dialog
        open={!!paystackEtimsPo}
        onOpenChange={(open) => {
          if (!open) setPaystackEtimsPo(null);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pay purchase order (eTIMS)</DialogTitle>
            <DialogDescription>
              There is no supplier invoice row for this PO yet. This checkout charges the PO / eTIMS total and records
              payment on the order for your test or integrator flow. When a supplier invoice appears in the list, use{' '}
              <strong>Pay now</strong> on that row to mark the invoice paid.
            </DialogDescription>
          </DialogHeader>
          {paystackEtimsPo ? (
            <div className="space-y-4 py-2">
              <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                <p className="font-mono font-medium">{paystackEtimsPo.poNumber}</p>
                <p className="text-muted-foreground">
                  Amount:{' '}
                  <span className="font-semibold text-foreground">
                    KES {paystackEtimsPo.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </p>
              </div>
              <PaystackCheckout
                amount={paystackEtimsPo.amount}
                currency="KES"
                description={`PO ${paystackEtimsPo.poNumber} (eTIMS — no supplier invoice yet)`}
                orderId={`etims_po_${paystackEtimsPo.poId}`}
                successNavigateTo="/professional-builder-dashboard?tab=invoices"
                onCancel={() => setPaystackEtimsPo(null)}
              />
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setPaystackEtimsPo(null)}>
              Close
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
            {userRole === 'supplier' && editedItems.length > 0 ? (
              <div className="space-y-3 rounded-lg border border-orange-200 bg-orange-50/40 p-3 dark:border-orange-900/50 dark:bg-orange-950/20">
                <div>
                  <Label className="text-base font-semibold text-foreground">Line items</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add or edit the KRA / eTIMS integrator <span className="font-mono">itemCode</span> per line (saved on
                    this invoice as <span className="font-mono">etims_item_code</span>). Helps match catalog codes when
                    you reconcile with eTIMS.
                  </p>
                </div>
                <div className="max-h-[min(50vh,24rem)] space-y-3 overflow-y-auto pr-1">
                  {editedItems.map((raw, index) => {
                    const line = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
                    const code =
                      typeof line.etims_item_code === 'string'
                        ? line.etims_item_code
                        : typeof line.itemCode === 'string'
                          ? line.itemCode
                          : typeof line.item_code === 'string'
                            ? line.item_code
                            : '';
                    const qty = line.quantity ?? line.qty;
                    const unit = typeof line.unit === 'string' ? line.unit : '';
                    const up = line.unit_price ?? line.price;
                    const qtyStr = qty !== undefined && qty !== null ? String(qty) : '—';
                    const upNum = typeof up === 'number' ? up : Number(up);
                    const upStr = Number.isFinite(upNum) ? `KES ${upNum.toLocaleString()}` : '—';
                    return (
                      <div
                        key={index}
                        className="space-y-2 rounded-md border border-border bg-card p-3 shadow-sm"
                      >
                        <p className="text-sm font-medium leading-snug text-foreground">
                          {invoiceLineLabel(line, index)}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>
                            Qty: <span className="font-medium text-foreground">{qtyStr}</span>
                            {unit ? ` ${unit}` : ''}
                          </span>
                          <span>
                            Unit price: <span className="font-medium text-foreground">{upStr}</span>
                          </span>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`inv-line-etims-${index}`} className="text-xs">
                            eTIMS item code (optional)
                          </Label>
                          <Input
                            id={`inv-line-etims-${index}`}
                            className="font-mono text-sm"
                            placeholder="e.g. KE1UCT0000001"
                            value={typeof code === 'string' ? code : ''}
                            autoComplete="off"
                            onChange={(e) => {
                              const v = e.target.value;
                              setEditedItems((prev) =>
                                prev.map((row, i) => {
                                  if (i !== index) return row;
                                  const o = {
                                    ...(row && typeof row === 'object' ? (row as Record<string, unknown>) : {}),
                                  };
                                  const t = v.trim();
                                  if (t) o.etims_item_code = t;
                                  else {
                                    delete o.etims_item_code;
                                    delete o.itemCode;
                                    delete o.item_code;
                                  }
                                  return o;
                                }),
                              );
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

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

/**
 * In-memory cache + parallel prefetch for Professional Builder "Invoices" hub
 * (Delivery notes, GRN, Supplier invoices). Lets subtabs paint data immediately
 * when prefetch finished (hover / idle / warm) before the user switches tabs.
 */
import { supabase } from '@/integrations/supabase/client';
import { readPrefetchedBuilderProfileId } from '@/lib/prefetchBuilderProfileRead';
import { sortSupplyChainDocsNewestFirst } from '@/utils/sortSupplyChainDocs';

const TTL_MS = 90_000;

/** Client-side cap so DN / GRN / invoice hub subtabs never spin forever if PostgREST hangs. */
export const BUILDER_HUB_LIST_FETCH_TIMEOUT_MS = 45_000;

/** Supplier hub runs RPC + profiles + signatures + PO chunks — needs a higher wall clock than builder single-flight. */
export const SUPPLIER_DOC_LIST_FETCH_TIMEOUT_MS = 120_000;

export function builderHubListFetchWithTimeout<T>(
  promise: Promise<T>,
  timeoutToken: string,
  ms: number = BUILDER_HUB_LIST_FETCH_TIMEOUT_MS
): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(timeoutToken)), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

const DN_WORKFLOW_LIST_LIMIT = 500;
const DN_ACTIVE_STATUSES = [
  'pending_signature',
  'signed',
  'forwarded_to_supplier',
  'inspection_pending',
] as const;
const DN_LIST_SELECT =
  'id,dn_number,purchase_order_id,builder_id,supplier_id,delivery_address,delivery_date,items,status,builder_signed_at,inspection_verified,builder_decision,rejection_reason,created_at,updated_at';

const BUILDER_INVOICE_PAGE_LIMIT = 350;
const BUILDER_RECENT_PO_CAP = 400;
const INVOICE_PO_ID_CHUNK = 80;

/** Hub list only — omit `items` JSONB (often huge); avoids statement timeouts / PostgREST stalls. */
const INVOICE_HUB_LIST_SELECT = `
    id,
    invoice_number,
    purchase_order_id,
    grn_id,
    supplier_id,
    builder_id,
    issuer_id,
    subtotal,
    tax_amount,
    discount_amount,
    total_amount,
    invoice_date,
    due_date,
    status,
    payment_status,
    is_editable,
    last_edited_at,
    last_edited_by,
    acknowledged_at,
    acknowledged_by,
    notes,
    created_at,
    updated_at,
    purchase_order:purchase_orders(po_number),
    supplier:suppliers(company_name)
  `;

export function hubCacheKey(authUserId: string, profileId: string | null | undefined): string {
  return `${authUserId}\0${profileId ?? ''}`;
}

/** Aligns cache + queries with login prefetch when `profile?.id` is still null. */
export function resolveBuilderHubProfileId(authUserId: string, profileId: string | null | undefined): string | undefined {
  const explicit =
    profileId != null && profileId !== '' && String(profileId) !== String(authUserId) ? String(profileId) : undefined;
  return explicit ?? readPrefetchedBuilderProfileId(authUserId);
}

function hubKeyResolved(authUserId: string, profileId: string | null | undefined): string {
  return hubCacheKey(authUserId, resolveBuilderHubProfileId(authUserId, profileId));
}

type Slot<T> = { at: number; data: T };

type HubSlots = {
  key: string;
  deliveryNotes?: Slot<unknown[]>;
  grns?: Slot<unknown[]>;
  invoices?: Slot<unknown[]>;
};

let slots: HubSlots | null = null;
let inflightKey: string | null = null;
let inflightPending = 0;

function slotFresh(s: Slot<unknown> | undefined): boolean {
  return !!s && Date.now() - s.at < TTL_MS;
}

export function invalidateBuilderInvoicesHub(authUserId: string, profileId: string | null | undefined): void {
  const k = hubKeyResolved(authUserId, profileId);
  if (slots?.key === k) slots = null;
}

export function peekHubDeliveryNotes(
  authUserId: string | undefined,
  profileId: string | null | undefined
): unknown[] | null {
  if (!authUserId) return null;
  const k = hubKeyResolved(authUserId, profileId);
  if (!slots || slots.key !== k || !slotFresh(slots.deliveryNotes)) return null;
  return slots.deliveryNotes!.data;
}

export function peekHubGrns(
  userId: string | undefined,
  profileId: string | null | undefined
): unknown[] | null {
  if (!userId) return null;
  const k = hubKeyResolved(userId, profileId);
  if (!slots || slots.key !== k || !slotFresh(slots.grns)) return null;
  return slots.grns!.data;
}

const HUB_CACHE_EVENT = 'ujenzi-builder-hub-cache';

function emitHubCacheUpdated(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(HUB_CACHE_EVENT));
}

export function subscribeBuilderHubCache(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(HUB_CACHE_EVENT, cb);
  return () => window.removeEventListener(HUB_CACHE_EVENT, cb);
}

export function patchHubDeliveryNotes(
  authUserId: string,
  profileId: string | null | undefined,
  data: unknown[]
): void {
  const k = hubKeyResolved(authUserId, profileId);
  if (!slots || slots.key !== k) slots = { key: k };
  slots.deliveryNotes = { at: Date.now(), data: [...data] };
  emitHubCacheUpdated();
}

export function patchHubGrns(
  authUserId: string,
  profileId: string | null | undefined,
  data: unknown[]
): void {
  const k = hubKeyResolved(authUserId, profileId);
  if (!slots || slots.key !== k) slots = { key: k };
  slots.grns = { at: Date.now(), data: [...data] };
  emitHubCacheUpdated();
}

export function patchHubInvoices(
  authUserId: string,
  profileId: string | null | undefined,
  data: unknown[]
): void {
  const k = hubKeyResolved(authUserId, profileId);
  if (!slots || slots.key !== k) slots = { key: k };
  slots.invoices = { at: Date.now(), data: [...data] };
  emitHubCacheUpdated();
}

export function peekHubInvoices(
  userId: string | undefined,
  profileId: string | null | undefined
): unknown[] | null {
  if (!userId) return null;
  const k = hubKeyResolved(userId, profileId);
  if (!slots || slots.key !== k || !slotFresh(slots.invoices)) return null;
  return slots.invoices!.data;
}

function uniqueBuilderIds(authId: string | undefined, profileId?: string | null): string[] {
  return [...new Set([authId, profileId].filter(Boolean))] as string[];
}

export async function fetchBuilderHubDeliveryNotes(
  builderAuthUserId: string,
  builderProfileId: string | null | undefined
): Promise<unknown[]> {
  const resolved = resolveBuilderHubProfileId(builderAuthUserId, builderProfileId);
  const builderIds = uniqueBuilderIds(builderAuthUserId, resolved ?? builderProfileId);
  if (builderIds.length === 0) return [];

  const statuses = [...DN_ACTIVE_STATUSES];
  let list: Record<string, unknown>[] = [];

  const { data: rpcRows, error: rpcErr } = await supabase.rpc('builder_hub_delivery_notes', {
    p_limit: DN_WORKFLOW_LIST_LIMIT,
  });

  if (!rpcErr && Array.isArray(rpcRows)) {
    const pick = (r: Record<string, unknown>) => {
      const o: Record<string, unknown> = {};
      for (const k of DN_LIST_SELECT.split(',')) {
        const key = k.trim();
        if (key in r) o[key] = r[key];
      }
      return o;
    };
    list = (rpcRows as Record<string, unknown>[]).map(pick);
    list = sortSupplyChainDocsNewestFirst(list) as Record<string, unknown>[];
    if (list.length > DN_WORKFLOW_LIST_LIMIT) list = list.slice(0, DN_WORKFLOW_LIST_LIMIT);
  } else {
    if (rpcErr) {
      console.warn('[hub] builder_hub_delivery_notes RPC failed, using direct query:', rpcErr.message);
    }

    if (builderIds.length === 1) {
      const { data: rows, error } = await supabase
        .from('delivery_notes')
        .select(DN_LIST_SELECT)
        .eq('builder_id', builderIds[0])
        .in('status', statuses)
        .order('created_at', { ascending: false })
        .limit(DN_WORKFLOW_LIST_LIMIT);
      if (error) throw error;
      list = (rows || []) as Record<string, unknown>[];
    } else {
      const perBuilder = Math.max(50, Math.ceil(DN_WORKFLOW_LIST_LIMIT / builderIds.length));
      const parts = await Promise.all(
        builderIds.map((bid) =>
          supabase
            .from('delivery_notes')
            .select(DN_LIST_SELECT)
            .eq('builder_id', bid)
            .in('status', statuses)
            .order('created_at', { ascending: false })
            .limit(perBuilder)
        )
      );
      const firstErr = parts.find((p) => p.error)?.error;
      if (firstErr) throw firstErr;
      const merged = new Map<string, Record<string, unknown>>();
      for (const p of parts) {
        for (const row of (p.data || []) as Record<string, unknown>[]) {
          const id = row.id as string;
          if (id) merged.set(id, row);
        }
      }
      list = sortSupplyChainDocsNewestFirst([...merged.values()]) as Record<string, unknown>[];
      if (list.length > DN_WORKFLOW_LIST_LIMIT) list = list.slice(0, DN_WORKFLOW_LIST_LIMIT);
    }
  }

  if (list.length === 0) return [];

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

  const enriched = (list as Record<string, unknown>[]).map((r) => {
    const po = poById[r.purchase_order_id as string];
    const sup = supById[r.supplier_id as string];
    return {
      ...r,
      purchase_order: po
        ? { po_number: po.po_number, total_amount: po.total_amount ?? undefined }
        : undefined,
      supplier: sup ? { company_name: sup.company_name ?? undefined } : undefined,
    };
  });

  return sortSupplyChainDocsNewestFirst(enriched as unknown as Record<string, unknown>[]) as unknown[];
}

export async function fetchBuilderHubGrns(
  userId: string,
  builderProfileId?: string | null
): Promise<unknown[]> {
  const resolved = resolveBuilderHubProfileId(userId, builderProfileId);
  const builderIds = uniqueBuilderIds(userId, resolved ?? builderProfileId);
  if (builderIds.length === 0) return [];

  // Omit purchase_orders.items — large JSONB embed often stalls PostgREST; list uses grn.items + po_number.
  const selectGrn = `
          *,
          purchase_order:purchase_orders(po_number)
        `;

  if (builderIds.length === 1) {
    const { data, error } = await supabase
      .from('goods_received_notes')
      .select(selectGrn)
      .eq('builder_id', builderIds[0])
      .order('created_at', { ascending: false })
      .limit(400);
    if (error) throw error;
    return sortSupplyChainDocsNewestFirst((data || []) as unknown as Record<string, unknown>[]) as unknown[];
  }

  const parts = await Promise.all(
    builderIds.map((bid) =>
      supabase.from('goods_received_notes').select(selectGrn).eq('builder_id', bid).order('created_at', { ascending: false }).limit(400)
    )
  );
  const firstErr = parts.find((p) => p.error)?.error;
  if (firstErr) throw firstErr;
  const merged = new Map<string, Record<string, unknown>>();
  for (const p of parts) {
    for (const row of (p.data || []) as Record<string, unknown>[]) {
      const id = row.id as string;
      if (id) merged.set(id, row);
    }
  }
  return sortSupplyChainDocsNewestFirst([...merged.values()]) as unknown[];
}

export async function fetchBuilderHubInvoices(
  userId: string,
  builderProfileId: string | null | undefined
): Promise<unknown[]> {
  const resolved = resolveBuilderHubProfileId(userId, builderProfileId);
  const builderKeys = [...new Set([userId, resolved ?? builderProfileId].filter(Boolean))] as string[];

  const invByKey = (bid: string) =>
    supabase
      .from('invoices')
      .select(INVOICE_HUB_LIST_SELECT)
      .eq('builder_id', bid)
      .order('created_at', { ascending: false })
      .limit(BUILDER_INVOICE_PAGE_LIMIT);

  const byKeyRes =
    builderKeys.length === 1 ? [await invByKey(builderKeys[0])] : await Promise.all(builderKeys.map((k) => invByKey(k)));
  const eInv = byKeyRes.find((r) => r.error)?.error;
  if (eInv) throw eInv;

  const byBuilderMap = new Map<string, Record<string, unknown>>();
  for (const r of byKeyRes) {
    for (const inv of (r.data || []) as Record<string, unknown>[]) {
      const id = inv.id as string;
      if (id) byBuilderMap.set(id, inv);
    }
  }

  const { data: myOrders, error: e2 } = await supabase
    .from('purchase_orders')
    .select('id')
    .in('buyer_id', builderKeys)
    .order('created_at', { ascending: false })
    .limit(BUILDER_RECENT_PO_CAP);
  if (e2) throw e2;

  const poIds = (myOrders || []).map((p) => p.id).filter(Boolean);
  const byPoMap = new Map<string, Record<string, unknown>>();
  if (poIds.length > 0) {
    const slices: string[][] = [];
    for (let i = 0; i < poIds.length; i += INVOICE_PO_ID_CHUNK) {
      slices.push(poIds.slice(i, i + INVOICE_PO_ID_CHUNK));
    }
    const poChunkResults = await Promise.all(
      slices.map((slice) =>
        supabase
          .from('invoices')
          .select(INVOICE_HUB_LIST_SELECT)
          .in('purchase_order_id', slice)
          .order('created_at', { ascending: false })
          .limit(BUILDER_INVOICE_PAGE_LIMIT)
      )
    );
    const poChunkErr = poChunkResults.find((r) => r.error)?.error;
    if (poChunkErr) throw poChunkErr;
    for (const { data: invPo } of poChunkResults) {
      for (const inv of (invPo || []) as Record<string, unknown>[]) {
        const id = inv.id as string;
        if (id) byPoMap.set(id, inv);
      }
    }
  }

  const merged = new Map<string, Record<string, unknown>>();
  for (const inv of byBuilderMap.values()) merged.set(inv.id as string, inv);
  for (const inv of byPoMap.values()) merged.set(inv.id as string, inv);

  let list = sortSupplyChainDocsNewestFirst(
    Array.from(merged.values()) as unknown as Record<string, unknown>[]
  ) as unknown as Record<string, unknown>[];
  if (list.length > BUILDER_INVOICE_PAGE_LIMIT) {
    list = list.slice(0, BUILDER_INVOICE_PAGE_LIMIT);
  }
  // List select omits `items`; UI expects an array (e.g. supplier edit, guards).
  return list.map((row) => ({
    ...row,
    items: Array.isArray((row as { items?: unknown }).items) ? (row as { items: unknown[] }).items : [],
  }));
}

function finishInflight(key: string) {
  inflightPending -= 1;
  if (inflightPending <= 0 && inflightKey === key) inflightKey = null;
}

/**
 * Fire parallel fetches for DN + GRN + invoices and fill cache slots (no await required).
 * Safe to call from hover, idle callback, or when opening the Invoices main tab.
 */
export function warmBuilderInvoicesHub(authUserId: string | undefined, profileId: string | null | undefined): void {
  if (!authUserId) return;
  const resolvedProfile = resolveBuilderHubProfileId(authUserId, profileId);
  const key = hubCacheKey(authUserId, resolvedProfile);
  if (
    slots?.key === key &&
    slotFresh(slots.deliveryNotes) &&
    slotFresh(slots.grns) &&
    slotFresh(slots.invoices)
  ) {
    return;
  }
  if (inflightKey === key && inflightPending > 0) return;

  inflightKey = key;
  inflightPending = 3;
  slots = { key };

  void fetchBuilderHubDeliveryNotes(authUserId, profileId)
    .then((data) => {
      if (slots?.key === key) slots.deliveryNotes = { at: Date.now(), data };
      emitHubCacheUpdated();
    })
    .catch(() => {})
    .finally(() => finishInflight(key));

  void fetchBuilderHubGrns(authUserId, profileId)
    .then((data) => {
      if (slots?.key === key) slots.grns = { at: Date.now(), data };
      emitHubCacheUpdated();
    })
    .catch(() => {})
    .finally(() => finishInflight(key));

  void fetchBuilderHubInvoices(authUserId, profileId)
    .then((data) => {
      if (slots?.key === key) slots.invoices = { at: Date.now(), data };
      emitHubCacheUpdated();
    })
    .catch(() => {})
    .finally(() => finishInflight(key));
}

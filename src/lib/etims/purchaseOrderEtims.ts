/**
 * Map UjenziXform purchase_orders → VFD REST **SalesReq** (POST /invoices), e.g. Swagger `SalesReq` / `SalesItem`.
 * Base path: `/api/v1/` (see integrator Postman: Generate Invoice).
 *
 * Each `purchase_orders.items` element may include:
 *   `etims_item_code` (or `itemCode` / `item_code`) — integrator **itemCode** (must exist on OSCU item master).
 *   `quantity` or `qty`, `unit_price` or `unitPrice`, optional `discountAmount`, `pkg`.
 *   Optional line fields accepted by many deployments: `taxCode` / `tax_code` (A–E), `insuranceCompanyCode`.
 *
 * Valid JSON example (integrator “tax code change” body, no stray quotes): `samples/integrator-invoice-tax-code-d.json`.
 */
import { formatEtimsSalesDate } from "./salesDate";
import type { EtimsGenerateInvoiceRequest, EtimsSalesItem } from "./types";
import { invokeEtimsProxy } from "./invokeEtimsProxy";
import { supabase } from "@/integrations/supabase/client";

export type PoItemJson = Record<string, unknown>;

export function parsePurchaseOrderItems(items: unknown): PoItemJson[] {
  if (!Array.isArray(items)) return [];
  return items.filter((x): x is PoItemJson => typeof x === "object" && x !== null);
}

/** Non-empty KRA/integrator code from a PO line (explicit JSON or common aliases). */
export function lineEtimsItemCode(line: PoItemJson): string {
  const keys = ["etims_item_code", "itemCode", "item_code", "kra_item_code", "kraItemCode"] as const;
  for (const k of keys) {
    const raw = line[k];
    const v = typeof raw === "string" ? raw.trim() : "";
    if (!v) continue;
    return v;
  }
  return "";
}

/** Catalog row id on PO lines (materials / admin_material_images / supplier_product_prices.product_id). */
const UUID_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function catalogIdFromPoLine(line: PoItemJson): string {
  const keyOrder = ["material_id", "product_id", "materialId", "productId"] as const;
  for (const k of keyOrder) {
    const raw = line[k];
    const v =
      typeof raw === "string"
        ? raw.trim()
        : typeof raw === "number" && Number.isFinite(raw)
          ? String(raw)
          : "";
    if (v) return v;
  }
  const idRaw = line.id;
  const idStr =
    typeof idRaw === "string"
      ? idRaw.trim()
      : typeof idRaw === "number" && Number.isFinite(idRaw)
        ? String(idRaw)
        : "";
  if (idStr && UUID_LIKE.test(idStr)) return idStr;
  return "";
}

function chunkIds(ids: string[], size: number): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}

type CatalogEtimsHints = {
  itemCode?: string;
  taxCode?: string;
  qtyUnit?: string;
  pkgUnit?: string;
};

function mergeHints(base: CatalogEtimsHints, patch: CatalogEtimsHints): CatalogEtimsHints {
  return {
    itemCode: base.itemCode || patch.itemCode,
    taxCode: base.taxCode || patch.taxCode,
    qtyUnit: base.qtyUnit || patch.qtyUnit,
    pkgUnit: base.pkgUnit || patch.pkgUnit,
  };
}

/**
 * Fills missing integrator fields from catalog: `supplier_product_prices` (per supplier + product_id),
 * then `materials`, then `admin_material_images` for item codes only.
 */
export async function enrichPurchaseOrderItemsWithEtimsCatalogCodes(
  supplierId: string,
  items: unknown,
): Promise<unknown> {
  const lines = parsePurchaseOrderItems(items);
  if (lines.length === 0) return items;

  const productIds = new Set<string>();
  for (const line of lines) {
    const pid = catalogIdFromPoLine(line);
    if (pid) productIds.add(pid);
  }
  if (productIds.size === 0) return items;

  const hintsByProduct = new Map<string, CatalogEtimsHints>();
  const ids = [...productIds];

  const rowToHints = (row: Record<string, unknown>): CatalogEtimsHints => {
    const icRaw = row.etims_item_code;
    const tcRaw = row.etims_tax_code;
    const quRaw = row.etims_qty_unit_code;
    const puRaw = row.etims_pkg_unit_code;
    return {
      itemCode: typeof icRaw === "string" && icRaw.trim() ? icRaw.trim() : undefined,
      taxCode: typeof tcRaw === "string" && tcRaw.trim() ? tcRaw.trim().slice(0, 8) : undefined,
      qtyUnit: typeof quRaw === "string" && quRaw.trim() ? quRaw.trim().slice(0, 32) : undefined,
      pkgUnit: typeof puRaw === "string" && puRaw.trim() ? puRaw.trim().slice(0, 32) : undefined,
    };
  };

  for (const part of chunkIds(ids, 80)) {
    const { data: sppRows } = await supabase
      .from("supplier_product_prices")
      .select("product_id,etims_item_code,etims_tax_code,etims_qty_unit_code,etims_pkg_unit_code")
      .eq("supplier_id", supplierId)
      .in("product_id", part);
    for (const row of sppRows ?? []) {
      const r = row as { product_id?: string };
      if (!r.product_id) continue;
      const pid = String(r.product_id);
      const h = rowToHints(row as Record<string, unknown>);
      hintsByProduct.set(pid, mergeHints(hintsByProduct.get(pid) ?? {}, h));
    }
  }

  for (const part of chunkIds(ids, 80)) {
    const { data: matRows } = await supabase
      .from("materials")
      .select("id,etims_item_code,etims_tax_code,etims_qty_unit_code,etims_pkg_unit_code")
      .in("id", part);
    for (const row of matRows ?? []) {
      const r = row as { id?: string };
      if (!r.id) continue;
      const pid = String(r.id);
      const h = rowToHints(row as Record<string, unknown>);
      hintsByProduct.set(pid, mergeHints(hintsByProduct.get(pid) ?? {}, h));
    }
  }

  const idsNeedingAmiItemCode = ids.filter((id) => {
    const h = hintsByProduct.get(id);
    return !h?.itemCode;
  });
  for (const part of chunkIds(idsNeedingAmiItemCode, 80)) {
    const { data: amiRows } = await supabase.from("admin_material_images").select("id,etims_item_code").in("id", part);
    for (const row of amiRows ?? []) {
      const r = row as { id?: string; etims_item_code?: string | null };
      const code = typeof r.etims_item_code === "string" ? r.etims_item_code.trim() : "";
      if (r.id && code) {
        const pid = String(r.id);
        hintsByProduct.set(pid, mergeHints(hintsByProduct.get(pid) ?? {}, { itemCode: code }));
      }
    }
  }

  const enriched = lines.map((line) => {
    const pid = catalogIdFromPoLine(line);
    const hints = pid ? hintsByProduct.get(pid) : undefined;
    if (!hints) return line;
    const out: PoItemJson = { ...line };
    if (!lineEtimsItemCode(out) && hints.itemCode) out.etims_item_code = hints.itemCode;
    if (!str(line.taxCode ?? line.tax_code) && hints.taxCode) out.tax_code = hints.taxCode;
    if (!str(line.qtyUnitCode ?? line.qty_unit_code) && hints.qtyUnit) out.qty_unit_code = hints.qtyUnit;
    if (!str(line.pkgUnitCode ?? line.pkg_unit_code) && hints.pkgUnit) out.pkg_unit_code = hints.pkgUnit;
    return out;
  });

  return enriched;
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return fallback;
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Suppliers often set `quote_amount` / accepted `total_amount` without rewriting each
 * `items[].unit_price` (cart/catalog prices stay on lines). The integrator receipt is
 * driven by line amounts, so we align lines to the PO header total before POST /invoices.
 */
function reconcileSalesItemsWithHeaderTotal(salesItems: EtimsSalesItem[], headerTotal: number): void {
  if (!salesItems.length) return;
  if (!Number.isFinite(headerTotal) || headerTotal <= 0) return;

  const lineSum = salesItems.reduce((s, it) => s + (Number.isFinite(it.amount) ? it.amount : 0), 0);
  if (!Number.isFinite(lineSum) || lineSum <= 0) return;
  if (Math.abs(lineSum - headerTotal) < 0.005) return;

  const factor = headerTotal / lineSum;
  for (const it of salesItems) {
    const qty = Number.isFinite(it.qty) && it.qty > 0 ? it.qty : 1;
    const scaled = roundMoney((Number.isFinite(it.amount) ? it.amount : 0) * factor);
    it.amount = scaled;
    it.unitPrice = roundMoney(scaled / qty);
  }

  const newSum = salesItems.reduce((s, it) => s + it.amount, 0);
  const drift = roundMoney(headerTotal - newSum);
  if (Math.abs(drift) >= 0.001) {
    const last = salesItems[salesItems.length - 1];
    const qty = Number.isFinite(last.qty) && last.qty > 0 ? last.qty : 1;
    last.amount = roundMoney(last.amount + drift);
    last.unitPrice = roundMoney(last.amount / qty);
  }
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

async function fetchBuilderPartyForEtims(
  buyerKey: string | null,
): Promise<{ customerPin?: string; customerName?: string }> {
  if (!buyerKey || !String(buyerKey).trim()) return {};
  const key = String(buyerKey).trim();
  const { data } = await supabase
    .from("profiles")
    .select("kra_pin, company_name, billing_company_name, full_name")
    .or(`id.eq.${key},user_id.eq.${key}`)
    .maybeSingle();
  if (!data) return {};
  const row = data as {
    kra_pin?: string | null;
    company_name?: string | null;
    billing_company_name?: string | null;
    full_name?: string | null;
  };
  const pin = typeof row.kra_pin === "string" ? row.kra_pin.trim().toUpperCase() : "";
  const name =
    (typeof row.billing_company_name === "string" && row.billing_company_name.trim()
      ? row.billing_company_name.trim()
      : null) ||
    (typeof row.company_name === "string" && row.company_name.trim() ? row.company_name.trim() : null) ||
    (typeof row.full_name === "string" && row.full_name.trim() ? row.full_name.trim() : null) ||
    undefined;
  return {
    ...(pin ? { customerPin: pin } : {}),
    ...(name ? { customerName: name.slice(0, 200) } : {}),
  };
}

export function purchaseOrderStatusBlocksEtimsInvoice(status: string | null | undefined): boolean {
  const s = (status || "").toLowerCase();
  return (
    s === "pending" ||
    s === "quote_created" ||
    s === "quote_received_by_supplier" ||
    s === "quote_responded" ||
    s === "quote_revised" ||
    s === "quote_viewed_by_builder" ||
    s === "quoted" ||
    s === "draft"
  );
}

/** Thrown when a PO line is linked to catalog id but has no integrator item code (for UI deep-link). */
export class EtimsMissingItemCodeError extends Error {
  override readonly name = "EtimsMissingItemCodeError";
  constructor(
    message: string,
    public readonly focusCatalogId: string,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Build integrator POST /invoices body from a PO row + buyer PIN.
 * Throws if any line is missing `etims_item_code`.
 */
export function buildEtimsInvoiceBodyFromPurchaseOrder(
  po: {
    id: string;
    po_number: string;
    total_amount: number;
    items: unknown;
  },
  options: {
    customerPin?: string;
    customerName?: string;
    paymentType?: EtimsGenerateInvoiceRequest["paymentType"];
    /** Override trader invoice ref (default: po_number) */
    traderInvoiceNo?: string;
    currency?: string;
    exchangeRate?: number;
    countryCode?: string;
    receiptTypeCode?: EtimsGenerateInvoiceRequest["receiptTypeCode"];
    salesTypeCode?: EtimsGenerateInvoiceRequest["salesTypeCode"];
    /** Credit note (R): original sale trader invoice number */
    originalTraderInvoiceNo?: string;
  } = {},
): EtimsGenerateInvoiceRequest {
  const lines = parsePurchaseOrderItems(po.items);
  const salesItems: EtimsSalesItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const itemCode = lineEtimsItemCode(line);
    if (!itemCode) {
      const catId = catalogIdFromPoLine(line);
      const label = str(line.material_name ?? line.name ?? line.item_name ?? line.description);
      const who = catId
        ? `No integrator item code on file for catalog id ${catId}${label ? ` (${label})` : ""}. Add eTIMS item code on that product in your supplier catalog (or admin catalog), or put etims_item_code on this line in the PO items JSON.`
        : `This line has no material/product id and no etims_item_code (line ${i + 1}${label ? `: ${label}` : ""}). Fix the PO items JSON so each row includes material_id (or product_id) plus etims_item_code, or only etims_item_code.`;
      if (catId) throw new EtimsMissingItemCodeError(who, catId);
      throw new Error(who);
    }
    const qty = num(line.quantity ?? line.qty, 1);
    const unitPrice = num(line.unit_price ?? line.unitPrice ?? line.price, 0);
    const discountAmount = num(line.discountAmount ?? line.discount_amount, 0);
    const pkg = num(line.pkg ?? line.pkgUnitCode ?? line.pkg_unit_code, 0);
    const amount = num(line.amount ?? line.lineTotal ?? line.total, unitPrice * qty - discountAmount);
    // SalesItem: itemCode (+ item_code duplicate for some deserializers). Optional taxCode, insuranceCompanyCode.
    const row: EtimsSalesItem = {
      itemCode,
      item_code: itemCode,
      qty,
      pkg,
      unitPrice,
      amount: amount > 0 ? amount : unitPrice * qty - discountAmount,
      discountAmount,
    };
    const taxCode = str(line.taxCode ?? line.tax_code);
    if (taxCode) row.taxCode = taxCode;
    const ins = str(line.insuranceCompanyCode ?? line.insurance_company_code);
    if (ins) row.insuranceCompanyCode = ins;
    salesItems.push(row);
  }

  if (salesItems.length === 0) {
    throw new Error("Purchase order has no line items.");
  }

  const preSum = salesItems.reduce((s, i) => s + i.amount, 0);
  const headerTotal =
    Number.isFinite(po.total_amount) && po.total_amount > 0 ? po.total_amount : preSum;
  reconcileSalesItemsWithHeaderTotal(salesItems, headerTotal);
  const totalAmount = salesItems.reduce((s, i) => s + i.amount, 0);

  const currency = (options.currency ?? "KES").trim().slice(0, 16) || "KES";
  const exchangeRate =
    typeof options.exchangeRate === "number" && Number.isFinite(options.exchangeRate) && options.exchangeRate > 0
      ? options.exchangeRate
      : 1;
  const countryCode = options.countryCode?.trim().slice(0, 8);

  const receiptType = options.receiptTypeCode ?? "S";
  const orgNo = str(options.originalTraderInvoiceNo);

  return {
    traderInvoiceNo: (options.traderInvoiceNo ?? po.po_number).slice(0, 200),
    ...(orgNo && receiptType === "R" ? { traderOrgInvoiceNo: orgNo.slice(0, 200) } : {}),
    totalAmount,
    paymentType: options.paymentType ?? "01",
    salesTypeCode: options.salesTypeCode ?? "N",
    receiptTypeCode: receiptType,
    salesStatusCode: "01",
    salesDate: formatEtimsSalesDate(),
    currency,
    exchangeRate,
    ...(countryCode ? { countryCode } : {}),
    salesItems,
    customerPin: options.customerPin || undefined,
    customerName: options.customerName || undefined,
  };
}

/** Extract common fields from integrator success JSON (shape may vary slightly). */
export function pickEtimsPersistFields(data: unknown): {
  verificationUrl: string | null;
  traderInvoiceNo: string | null;
} {
  if (!data || typeof data !== "object") return { verificationUrl: null, traderInvoiceNo: null };
  const root = data as Record<string, unknown>;
  const inner = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  const verificationUrl =
    typeof inner.invoiceVerificationUrl === "string"
      ? inner.invoiceVerificationUrl
      : typeof inner.invoice_verification_url === "string"
        ? inner.invoice_verification_url
        : typeof inner.verificationUrl === "string"
          ? inner.verificationUrl
          : typeof inner.verification_url === "string"
            ? inner.verification_url
            : typeof inner.link === "string"
              ? inner.link
              : null;
  const traderInvoiceNo =
    typeof inner.traderInvoiceNo === "string"
      ? inner.traderInvoiceNo
      : typeof inner.trader_invoice_no === "string"
        ? inner.trader_invoice_no
        : null;
  return { verificationUrl, traderInvoiceNo };
}

export type SubmitEtimsInvoiceResult =
  | { ok: true; data: unknown }
  | { ok: false; message: string; status?: number; focusCatalogId?: string };

/**
 * POST /invoices via etims-proxy and persist outcome on purchase_orders.
 * Uses buyer KRA / billing name from `profiles` when options omit customer fields.
 * Sets `etims_validated_at` when the integrator returns success and the order row is updated.
 */
export async function submitEtimsInvoiceForPurchaseOrder(
  purchaseOrderId: string,
  options: {
    enforceSupplierId?: string | null;
    customerPin?: string;
    customerName?: string;
    paymentType?: EtimsGenerateInvoiceRequest["paymentType"];
    currency?: string;
    exchangeRate?: number;
    countryCode?: string;
  } = {},
): Promise<SubmitEtimsInvoiceResult> {
  const { data: po, error: poErr } = await supabase
    .from("purchase_orders")
    .select("id, po_number, total_amount, items, supplier_id, buyer_id, accepted_quote_id, status")
    .eq("id", purchaseOrderId)
    .maybeSingle();

  if (poErr || !po) {
    return { ok: false, message: poErr?.message ?? "Purchase order not found or not accessible." };
  }

  if (options.enforceSupplierId && String(po.supplier_id) !== String(options.enforceSupplierId)) {
    return { ok: false, message: "This order does not belong to your supplier account." };
  }

  if (purchaseOrderStatusBlocksEtimsInvoice((po as { status?: string }).status)) {
    return {
      ok: false,
      message:
        "This order is not in an accepted state yet. Wait until the buyer accepts a quotation (or the order is confirmed) before issuing a KRA tax invoice.",
    };
  }

  const { data: sup } = await supabase
    .from("suppliers")
    .select("etims_default_payment_type")
    .eq("id", (po as { supplier_id: string }).supplier_id)
    .maybeSingle();
  const supPay = (sup as { etims_default_payment_type?: string | null } | null)?.etims_default_payment_type;
  const paymentFromSupplier =
    typeof supPay === "string" && /^0[1-7]$/.test(supPay.trim())
      ? (supPay.trim() as EtimsGenerateInvoiceRequest["paymentType"])
      : undefined;

  const party = await fetchBuilderPartyForEtims((po as { buyer_id?: string | null }).buyer_id ?? null);

  const itemsForInvoice = await enrichPurchaseOrderItemsWithEtimsCatalogCodes(
    String((po as { supplier_id: string }).supplier_id),
    (po as { items: unknown }).items,
  );

  let body: EtimsGenerateInvoiceRequest;
  try {
    body = buildEtimsInvoiceBodyFromPurchaseOrder(
      {
        id: (po as { id: string }).id,
        po_number: (po as { po_number: string }).po_number,
        total_amount: Number((po as { total_amount: number }).total_amount),
        items: itemsForInvoice,
      },
      {
        customerPin: options.customerPin ?? party.customerPin,
        customerName: options.customerName ?? party.customerName,
        paymentType: options.paymentType ?? paymentFromSupplier ?? "01",
        currency: options.currency,
        exchangeRate: options.exchangeRate,
        countryCode: options.countryCode,
        receiptTypeCode: "S",
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const focusCatalogId = e instanceof EtimsMissingItemCodeError ? e.focusCatalogId : undefined;
    await supabase
      .from("purchase_orders")
      .update({ etims_error: msg, etims_submitted_at: new Date().toISOString() })
      .eq("id", purchaseOrderId);
    return { ok: false, message: msg, focusCatalogId };
  }

  const res = await invokeEtimsProxy<Record<string, unknown>>({
    method: "POST",
    path: "invoices",
    body,
  });

  if (!res.ok) {
    await supabase
      .from("purchase_orders")
      .update({
        etims_error: res.message,
        etims_submitted_at: new Date().toISOString(),
        etims_response: (res.data ?? null) as object | null,
      })
      .eq("id", purchaseOrderId);
    return { ok: false, message: res.message, status: res.status };
  }

  const persist = pickEtimsPersistFields(res.data);
  const nowIso = new Date().toISOString();
  const { error: upErr } = await supabase
    .from("purchase_orders")
    .update({
      etims_submitted_at: nowIso,
      etims_validated_at: nowIso,
      etims_trader_invoice_no: persist.traderInvoiceNo ?? body.traderInvoiceNo,
      etims_response: res.data as object,
      etims_verification_url: persist.verificationUrl,
      etims_error: null,
    })
    .eq("id", purchaseOrderId);

  if (upErr) {
    return {
      ok: false,
      message: `Invoice accepted by integrator but failed to save on order: ${upErr.message}`,
    };
  }

  return { ok: true, data: res.data };
}

/**
 * POST credit note (receipt type R) for a purchase order that already has a successful sale invoice reference.
 */
export async function submitEtimsCreditNoteForPurchaseOrder(
  purchaseOrderId: string,
  options: {
    enforceSupplierId?: string | null;
    customerPin?: string;
    customerName?: string;
    paymentType?: EtimsGenerateInvoiceRequest["paymentType"];
    currency?: string;
    exchangeRate?: number;
    countryCode?: string;
  } = {},
): Promise<SubmitEtimsInvoiceResult> {
  const { data: po, error: poErr } = await supabase
    .from("purchase_orders")
    .select(
      "id, po_number, total_amount, items, supplier_id, buyer_id, status, etims_trader_invoice_no, etims_validated_at",
    )
    .eq("id", purchaseOrderId)
    .maybeSingle();

  if (poErr || !po) {
    return { ok: false, message: poErr?.message ?? "Purchase order not found or not accessible." };
  }

  const row = po as {
    id: string;
    supplier_id: string;
    buyer_id?: string | null;
    etims_trader_invoice_no?: string | null;
    etims_validated_at?: string | null;
    po_number: string;
    total_amount: number;
    items: unknown;
  };

  if (options.enforceSupplierId && String(row.supplier_id) !== String(options.enforceSupplierId)) {
    return { ok: false, message: "This order does not belong to your supplier account." };
  }

  if (!row.etims_validated_at || !str(row.etims_trader_invoice_no)) {
    return {
      ok: false,
      message: "Issue a validated sale invoice on this order before submitting a credit note.",
    };
  }

  const { data: sup } = await supabase
    .from("suppliers")
    .select("etims_default_payment_type")
    .eq("id", row.supplier_id)
    .maybeSingle();
  const supPay = (sup as { etims_default_payment_type?: string | null } | null)?.etims_default_payment_type;
  const paymentFromSupplier =
    typeof supPay === "string" && /^0[1-7]$/.test(supPay.trim())
      ? (supPay.trim() as EtimsGenerateInvoiceRequest["paymentType"])
      : undefined;

  const party = await fetchBuilderPartyForEtims(row.buyer_id ?? null);
  const itemsForInvoice = await enrichPurchaseOrderItemsWithEtimsCatalogCodes(String(row.supplier_id), row.items);

  const creditTraderNo = `CN-${row.po_number}-${Date.now()}`.slice(0, 200);

  let body: EtimsGenerateInvoiceRequest;
  try {
    body = buildEtimsInvoiceBodyFromPurchaseOrder(
      {
        id: row.id,
        po_number: row.po_number,
        total_amount: Number(row.total_amount),
        items: itemsForInvoice,
      },
      {
        customerPin: options.customerPin ?? party.customerPin,
        customerName: options.customerName ?? party.customerName,
        paymentType: options.paymentType ?? paymentFromSupplier ?? "01",
        currency: options.currency,
        exchangeRate: options.exchangeRate,
        countryCode: options.countryCode,
        receiptTypeCode: "R",
        traderInvoiceNo: creditTraderNo,
        originalTraderInvoiceNo: str(row.etims_trader_invoice_no),
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const focusCatalogId = e instanceof EtimsMissingItemCodeError ? e.focusCatalogId : undefined;
    await supabase.from("purchase_orders").update({ etims_credit_error: msg }).eq("id", purchaseOrderId);
    return { ok: false, message: msg, focusCatalogId };
  }

  const res = await invokeEtimsProxy<Record<string, unknown>>({
    method: "POST",
    path: "invoices",
    body,
  });

  if (!res.ok) {
    await supabase
      .from("purchase_orders")
      .update({
        etims_credit_error: res.message,
        etims_credit_submitted_at: new Date().toISOString(),
        etims_credit_response: (res.data ?? null) as object | null,
      })
      .eq("id", purchaseOrderId);
    return { ok: false, message: res.message, status: res.status };
  }

  const persist = pickEtimsPersistFields(res.data);
  const nowIso = new Date().toISOString();
  const { error: upErr } = await supabase
    .from("purchase_orders")
    .update({
      etims_credit_submitted_at: nowIso,
      etims_credit_trader_invoice_no: persist.traderInvoiceNo ?? creditTraderNo,
      etims_credit_response: res.data as object,
      etims_credit_verification_url: persist.verificationUrl,
      etims_credit_error: null,
    })
    .eq("id", purchaseOrderId);

  if (upErr) {
    return {
      ok: false,
      message: `Credit note accepted by integrator but failed to save on order: ${upErr.message}`,
    };
  }

  return { ok: true, data: res.data };
}

/** Supplier/admin: lightweight GET to verify Edge secrets and integrator reachability. */
export async function testEtimsIntegratorConnection() {
  return invokeEtimsProxy<unknown>({ method: "GET", path: "branches" });
}

/**
 * (4) Push stock level to integrator for an existing item code (sandbox/prod per Edge secrets).
 */
export async function pushEtimsItemStockLevel(itemCode: string, stock: number) {
  const path = `items/${encodeURIComponent(itemCode)}/stocks`;
  return invokeEtimsProxy<{ status?: number }>({
    method: "PUT",
    path,
    body: { stock },
  });
}

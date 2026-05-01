/**
 * Map UjenziXform purchase_orders → integrator sales invoice payload.
 *
 * Convention: each element in `purchase_orders.items` JSON array may include:
 *   `etims_item_code` (string, required for submission) — item code from your integrator/OSCU catalog.
 *   `quantity` or `qty`, `unit_price` or `unitPrice`, optional `discountAmount`, `pkg` (default 0).
 */
import { formatEtimsSalesDate } from "./salesDate";
import type { EtimsGenerateInvoiceRequest, EtimsSalesItem } from "./types";
import { invokeEtimsProxy } from "./invokeEtimsProxy";
import { supabase } from "@/integrations/supabase/client";

export type PoItemJson = Record<string, unknown>;

/** Legacy demo / tutorial values — never valid on a real integrator tenant; ignore everywhere. */
const DISCOURAGED_ETIMS_ITEM_CODES = new Set(["KE1UCT0000014"]);

export function isDiscouragedEtimsItemCode(code: string): boolean {
  const t = code.trim();
  return t.length > 0 && DISCOURAGED_ETIMS_ITEM_CODES.has(t);
}

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
    if (!v || isDiscouragedEtimsItemCode(v)) continue;
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

/**
 * Fills missing line codes from `supplier_product_prices` (same supplier + product_id)
 * then `materials` (by id), so legacy PO rows work once catalog codes are stored in DB.
 */
export async function enrichPurchaseOrderItemsWithEtimsCatalogCodes(
  supplierId: string,
  items: unknown,
): Promise<unknown> {
  const lines = parsePurchaseOrderItems(items);
  if (lines.length === 0) return items;

  const productIdsNeedingLookup = new Set<string>();
  for (const line of lines) {
    if (lineEtimsItemCode(line)) continue;
    const pid = catalogIdFromPoLine(line);
    if (pid) productIdsNeedingLookup.add(pid);
  }
  if (productIdsNeedingLookup.size === 0) return items;

  const codeByProduct = new Map<string, string>();
  const ids = [...productIdsNeedingLookup];

  for (const part of chunkIds(ids, 80)) {
    const { data: sppRows } = await supabase
      .from("supplier_product_prices")
      .select("product_id,etims_item_code")
      .eq("supplier_id", supplierId)
      .in("product_id", part);
    for (const row of sppRows ?? []) {
      const r = row as { product_id?: string; etims_item_code?: string | null };
      const code = typeof r.etims_item_code === "string" ? r.etims_item_code.trim() : "";
      if (r.product_id && code && !isDiscouragedEtimsItemCode(code)) codeByProduct.set(String(r.product_id), code);
    }
  }

  const still = ids.filter((id) => !codeByProduct.has(id));
  for (const part of chunkIds(still, 80)) {
    const { data: matRows } = await supabase.from("materials").select("id,etims_item_code").in("id", part);
    for (const row of matRows ?? []) {
      const r = row as { id?: string; etims_item_code?: string | null };
      const code = typeof r.etims_item_code === "string" ? r.etims_item_code.trim() : "";
      if (r.id && code && !isDiscouragedEtimsItemCode(code)) codeByProduct.set(String(r.id), code);
    }
  }

  const stillAmi = ids.filter((id) => !codeByProduct.has(id));
  for (const part of chunkIds(stillAmi, 80)) {
    const { data: amiRows } = await supabase.from("admin_material_images").select("id,etims_item_code").in("id", part);
    for (const row of amiRows ?? []) {
      const r = row as { id?: string; etims_item_code?: string | null };
      const code = typeof r.etims_item_code === "string" ? r.etims_item_code.trim() : "";
      if (r.id && code && !isDiscouragedEtimsItemCode(code)) codeByProduct.set(String(r.id), code);
    }
  }

  const enriched = lines.map((line) => {
    if (lineEtimsItemCode(line)) return line;
    const pid = catalogIdFromPoLine(line);
    const code = pid ? codeByProduct.get(pid) : undefined;
    if (!code) return line;
    return { ...line, etims_item_code: code };
  });

  return enriched;
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return fallback;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
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
    const pkg = num(line.pkg, 0);
    const amount = num(line.amount, unitPrice * qty - discountAmount);
    // Integrator payload: itemCode + item_code only (no extra non-schema fields).
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
    salesItems.push(row);
  }

  if (salesItems.length === 0) {
    throw new Error("Purchase order has no line items.");
  }

  const totalAmount = Number.isFinite(po.total_amount) ? po.total_amount : salesItems.reduce((s, i) => s + i.amount, 0);

  const currency = (options.currency ?? "KES").trim().slice(0, 16) || "KES";
  const exchangeRate =
    typeof options.exchangeRate === "number" && Number.isFinite(options.exchangeRate) && options.exchangeRate > 0
      ? options.exchangeRate
      : 1;
  const countryCode = options.countryCode?.trim().slice(0, 8);

  return {
    traderInvoiceNo: (options.traderInvoiceNo ?? po.po_number).slice(0, 200),
    totalAmount,
    paymentType: options.paymentType ?? "01",
    salesTypeCode: "N",
    receiptTypeCode: "S",
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
    .select("id, po_number, total_amount, items, supplier_id")
    .eq("id", purchaseOrderId)
    .maybeSingle();

  if (poErr || !po) {
    return { ok: false, message: poErr?.message ?? "Purchase order not found or not accessible." };
  }

  if (options.enforceSupplierId && String(po.supplier_id) !== String(options.enforceSupplierId)) {
    return { ok: false, message: "This order does not belong to your supplier account." };
  }

  const itemsForInvoice = await enrichPurchaseOrderItemsWithEtimsCatalogCodes(String(po.supplier_id), po.items);

  let body: EtimsGenerateInvoiceRequest;
  try {
    body = buildEtimsInvoiceBodyFromPurchaseOrder(
      {
        id: po.id,
        po_number: po.po_number,
        total_amount: Number(po.total_amount),
        items: itemsForInvoice,
      },
      {
        customerPin: options.customerPin,
        customerName: options.customerName,
        paymentType: options.paymentType,
        currency: options.currency,
        exchangeRate: options.exchangeRate,
        countryCode: options.countryCode,
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
  const { error: upErr } = await supabase
    .from("purchase_orders")
    .update({
      etims_submitted_at: new Date().toISOString(),
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

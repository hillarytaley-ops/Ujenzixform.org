/**
 * Map UjenziXform purchase_orders → integrator sales invoice payload.
 *
 * Convention: each element in `purchase_orders.items` JSON array may include:
 *   `etims_item_code` (string, required for submission) — KRA/integrator item code (e.g. KE1UCT…).
 *   `quantity` or `qty`, `unit_price` or `unitPrice`, optional `discountAmount`, `pkg` (default 0).
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

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return fallback;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
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
  } = {},
): EtimsGenerateInvoiceRequest {
  const lines = parsePurchaseOrderItems(po.items);
  const salesItems: EtimsSalesItem[] = [];

  for (const line of lines) {
    const itemCode = str(line.etims_item_code);
    if (!itemCode) {
      throw new Error(
        'Each PO line must include etims_item_code (KRA item code). Edit items JSON or extend your materials flow to set it.',
      );
    }
    const qty = num(line.quantity ?? line.qty, 1);
    const unitPrice = num(line.unit_price ?? line.unitPrice ?? line.price, 0);
    const discountAmount = num(line.discountAmount ?? line.discount_amount, 0);
    const pkg = num(line.pkg, 0);
    const amount = num(line.amount, unitPrice * qty - discountAmount);
    const row: EtimsSalesItem = {
      itemCode,
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

  return {
    traderInvoiceNo: (options.traderInvoiceNo ?? po.po_number).slice(0, 200),
    totalAmount,
    paymentType: options.paymentType ?? "01",
    salesTypeCode: "N",
    receiptTypeCode: "S",
    salesStatusCode: "01",
    salesDate: formatEtimsSalesDate(),
    currency: "KES",
    exchangeRate: 1,
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
  | { ok: false; message: string; status?: number };

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

  let body: EtimsGenerateInvoiceRequest;
  try {
    body = buildEtimsInvoiceBodyFromPurchaseOrder(
      {
        id: po.id,
        po_number: po.po_number,
        total_amount: Number(po.total_amount),
        items: po.items,
      },
      { customerPin: options.customerPin, customerName: options.customerName, paymentType: options.paymentType },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase
      .from("purchase_orders")
      .update({ etims_error: msg, etims_submitted_at: new Date().toISOString() })
      .eq("id", purchaseOrderId);
    return { ok: false, message: msg };
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

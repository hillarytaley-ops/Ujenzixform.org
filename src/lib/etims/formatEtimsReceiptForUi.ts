/**
 * Format stored integrator/KRA JSON (`purchase_orders.etims_response`) for builder UI.
 * The verification URL often cannot be iframe-embedded (X-Frame-Options); this data is still the receipt record.
 */

function unwrapDataNode(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r.data && typeof r.data === 'object' && !Array.isArray(r.data)) {
    return r.data as Record<string, unknown>;
  }
  return r;
}

function scalarRoots(raw: unknown): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  if (!raw || typeof raw !== 'object') return out;
  const top = raw as Record<string, unknown>;
  out.push(top);
  const inner = unwrapDataNode(raw);
  if (inner && inner !== top) out.push(inner);
  return out;
}

function pickScalar(o: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const k of keys) {
    if (!(k in o)) continue;
    const v = o[k];
    if (v == null || typeof v === 'object') continue;
    const s = String(v).trim();
    if (!s || s.length > 900) continue;
    return s;
  }
  return null;
}

export type EtimsReceiptKv = { label: string; value: string };

/** Key receipt fields for display (deduped). */
export function buildEtimsReceiptKvRows(raw: unknown): EtimsReceiptKv[] {
  const rows: EtimsReceiptKv[] = [];
  const seen = new Set<string>();
  const add = (label: string, value: string) => {
    const sig = `${label}\0${value}`;
    if (seen.has(sig)) return;
    seen.add(sig);
    rows.push({ label, value });
  };

  const roots = scalarRoots(raw);
  const tryAdd = (keys: readonly string[], label: string) => {
    for (const o of roots) {
      const s = pickScalar(o, keys);
      if (s) {
        add(label, s);
        return;
      }
    }
  };

  tryAdd(['traderInvoiceNo', 'trader_invoice_no'], 'Trader invoice no.');
  tryAdd(['totalAmount', 'total_amount'], 'Total amount');
  tryAdd(['currency'], 'Currency');
  tryAdd(['salesDate', 'sales_date'], 'Sale date / time (integrator)');
  tryAdd(['salesStatusCode', 'sales_status_code'], 'Sales status code');
  tryAdd(['paymentType', 'payment_type'], 'Payment type');
  tryAdd(['receiptTypeCode', 'receipt_type_code'], 'Receipt type');
  tryAdd(['salesTypeCode', 'sales_type_code'], 'Sales type');
  tryAdd(['exchangeRate', 'exchange_rate'], 'Exchange rate');
  tryAdd(['customerName', 'customer_name'], 'Customer name');
  tryAdd(['customerPin', 'customer_pin'], 'Customer PIN');
  tryAdd(['receiptNo', 'receipt_no', 'mrcNo', 'mrc_no'], 'Receipt / MRC reference');

  for (const o of roots) {
    const url =
      pickScalar(o, ['invoiceVerificationUrl', 'invoice_verification_url']) ||
      pickScalar(o, ['verificationUrl', 'verification_url']) ||
      pickScalar(o, ['receiptVerificationUrl', 'receipt_verification_url']) ||
      pickScalar(o, ['link', 'receiptLink', 'receipt_link']);
    if (url && /^https?:\/\//i.test(url)) {
      add('Verification URL', url);
      break;
    }
  }

  for (const o of roots) {
    const items = o.salesItems ?? o.sales_items;
    if (Array.isArray(items) && items.length) {
      add('Line items', `${items.length} line(s)`);
      break;
    }
  }

  return rows;
}

/** Best verification URL from DB column and/or stored integrator JSON. */
export function resolveEtimsVerificationUrl(
  storedUrl: string | null | undefined,
  etimsResponse: unknown,
): string | null {
  const fromDb = typeof storedUrl === 'string' ? storedUrl.trim() : '';
  if (fromDb && /^https?:\/\//i.test(fromDb)) return fromDb;

  const roots = scalarRoots(etimsResponse);
  for (const o of roots) {
    const url =
      pickScalar(o, ['invoiceVerificationUrl', 'invoice_verification_url']) ||
      pickScalar(o, ['verificationUrl', 'verification_url']) ||
      pickScalar(o, ['receiptVerificationUrl', 'receipt_verification_url']) ||
      pickScalar(o, ['link', 'receiptLink', 'receipt_link']);
    if (url && /^https?:\/\//i.test(url)) return url;
  }
  return null;
}

/** Total in major currency units (e.g. KES) from stored integrator JSON, for Paystack sandbox amount. */
export function pickEtimsTotalAmountKes(raw: unknown): number | null {
  const roots = scalarRoots(raw);
  for (const o of roots) {
    for (const k of ['totalAmount', 'total_amount'] as const) {
      if (!(k in o)) continue;
      const v = o[k];
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
      if (v != null && typeof v !== 'object') {
        const n = parseFloat(String(v).replace(/,/g, ''));
        if (Number.isFinite(n) && n > 0) return n;
      }
    }
  }
  return null;
}

export function extractEtimsSalesItems(raw: unknown): Array<Record<string, unknown>> {
  const roots = scalarRoots(raw);
  for (const o of roots) {
    const items = o.salesItems ?? o.sales_items;
    if (Array.isArray(items)) {
      return items.filter((x) => x && typeof x === 'object') as Array<Record<string, unknown>>;
    }
  }
  return [];
}

export function lineItemCode(row: Record<string, unknown>): string {
  const c = row.itemCode ?? row.item_code ?? row.materialCode ?? row.material_code ?? row.code;
  return typeof c === 'string' && c.trim() ? c.trim() : '—';
}

export function lineQty(row: Record<string, unknown>): string {
  const q = row.qty ?? row.quantity;
  if (q == null) return '—';
  return String(q);
}

export function lineAmount(row: Record<string, unknown>): string {
  const a = row.amount ?? row.total ?? row.lineTotal;
  if (typeof a === 'number' && Number.isFinite(a)) {
    return a.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 0 });
  }
  if (a != null && typeof a !== 'object') return String(a);
  return '—';
}

export function lineItemName(row: Record<string, unknown>): string {
  for (const k of ['itemName', 'item_name', 'name', 'material_name', 'description', 'title'] as const) {
    const v = row[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  const code = lineItemCode(row);
  return code !== '—' ? code : 'Item';
}

export function lineUnitPrice(row: Record<string, unknown>): string {
  const p = row.unitPrice ?? row.unit_price ?? row.price;
  if (typeof p === 'number' && Number.isFinite(p)) {
    return p.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  }
  if (p != null && typeof p !== 'object') return String(p);
  return '—';
}

function pickFromRoots(raw: unknown, keys: readonly string[]): string | null {
  for (const o of scalarRoots(raw)) {
    const s = pickScalar(o, keys);
    if (s) return s;
  }
  return null;
}

function formatMoneyLabel(raw: unknown, keys: readonly string[]): string | null {
  const s = pickFromRoots(raw, keys);
  if (!s) return null;
  const n = parseFloat(s.replace(/,/g, ''));
  if (Number.isFinite(n)) {
    return n.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  }
  return s;
}

export type EtimsReceiptLineDisplay = {
  index: number;
  name: string;
  code: string;
  qty: string;
  unitPrice: string;
  amount: string;
};

export type EtimsReceiptDisplay = {
  invoiceNo: string | null;
  traderInvoiceNo: string | null;
  salesDate: string | null;
  customerName: string | null;
  customerPin: string | null;
  paymentType: string | null;
  currency: string | null;
  exchangeRate: string | null;
  totalAmount: string | null;
  taxableAmount: string | null;
  taxAmount: string | null;
  receiptNo: string | null;
  scdcId: string | null;
  scuReceiptNo: string | null;
  scuDate: string | null;
  internalData: string | null;
  signature: string | null;
  lines: EtimsReceiptLineDisplay[];
  verificationUrl: string | null;
};

/** Structured receipt fields for fiscal-style UI. */
export function parseEtimsReceiptForDisplay(
  etimsResponse: unknown,
  opts?: {
    storedVerificationUrl?: string | null;
    traderInvoiceNoDb?: string | null;
    poNumber?: string | null;
  },
): EtimsReceiptDisplay {
  const salesLines = extractEtimsSalesItems(etimsResponse);
  const lines: EtimsReceiptLineDisplay[] = salesLines.map((row, i) => ({
    index: i + 1,
    name: lineItemName(row),
    code: lineItemCode(row),
    qty: lineQty(row),
    unitPrice: lineUnitPrice(row),
    amount: lineAmount(row),
  }));

  const traderFromDb = opts?.traderInvoiceNoDb?.trim() || null;

  return {
    invoiceNo: pickFromRoots(etimsResponse, ['receiptNo', 'receipt_no', 'invoiceNo', 'invoice_no', 'mrcNo', 'mrc_no']),
    traderInvoiceNo:
      traderFromDb ||
      pickFromRoots(etimsResponse, ['traderInvoiceNo', 'trader_invoice_no']) ||
      opts?.poNumber?.trim() ||
      null,
    salesDate: pickFromRoots(etimsResponse, ['salesDate', 'sales_date', 'scuDate', 'scu_date']),
    customerName: pickFromRoots(etimsResponse, ['customerName', 'customer_name']),
    customerPin: pickFromRoots(etimsResponse, ['customerPin', 'customer_pin']),
    paymentType: pickFromRoots(etimsResponse, ['paymentType', 'payment_type']),
    currency: pickFromRoots(etimsResponse, ['currency']) || 'KES',
    exchangeRate: pickFromRoots(etimsResponse, ['exchangeRate', 'exchange_rate']),
    totalAmount: formatMoneyLabel(etimsResponse, ['totalAmount', 'total_amount']),
    taxableAmount: formatMoneyLabel(etimsResponse, ['taxableAmount', 'taxable_amount', 'taxblAmt', 'taxbl_amt']),
    taxAmount: formatMoneyLabel(etimsResponse, ['taxAmount', 'tax_amount', 'taxAmt', 'tax_amt']),
    receiptNo: pickFromRoots(etimsResponse, ['receiptNo', 'receipt_no', 'scuReceiptNo', 'scu_receipt_no']),
    scdcId: pickFromRoots(etimsResponse, ['scdcId', 'scdc_id', 'scuId', 'scu_id']),
    scuReceiptNo: pickFromRoots(etimsResponse, ['scuReceiptNo', 'scu_receipt_no']),
    scuDate: pickFromRoots(etimsResponse, ['scuDate', 'scu_date']),
    internalData: pickFromRoots(etimsResponse, ['internalData', 'internal_data']),
    signature: pickFromRoots(etimsResponse, ['signature', 'receiptSignature', 'receipt_signature']),
    lines,
    verificationUrl: resolveEtimsVerificationUrl(opts?.storedVerificationUrl, etimsResponse),
  };
}

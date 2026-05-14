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
  const n = parseMoneyNum(raw, keys);
  return n != null ? formatMoneyNum(n) : null;
}

function parseMoneyNum(raw: unknown, keys: readonly string[]): number | null {
  const s = pickFromRoots(raw, keys);
  if (!s) return null;
  const n = parseFloat(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function formatMoneyNum(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

/** Sum per-line tax from integrator salesItems when header tax fields are absent. */
function sumLineTaxFromSalesItems(raw: unknown): number | null {
  const lines = extractEtimsSalesItems(raw);
  if (!lines.length) return null;
  let sum = 0;
  let any = false;
  for (const row of lines) {
    for (const k of ['taxAmount', 'tax_amount', 'taxAmt', 'tax_amt', 'vatAmount', 'vat_amount'] as const) {
      const v = row[k];
      if (typeof v === 'number' && Number.isFinite(v)) {
        sum += v;
        any = true;
        break;
      }
      if (v != null && typeof v !== 'object') {
        const n = parseFloat(String(v).replace(/,/g, ''));
        if (Number.isFinite(n)) {
          sum += n;
          any = true;
          break;
        }
      }
    }
  }
  return any ? sum : null;
}

/** Kenya standard VAT rate for derived breakdown when integrator omits tax rows. */
const DEFAULT_VAT_RATE = 0.16;

export type EtimsReceiptTaxBreakdown = {
  subtotalOrTaxable: string | null;
  taxLabel: string;
  taxAmount: string | null;
  totalAmount: string | null;
};

export function resolveEtimsReceiptTaxBreakdown(
  etimsResponse: unknown,
  opts?: {
    invoiceSubtotal?: number | null;
    invoiceTaxAmount?: number | null;
    invoiceTotalAmount?: number | null;
    poTotalAmount?: number | null;
  },
): EtimsReceiptTaxBreakdown {
  const taxLabel = 'VAT / Tax';

  let taxable =
    parseMoneyNum(etimsResponse, [
      'taxableAmount',
      'taxable_amount',
      'taxblAmt',
      'taxbl_amt',
      'taxblAmtA',
      'taxbl_amt_a',
      'netAmount',
      'net_amount',
    ]) ?? null;

  let tax =
    parseMoneyNum(etimsResponse, [
      'taxAmount',
      'tax_amount',
      'taxAmt',
      'tax_amt',
      'taxAmtA',
      'tax_amt_a',
      'vatAmount',
      'vat_amount',
      'totalTax',
      'total_tax',
    ]) ?? sumLineTaxFromSalesItems(etimsResponse);

  let total =
    parseMoneyNum(etimsResponse, ['totalAmount', 'total_amount', 'grandTotal', 'grand_total']) ??
    (opts?.invoiceTotalAmount != null && Number.isFinite(opts.invoiceTotalAmount)
      ? opts.invoiceTotalAmount
      : null) ??
    (opts?.poTotalAmount != null && Number.isFinite(opts.poTotalAmount) ? opts.poTotalAmount : null);

  const invSub =
    opts?.invoiceSubtotal != null && Number.isFinite(opts.invoiceSubtotal) ? opts.invoiceSubtotal : null;
  const invTax =
    opts?.invoiceTaxAmount != null && Number.isFinite(opts.invoiceTaxAmount) ? opts.invoiceTaxAmount : null;
  const invTotal =
    opts?.invoiceTotalAmount != null && Number.isFinite(opts.invoiceTotalAmount)
      ? opts.invoiceTotalAmount
      : null;

  if (invSub != null && invSub > 0 && taxable == null) taxable = invSub;
  if (invTax != null && invTax > 0 && (tax == null || tax === 0)) tax = invTax;
  if (invTotal != null && invTotal > 0 && total == null) total = invTotal;

  // Single figure used for both subtotal and total — no separate tax in DB/integrator
  if (
    total == null &&
    taxable != null &&
    taxable > 0 &&
    invTotal != null &&
    invTotal > 0 &&
    Math.abs(invTotal - taxable) < 0.01
  ) {
    total = invTotal;
  }
  if (total == null && taxable != null && taxable > 0 && invSub == null && invTotal == null) {
    total = taxable;
  }

  // Tax-exclusive: subtotal + tax = total
  if (taxable != null && tax != null && tax > 0 && total == null) total = taxable + tax;
  if (taxable != null && total != null && (tax == null || tax === 0) && total > taxable) {
    tax = Math.round((total - taxable) * 100) / 100;
  }
  if (tax != null && tax > 0 && total != null && taxable == null && total >= tax) {
    taxable = Math.round((total - tax) * 100) / 100;
  }

  // VAT-inclusive: one amount (subtotal === total) or only grand total known — split at 16%
  const vatInclusiveFigure =
    total != null && total > 0 && (tax == null || tax === 0)
      ? taxable != null && taxable > 0 && Math.abs(total - taxable) < 0.01
        ? total
        : taxable == null || taxable === 0
          ? total
          : null
      : null;

  if (vatInclusiveFigure != null && vatInclusiveFigure > 0) {
    const exVat = Math.round((vatInclusiveFigure / (1 + DEFAULT_VAT_RATE)) * 100) / 100;
    taxable = exVat;
    tax = Math.round((vatInclusiveFigure - exVat) * 100) / 100;
    total = vatInclusiveFigure;
  }

  // Tax-exclusive subtotal only — add 16% VAT
  if (
    taxable != null &&
    taxable > 0 &&
    (tax == null || tax === 0) &&
    total == null &&
    invSub != null &&
    invSub > 0 &&
    (invTotal == null || invTotal <= 0)
  ) {
    tax = Math.round(taxable * DEFAULT_VAT_RATE * 100) / 100;
    total = Math.round((taxable + tax) * 100) / 100;
  }

  const subtotalOrTaxable =
    taxable != null && taxable > 0 ? formatMoneyNum(taxable) : invSub != null && invSub > 0 ? formatMoneyNum(invSub) : null;

  const taxNum = tax != null && tax > 0 ? tax : invTax != null && invTax > 0 ? invTax : null;

  return {
    subtotalOrTaxable,
    taxLabel:
      taxNum != null && taxable != null && taxable > 0
        ? `${taxLabel}${Math.abs(taxNum / taxable - DEFAULT_VAT_RATE) < 0.02 ? ' (16%)' : ''}`
        : taxLabel,
    taxAmount: taxNum != null ? formatMoneyNum(taxNum) : null,
    totalAmount: total != null && total > 0 ? formatMoneyNum(total) : null,
  };
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
  taxBreakdown: EtimsReceiptTaxBreakdown;
};

/** Structured receipt fields for fiscal-style UI. */
export function parseEtimsReceiptForDisplay(
  etimsResponse: unknown,
  opts?: {
    storedVerificationUrl?: string | null;
    traderInvoiceNoDb?: string | null;
    poNumber?: string | null;
    invoiceSubtotal?: number | null;
    invoiceTaxAmount?: number | null;
    invoiceTotalAmount?: number | null;
    poTotalAmount?: number | null;
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
    taxBreakdown: resolveEtimsReceiptTaxBreakdown(etimsResponse, {
      invoiceSubtotal: opts?.invoiceSubtotal,
      invoiceTaxAmount: opts?.invoiceTaxAmount,
      invoiceTotalAmount: opts?.invoiceTotalAmount,
      poTotalAmount: opts?.poTotalAmount,
    }),
  };
}

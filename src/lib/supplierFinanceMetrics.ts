import { purchaseOrderStatusChartBucket } from '@/lib/purchaseOrderMetrics';

export type SupplierInvoiceRow = {
  id?: string;
  total_amount?: number | string | null;
  amount_paid?: number | string | null;
  payment_status?: string | null;
  status?: string | null;
  purchase_order_id?: string | null;
};

export type SupplierPurchaseOrderRow = {
  id?: string;
  total_amount?: number | string | null;
  status?: string | null;
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Cash received, still due on invoices, and PO value not yet covered by an invoice.
 * Cancelled invoices are excluded from all sums.
 */
export function computeSupplierFinanceMetrics(
  invoices: SupplierInvoiceRow[],
  purchaseOrders: SupplierPurchaseOrderRow[]
) {
  const poIdsWithInvoice = new Set(
    invoices.map((i) => (i.purchase_order_id ? String(i.purchase_order_id) : '')).filter(Boolean)
  );

  let paidCash = 0;
  let unpaidOnInvoices = 0;
  let activeInvoicedTotal = 0;
  let activeInvoiceCount = 0;

  for (const inv of invoices) {
    const invStatus = String(inv.status || '').toLowerCase();
    const ps = String(inv.payment_status || '').toLowerCase();
    if (invStatus === 'cancelled' || ps === 'cancelled') continue;

    const total = num(inv.total_amount);
    const paid = num(inv.amount_paid);
    activeInvoicedTotal += total;
    activeInvoiceCount += 1;
    paidCash += paid;
    if (ps !== 'paid') {
      unpaidOnInvoices += Math.max(0, total - paid);
    }
  }

  let uninvoicedPipeline = 0;
  let uninvoicedOrderCount = 0;
  for (const po of purchaseOrders) {
    if (purchaseOrderStatusChartBucket(po.status) === 'cancelled') continue;
    const id = po.id != null ? String(po.id) : '';
    if (id && poIdsWithInvoice.has(id)) continue;
    uninvoicedPipeline += num(po.total_amount);
    uninvoicedOrderCount += 1;
  }

  const totalCashExpected = paidCash + unpaidOnInvoices + uninvoicedPipeline;

  return {
    paidCash,
    unpaidOnInvoices,
    uninvoicedPipeline,
    activeInvoicedTotal,
    totalCashExpected,
    activeInvoiceCount,
    uninvoicedOrderCount,
  };
}

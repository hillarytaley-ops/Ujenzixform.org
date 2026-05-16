/** Admin delivery quote pipeline status helpers (builder Paystack flow). */

export function normalizeDeliveryQuoteStatus(status: string | null | undefined): string {
  return String(status ?? "")
    .trim()
    .toLowerCase();
}

export function parseDeliveryQuoteAmount(estimatedCost: unknown): number | null {
  if (estimatedCost == null || estimatedCost === "") return null;
  const amt = Number(estimatedCost);
  if (!Number.isFinite(amt) || amt < 1) return null;
  return amt;
}

export function isDeliveryQuotePaid(row: {
  status?: string | null;
  delivery_quote_paid_at?: string | null;
}): boolean {
  const st = normalizeDeliveryQuoteStatus(row.status);
  if (st === "delivery_quote_paid") return true;
  const paidAt = row.delivery_quote_paid_at;
  return typeof paidAt === "string" && paidAt.trim().length > 0;
}

/** Builder must complete Paystack (status quote_accepted, not yet paid). */
export function needsDeliveryQuotePayment(row: {
  status?: string | null;
  delivery_quote_paid_at?: string | null;
}): boolean {
  const st = normalizeDeliveryQuoteStatus(row.status);
  return st === "quote_accepted" && !isDeliveryQuotePaid(row);
}

export function deliveryQuoteStatusLabel(
  status: string | null | undefined,
  row?: { delivery_quote_paid_at?: string | null }
): string {
  const st = normalizeDeliveryQuoteStatus(status);
  if (st === "quoted") return "Quote received";
  if (st === "quote_accepted") {
    if (row && isDeliveryQuotePaid({ status, delivery_quote_paid_at: row.delivery_quote_paid_at })) {
      return "Payment recorded";
    }
    return "Awaiting payment";
  }
  if (st === "delivery_quote_paid") return "Paid";
  return status ?? "";
}

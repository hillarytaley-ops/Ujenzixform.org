/**
 * Sort supply-chain rows (delivery notes, GRN, invoices) with newest first.
 * Uses the first present timestamp among common columns.
 */
export function supplyChainDocRecencyMs(row: Record<string, unknown>): number {
  const keys = ['updated_at', 'created_at', 'received_date', 'invoice_date', 'delivery_date'] as const;
  for (const k of keys) {
    const v = row[k];
    if (typeof v === 'string' && v.trim()) {
      const t = Date.parse(v);
      if (!Number.isNaN(t)) return t;
    }
  }
  return 0;
}

export function sortSupplyChainDocsNewestFirst<T extends Record<string, unknown>>(rows: T[]): T[] {
  return [...rows].sort((a, b) => supplyChainDocRecencyMs(b) - supplyChainDocRecencyMs(a));
}

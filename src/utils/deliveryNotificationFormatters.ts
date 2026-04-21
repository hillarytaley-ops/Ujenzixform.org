import { supplierLocationLine, type SupplierLocationFields } from '@/utils/supplierLocationLine';

const PLACEHOLDER_PICKUP = /pickup location\s*$/i;

/** One line per order item for drivers: "Sand × 3 bags · Cement × 10 bags" plus optional total units. */
export function formatOrderItemsQuantityLine(items: unknown): string {
  if (!items || !Array.isArray(items) || items.length === 0) return '';
  const parts: string[] = [];
  for (let i = 0; i < Math.min(items.length, 12); i++) {
    const it = items[i] as Record<string, unknown>;
    const nm = String(it.material_name ?? it.name ?? 'Item').trim();
    const q = Number(it.quantity);
    const u = String(it.unit ?? 'units').trim();
    if (Number.isFinite(q) && q > 0) parts.push(`${nm} ×${q} ${u}`);
    else if (nm) parts.push(nm);
  }
  let line = parts.join(' · ');
  const sum = (items as Record<string, unknown>[]).reduce(
    (acc, it) => acc + (Number(it.quantity) || 0),
    0
  );
  if (items.length > 1 && sum > 0) line += ` — ${sum} total units`;
  if (items.length > 12) line += ` (+${items.length - 12} more line(s))`;
  return line;
}

export function formatSupplierPickupDisplay(
  companyName: string | undefined,
  supplierRow: Record<string, unknown> | null | undefined
): string {
  const name = (companyName || 'Supplier').trim();
  if (!supplierRow) return `${name} — store address not loaded; open order details`;
  const line = supplierLocationLine(supplierRow as SupplierLocationFields);
  if (line) return `${name} — ${line}`;
  return `${name} — add street/town in supplier profile for drivers`;
}

/**
 * Prefer a real supplier address over generic "…Pickup Location" / "Supplier location" text.
 */
export function resolvePickupForProvider(
  drPickup: string | undefined | null,
  supplierId: string | undefined,
  supplierRow: Record<string, unknown> | null | undefined,
  companyName: string | undefined
): string {
  const raw = (drPickup || '').trim();
  if (raw && raw.length > 4 && !PLACEHOLDER_PICKUP.test(raw) && !/^supplier location$/i.test(raw)) {
    return raw;
  }
  if (supplierId && supplierId.length === 36) {
    return formatSupplierPickupDisplay(companyName, supplierRow || null);
  }
  if (raw) return raw;
  return 'Supplier pickup — link order in dashboard for full store address';
}

/** REST: load supplier rows for pickup address lines (chunked for long URL limits). */
export async function fetchSuppliersByIds(
  restUrl: string,
  headers: Record<string, string>,
  supplierIds: Iterable<string>
): Promise<Map<string, Record<string, unknown>>> {
  const map = new Map<string, Record<string, unknown>>();
  const uuids = [...new Set([...supplierIds].filter((id) => typeof id === 'string' && id.length === 36))];
  for (let i = 0; i < uuids.length; i += 80) {
    const chunk = uuids.slice(i, i + 80);
    try {
      const res = await fetch(
        `${restUrl}/rest/v1/suppliers?id=in.(${chunk.join(',')})&select=id,company_name,location,address,physical_address,county`,
        { headers, cache: 'no-store' }
      );
      if (res.ok) {
        const rows = (await res.json()) as Record<string, unknown>[];
        rows.forEach((r) => {
          const id = r.id as string;
          if (id) map.set(id, r);
        });
      }
    } catch {
      /* ignore */
    }
  }
  return map;
}

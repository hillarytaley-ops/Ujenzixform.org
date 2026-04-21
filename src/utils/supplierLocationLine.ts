/** Fields commonly present on `public.suppliers` for display-only address lines */
export type SupplierLocationFields = {
  location?: string | null;
  address?: string | null;
  physical_address?: string | null;
  county?: string | null;
};

const MAX_LEN = 160;

function trim(v: unknown): string {
  if (v == null) return '';
  const s = String(v).trim();
  return s;
}

/**
 * One line for supplier cards (compare prices, directory, etc.).
 * Prefers full `address`, then street-style + county, then `location` (e.g. town/county).
 */
export function supplierLocationLine(
  s: SupplierLocationFields | null | undefined
): string | undefined {
  if (!s) return undefined;

  const address = trim(s.address);
  if (address) return address.slice(0, MAX_LEN);

  const physical = trim(s.physical_address);
  const county = trim(s.county);
  const streetCounty = [physical, county].filter(Boolean).join(', ');
  if (streetCounty) return streetCounty.slice(0, MAX_LEN);

  const location = trim(s.location);
  if (location) return location.slice(0, MAX_LEN);

  return undefined;
}

/** Matches validate_delivery_address_not_null() placeholder list in Supabase. */
const PLACEHOLDER_NORMALIZED = new Set([
  'to be provided',
  'tbd',
  't.b.d.',
  'n/a',
  'na',
  'tba',
  'to be determined',
  'delivery location',
  'address not found',
  'address not specified by builder',
  'to be confirmed',
  'to be confirmed.',
]);

export function isPlaceholderDeliveryAddress(addr: string | null | undefined): boolean {
  const a = (addr ?? '').trim().toLowerCase();
  if (!a) return true;
  return PLACEHOLDER_NORMALIZED.has(a);
}

/** DB allows pending INSERT when coordinates are present without a street address. */
export function hasUsableDeliveryCoordinates(coords: string | null | undefined): boolean {
  const c = (coords ?? '').trim();
  return c.length >= 5;
}

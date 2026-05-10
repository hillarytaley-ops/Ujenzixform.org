/**
 * Single place to combine GPS + human-readable delivery text for provider-facing UI.
 * Builders often have a project/site label on the PO while the pin lives in coordinates or lat/lng columns.
 */

export type DeliveryLocationRow = {
  delivery_address?: string | null;
  delivery_location?: string | null;
  delivery_coordinates?: string | null;
  delivery_latitude?: number | null;
  delivery_longitude?: number | null;
};

/** Parse "lat, lng" or "@lat,lng" from a single string (map picker / manual paste). */
export function parseLatLngFromString(input: string): { lat: number; lng: number } | null {
  if (!input || typeof input !== 'string') return null;
  const t = input.trim();
  const commaFormat = t.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (commaFormat) {
    const lat = parseFloat(commaFormat[1]);
    const lng = parseFloat(commaFormat[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }
  const gmapsFormat = t.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (gmapsFormat) {
    const lat = parseFloat(gmapsFormat[1]);
    const lng = parseFloat(gmapsFormat[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }
  return null;
}

/**
 * Prefer showing GPS first when present and not already embedded in the address string,
 * then the builder/PO text (project name, street, etc.).
 */
export function buildProviderDeliveryLocationLine(row: DeliveryLocationRow): string {
  const addrRaw = (row.delivery_address ?? row.delivery_location ?? '').trim();
  const coordText = (row.delivery_coordinates ?? '').trim();
  const lat = row.delivery_latitude;
  const lng = row.delivery_longitude;
  const fromLatLng =
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
      ? `${lat}, ${lng}`
      : '';
  const primaryCoord = coordText || fromLatLng;
  if (!addrRaw) return primaryCoord;
  if (!primaryCoord) return addrRaw;
  const normAddr = addrRaw.replace(/\s/g, '');
  const normCoord = primaryCoord.replace(/\s/g, '');
  if (normAddr.includes(normCoord)) return addrRaw;
  return `${primaryCoord} | ${addrRaw}`;
}

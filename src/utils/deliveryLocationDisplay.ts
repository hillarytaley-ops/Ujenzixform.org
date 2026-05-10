/**
 * Single place to combine GPS + human-readable delivery text for provider-facing UI.
 * Builders often have a project/site label on the PO while the pin lives in coordinates or lat/lng columns.
 */

export type DeliveryLocationRow = {
  delivery_address?: string | null;
  delivery_location?: string | null;
  delivery_coordinates?: string | null;
  /** REST/PostgREST may return numbers or numeric strings */
  delivery_latitude?: number | string | null;
  delivery_longitude?: number | string | null;
};

function normalizeCoordField(v: unknown): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** If the saved line is "lat, lng | human text" but lat/lng columns are empty, recover GPS from the prefix. */
function splitLeadingLatLngPrefix(addr: string): { coords: string; remainder: string } | null {
  const t = addr.trim();
  if (!t) return null;
  const pipe = t.indexOf('|');
  if (pipe > 0) {
    const head = t.slice(0, pipe).trim();
    const tail = t.slice(pipe + 1).trim();
    const p = parseLatLngFromString(head);
    if (p) return { coords: `${p.lat}, ${p.lng}`, remainder: tail };
  }
  const p2 = parseLatLngFromString(t);
  if (p2) return { coords: `${p2.lat}, ${p2.lng}`, remainder: '' };
  return null;
}

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
  let addrRaw = (row.delivery_address ?? row.delivery_location ?? '').trim();
  const coordText = (row.delivery_coordinates ?? '').trim();
  const latN = normalizeCoordField(row.delivery_latitude);
  const lngN = normalizeCoordField(row.delivery_longitude);
  const fromLatLng = latN != null && lngN != null ? `${latN}, ${lngN}` : '';
  let primaryCoord = coordText || fromLatLng;

  if (!primaryCoord && addrRaw) {
    const split = splitLeadingLatLngPrefix(addrRaw);
    if (split) {
      primaryCoord = split.coords;
      addrRaw = split.remainder;
    }
  }

  if (!addrRaw) return primaryCoord;
  if (!primaryCoord) return addrRaw;
  const normAddr = addrRaw.replace(/\s/g, '');
  const normCoord = primaryCoord.replace(/\s/g, '');
  if (normAddr.includes(normCoord)) return addrRaw;
  return `${primaryCoord} | ${addrRaw}`;
}

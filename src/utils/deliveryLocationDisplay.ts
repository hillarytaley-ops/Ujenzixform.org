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

/**
 * Parse "lat, lng" or "@lat,lng" from a string (map picker / manual paste / "lat, lng | label").
 * Tries the full trimmed string, then the segment before the first "|" (common in saved delivery_address).
 */
export function parseLatLngFromString(input: string): { lat: number; lng: number } | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  const candidates: string[] = [];
  const push = (s: string | undefined) => {
    const v = (s ?? '').trim();
    if (v && !candidates.includes(v)) candidates.push(v);
  };
  push(trimmed);
  push(trimmed.split('|')[0]);

  for (const t of candidates) {
    const commaFormat = t.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
    if (commaFormat) {
      const lat = parseFloat(commaFormat[1]);
      const lng = parseFloat(commaFormat[2]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      return { lat, lng };
    }
    const gmapsFormat = t.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (gmapsFormat) {
      const lat = parseFloat(gmapsFormat[1]);
      const lng = parseFloat(gmapsFormat[2]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      return { lat, lng };
    }
  }
  return null;
}

/** Extract GPS embedded as `[Coords: lat, lng]` or `GPS: lat, lng` (legacy DeliveryRequest.tsx format). */
export function scavengeCoordinatesFromBlob(text: string): { coords: string; label: string } | null {
  if (!text || typeof text !== 'string') return null;
  let t = text.trim();
  const bracket = t.match(/\[\s*Coords:\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*\]/i);
  if (bracket) {
    const lat = parseFloat(bracket[1]);
    const lng = parseFloat(bracket[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const label = t
        .replace(bracket[0], ' ')
        .replace(/\s*\|\s*/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
      return { coords: `${lat}, ${lng}`, label };
    }
  }
  const gps = t.match(/GPS:\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/i);
  if (gps) {
    const lat = parseFloat(gps[1]);
    const lng = parseFloat(gps[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const label = t
        .replace(gps[0], ' ')
        .replace(/\s*\|\s*/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
      return { coords: `${lat}, ${lng}`, label };
    }
  }
  return null;
}

/**
 * Prefer showing GPS first when present and not already embedded in the address string,
 * then the builder/PO text (project name, street, etc.).
 */
export function buildProviderDeliveryLocationLine(row: DeliveryLocationRow): string {
  const rawFull = (row.delivery_address ?? row.delivery_location ?? '').trim();
  const coordText = (row.delivery_coordinates ?? '').trim();
  const latN = normalizeCoordField(row.delivery_latitude);
  const lngN = normalizeCoordField(row.delivery_longitude);

  let addrRaw = rawFull;
  let primaryCoord = '';

  if (latN != null && lngN != null) {
    primaryCoord = `${latN}, ${lngN}`;
  }
  if (!primaryCoord && coordText) {
    const p = parseLatLngFromString(coordText);
    primaryCoord = p ? `${p.lat}, ${p.lng}` : coordText;
  }
  if (!primaryCoord && addrRaw) {
    const split = splitLeadingLatLngPrefix(addrRaw);
    if (split) {
      primaryCoord = split.coords;
      addrRaw = split.remainder;
    }
  }
  if (!primaryCoord && addrRaw) {
    const scav = scavengeCoordinatesFromBlob(addrRaw);
    if (scav) {
      primaryCoord = scav.coords;
      addrRaw = scav.label;
    }
  }

  if (!addrRaw) return primaryCoord;
  if (!primaryCoord) return addrRaw;
  const normAddr = addrRaw.replace(/\s/g, '');
  const normCoord = primaryCoord.replace(/\s/g, '');
  if (normAddr.includes(normCoord)) return addrRaw;
  return `${primaryCoord} | ${addrRaw}`;
}

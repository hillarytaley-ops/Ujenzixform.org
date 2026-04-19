/**
 * Haversine distance in kilometers (WGS84).
 */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Parse "lat, lng" or "-1.15, 36.96" from free text (e.g. delivery address line).
 */
export function parseLatLngFromText(text: string): { lat: number; lng: number } | null {
  if (!text || typeof text !== 'string') return null;
  const m = text.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export type JobCoordinates = { lat: number; lng: number; source: 'delivery' | 'pickup' | 'parsed_delivery' | 'parsed_pickup' };

export function resolveJobCoordinates(input: {
  delivery_latitude?: number | null;
  delivery_longitude?: number | null;
  pickup_latitude?: number | null;
  pickup_longitude?: number | null;
  delivery_address?: string;
  pickup_address?: string;
}): JobCoordinates | null {
  const dLat = input.delivery_latitude;
  const dLng = input.delivery_longitude;
  if (typeof dLat === 'number' && typeof dLng === 'number' && Number.isFinite(dLat) && Number.isFinite(dLng)) {
    return { lat: dLat, lng: dLng, source: 'delivery' };
  }
  const pLat = input.pickup_latitude;
  const pLng = input.pickup_longitude;
  if (typeof pLat === 'number' && typeof pLng === 'number' && Number.isFinite(pLat) && Number.isFinite(pLng)) {
    return { lat: pLat, lng: pLng, source: 'pickup' };
  }
  const fromDel = input.delivery_address ? parseLatLngFromText(input.delivery_address) : null;
  if (fromDel) return { ...fromDel, source: 'parsed_delivery' };
  const fromPk = input.pickup_address ? parseLatLngFromText(input.pickup_address) : null;
  if (fromPk) return { ...fromPk, source: 'parsed_pickup' };
  return null;
}

export function normalizeAreaToken(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * True if any service area string appears as a substring of the address blob (Kenyan counties / towns).
 */
export function serviceAreaMatchesAddress(serviceAreas: string[] | null | undefined, addressBlob: string): boolean {
  if (!serviceAreas?.length || !addressBlob) return false;
  const hay = addressBlob.toLowerCase();
  return serviceAreas.some((raw) => {
    const t = normalizeAreaToken(raw);
    return t.length >= 3 && hay.includes(t);
  });
}

export type ProviderForProximity = {
  id: string;
  current_latitude?: number | null;
  current_longitude?: number | null;
  service_areas?: string[] | null;
};

/**
 * TEMPORARY: when true, proximity and service-area matching are skipped for delivery alerts
 * (all active providers passed into this function are kept). Set to false to reinstate the km rule.
 */
export const DELIVERY_PROXIMITY_FILTER_TEMP_DISABLED = true;

/**
 * Providers within radius (using last known GPS) OR (if no GPS) service-area match against address text.
 * Providers with GPS outside radius are excluded.
 */
export function filterProvidersByProximity(
  providers: ProviderForProximity[],
  jobLat: number,
  jobLng: number,
  radiusKm: number,
  addressBlob: string
): ProviderForProximity[] {
  if (DELIVERY_PROXIMITY_FILTER_TEMP_DISABLED) {
    return providers.slice();
  }
  return providers.filter((p) => {
    const plat = p.current_latitude;
    const plng = p.current_longitude;
    const hasGps =
      typeof plat === 'number' &&
      typeof plng === 'number' &&
      Number.isFinite(plat) &&
      Number.isFinite(plng);
    if (hasGps) {
      const d = haversineKm(jobLat, jobLng, plat, plng);
      return d <= radiusKm;
    }
    return serviceAreaMatchesAddress(p.service_areas || [], addressBlob);
  });
}

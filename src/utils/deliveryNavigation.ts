import {
  buildProviderDeliveryLocationLine,
  parseLatLngFromString,
  type DeliveryLocationRow,
} from "@/utils/deliveryLocationDisplay";

export type DeliveryNavLeg = "pickup" | "drop" | "route";

export type NavTarget = {
  lat: number | null;
  lng: number | null;
  /** Human-readable label (street, project name, etc.) */
  label: string;
  /** Value for Google Maps query param when lat/lng missing */
  query: string;
};

function normalizeCoordField(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Resolve GPS + label from a location line and optional lat/lng columns. */
export function resolveNavTarget(
  text: string | null | undefined,
  opts?: { lat?: number | string | null; lng?: number | string | null }
): NavTarget | null {
  const merged = buildProviderDeliveryLocationLine({
    delivery_address: text ?? "",
    delivery_location: text ?? "",
    delivery_latitude: opts?.lat ?? null,
    delivery_longitude: opts?.lng ?? null,
  }).trim();

  const raw = (text ?? "").trim();
  const labelSource = merged || raw;
  if (!labelSource) return null;

  const latN = normalizeCoordField(opts?.lat);
  const lngN = normalizeCoordField(opts?.lng);
  if (latN != null && lngN != null) {
    return {
      lat: latN,
      lng: lngN,
      label: stripLeadingCoordsFromLabel(labelSource),
      query: `${latN},${lngN}`,
    };
  }

  const fromMerged = parseLatLngFromString(labelSource);
  if (fromMerged) {
    const label = stripLeadingCoordsFromLabel(labelSource);
    return {
      lat: fromMerged.lat,
      lng: fromMerged.lng,
      label: label || `${fromMerged.lat}, ${fromMerged.lng}`,
      query: `${fromMerged.lat},${fromMerged.lng}`,
    };
  }

  return {
    lat: null,
    lng: null,
    label: labelSource,
    query: labelSource,
  };
}

function stripLeadingCoordsFromLabel(line: string): string {
  const t = line.trim();
  const pipe = t.indexOf("|");
  if (pipe > 0) {
    const head = t.slice(0, pipe).trim();
    const tail = t.slice(pipe + 1).trim();
    if (parseLatLngFromString(head)) return tail || head;
  }
  if (parseLatLngFromString(t)) return "";
  return t;
}

export function resolvePickupNavTarget(pickupText: string | null | undefined): NavTarget | null {
  return resolveNavTarget(pickupText);
}

export function resolveDropNavTarget(
  row: DeliveryLocationRow & { delivery_location?: string | null }
): NavTarget | null {
  const line = buildProviderDeliveryLocationLine(row).trim();
  return resolveNavTarget(line, {
    lat: row.delivery_latitude,
    lng: row.delivery_longitude,
  });
}

export function googleMapsDirectionsUrl(opts: {
  origin?: NavTarget | null;
  destination: NavTarget;
}): string {
  const dest = formatMapsEndpoint(opts.destination);
  if (!opts.origin) {
    return `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
  }
  const orig = formatMapsEndpoint(opts.origin);
  return `https://www.google.com/maps/dir/?api=1&origin=${orig}&destination=${dest}`;
}

export function googleMapsSearchUrl(target: NavTarget): string {
  const q = formatMapsEndpoint(target);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function formatMapsEndpoint(t: NavTarget): string {
  if (t.lat != null && t.lng != null) {
    return encodeURIComponent(`${t.lat},${t.lng}`);
  }
  return encodeURIComponent(t.query);
}

export function openGoogleMapsNavigation(target: NavTarget): void {
  window.open(googleMapsSearchUrl(target), "_blank", "noopener,noreferrer");
}

export function openGoogleMapsRoute(opts: {
  origin?: NavTarget | null;
  destination: NavTarget;
}): void {
  window.open(googleMapsDirectionsUrl(opts), "_blank", "noopener,noreferrer");
}

export function openDeliveryNavigation(
  pickupText: string | null | undefined,
  dropRow: DeliveryLocationRow & { delivery_location?: string | null },
  leg: DeliveryNavLeg
): boolean {
  const pickup = resolvePickupNavTarget(pickupText);
  const drop = resolveDropNavTarget(dropRow);

  if (leg === "pickup") {
    if (!pickup) return false;
    openGoogleMapsNavigation(pickup);
    return true;
  }
  if (leg === "drop") {
    const dest = drop ?? resolveNavTarget(dropRow.delivery_address ?? dropRow.delivery_location);
    if (!dest) return false;
    openGoogleMapsNavigation(dest);
    return true;
  }
  if (pickup && drop) {
    openGoogleMapsRoute({ origin: pickup, destination: drop });
    return true;
  }
  if (drop) {
    openGoogleMapsNavigation(drop);
    return true;
  }
  if (pickup) {
    openGoogleMapsNavigation(pickup);
    return true;
  }
  return false;
}

/** Embed map centered on a point (no API key). */
export function googleMapsEmbedUrl(lat: number, lng: number, zoom = 14): string {
  return `https://maps.google.com/maps?q=${lat},${lng}&hl=en&z=${zoom}&output=embed`;
}

export type MapStop = {
  id: string;
  orderId: string;
  orderLabel: string;
  type: "pickup" | "delivery";
  name: string;
  address: string;
  lat: number;
  lng: number;
  status?: string;
};

export function buildMapStopsFromDeliveryCard(d: {
  id: string;
  pickup_location?: string | null;
  delivery_location?: string | null;
  material_type?: string | null;
  order_number?: string | null;
  status?: string | null;
}): MapStop[] {
  const stops: MapStop[] = [];
  const orderLabel = d.order_number || d.material_type || `Order ${d.id.slice(0, 8)}`;

  const pickup = resolvePickupNavTarget(d.pickup_location);
  if (pickup?.lat != null && pickup?.lng != null) {
    stops.push({
      id: `${d.id}-pickup`,
      orderId: d.id,
      orderLabel,
      type: "pickup",
      name: `${orderLabel} — Pickup`,
      address: pickup.label || d.pickup_location || "Pickup",
      lat: pickup.lat,
      lng: pickup.lng,
      status: d.status ?? undefined,
    });
  }

  const drop = resolveNavTarget(d.delivery_location);
  if (drop?.lat != null && drop?.lng != null) {
    stops.push({
      id: `${d.id}-drop`,
      orderId: d.id,
      orderLabel,
      type: "delivery",
      name: `${orderLabel} — Drop-off`,
      address: drop.label || d.delivery_location || "Delivery",
      lat: drop.lat,
      lng: drop.lng,
      status: d.status ?? undefined,
    });
  }

  return stops;
}

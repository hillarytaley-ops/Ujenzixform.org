import { parseLatLngFromString } from '@/utils/deliveryLocationDisplay';

/** Stored on PO/quote until builder sets a real drop-off in Delivery Location dialog. */
export const PENDING_DELIVERY_ADDRESS = 'To be provided';

const PLACEHOLDER_DELIVERY_ADDRESSES = [
  'to be provided',
  'to be confirmed',
  'tbd',
  't.b.d.',
  'tba',
  'n/a',
  'na',
  'to be determined',
  'delivery location',
  'address not found',
] as const;

const STREET_HINTS =
  /\b(street|st\.?|road|rd\.?|avenue|ave\.?|drive|dr\.?|lane|ln\.?|way|plot|building|bldg|apartment|apt\.?|estate|close|court|ct\.?|highway|hwy|boulevard|blvd)\b/i;

/** Kenya-ish bounds for GPS prefill (reject project codes like "401 - 10200"). */
const KENYA_LAT_MIN = -5.5;
const KENYA_LAT_MAX = 5.5;
const KENYA_LNG_MIN = 33;
const KENYA_LNG_MAX = 42;

export function isPlaceholderDeliveryAddress(addr: string | null | undefined): boolean {
  if (!addr || typeof addr !== 'string') return true;
  const t = addr.trim().toLowerCase();
  if (!t) return true;
  return PLACEHOLDER_DELIVERY_ADDRESSES.some((p) => t === p || t.startsWith(`${p} `) || t.endsWith(` ${p}`));
}

export type ProjectSiteLabelContext = {
  projectName?: string | null;
  projectLocation?: string | null;
};

/** Strip cart suffixes so PO project_name matches site labels on legacy rows. */
export function extractCoreProjectName(projectName?: string | null): string {
  if (!projectName?.trim()) return '';
  return projectName
    .trim()
    .replace(/\s+[-—]\s+quote\s+from\s+.+$/i, '')
    .replace(/\s+[-—]\s+direct\s+purchase(?:\s*[-—].*)?$/i, '')
    .trim();
}

function normalizeSiteLabel(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Context for sanitizing legacy PO rows that stored "Project Name - Location" as delivery_address.
 */
export function buildDeliveryPrefillContext(opts: {
  projectName?: string | null;
  projectLocation?: string | null;
  deliveryAddress?: string | null;
}): ProjectSiteLabelContext {
  const projectName = extractCoreProjectName(opts.projectName);
  let projectLocation = (opts.projectLocation ?? '').trim();

  const raw = (opts.deliveryAddress ?? '').trim();
  if (!projectLocation && raw && projectName) {
    const dash = raw.match(/^(.+?)\s+-\s+(.+?)(\s*\([^)]*\))?$/);
    if (dash) {
      const head = extractCoreProjectName(dash[1]);
      if (normalizeSiteLabel(head) === normalizeSiteLabel(projectName)) {
        projectLocation = dash[2].trim().split('(')[0].trim();
      }
    }
  }

  return {
    projectName: projectName || undefined,
    projectLocation: projectLocation || undefined,
  };
}

function hasStreetAddressCues(text: string): boolean {
  return STREET_HINTS.test(text) || /\b\d{1,5}[a-z]?\s+[a-z]/i.test(text);
}

/**
 * True when text is a project/site label (e.g. "Moi's Bridge Project - Moi's Bridge"), not a street address.
 * Never use these as delivery_address for providers.
 */
export function looksLikeProjectSiteLabel(
  addr: string | null | undefined,
  ctx?: ProjectSiteLabelContext
): boolean {
  if (!addr || typeof addr !== 'string') return false;
  const t = addr.trim();
  if (!t || parseLatLngFromString(t)) return false;

  const lower = t.toLowerCase();
  const pn = extractCoreProjectName(ctx?.projectName);
  const pl = (ctx?.projectLocation ?? '').trim();

  if (pn) {
    const pnLower = pn.toLowerCase();
    if (lower === pnLower) return true;
    if (lower.startsWith(`${pnLower} -`)) return true;
    if (pl) {
      const combo = `${pn} - ${pl}`.toLowerCase();
      if (lower === combo || lower.startsWith(`${combo} (`) || lower.startsWith(`${combo}(`)) {
        return true;
      }
    }
  }

  if (pl) {
    const plLower = pl.toLowerCase();
    if (lower === plLower || lower.endsWith(` - ${plLower}`)) return true;
  }

  const dash = t.match(/^(.+?)\s+-\s+(.+?)(\s*\([^)]*\))?$/);
  if (!dash) return false;

  const left = dash[1].trim();
  const right = dash[2].trim();
  const leftNorm = left.toLowerCase();
  const rightNorm = right.toLowerCase();

  if (leftNorm === rightNorm) return true;

  if (hasStreetAddressCues(t)) return false;

  if (pn && leftNorm === pn.toLowerCase()) return true;

  // Legacy cart: numeric/code prefix + town — "401 - 10200, MURANGA TOWN"
  if (/^\d{1,6}\s*-\s*.+/.test(left)) return true;

  // "… Project - site/area" without street cues
  if (/\bproject\b/i.test(left)) return true;

  // "Moi's Bridge Project - Moi's Bridge" (right is site name inside left)
  if (
    rightNorm.length >= 3 &&
    (leftNorm.startsWith(rightNorm) ||
      leftNorm.replace(/\s+project\s*$/i, '').trim() === rightNorm)
  ) {
    return true;
  }

  return false;
}

/** Only real lat/lng for coordinate prefill — never project labels. */
export function sanitizeCoordinatesForPrefill(coord: string | null | undefined): string {
  if (!coord?.trim()) return '';
  const ll = parseLatLngFromString(coord.trim());
  if (!ll) return '';
  if (
    ll.lat < KENYA_LAT_MIN ||
    ll.lat > KENYA_LAT_MAX ||
    ll.lng < KENYA_LNG_MIN ||
    ll.lng > KENYA_LNG_MAX
  ) {
    return '';
  }
  return `${ll.lat}, ${ll.lng}`;
}

/** Address safe to show in delivery form — never project name/location labels. */
export function sanitizeDeliveryAddressForPrefill(
  addr: string | null | undefined,
  ctx?: ProjectSiteLabelContext
): string {
  if (!addr || isPlaceholderDeliveryAddress(addr)) return '';

  const pipe = addr.indexOf('|');
  if (pipe > 0) {
    const head = addr.slice(0, pipe).trim();
    const tail = addr.slice(pipe + 1).trim();
    if (parseLatLngFromString(head)) {
      if (tail && !isPlaceholderDeliveryAddress(tail) && !looksLikeProjectSiteLabel(tail, ctx)) {
        return tail;
      }
      return '';
    }
  }

  if (parseLatLngFromString(addr)) return '';
  if (looksLikeProjectSiteLabel(addr, ctx)) return '';
  return addr.trim();
}

export function isUsableDeliveryAddressText(
  addr: string | null | undefined,
  ctx?: ProjectSiteLabelContext
): boolean {
  const t = (addr ?? '').trim();
  if (!t) return false;
  if (isPlaceholderDeliveryAddress(t)) return false;
  if (looksLikeProjectSiteLabel(t, ctx)) return false;
  return true;
}

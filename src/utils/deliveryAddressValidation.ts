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
  const pn = (ctx?.projectName ?? '').trim();
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

  const dash = t.match(/^(.+?)\s+-\s+(.+?)(\s*\([^)]*\))?$/);
  if (!dash) return false;

  const left = dash[1].trim();
  const right = dash[2].trim();
  if (left.toLowerCase() === right.toLowerCase()) return true;

  const streetHints =
    /\b(street|st\.?|road|rd\.?|avenue|ave\.?|drive|dr\.?|lane|ln\.?|way|plot|building|bldg|apartment|apt\.?|estate|close|court|ct\.?|highway|hwy|boulevard|blvd)\b/i;
  const hasStreetNumber = /\b\d{1,5}[a-z]?\s+\w/i.test(t);
  if (streetHints.test(t) || hasStreetNumber) return false;

  if (pn && left.toLowerCase() === pn.toLowerCase()) return true;

  return false;
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

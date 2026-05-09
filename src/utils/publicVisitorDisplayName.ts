const STORAGE_KEY = 'ux_public_visitor_display_name';

/** Minimum trimmed length for a visitor display name */
const MIN_LEN = 2;

export function getPublicVisitorDisplayName(): string {
  if (typeof window === 'undefined') return '';
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    const t = (v || '').trim();
    return t.length >= MIN_LEN ? t : '';
  } catch {
    return '';
  }
}

export function hasPublicVisitorDisplayName(): boolean {
  return getPublicVisitorDisplayName().length >= MIN_LEN;
}

/** Persist visitor name for /builders (comments, feed label, guest flows). */
export function setPublicVisitorDisplayName(name: string): void {
  const t = name.trim();
  if (t.length < MIN_LEN) return;
  try {
    localStorage.setItem(STORAGE_KEY, t);
    localStorage.setItem('user_name', t);
  } catch {
    /* ignore quota / private mode */
  }
}

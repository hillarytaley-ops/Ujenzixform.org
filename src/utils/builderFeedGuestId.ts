const STORAGE_KEY = 'ux_builder_feed_guest_id';

/** Stable anonymous id for public feed likes (stored in localStorage). */
export function getBuilderFeedGuestId(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id || id.length < 8) {
      id =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `g-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

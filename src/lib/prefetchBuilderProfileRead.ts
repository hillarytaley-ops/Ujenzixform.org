/** Mirrors `dataPrefetch` storage key so hub cache can resolve profile id without importing `dataPrefetch` (avoids circular deps). */
const CACHE_EXPIRY_MS = 5 * 60 * 1000;

export function readPrefetchedBuilderProfileId(authUserId: string): string | undefined {
  try {
    const raw = localStorage.getItem(`prefetch_builder_profile_${authUserId}`);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { data?: { id?: string }; timestamp?: number };
    if (parsed.timestamp == null || Date.now() - parsed.timestamp > CACHE_EXPIRY_MS) return undefined;
    const id = parsed.data?.id;
    if (id == null || String(id) === '' || String(id) === String(authUserId)) return undefined;
    return String(id);
  } catch {
    return undefined;
  }
}

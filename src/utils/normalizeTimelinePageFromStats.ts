/**
 * `get_builders_page_public_stats` returns `timeline_page` as jsonb; PostgREST/Supabase
 * may surface it as an array, a JSON string, or (rarely) another shape.
 */
export function normalizeTimelinePageFromStats(raw: unknown): Record<string, unknown>[] | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    return raw.length ? (raw as Record<string, unknown>[]) : null;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) && parsed.length
        ? (parsed as Record<string, unknown>[])
        : null;
    } catch {
      return null;
    }
  }
  return null;
}

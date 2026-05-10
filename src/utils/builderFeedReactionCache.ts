const KEYS = {
  builder: 'ux_builder_feed_reaction_v1',
  supplier: 'ux_supplier_feed_reaction_v1',
} as const;

export type FeedReactionScope = keyof typeof KEYS;

function readRaw(scope: FeedReactionScope): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(KEYS[scope]);
    if (!raw) return {};
    const o = JSON.parse(raw) as unknown;
    return o && typeof o === 'object' && !Array.isArray(o) ? (o as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeRaw(scope: FeedReactionScope, next: Record<string, string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEYS[scope], JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
}

export function setFeedReactionCache(scope: FeedReactionScope, postId: string, reaction: string | null) {
  const next = readRaw(scope);
  if (reaction && reaction.length > 0) next[postId] = reaction;
  else delete next[postId];
  writeRaw(scope, next);
}

/**
 * Merge server like-reactions with localStorage so emojis survive refresh when `reaction` is missing from API/DB.
 */
export function mergeViewerReactionsWithLocalFallback(
  scope: FeedReactionScope,
  server: Map<string, string>,
): Map<string, string> {
  const cache = readRaw(scope);
  const out = new Map(server);
  for (const [pid, em] of out) {
    if (em === '👍' && cache[pid] && cache[pid] !== '👍') {
      out.set(pid, cache[pid]!);
    }
  }
  const next: Record<string, string> = {};
  for (const [k, v] of out) {
    if (v) next[k] = v;
  }
  writeRaw(scope, next);
  return out;
}

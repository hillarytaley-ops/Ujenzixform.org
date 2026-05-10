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
 * Merge server `post_likes` reactions with localStorage.
 *
 * When `fetchSucceeded` is false, we **do not** overwrite storage (empty server maps are common on
 * network/RLS errors and would wipe the user's cached emojis).
 *
 * When `fetchSucceeded` is true, we merge 👍 defaults from cache, then persist only keys that still
 * have a like (server map + upgrades). For `postIdsInBatch`, entries missing from the merged map
 * are removed from storage so unlikes stay in sync.
 */
export function mergeViewerReactionsWithLocalFallback(
  scope: FeedReactionScope,
  server: Map<string, string>,
  postIdsInBatch: string[],
  fetchSucceeded: boolean,
): Map<string, string> {
  const cache = readRaw(scope);
  const out = new Map(server);

  if (!fetchSucceeded) {
    for (const pid of postIdsInBatch) {
      if (!out.has(pid) && cache[pid]) out.set(pid, cache[pid]!);
    }
    return out;
  }

  for (const [pid, em] of out) {
    if (em === '👍' && cache[pid] && cache[pid] !== '👍') {
      out.set(pid, cache[pid]!);
    }
  }

  const next: Record<string, string> = { ...cache };
  for (const pid of postIdsInBatch) {
    if (out.has(pid)) next[pid] = out.get(pid)!;
    else delete next[pid];
  }
  writeRaw(scope, next);
  return out;
}

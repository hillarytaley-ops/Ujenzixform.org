const STORAGE_KEY = 'ux_comment_emoji_recent_v1';
const MAX_RECENT = 24;

export function loadRecentCommentEmojis(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length <= 32)
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

/** Move `emoji` to the front, dedupe, persist, and return the new list for React state. */
export function pushRecentCommentEmoji(emoji: string): string[] {
  const trimmed = emoji.trim();
  if (!trimmed) return loadRecentCommentEmojis();

  const prev = loadRecentCommentEmojis();
  const next = [trimmed, ...prev.filter((e) => e !== trimmed)].slice(0, MAX_RECENT);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* quota / private mode */
    }
  }
  return next;
}

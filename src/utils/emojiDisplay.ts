/** Map legacy text reactions to emoji (DB rows before reaction column or bad clients). */
const REACTION_ALIASES: Record<string, string> = {
  like: "👍",
  love: "❤️",
  heart: "❤️",
  haha: "😂",
  wow: "😮",
  sad: "😢",
  angry: "😡",
  fire: "🔥",
  celebrate: "🎉",
  clap: "👏",
};

/** Replacement / missing-glyph boxes sometimes stored or returned from bad encodings. */
const BROKEN_GLYPH = /^[\uFFFD\u25A1\u25A0\u200B\s]+$/;

/**
 * Ensure a reaction or caption emoji renders in the UI (not tofu / "like" text).
 */
export function normalizeEmojiForDisplay(raw: string | null | undefined, fallback = "👍"): string {
  if (raw == null) return fallback;
  const t = String(raw).trim();
  if (!t) return fallback;
  const alias = REACTION_ALIASES[t.toLowerCase()];
  if (alias) return alias;
  if (BROKEN_GLYPH.test(t)) return fallback;
  return t;
}

/** True if the string contains at least one emoji codepoint (for mixed text). */
export function textContainsEmoji(text: string): boolean {
  try {
    return /\p{Extended_Pictographic}/u.test(text);
  } catch {
    return /[\u{1F300}-\u{1FAFF}]/u.test(text);
  }
}

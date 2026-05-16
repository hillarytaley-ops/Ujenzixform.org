import { describe, expect, it } from "vitest";
import { normalizeEmojiForDisplay } from "@/utils/emojiDisplay";

describe("emojiDisplay", () => {
  it("maps legacy like text to thumbs up", () => {
    expect(normalizeEmojiForDisplay("like")).toBe("👍");
    expect(normalizeEmojiForDisplay("LOVE")).toBe("❤️");
  });

  it("preserves real emoji", () => {
    expect(normalizeEmojiForDisplay("🔥")).toBe("🔥");
    expect(normalizeEmojiForDisplay("🏗️")).toBe("🏗️");
  });
});

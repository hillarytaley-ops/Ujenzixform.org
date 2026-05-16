import React from "react";
import { cn } from "@/lib/utils";

type EmojiTextProps = {
  children: React.ReactNode;
  className?: string;
  as?: "span" | "p" | "div";
};

/**
 * User-generated text (captions, comments) — uses global emoji font fallbacks so
 * emojis do not render as empty boxes on Windows / some mobile WebViews.
 */
export function EmojiText({ children, className, as: Tag = "span" }: EmojiTextProps) {
  return <Tag className={cn("emoji-text", className)}>{children}</Tag>;
}

-- Persist Facebook-style reaction emoji per like row on the public CO timeline (builder_posts feed).
-- Frontend reads/writes this so the chosen emoji survives refresh.

ALTER TABLE public.post_likes
  ADD COLUMN IF NOT EXISTS reaction TEXT NOT NULL DEFAULT '👍';

COMMENT ON COLUMN public.post_likes.reaction IS
  'Reaction emoji for this viewer''s like (e.g. 👍 ❤️). Default 👍 for legacy rows.';

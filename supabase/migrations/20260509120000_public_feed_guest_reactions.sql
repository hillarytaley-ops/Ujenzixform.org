-- Public (anon) can like/comment on CO feed posts; guest rows use guest_identifier + nullable user_id.
-- Tightens post_likes DELETE so guests unlike via SECURITY DEFINER RPC only (avoids wiping all NULL-user likes).

-- Older DBs may have post_likes without guest_identifier (predates 20260216_sync_social_and_showcase.sql).
ALTER TABLE public.post_likes ADD COLUMN IF NOT EXISTS guest_identifier TEXT;

-- post_likes: replace broad UNIQUE(post_id, user_id) with partial uniques (auth vs guest)
ALTER TABLE public.post_likes DROP CONSTRAINT IF EXISTS post_likes_post_id_user_id_key;

-- Legacy rows: user_id null without guest_identifier would bypass partial uniques; repair then enforce.
UPDATE public.post_likes
SET guest_identifier = 'migrated-' || id::text
WHERE user_id IS NULL
  AND (guest_identifier IS NULL OR length(btrim(guest_identifier)) < 8);

ALTER TABLE public.post_likes DROP CONSTRAINT IF EXISTS post_likes_actor_chk;
ALTER TABLE public.post_likes ADD CONSTRAINT post_likes_actor_chk CHECK (
  user_id IS NOT NULL
  OR (guest_identifier IS NOT NULL AND length(btrim(guest_identifier)) >= 8)
);

CREATE UNIQUE INDEX IF NOT EXISTS post_likes_post_id_user_id_active
  ON public.post_likes (post_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS post_likes_post_id_guest_active
  ON public.post_likes (post_id, guest_identifier)
  WHERE guest_identifier IS NOT NULL;

-- post_comments: allow anonymous comments
ALTER TABLE public.post_comments ADD COLUMN IF NOT EXISTS guest_identifier TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'post_comments'
      AND column_name = 'user_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.post_comments ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END $$;

-- Count triggers (SECURITY DEFINER updates builder_posts)
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.builder_posts SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.builder_posts SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.builder_posts SET comments_count = COALESCE(comments_count, 0) + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.builder_posts SET comments_count = GREATEST(COALESCE(comments_count, 0) - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_post_likes ON public.post_likes;
CREATE TRIGGER trigger_update_post_likes
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();

DROP TRIGGER IF EXISTS trigger_update_post_comments ON public.post_comments;
CREATE TRIGGER trigger_update_post_comments
  AFTER INSERT OR DELETE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();

-- RLS: authenticated users delete own auth-based likes only (no blanket user_id IS NULL)
DROP POLICY IF EXISTS "post_likes_delete" ON public.post_likes;
CREATE POLICY "post_likes_delete" ON public.post_likes
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

GRANT INSERT ON public.post_likes TO anon;
GRANT INSERT ON public.post_comments TO anon;

-- Guests remove their like via RPC (matches post_id + guest_identifier)
CREATE OR REPLACE FUNCTION public.delete_guest_post_like(p_post_id uuid, p_guest text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_guest IS NULL OR length(trim(p_guest)) < 8 THEN
    RAISE EXCEPTION 'invalid guest identifier';
  END IF;
  DELETE FROM public.post_likes
  WHERE post_id = p_post_id
    AND user_id IS NULL
    AND guest_identifier = p_guest;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_guest_post_like(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_guest_post_like(uuid, text) TO anon, authenticated;

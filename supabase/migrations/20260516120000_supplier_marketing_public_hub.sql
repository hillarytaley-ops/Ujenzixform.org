-- Public hub: supplier directory (definer) + supplier marketing posts (text/media) with guest likes/comments/reactions.

-- ---------------------------------------------------------------------------
-- 1) Directory: anon-safe listing (public fields only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_supplier_directory()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT jsonb_agg(row_json ORDER BY sort_key)
      FROM (
        SELECT
          jsonb_build_object(
            'id', s.id,
            'user_id', s.user_id,
            'company_name', s.company_name,
            'location', s.location,
            'phone', s.phone,
            'email', s.email,
            -- Many deployments have no suppliers.logo_url; use profile avatar for the hub.
            'logo_url', p.avatar_url,
            'is_verified', COALESCE(s.is_verified, false),
            -- suppliers.description is missing on some DBs; use profile text via jsonb keys (no catalog dependency).
            'description', LEFT(
              BTRIM(
                COALESCE(
                  NULLIF(to_jsonb(p) ->> 'bio', ''),
                  NULLIF(to_jsonb(p) ->> 'description', ''),
                  NULLIF(to_jsonb(s) ->> 'description', ''),
                  ''
                )
              ),
              400
            )
          ) AS row_json,
          lower(
            coalesce(
              nullif(trim(coalesce(s.company_name, '')), ''),
              ''
            )
          ) AS sort_key
        FROM public.suppliers s
        LEFT JOIN public.profiles p ON p.user_id = s.user_id
        WHERE COALESCE(lower(trim(s.status)), 'active') IN ('active', '', 'published')
          AND s.user_id IS NOT NULL
      ) x
    ),
    '[]'::jsonb
  );
$$;

COMMENT ON FUNCTION public.get_public_supplier_directory() IS
  'Public supplier rows for market hub; SECURITY DEFINER so anon can list active suppliers.';

REVOKE ALL ON FUNCTION public.get_public_supplier_directory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_supplier_directory() TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Supplier marketing posts (mirrors builder_posts intent for suppliers)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supplier_marketing_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  video_url TEXT,
  image_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  thumbnail_url TEXT,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_marketing_posts_created
  ON public.supplier_marketing_posts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_supplier_marketing_posts_author
  ON public.supplier_marketing_posts (supplier_user_id);

ALTER TABLE public.supplier_marketing_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "supplier_marketing_posts_select_public" ON public.supplier_marketing_posts;
CREATE POLICY "supplier_marketing_posts_select_public" ON public.supplier_marketing_posts
  FOR SELECT
  USING (COALESCE(NULLIF(trim(status), ''), 'active') = 'active');

DROP POLICY IF EXISTS "supplier_marketing_posts_insert_owner" ON public.supplier_marketing_posts;
CREATE POLICY "supplier_marketing_posts_insert_owner" ON public.supplier_marketing_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    supplier_user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role::text = 'supplier'
    )
  );

DROP POLICY IF EXISTS "supplier_marketing_posts_update_owner" ON public.supplier_marketing_posts;
CREATE POLICY "supplier_marketing_posts_update_owner" ON public.supplier_marketing_posts
  FOR UPDATE
  TO authenticated
  USING (supplier_user_id = (SELECT auth.uid()))
  WITH CHECK (supplier_user_id = (SELECT auth.uid()));

GRANT SELECT ON public.supplier_marketing_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.supplier_marketing_posts TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) Likes + reactions (emoji stored in reaction text)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supplier_post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.supplier_marketing_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_identifier TEXT,
  reaction TEXT NOT NULL DEFAULT '👍',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT supplier_post_likes_actor_chk CHECK (
    user_id IS NOT NULL
    OR (guest_identifier IS NOT NULL AND length(btrim(guest_identifier)) >= 8)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_post_likes_post_user
  ON public.supplier_post_likes (post_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS supplier_post_likes_post_guest
  ON public.supplier_post_likes (post_id, guest_identifier)
  WHERE guest_identifier IS NOT NULL;

ALTER TABLE public.supplier_post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "supplier_post_likes_select" ON public.supplier_post_likes;
CREATE POLICY "supplier_post_likes_select" ON public.supplier_post_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "supplier_post_likes_insert" ON public.supplier_post_likes;
CREATE POLICY "supplier_post_likes_insert" ON public.supplier_post_likes
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (
      user_id IS NOT NULL
      AND user_id = (SELECT auth.uid())
    )
    OR (
      (SELECT auth.uid()) IS NULL
      AND user_id IS NULL
      AND guest_identifier IS NOT NULL
      AND length(btrim(guest_identifier)) >= 8
    )
  );

DROP POLICY IF EXISTS "supplier_post_likes_delete_auth" ON public.supplier_post_likes;
CREATE POLICY "supplier_post_likes_delete_auth" ON public.supplier_post_likes
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

GRANT SELECT, INSERT, DELETE ON public.supplier_post_likes TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) Comments (guest-friendly)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supplier_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.supplier_marketing_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_identifier TEXT,
  commenter_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_post_comments_post
  ON public.supplier_post_comments (post_id, created_at DESC);

ALTER TABLE public.supplier_post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "supplier_post_comments_select" ON public.supplier_post_comments;
CREATE POLICY "supplier_post_comments_select" ON public.supplier_post_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "supplier_post_comments_insert" ON public.supplier_post_comments;
CREATE POLICY "supplier_post_comments_insert" ON public.supplier_post_comments
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (length(btrim(commenter_name)) >= 1 AND length(btrim(content)) >= 1);

GRANT SELECT, INSERT ON public.supplier_post_comments TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) Count triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_supplier_post_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.supplier_marketing_posts
    SET likes_count = COALESCE(likes_count, 0) + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.supplier_marketing_posts
    SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0)
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_supplier_post_likes_count ON public.supplier_post_likes;
CREATE TRIGGER trg_supplier_post_likes_count
  AFTER INSERT OR DELETE ON public.supplier_post_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_supplier_post_likes_count();

CREATE OR REPLACE FUNCTION public.update_supplier_post_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.supplier_marketing_posts
    SET comments_count = COALESCE(comments_count, 0) + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.supplier_marketing_posts
    SET comments_count = GREATEST(COALESCE(comments_count, 0) - 1, 0)
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_supplier_post_comments_count ON public.supplier_post_comments;
CREATE TRIGGER trg_supplier_post_comments_count
  AFTER INSERT OR DELETE ON public.supplier_post_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_supplier_post_comments_count();

-- ---------------------------------------------------------------------------
-- 6) Public feed RPC (anon parity with builder feed)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_supplier_feed_posts(p_limit int DEFAULT 10, p_offset int DEFAULT 0)
RETURNS SETOF public.supplier_marketing_posts
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.supplier_marketing_posts p
  WHERE COALESCE(NULLIF(trim(p.status), ''), 'active') = 'active'
  ORDER BY p.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

REVOKE ALL ON FUNCTION public.get_public_supplier_feed_posts(int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_supplier_feed_posts(int, int) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.delete_guest_supplier_post_like(p_post_id uuid, p_guest text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_guest IS NULL OR length(trim(p_guest)) < 8 THEN
    RAISE EXCEPTION 'invalid guest identifier';
  END IF;
  DELETE FROM public.supplier_post_likes
  WHERE post_id = p_post_id
    AND user_id IS NULL
    AND guest_identifier = p_guest;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_guest_supplier_post_like(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_guest_supplier_post_like(uuid, text) TO anon, authenticated;

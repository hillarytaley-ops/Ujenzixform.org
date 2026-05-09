-- =============================================================================
-- ONE-SHOT FIX: public /builders Social Feed + Project Showcase for anon
-- =============================================================================
-- Run in Supabase Dashboard → SQL → New query, against the SAME project as
-- VITE_SUPABASE_URL / your hosted site. This is idempotent (CREATE OR REPLACE).
--
-- If you only deploy frontend but never run migrations, the app cannot read
-- builder_posts / builder_videos as anon — hero counts use SECURITY DEFINER
-- and will still show "7+" while the feed stays empty.
-- =============================================================================

-- Dedicated feed read (anon-safe; bypasses RLS on builder_posts)
CREATE OR REPLACE FUNCTION public.get_public_builder_feed_posts(p_limit int DEFAULT 10, p_offset int DEFAULT 0)
RETURNS SETOF public.builder_posts
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.builder_posts
  WHERE COALESCE(NULLIF(trim(status::text), ''), 'active') = 'active'
  ORDER BY created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

REVOKE ALL ON FUNCTION public.get_public_builder_feed_posts(int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_builder_feed_posts(int, int) TO anon, authenticated;

-- Stats + optional first timeline page (anon-safe; powers hero + bundled feed)
DROP FUNCTION IF EXISTS public.get_builders_page_public_stats();
DROP FUNCTION IF EXISTS public.get_builders_page_public_stats(integer, integer);

CREATE FUNCTION public.get_builders_page_public_stats(
  p_feed_limit int DEFAULT NULL,
  p_feed_offset int DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'professional_builders',
      (SELECT COUNT(*)::int FROM public.user_roles WHERE role = 'professional_builder'),
    'active_posts',
      (
        SELECT COUNT(*)::int
        FROM public.builder_posts bp
        WHERE COALESCE(NULLIF(trim(bp.status::text), ''), 'active') = 'active'
      ),
    'published_videos',
      (SELECT COUNT(*)::int FROM public.builder_videos WHERE COALESCE(is_published, true) = true),
    'timeline_page',
      CASE
        WHEN p_feed_limit IS NOT NULL AND p_feed_limit > 0 THEN
          COALESCE(
            (
              SELECT jsonb_agg(to_jsonb(f) ORDER BY f.created_at DESC)
              FROM (
                SELECT *
                FROM public.builder_posts bp
                WHERE COALESCE(NULLIF(trim(bp.status::text), ''), 'active') = 'active'
                ORDER BY bp.created_at DESC
                LIMIT LEAST(GREATEST(p_feed_limit, 1), 50)
                OFFSET GREATEST(COALESCE(p_feed_offset, 0), 0)
              ) f
            ),
            '[]'::jsonb
          )
        ELSE NULL::jsonb
      END
  );
$$;

REVOKE ALL ON FUNCTION public.get_builders_page_public_stats(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_builders_page_public_stats(integer, integer) TO anon, authenticated;

-- Direct REST read for active posts (when RPC is not used)
DROP POLICY IF EXISTS "builder_posts_public_read" ON public.builder_posts;
DROP POLICY IF EXISTS "builder_posts_select_public_co" ON public.builder_posts;

CREATE POLICY "builder_posts_select_public_co" ON public.builder_posts
FOR SELECT
USING (
  (
    COALESCE(NULLIF(trim(status::text), ''), 'active') = 'active'
  )
  OR (
    (select auth.uid()) IS NOT NULL
    AND builder_id = (select auth.uid())
  )
);

-- Showcase videos (anon-safe RPC + policy)
CREATE OR REPLACE FUNCTION public.get_public_builder_showcase_videos(
  p_limit integer DEFAULT 48,
  p_offset integer DEFAULT 0,
  p_builder_id uuid DEFAULT NULL
)
RETURNS SETOF public.builder_videos
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.builder_videos v
  WHERE COALESCE(v.is_published, true) = true
    AND (p_builder_id IS NULL OR v.builder_id = p_builder_id)
  ORDER BY v.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 48), 1), 200)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

REVOKE ALL ON FUNCTION public.get_public_builder_showcase_videos(integer, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_builder_showcase_videos(integer, integer, uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "builder_videos_public_read" ON public.builder_videos;

CREATE POLICY "builder_videos_public_read" ON public.builder_videos
  FOR SELECT
  TO anon, authenticated
  USING (COALESCE(is_published, true) = true);

-- -----------------------------------------------------------------------------
-- post_likes: allow NULL user_id for guest rows (fixes 23502 on insert)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'post_likes'
      AND column_name = 'user_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.post_likes ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- post_likes: anonymous guests (user_id null + guest_identifier)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "post_likes_insert" ON public.post_likes;
DROP POLICY IF EXISTS "Authenticated users can like posts" ON public.post_likes;
DROP POLICY IF EXISTS "Users can manage own likes" ON public.post_likes;

CREATE POLICY "post_likes_insert" ON public.post_likes
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (
      user_id IS NOT NULL
      AND user_id = (select auth.uid())
    )
    OR
    (
      (select auth.uid()) IS NULL
      AND user_id IS NULL
      AND guest_identifier IS NOT NULL
      AND length(btrim(guest_identifier)) >= 8
    )
  );

GRANT INSERT ON public.post_likes TO anon;

-- -----------------------------------------------------------------------------
-- video_comments: visitors read + post (Project Showcase / VideoPlayer)
-- -----------------------------------------------------------------------------
GRANT SELECT, INSERT ON public.video_comments TO anon;

DROP POLICY IF EXISTS "video_comments_select" ON public.video_comments;
DROP POLICY IF EXISTS "Anyone can view approved comments" ON public.video_comments;
DROP POLICY IF EXISTS "Users can view own comments" ON public.video_comments;

CREATE POLICY "video_comments_select_public" ON public.video_comments
  FOR SELECT
  TO anon, authenticated
  USING (
    COALESCE(is_approved, true) = true
    OR (
      (select auth.uid()) IS NOT NULL
      AND user_id IS NOT NULL
      AND user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "video_comments_insert" ON public.video_comments;
DROP POLICY IF EXISTS "Authenticated users can comment" ON public.video_comments;
DROP POLICY IF EXISTS "Public users can comment" ON public.video_comments;

CREATE POLICY "video_comments_insert_public" ON public.video_comments
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (
      (select auth.uid()) IS NOT NULL
      AND user_id IS NOT NULL
      AND user_id = (select auth.uid())
    )
    OR (
      (select auth.uid()) IS NULL
      AND user_id IS NULL
    )
  );

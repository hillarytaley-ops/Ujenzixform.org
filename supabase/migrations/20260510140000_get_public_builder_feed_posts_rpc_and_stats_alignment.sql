-- Public social feed: stats RPC counted active rows while RLS still hid posts when
-- builder_posts_select_public_co required user_has_professional_builder_role(builder_id)
-- (e.g. migration 20260508210000 not applied). This adds a DEFINER feed read + fixes policy + aligns counts.

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

COMMENT ON FUNCTION public.get_public_builder_feed_posts(int, int) IS
  'Public builder social feed rows (active or legacy blank status); bypasses RLS so anon matches marketing counts.';

REVOKE ALL ON FUNCTION public.get_public_builder_feed_posts(int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_builder_feed_posts(int, int) TO anon, authenticated;

-- Hero stats: same visibility as the feed (not raw status = active only).
CREATE OR REPLACE FUNCTION public.get_builders_page_public_stats()
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
      (SELECT COUNT(*)::int FROM public.builder_videos WHERE COALESCE(is_published, true) = true)
  );
$$;

COMMENT ON FUNCTION public.get_builders_page_public_stats() IS
  'Safe public counts for Builders page; active_posts matches get_public_builder_feed_posts visibility.';

REVOKE ALL ON FUNCTION public.get_builders_page_public_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_builders_page_public_stats() TO anon, authenticated;

-- Ensure SELECT policy matches intended public read (no CO-role gate on author).
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

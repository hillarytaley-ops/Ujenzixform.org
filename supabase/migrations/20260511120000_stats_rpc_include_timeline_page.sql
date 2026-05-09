-- Bundle first page of public timeline posts into get_builders_page_public_stats so the
-- Social Feed can use the same RPC that already powers hero counts (no extra function to deploy).

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

COMMENT ON FUNCTION public.get_builders_page_public_stats(integer, integer) IS
  'Public counts for /builders; optional p_feed_limit/p_feed_offset return timeline_page jsonb array.';

REVOKE ALL ON FUNCTION public.get_builders_page_public_stats(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_builders_page_public_stats(integer, integer) TO anon, authenticated;

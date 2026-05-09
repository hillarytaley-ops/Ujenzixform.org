-- Public Project Showcase: mirror get_public_builder_feed_posts — if RLS on builder_videos
-- is missing or mis-deployed, anon still cannot list rows while stats count published videos.
-- This RPC returns the same rows visitors should see (published / legacy-visible).

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

COMMENT ON FUNCTION public.get_public_builder_showcase_videos(integer, integer, uuid) IS
  'Published builder showcase videos for public directory; bypasses RLS so anon matches marketing counts.';

REVOKE ALL ON FUNCTION public.get_public_builder_showcase_videos(integer, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_builder_showcase_videos(integer, integer, uuid) TO anon, authenticated;

-- Align direct REST reads with stats RPC (COALESCE(is_published, true)); keep builder drafts private.
DROP POLICY IF EXISTS "builder_videos_public_read" ON public.builder_videos;

CREATE POLICY "builder_videos_public_read" ON public.builder_videos
  FOR SELECT
  TO anon, authenticated
  USING (COALESCE(is_published, true) = true);

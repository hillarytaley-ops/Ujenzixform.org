-- Project showcase reads builder_videos with RLS (is_published = true only).
-- NULL is_published failed that check (NULL = true is unknown), while stats used COALESCE(..., true) — inflated counts vs empty gallery.
-- 1) Normalize legacy rows. 2) Align stats with what visitors can actually see.

UPDATE public.builder_videos
SET is_published = true
WHERE is_published IS NULL;

COMMENT ON COLUMN public.builder_videos.is_published IS
  'When false, video is draft/pending and not shown on public showcase. NULL treated as published for legacy rows (normalized by migration).';

CREATE OR REPLACE FUNCTION public.get_builders_page_public_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'professional_builders',
      (SELECT COUNT(*)::int FROM public.user_roles WHERE role::text = 'professional_builder'),
    'active_posts',
      (SELECT COUNT(*)::int FROM public.builder_posts WHERE status = 'active'),
    'published_videos',
      (SELECT COUNT(*)::int FROM public.builder_videos WHERE is_published IS TRUE)
  );
$$;

COMMENT ON FUNCTION public.get_builders_page_public_stats() IS
  'Safe public counts for Builders page; video count matches public showcase (is_published IS TRUE).';

GRANT EXECUTE ON FUNCTION public.get_builders_page_public_stats() TO anon, authenticated;

-- Ensure authenticated builders can still read unpublished own rows (drafts).
DROP POLICY IF EXISTS "builders_view_own_videos" ON public.builder_videos;
DROP POLICY IF EXISTS "Builders can view own videos" ON public.builder_videos;

CREATE POLICY "builders_view_own_videos" ON public.builder_videos
  FOR SELECT
  TO authenticated
  USING (builder_id = (select auth.uid()));

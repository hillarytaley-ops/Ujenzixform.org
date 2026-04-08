-- Public aggregate stats for /builders marketing (no PII). Callable by anon for directory trust.

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
      (SELECT COUNT(*)::int FROM public.builder_posts WHERE status = 'active'),
    'published_videos',
      (SELECT COUNT(*)::int FROM public.builder_videos WHERE COALESCE(is_published, true) = true)
  );
$$;

COMMENT ON FUNCTION public.get_builders_page_public_stats() IS
  'Safe public counts for Builders page hero/stats; SECURITY DEFINER exposes only aggregates.';

GRANT EXECUTE ON FUNCTION public.get_builders_page_public_stats() TO anon, authenticated;

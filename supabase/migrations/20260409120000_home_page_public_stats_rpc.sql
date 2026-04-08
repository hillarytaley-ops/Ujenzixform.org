-- Public aggregate stats for marketing home page (no PII). Callable by anon.

CREATE OR REPLACE FUNCTION public.get_home_page_public_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'professional_builders',
      (SELECT COUNT(*)::int FROM public.user_roles WHERE role = 'professional_builder'),
    'supplier_companies',
      (SELECT COUNT(*)::int FROM public.suppliers),
    'builder_projects',
      (SELECT COUNT(*)::int FROM public.builder_projects),
    'delivery_providers',
      (SELECT COUNT(*)::int FROM public.user_roles WHERE role IN ('delivery_provider', 'delivery')),
    'registered_network',
      (SELECT COUNT(DISTINCT user_id)::int FROM public.user_roles
       WHERE role IS NOT NULL
         AND role NOT IN ('admin', 'super_admin'))
  );
$$;

COMMENT ON FUNCTION public.get_home_page_public_stats() IS
  'Safe public counts for home hero/stats; SECURITY DEFINER exposes only aggregates.';

GRANT EXECUTE ON FUNCTION public.get_home_page_public_stats() TO anon, authenticated;

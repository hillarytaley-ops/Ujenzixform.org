-- Add approved materials count (aligns with marketplace: approved or legacy null status).

CREATE OR REPLACE FUNCTION public.get_home_page_public_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'professional_builders',
      (SELECT COUNT(*)::int FROM public.user_roles WHERE role::text = 'professional_builder'),
    'supplier_companies',
      (SELECT COUNT(*)::int FROM public.suppliers),
    'builder_projects',
      (SELECT COUNT(*)::int FROM public.builder_projects),
    'delivery_providers',
      (SELECT COUNT(*)::int FROM public.user_roles WHERE role::text IN ('delivery_provider', 'delivery')),
    'registered_network',
      (SELECT COUNT(DISTINCT user_id)::int FROM public.user_roles
       WHERE role IS NOT NULL
         AND role::text NOT IN ('admin', 'super_admin')),
    'approved_materials',
      (SELECT COUNT(*)::int FROM public.materials m
       WHERE m.approval_status IS NULL
          OR lower(trim(m.approval_status::text)) = 'approved')
  );
$$;

COMMENT ON FUNCTION public.get_home_page_public_stats() IS
  'Safe public counts for marketing (home, suppliers hero); includes approved materials count for marketplace.';

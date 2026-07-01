-- Unblock delivery providers: user_roles delivery role = hiring approved

CREATE OR REPLACE FUNCTION public.is_delivery_provider_hiring_approved(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_user_id IS NULL THEN false
    WHEN EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = p_user_id
        AND ur.role::text IN ('delivery', 'delivery_provider')
    ) THEN true
    WHEN EXISTS (
      SELECT 1
      FROM public.delivery_provider_registrations r
      WHERE r.auth_user_id = p_user_id
        AND lower(trim(coalesce(r.status, ''))) = 'approved'
    ) THEN true
    WHEN EXISTS (
      SELECT 1
      FROM public.delivery_providers dp
      WHERE (dp.user_id = p_user_id OR dp.id = p_user_id)
        AND coalesce(dp.is_verified, false) = true
        AND coalesce(dp.is_active, false) = true
    ) THEN true
    ELSE false
  END;
$$;

UPDATE public.delivery_provider_registrations r
SET status = 'approved', updated_at = now()
FROM public.user_roles ur
WHERE ur.user_id = r.auth_user_id
  AND ur.role::text IN ('delivery', 'delivery_provider')
  AND lower(trim(coalesce(r.status, ''))) IN ('pending', 'under_review');

UPDATE public.delivery_providers dp
SET is_verified = true, is_active = true, updated_at = now()
FROM public.user_roles ur
WHERE ur.user_id = dp.user_id
  AND ur.role::text IN ('delivery', 'delivery_provider');

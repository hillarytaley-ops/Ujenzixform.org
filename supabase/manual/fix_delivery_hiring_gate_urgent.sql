-- URGENT: Unblock all delivery providers (run entire file in SQL Editor)
-- Grants dashboard + open jobs to anyone with delivery role in user_roles.

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

-- Reactivate every account that already has the delivery role
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

DROP POLICY IF EXISTS "delivery_providers_self_read" ON public.delivery_providers;
CREATE POLICY "delivery_providers_self_read"
  ON public.delivery_providers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR id = auth.uid());

DROP POLICY IF EXISTS "delivery_provider_registrations_insert" ON public.delivery_provider_registrations;
CREATE POLICY "delivery_provider_registrations_insert"
  ON public.delivery_provider_registrations FOR INSERT
  TO authenticated
  WITH CHECK (
    auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    )
  );

DROP POLICY IF EXISTS "delivery_provider_registrations_update" ON public.delivery_provider_registrations;
CREATE POLICY "delivery_provider_registrations_update"
  ON public.delivery_provider_registrations FOR UPDATE
  TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    )
  );

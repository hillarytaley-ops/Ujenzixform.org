-- Fix delivery provider hiring gate: auth_user_id RLS + self-read on delivery_providers

DROP POLICY IF EXISTS "delivery_provider_registrations_insert" ON public.delivery_provider_registrations;
CREATE POLICY "delivery_provider_registrations_insert"
  ON public.delivery_provider_registrations FOR INSERT
  TO authenticated
  WITH CHECK (
    auth_user_id = auth.uid()
    OR user_id = auth.uid()
    OR applicant_user_id = auth.uid()
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
    OR user_id = auth.uid()
    OR applicant_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    )
  );

DROP POLICY IF EXISTS "delivery_providers_self_read" ON public.delivery_providers;
CREATE POLICY "delivery_providers_self_read"
  ON public.delivery_providers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR id = auth.uid());

COMMENT ON POLICY "delivery_providers_self_read" ON public.delivery_providers IS
  'Providers can read their own row for hiring gate / profile (is_verified, is_active).';

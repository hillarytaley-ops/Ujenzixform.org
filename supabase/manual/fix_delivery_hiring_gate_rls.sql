-- Run in Supabase SQL Editor (migration 20260624200000)
-- delivery_provider_registrations uses auth_user_id (not user_id / applicant_user_id)

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

DROP POLICY IF EXISTS "delivery_providers_self_read" ON public.delivery_providers;
CREATE POLICY "delivery_providers_self_read"
  ON public.delivery_providers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR id = auth.uid());

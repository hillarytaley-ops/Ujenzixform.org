-- Fix TIS integrator RLS: app_role enum does not include super_admin.
-- Safe to re-run if the original migration partially applied (tables exist, policies failed).

CREATE OR REPLACE FUNCTION public.is_tis_integrator_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.admin_staff s
      WHERE coalesce(s.status, 'active') = 'active'
        AND (
          s.user_id = auth.uid()
          OR lower(trim(s.email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
        )
        AND s.role IN ('admin', 'super_admin', 'administrator', 'finance_officer')
    );
$$;

REVOKE ALL ON FUNCTION public.is_tis_integrator_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_tis_integrator_staff() TO authenticated;

DROP POLICY IF EXISTS "Admin read tis_integrator_platform" ON public.tis_integrator_platform;
DROP POLICY IF EXISTS "Admin write tis_integrator_platform" ON public.tis_integrator_platform;
DROP POLICY IF EXISTS "Admin read tis_vendor_onboarding" ON public.tis_vendor_onboarding;
DROP POLICY IF EXISTS "Admin write tis_vendor_onboarding" ON public.tis_vendor_onboarding;
DROP POLICY IF EXISTS "Supplier read own tis_vendor_onboarding" ON public.tis_vendor_onboarding;
DROP POLICY IF EXISTS "Admin read tis_submission_log" ON public.tis_submission_log;
DROP POLICY IF EXISTS "Authenticated insert tis_submission_log" ON public.tis_submission_log;

CREATE POLICY "Admin read tis_integrator_platform"
  ON public.tis_integrator_platform FOR SELECT TO authenticated
  USING (public.is_tis_integrator_staff());

CREATE POLICY "Admin write tis_integrator_platform"
  ON public.tis_integrator_platform FOR ALL TO authenticated
  USING (public.is_tis_integrator_staff())
  WITH CHECK (public.is_tis_integrator_staff());

CREATE POLICY "Admin read tis_vendor_onboarding"
  ON public.tis_vendor_onboarding FOR SELECT TO authenticated
  USING (public.is_tis_integrator_staff());

CREATE POLICY "Admin write tis_vendor_onboarding"
  ON public.tis_vendor_onboarding FOR ALL TO authenticated
  USING (public.is_tis_integrator_staff())
  WITH CHECK (public.is_tis_integrator_staff());

CREATE POLICY "Supplier read own tis_vendor_onboarding"
  ON public.tis_vendor_onboarding FOR SELECT TO authenticated
  USING (supplier_id IN (
    SELECT s.id FROM public.suppliers s WHERE s.user_id = auth.uid()
  ));

CREATE POLICY "Admin read tis_submission_log"
  ON public.tis_submission_log FOR SELECT TO authenticated
  USING (public.is_tis_integrator_staff());

CREATE POLICY "Authenticated insert tis_submission_log"
  ON public.tis_submission_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

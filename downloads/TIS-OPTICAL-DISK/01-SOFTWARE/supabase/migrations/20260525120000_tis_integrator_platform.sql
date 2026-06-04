-- Third-party eTIMS TIS integrator platform (UjenziXform as certified integrator)
-- Separate from per-supplier eTIMS settings; tracks platform identity and vendor onboarding workflow.

-- ---------------------------------------------------------------------------
-- 1) Platform identity (singleton row — UjenziXform Solution)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tis_integrator_platform (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integrator_name TEXT NOT NULL DEFAULT 'UjenziXform Solution',
  integrator_pin TEXT,
  product_name TEXT NOT NULL DEFAULT 'UjenziXform Trader Invoicing System (TIS)',
  product_version TEXT NOT NULL DEFAULT '1.0.0',
  solution_type TEXT NOT NULL DEFAULT 'OSCU'
    CHECK (solution_type IN ('OSCU', 'VSCU')),
  environment TEXT NOT NULL DEFAULT 'sandbox'
    CHECK (environment IN ('sandbox', 'production')),
  certification_status TEXT NOT NULL DEFAULT 'in_development'
    CHECK (certification_status IN (
      'in_development', 'sandbox_testing', 'submitted_to_kra', 'certified', 'suspended'
    )),
  kra_contact_email TEXT,
  sandbox_base_url TEXT NOT NULL DEFAULT 'https://etims-api-sbx.kra.go.ke',
  production_base_url TEXT NOT NULL DEFAULT 'https://etims-api.kra.go.ke',
  checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.tis_integrator_platform IS
  'UjenziXform as KRA-approved third-party eTIMS integrator — platform metadata and certification checklist.';

-- Seed singleton if empty
INSERT INTO public.tis_integrator_platform (integrator_name, product_name)
SELECT 'UjenziXform Solution', 'UjenziXform Trader Invoicing System (TIS)'
WHERE NOT EXISTS (SELECT 1 FROM public.tis_integrator_platform LIMIT 1);

-- ---------------------------------------------------------------------------
-- 2) Per-vendor onboarding workflow (links to suppliers)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tis_vendor_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  onboarding_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (onboarding_status IN (
      'draft', 'pending_review', 'pending_kra', 'active', 'suspended', 'rejected'
    )),
  solution_type TEXT CHECK (solution_type IN ('OSCU', 'VSCU')),
  onboarding_notes TEXT,
  admin_review_notes TEXT,
  certified_at TIMESTAMPTZ,
  certified_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (supplier_id)
);

CREATE INDEX IF NOT EXISTS idx_tis_vendor_onboarding_status
  ON public.tis_vendor_onboarding(onboarding_status);
CREATE INDEX IF NOT EXISTS idx_tis_vendor_onboarding_supplier
  ON public.tis_vendor_onboarding(supplier_id);

COMMENT ON TABLE public.tis_vendor_onboarding IS
  'Vendor onboarding lifecycle for suppliers using UjenziXform TIS integrator services.';

-- ---------------------------------------------------------------------------
-- 3) Submission audit log (integrator ops)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tis_submission_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  submission_type TEXT NOT NULL CHECK (submission_type IN ('sale', 'credit_note', 'item', 'customer', 'stock')),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  trader_invoice_no TEXT,
  error_message TEXT,
  response_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_tis_submission_log_supplier ON public.tis_submission_log(supplier_id);
CREATE INDEX IF NOT EXISTS idx_tis_submission_log_po ON public.tis_submission_log(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_tis_submission_log_created ON public.tis_submission_log(created_at DESC);

-- ---------------------------------------------------------------------------
-- 4) updated_at triggers
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS update_tis_integrator_platform_updated_at ON public.tis_integrator_platform;
CREATE TRIGGER update_tis_integrator_platform_updated_at
  BEFORE UPDATE ON public.tis_integrator_platform
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_tis_vendor_onboarding_updated_at ON public.tis_vendor_onboarding;
CREATE TRIGGER update_tis_vendor_onboarding_updated_at
  BEFORE UPDATE ON public.tis_vendor_onboarding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 5) RLS (app_role enum has admin/supplier/builder — not super_admin; staff via admin_staff)
-- ---------------------------------------------------------------------------
ALTER TABLE public.tis_integrator_platform ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tis_vendor_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tis_submission_log ENABLE ROW LEVEL SECURITY;

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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tis_integrator_platform TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tis_vendor_onboarding TO authenticated;
GRANT SELECT, INSERT ON public.tis_submission_log TO authenticated;

-- =============================================================================
-- Critical RLS orphan policy cleanup (May 2026)
-- Drops permissive policies that override stricter later policies (Postgres ORs
-- permissive policies — the loosest SELECT/INSERT wins).
-- Idempotent: safe to re-run.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) profiles — remove public full-row read; keep directory via RPCs/views
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

REVOKE SELECT ON public.profiles FROM anon;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;

CREATE POLICY "profiles_select_own"
ON public.profiles FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "profiles_select_admin"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_admin_no_rls());

CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2) supplier_product_prices — drop Feb 2026 USING(true) orphans
--    Keep role-aware policies from 20260425103100
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view supplier prices" ON public.supplier_product_prices;
DROP POLICY IF EXISTS "Anon can view supplier prices" ON public.supplier_product_prices;
DROP POLICY IF EXISTS "Authenticated can view all prices" ON public.supplier_product_prices;
DROP POLICY IF EXISTS "Anyone can view prices" ON public.supplier_product_prices;
DROP POLICY IF EXISTS "Public can view supplier prices" ON public.supplier_product_prices;
DROP POLICY IF EXISTS "Suppliers can view all prices" ON public.supplier_product_prices;

DROP POLICY IF EXISTS "Public can view prices" ON public.supplier_product_prices;
CREATE POLICY "Public can view prices" ON public.supplier_product_prices
  FOR SELECT
  USING (
    auth.uid() IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'supplier'
    )
  );

DROP POLICY IF EXISTS "Suppliers can view own prices" ON public.supplier_product_prices;
CREATE POLICY "Suppliers can view own prices" ON public.supplier_product_prices
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'supplier'
    )
    AND (
      supplier_id = auth.uid()
      OR supplier_id IN (SELECT s.id FROM public.suppliers s WHERE s.user_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 3) user_roles — block self-assigning admin/super_admin via PostgREST
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "user_roles_insert_own" ON public.user_roles;

CREATE POLICY "user_roles_insert_own"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role IN (
    'builder',
    'professional_builder',
    'private_client',
    'supplier',
    'delivery',
    'delivery_provider'
  )
);

-- ---------------------------------------------------------------------------
-- 4) admin_staff — no anon table access; login via verify_admin_staff_login RPC
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view online staff" ON public.admin_staff;
DROP POLICY IF EXISTS "Anyone can view online staff" ON public.admin_staff;
DROP POLICY IF EXISTS "Allow public read for login verification" ON public.admin_staff;

REVOKE ALL ON public.admin_staff FROM anon;
GRANT SELECT ON public.admin_staff TO authenticated;

-- ---------------------------------------------------------------------------
-- 5) invoice_payments — align with current invoices.builder_id + admin
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Builders can view their invoice payments" ON public.invoice_payments;
DROP POLICY IF EXISTS "Suppliers can view payments for their invoices" ON public.invoice_payments;
DROP POLICY IF EXISTS "Builders can insert payments for their invoices" ON public.invoice_payments;
DROP POLICY IF EXISTS "invoice_payments_admin_all" ON public.invoice_payments;

CREATE POLICY "invoice_payments_select_parties"
ON public.invoice_payments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_payments.invoice_id
      AND (
        i.builder_id = auth.uid()
        OR i.builder_id IN (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid())
        OR i.issuer_id = auth.uid()
        OR i.issuer_id IN (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid())
        OR i.supplier_id IN (SELECT s.id FROM public.suppliers s WHERE s.user_id = auth.uid())
      )
  )
  OR public.is_admin_no_rls()
);

CREATE POLICY "invoice_payments_insert_parties"
ON public.invoice_payments FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_payments.invoice_id
      AND (
        i.builder_id = auth.uid()
        OR i.builder_id IN (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid())
      )
  )
  OR public.is_admin_no_rls()
);

CREATE POLICY "invoice_payments_admin_all"
ON public.invoice_payments FOR ALL TO authenticated
USING (public.is_admin_no_rls())
WITH CHECK (public.is_admin_no_rls());

-- ---------------------------------------------------------------------------
-- 6) analytics_events — ensure anon cannot insert (belt-and-suspenders)
-- ---------------------------------------------------------------------------
REVOKE INSERT ON public.analytics_events FROM anon;

-- =============================================================================
-- Done
-- =============================================================================

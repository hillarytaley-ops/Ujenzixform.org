-- ========================================
-- COMPREHENSIVE SECURITY FIX - FINAL VERSION
-- ========================================

-- 1. PROFILES TABLE - Add RLS policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_admin_full_access'
  ) THEN
    CREATE POLICY "profiles_admin_full_access"
    ON public.profiles FOR ALL
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_owner_access'
  ) THEN
    CREATE POLICY "profiles_owner_access"
    ON public.profiles FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_public_directory_read'
  ) THEN
    CREATE POLICY "profiles_public_directory_read"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
      role IN ('builder', 'supplier') 
      AND is_professional = true
    );
  END IF;
END $$;

-- 2. SUPPLIERS TABLE - Strengthen with business relationship verification
DROP POLICY IF EXISTS "suppliers_admin_complete_access" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_owner_manage_own" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_block_anonymous" ON public.suppliers;

CREATE POLICY "suppliers_admin_full_access"
ON public.suppliers FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "suppliers_owner_full_access"
ON public.suppliers FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "suppliers_verified_business_read"
ON public.suppliers FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM purchase_orders po
    JOIN profiles p ON p.id = po.buyer_id
    WHERE po.supplier_id = suppliers.id
    AND p.user_id = auth.uid()
    AND po.status IN ('confirmed', 'completed')
    AND po.created_at > NOW() - INTERVAL '90 days'
  )
);

-- 3. DELIVERIES - Create secure view for driver contact masking
CREATE OR REPLACE VIEW public.deliveries_safe AS
SELECT 
  d.id,
  d.supplier_id,
  d.builder_id,
  d.project_id,
  d.quantity,
  d.weight_kg,
  d.pickup_date,
  d.delivery_date,
  d.estimated_delivery_time,
  d.actual_delivery_time,
  d.created_at,
  d.updated_at,
  d.tracking_number,
  d.material_type,
  d.pickup_address,
  d.delivery_address,
  d.status,
  d.vehicle_details,
  d.notes,
  -- Mask driver contact based on user role
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN d.driver_name
    WHEN EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() 
      AND p.id = d.builder_id
      AND d.status IN ('in_progress', 'out_for_delivery', 'delivered')
    ) THEN d.driver_name
    ELSE 'Driver assigned'
  END as driver_name,
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN d.driver_phone
    ELSE 'Contact via platform'
  END as driver_phone
FROM deliveries d;

GRANT SELECT ON public.deliveries_safe TO authenticated;

-- 4. PAYMENTS TABLE - Create with strict RLS
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'KES',
  provider text NOT NULL,
  phone_number text,
  reference text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  transaction_id text,
  provider_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_admin_full_access" ON public.payments;
DROP POLICY IF EXISTS "payments_owner_access" ON public.payments;

CREATE POLICY "payments_admin_full_access"
ON public.payments FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "payments_owner_access"
ON public.payments FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 5. PROJECTS TABLE - Strengthen RLS
DROP POLICY IF EXISTS "Builders can manage their own projects" ON public.projects;
DROP POLICY IF EXISTS "projects_admin_full_access" ON public.projects;
DROP POLICY IF EXISTS "projects_builder_access" ON public.projects;
DROP POLICY IF EXISTS "projects_supplier_read_active" ON public.projects;

CREATE POLICY "projects_admin_full_access"
ON public.projects FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "projects_builder_access"
ON public.projects FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND p.id = projects.builder_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND p.id = projects.builder_id
  )
);

CREATE POLICY "projects_supplier_read_active"
ON public.projects FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM purchase_orders po
    JOIN suppliers s ON s.id = po.supplier_id
    WHERE po.buyer_id = projects.builder_id
    AND s.user_id = auth.uid()
    AND po.status IN ('confirmed', 'in_progress')
    AND po.created_at > NOW() - INTERVAL '30 days'
  )
);

-- Log security enhancement
INSERT INTO public.security_events (
  user_id, event_type, severity, details
) VALUES (
  NULL,
  'comprehensive_security_fix_final',
  'high',
  jsonb_build_object(
    'description', 'Applied comprehensive RLS policies - profiles, suppliers, deliveries, payments, projects',
    'tables_secured', ARRAY[
      'profiles', 'suppliers', 'deliveries', 'payments', 'projects'
    ],
    'views_created', ARRAY['deliveries_safe'],
    'timestamp', NOW()
  )
);
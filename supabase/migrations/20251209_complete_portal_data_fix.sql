-- ============================================================================
-- COMPLETE PORTAL DATA FIX
-- This migration ensures all portals can communicate with the admin dashboard
-- ============================================================================

-- ============================================================================
-- 1. CREATE MONITORING_SERVICE_REQUESTS TABLE (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.monitoring_service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  project_name TEXT NOT NULL,
  project_location TEXT NOT NULL,
  project_size TEXT,
  project_type TEXT,
  project_duration TEXT,
  start_date DATE,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  company_name TEXT,
  selected_services TEXT[] DEFAULT '{}',
  camera_count INTEGER DEFAULT 0,
  drone_hours INTEGER DEFAULT 0,
  security_level TEXT,
  special_requirements TEXT,
  budget_range TEXT,
  urgency TEXT DEFAULT 'normal',
  estimated_cost DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'quoted', 'approved', 'rejected', 'completed', 'active')),
  admin_notes TEXT,
  quote_amount DECIMAL(12,2),
  quote_valid_until DATE,
  access_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.monitoring_service_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "monitoring_requests_user_own" ON public.monitoring_service_requests;
DROP POLICY IF EXISTS "monitoring_requests_admin_full" ON public.monitoring_service_requests;
DROP POLICY IF EXISTS "monitoring_requests_authenticated_insert" ON public.monitoring_service_requests;

-- Users can view their own requests
CREATE POLICY "monitoring_requests_user_own"
ON public.monitoring_service_requests FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own requests
CREATE POLICY "monitoring_requests_authenticated_insert"
ON public.monitoring_service_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Admins have full access
CREATE POLICY "monitoring_requests_admin_full"
ON public.monitoring_service_requests FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.monitoring_service_requests TO authenticated;

-- ============================================================================
-- 2. FIX DELIVERY_REQUESTS RLS POLICIES
-- ============================================================================

-- Drop ALL existing policies on delivery_requests
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'delivery_requests'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.delivery_requests', pol.policyname);
    END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.delivery_requests ENABLE ROW LEVEL SECURITY;

-- Builders can manage their own delivery requests
CREATE POLICY "delivery_requests_builder_own"
ON public.delivery_requests FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.id = delivery_requests.builder_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.id = delivery_requests.builder_id
  )
);

-- Admins have full access
CREATE POLICY "delivery_requests_admin_full"
ON public.delivery_requests FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- Block anonymous access
CREATE POLICY "delivery_requests_block_anon"
ON public.delivery_requests FOR ALL TO anon
USING (false)
WITH CHECK (false);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.delivery_requests TO authenticated;

-- ============================================================================
-- 3. CREATE SECURE INSERT FUNCTION FOR DELIVERY REQUESTS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.insert_builder_delivery_request(
  p_pickup_address TEXT,
  p_delivery_address TEXT,
  p_material_type TEXT,
  p_quantity INTEGER DEFAULT 1,
  p_weight_kg DECIMAL DEFAULT NULL,
  p_pickup_date DATE DEFAULT NULL,
  p_preferred_time TEXT DEFAULT NULL,
  p_special_instructions TEXT DEFAULT NULL,
  p_budget_range TEXT DEFAULT NULL,
  p_required_vehicle_type TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_profile_id UUID;
  v_request_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE user_id = v_user_id;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  IF p_pickup_address IS NULL OR p_pickup_address = '' THEN
    RAISE EXCEPTION 'Pickup address is required';
  END IF;

  IF p_delivery_address IS NULL OR p_delivery_address = '' THEN
    RAISE EXCEPTION 'Delivery address is required';
  END IF;

  IF p_material_type IS NULL OR p_material_type = '' THEN
    RAISE EXCEPTION 'Material type is required';
  END IF;

  INSERT INTO public.delivery_requests (
    builder_id, pickup_address, delivery_address, material_type,
    quantity, weight_kg, pickup_date, preferred_time,
    special_instructions, budget_range, required_vehicle_type, status
  ) VALUES (
    v_profile_id, p_pickup_address, p_delivery_address, p_material_type,
    COALESCE(p_quantity, 1), p_weight_kg, COALESCE(p_pickup_date, CURRENT_DATE),
    p_preferred_time, p_special_instructions, p_budget_range,
    p_required_vehicle_type, 'pending'
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_builder_delivery_request(TEXT, TEXT, TEXT, INTEGER, DECIMAL, DATE, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- 4. FIX PURCHASE_ORDERS RLS POLICIES
-- ============================================================================

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'purchase_orders'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.purchase_orders', pol.policyname);
    END LOOP;
END $$;

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

-- Buyers can manage their own orders
CREATE POLICY "purchase_orders_buyer_own"
ON public.purchase_orders FOR ALL TO authenticated
USING (
  buyer_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.id = purchase_orders.buyer_id)
)
WITH CHECK (
  buyer_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.id = purchase_orders.buyer_id)
);

-- Suppliers can view orders assigned to them
CREATE POLICY "purchase_orders_supplier_view"
ON public.purchase_orders FOR SELECT TO authenticated
USING (
  supplier_id IS NOT NULL AND
  EXISTS (SELECT 1 FROM suppliers s WHERE s.id = purchase_orders.supplier_id AND s.user_id = auth.uid())
);

-- Admins have full access
CREATE POLICY "purchase_orders_admin_full"
ON public.purchase_orders FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

GRANT SELECT, INSERT, UPDATE ON public.purchase_orders TO authenticated;

-- ============================================================================
-- 5. FIX REGISTRATION TABLES RLS (using auth_user_id column)
-- ============================================================================

-- Builder registrations
ALTER TABLE public.builder_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "builder_reg_own" ON public.builder_registrations;
DROP POLICY IF EXISTS "builder_reg_insert" ON public.builder_registrations;
DROP POLICY IF EXISTS "builder_reg_admin" ON public.builder_registrations;

CREATE POLICY "builder_reg_own"
ON public.builder_registrations FOR SELECT TO authenticated
USING (auth_user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "builder_reg_insert"
ON public.builder_registrations FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "builder_reg_admin"
ON public.builder_registrations FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

GRANT SELECT, INSERT, UPDATE ON public.builder_registrations TO authenticated;

-- Supplier registrations
ALTER TABLE public.supplier_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "supplier_reg_own" ON public.supplier_registrations;
DROP POLICY IF EXISTS "supplier_reg_insert" ON public.supplier_registrations;
DROP POLICY IF EXISTS "supplier_reg_admin" ON public.supplier_registrations;

CREATE POLICY "supplier_reg_own"
ON public.supplier_registrations FOR SELECT TO authenticated
USING (auth_user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "supplier_reg_insert"
ON public.supplier_registrations FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "supplier_reg_admin"
ON public.supplier_registrations FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

GRANT SELECT, INSERT, UPDATE ON public.supplier_registrations TO authenticated;

-- Delivery provider registrations
ALTER TABLE public.delivery_provider_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "delivery_reg_own" ON public.delivery_provider_registrations;
DROP POLICY IF EXISTS "delivery_reg_insert" ON public.delivery_provider_registrations;
DROP POLICY IF EXISTS "delivery_reg_admin" ON public.delivery_provider_registrations;

CREATE POLICY "delivery_reg_own"
ON public.delivery_provider_registrations FOR SELECT TO authenticated
USING (auth_user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "delivery_reg_insert"
ON public.delivery_provider_registrations FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "delivery_reg_admin"
ON public.delivery_provider_registrations FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

GRANT SELECT, INSERT, UPDATE ON public.delivery_provider_registrations TO authenticated;

-- ============================================================================
-- 6. FIX FEEDBACK TABLE RLS
-- ============================================================================

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feedback_own" ON public.feedback;
DROP POLICY IF EXISTS "feedback_insert" ON public.feedback;
DROP POLICY IF EXISTS "feedback_admin" ON public.feedback;

CREATE POLICY "feedback_own"
ON public.feedback FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "feedback_insert"
ON public.feedback FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "feedback_admin"
ON public.feedback FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

GRANT SELECT, INSERT ON public.feedback TO authenticated;

-- ============================================================================
-- 7. FIX PROFILES TABLE RLS
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin" ON public.profiles;

CREATE POLICY "profiles_own"
ON public.profiles FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_admin"
ON public.profiles FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

GRANT SELECT, UPDATE ON public.profiles TO authenticated;

-- ============================================================================
-- 8. FIX INVOICES RLS
-- ============================================================================

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_own" ON public.invoices;
DROP POLICY IF EXISTS "invoices_admin" ON public.invoices;

CREATE POLICY "invoices_own"
ON public.invoices FOR SELECT TO authenticated
USING (
  issuer_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM suppliers s WHERE s.id = invoices.supplier_id AND s.user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.id = invoices.issuer_id)
);

CREATE POLICY "invoices_admin"
ON public.invoices FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

GRANT SELECT, INSERT, UPDATE ON public.invoices TO authenticated;

-- ============================================================================
-- 9. CREATE UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_monitoring_requests_updated_at ON public.monitoring_service_requests;
CREATE TRIGGER update_monitoring_requests_updated_at
    BEFORE UPDATE ON public.monitoring_service_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 10. GRANT SERVICE ROLE ACCESS
-- ============================================================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ============================================================================
-- DONE
-- ============================================================================

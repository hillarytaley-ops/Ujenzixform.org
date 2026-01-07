-- ====================================================
-- FIX REGISTRATION TABLES - Ensure proper storage and admin access
-- ====================================================

-- 1. Ensure builder_registrations table exists with all columns
CREATE TABLE IF NOT EXISTS public.builder_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  company_name TEXT,
  business_registration_number TEXT,
  nca_license_number TEXT,
  kra_pin TEXT,
  county TEXT DEFAULT 'Nairobi',
  town TEXT,
  physical_address TEXT,
  builder_type TEXT DEFAULT 'individual',
  builder_category TEXT DEFAULT 'private',
  years_experience INTEGER DEFAULT 0,
  specialties TEXT[] DEFAULT ARRAY[]::TEXT[],
  portfolio_url TEXT,
  insurance_details TEXT,
  project_types TEXT[] DEFAULT ARRAY[]::TEXT[],
  project_timeline TEXT,
  budget_range TEXT,
  project_description TEXT,
  property_type TEXT,
  id_document_url TEXT,
  business_certificate_url TEXT,
  nca_certificate_url TEXT,
  profile_photo_url TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  approval_notes TEXT,
  terms_accepted BOOLEAN DEFAULT true,
  privacy_accepted BOOLEAN DEFAULT true,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Ensure supplier_registrations table exists with all columns
CREATE TABLE IF NOT EXISTS public.supplier_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  company_name TEXT NOT NULL,
  business_registration_number TEXT,
  kra_pin TEXT,
  business_type TEXT DEFAULT 'retailer',
  years_in_business INTEGER DEFAULT 0,
  county TEXT DEFAULT 'Nairobi',
  town TEXT,
  physical_address TEXT,
  delivery_areas TEXT[] DEFAULT ARRAY[]::TEXT[],
  material_categories TEXT[] DEFAULT ARRAY[]::TEXT[],
  specialties TEXT[] DEFAULT ARRAY[]::TEXT[],
  materials_list TEXT,
  price_list TEXT,
  minimum_order_value DECIMAL(12,2),
  accepts_bulk_orders BOOLEAN DEFAULT true,
  offers_delivery BOOLEAN DEFAULT false,
  delivery_fee_structure TEXT,
  opening_hours TEXT,
  weekend_availability BOOLEAN DEFAULT false,
  business_certificate_url TEXT,
  kra_certificate_url TEXT,
  company_logo_url TEXT,
  product_catalog_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  verification_date TIMESTAMP WITH TIME ZONE,
  verification_notes TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  approval_notes TEXT,
  terms_accepted BOOLEAN DEFAULT true,
  privacy_accepted BOOLEAN DEFAULT true,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.builder_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_registrations ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies to recreate them cleanly
DROP POLICY IF EXISTS "builder_reg_authenticated_insert" ON builder_registrations;
DROP POLICY IF EXISTS "builder_reg_view_own" ON builder_registrations;
DROP POLICY IF EXISTS "builder_reg_admin_view" ON builder_registrations;
DROP POLICY IF EXISTS "builder_reg_admin_update" ON builder_registrations;
DROP POLICY IF EXISTS "builder_reg_insert" ON builder_registrations;
DROP POLICY IF EXISTS "builder_reg_select" ON builder_registrations;
DROP POLICY IF EXISTS "builder_reg_update" ON builder_registrations;

DROP POLICY IF EXISTS "supplier_reg_authenticated_insert" ON supplier_registrations;
DROP POLICY IF EXISTS "supplier_reg_view_own" ON supplier_registrations;
DROP POLICY IF EXISTS "supplier_reg_admin_view" ON supplier_registrations;
DROP POLICY IF EXISTS "supplier_reg_admin_update" ON supplier_registrations;
DROP POLICY IF EXISTS "supplier_reg_insert" ON supplier_registrations;
DROP POLICY IF EXISTS "supplier_reg_select" ON supplier_registrations;
DROP POLICY IF EXISTS "supplier_reg_update" ON supplier_registrations;

-- 5. Create RLS policies for builder_registrations

-- Users can insert their own registration
CREATE POLICY "builder_reg_insert" ON builder_registrations
FOR INSERT TO authenticated
WITH CHECK (auth_user_id = auth.uid());

-- Users can view their own registration
CREATE POLICY "builder_reg_select_own" ON builder_registrations
FOR SELECT TO authenticated
USING (auth_user_id = auth.uid());

-- Admins can view all registrations
CREATE POLICY "builder_reg_admin_select" ON builder_registrations
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Admins can update any registration
CREATE POLICY "builder_reg_admin_update" ON builder_registrations
FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 6. Create RLS policies for supplier_registrations

-- Users can insert their own registration
CREATE POLICY "supplier_reg_insert" ON supplier_registrations
FOR INSERT TO authenticated
WITH CHECK (auth_user_id = auth.uid());

-- Users can view their own registration
CREATE POLICY "supplier_reg_select_own" ON supplier_registrations
FOR SELECT TO authenticated
USING (auth_user_id = auth.uid());

-- Admins can view all registrations
CREATE POLICY "supplier_reg_admin_select" ON supplier_registrations
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Admins can update any registration
CREATE POLICY "supplier_reg_admin_update" ON supplier_registrations
FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 7. Grant permissions
GRANT ALL ON public.builder_registrations TO authenticated;
GRANT ALL ON public.supplier_registrations TO authenticated;

-- 8. Ensure delivery_provider_registrations table exists with all columns
CREATE TABLE IF NOT EXISTS public.delivery_provider_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  id_number TEXT,
  company_name TEXT,
  business_registration_number TEXT,
  is_company BOOLEAN DEFAULT false,
  county TEXT DEFAULT 'Nairobi',
  town TEXT,
  physical_address TEXT,
  service_areas TEXT[] DEFAULT ARRAY[]::TEXT[],
  vehicle_type TEXT NOT NULL,
  vehicle_registration TEXT,
  vehicle_capacity_kg INTEGER,
  vehicle_capacity_description TEXT,
  vehicle_photo_url TEXT,
  driving_license_number TEXT,
  driving_license_class TEXT,
  driving_license_expiry DATE,
  years_driving_experience INTEGER DEFAULT 0,
  insurance_provider TEXT,
  insurance_policy_number TEXT,
  insurance_expiry DATE,
  ntsa_compliance BOOLEAN DEFAULT false,
  good_conduct_certificate_url TEXT,
  base_rate_per_km DECIMAL(10,2),
  minimum_charge DECIMAL(10,2),
  pricing_notes TEXT,
  available_days TEXT[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']::TEXT[],
  available_hours_start TIME,
  available_hours_end TIME,
  accepts_weekend_jobs BOOLEAN DEFAULT false,
  accepts_night_jobs BOOLEAN DEFAULT false,
  id_document_url TEXT,
  driving_license_url TEXT,
  vehicle_logbook_url TEXT,
  insurance_certificate_url TEXT,
  good_conduct_url TEXT,
  profile_photo_url TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  approval_notes TEXT,
  terms_accepted BOOLEAN DEFAULT true,
  privacy_accepted BOOLEAN DEFAULT true,
  background_check_consent BOOLEAN DEFAULT true,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Enable RLS for delivery_provider_registrations
ALTER TABLE public.delivery_provider_registrations ENABLE ROW LEVEL SECURITY;

-- 10. Drop existing delivery policies
DROP POLICY IF EXISTS "delivery_reg_authenticated_insert" ON delivery_provider_registrations;
DROP POLICY IF EXISTS "delivery_reg_view_own" ON delivery_provider_registrations;
DROP POLICY IF EXISTS "delivery_reg_admin_view" ON delivery_provider_registrations;
DROP POLICY IF EXISTS "delivery_reg_admin_update" ON delivery_provider_registrations;
DROP POLICY IF EXISTS "delivery_reg_insert" ON delivery_provider_registrations;
DROP POLICY IF EXISTS "delivery_reg_select" ON delivery_provider_registrations;
DROP POLICY IF EXISTS "delivery_reg_update" ON delivery_provider_registrations;
DROP POLICY IF EXISTS "delivery_reg_select_own" ON delivery_provider_registrations;
DROP POLICY IF EXISTS "delivery_reg_admin_select" ON delivery_provider_registrations;

-- 11. Create RLS policies for delivery_provider_registrations

-- Users can insert their own registration
CREATE POLICY "delivery_reg_insert" ON delivery_provider_registrations
FOR INSERT TO authenticated
WITH CHECK (auth_user_id = auth.uid());

-- Users can view their own registration
CREATE POLICY "delivery_reg_select_own" ON delivery_provider_registrations
FOR SELECT TO authenticated
USING (auth_user_id = auth.uid());

-- Admins can view all registrations
CREATE POLICY "delivery_reg_admin_select" ON delivery_provider_registrations
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Admins can update any registration
CREATE POLICY "delivery_reg_admin_update" ON delivery_provider_registrations
FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 12. Grant permissions for delivery_provider_registrations
GRANT ALL ON public.delivery_provider_registrations TO authenticated;

-- 13. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_builder_reg_auth_user ON builder_registrations(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_builder_reg_email ON builder_registrations(email);
CREATE INDEX IF NOT EXISTS idx_builder_reg_status ON builder_registrations(status);
CREATE INDEX IF NOT EXISTS idx_builder_reg_created ON builder_registrations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_supplier_reg_auth_user ON supplier_registrations(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_supplier_reg_email ON supplier_registrations(email);
CREATE INDEX IF NOT EXISTS idx_supplier_reg_status ON supplier_registrations(status);
CREATE INDEX IF NOT EXISTS idx_supplier_reg_created ON supplier_registrations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_delivery_reg_auth_user ON delivery_provider_registrations(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_reg_email ON delivery_provider_registrations(email);
CREATE INDEX IF NOT EXISTS idx_delivery_reg_status ON delivery_provider_registrations(status);
CREATE INDEX IF NOT EXISTS idx_delivery_reg_vehicle ON delivery_provider_registrations(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_delivery_reg_created ON delivery_provider_registrations(created_at DESC);

-- 14. Log success
DO $$
BEGIN
  RAISE NOTICE 'All registration tables (builder, supplier, delivery) fixed with proper RLS policies for admin access';
END $$;


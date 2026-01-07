-- ===================================================================
-- REGISTRATION TABLES: For Authenticated Users
-- ===================================================================
-- These tables capture builder, supplier, and delivery provider 
-- registration details for users who have ALREADY signed up.
-- 
-- Flow:
-- 1. User signs up at Auth page (creates auth account)
-- 2. User goes to builder/supplier/delivery registration
-- 3. Form pre-fills their email from auth account
-- 4. User completes registration details
-- 5. Data saved to registration table with status 'pending'
-- 6. Admin reviews and approves/rejects
-- 7. On approval: Profile populated, role assigned
--
-- KEY: Users use the SAME email for signup AND registration!
-- ===================================================================

-- ===================================================================
-- BUILDER REGISTRATIONS TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS public.builder_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to authenticated user (required - user must sign up first)
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Personal/Contact Information
  full_name TEXT NOT NULL,
  email TEXT NOT NULL, -- Pre-filled from auth account, same as signup email
  phone TEXT NOT NULL,
  
  -- Business Information
  company_name TEXT,
  business_registration_number TEXT,
  nca_license_number TEXT, -- National Construction Authority license
  kra_pin TEXT, -- Kenya Revenue Authority PIN
  
  -- Location
  county TEXT NOT NULL,
  town TEXT,
  physical_address TEXT,
  
  -- Builder Type & Category
  builder_type TEXT NOT NULL DEFAULT 'individual', -- 'individual', 'company'
  builder_category TEXT NOT NULL DEFAULT 'private', -- 'private', 'professional'
  
  -- Professional Details (for professional builders)
  years_experience INTEGER DEFAULT 0,
  specialties TEXT[] DEFAULT ARRAY[]::TEXT[],
  portfolio_url TEXT,
  insurance_details TEXT,
  
  -- Private Client Details (for private clients)
  project_types TEXT[] DEFAULT ARRAY[]::TEXT[],
  project_timeline TEXT,
  budget_range TEXT,
  project_description TEXT,
  property_type TEXT,
  
  -- Documents (URLs to uploaded files)
  id_document_url TEXT,
  business_certificate_url TEXT,
  nca_certificate_url TEXT,
  profile_photo_url TEXT,
  
  -- Application Status
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  approval_notes TEXT,
  
  -- Metadata
  terms_accepted BOOLEAN NOT NULL DEFAULT false,
  privacy_accepted BOOLEAN NOT NULL DEFAULT false,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT builder_valid_status CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  CONSTRAINT builder_valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  CONSTRAINT builder_valid_phone CHECK (phone ~ '^\+?[0-9]{9,15}$'),
  CONSTRAINT builder_valid_type CHECK (builder_type IN ('individual', 'company')),
  CONSTRAINT builder_valid_category CHECK (builder_category IN ('private', 'professional')),
  CONSTRAINT builder_one_registration_per_user UNIQUE (auth_user_id), -- One registration per user
  CONSTRAINT builder_terms_required CHECK (terms_accepted = true)
);

-- Indexes for builder_registrations
CREATE INDEX IF NOT EXISTS idx_builder_reg_email ON public.builder_registrations(email);
CREATE INDEX IF NOT EXISTS idx_builder_reg_status ON public.builder_registrations(status);
CREATE INDEX IF NOT EXISTS idx_builder_reg_category ON public.builder_registrations(builder_category);
CREATE INDEX IF NOT EXISTS idx_builder_reg_county ON public.builder_registrations(county);
CREATE INDEX IF NOT EXISTS idx_builder_reg_created ON public.builder_registrations(created_at DESC);

-- ===================================================================
-- SUPPLIER REGISTRATIONS TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS public.supplier_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to authenticated user (required - user must sign up first)
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Contact Information
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL, -- Pre-filled from auth account, same as signup email
  phone TEXT NOT NULL,
  
  -- Business Information
  company_name TEXT NOT NULL,
  business_registration_number TEXT,
  kra_pin TEXT,
  business_type TEXT NOT NULL DEFAULT 'retailer', -- 'manufacturer', 'wholesaler', 'retailer', 'distributor'
  years_in_business INTEGER DEFAULT 0,
  
  -- Location
  county TEXT NOT NULL,
  town TEXT,
  physical_address TEXT NOT NULL,
  delivery_areas TEXT[] DEFAULT ARRAY[]::TEXT[], -- Counties they deliver to
  
  -- Products & Services
  material_categories TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  specialties TEXT[] DEFAULT ARRAY[]::TEXT[],
  materials_list TEXT, -- Detailed list of materials
  price_list TEXT, -- Price information
  minimum_order_value DECIMAL(12,2),
  accepts_bulk_orders BOOLEAN DEFAULT true,
  offers_delivery BOOLEAN DEFAULT false,
  delivery_fee_structure TEXT,
  
  -- Business Hours
  opening_hours TEXT,
  weekend_availability BOOLEAN DEFAULT false,
  
  -- Documents (URLs to uploaded files)
  business_certificate_url TEXT,
  kra_certificate_url TEXT,
  company_logo_url TEXT,
  product_catalog_url TEXT,
  
  -- Verification
  is_verified BOOLEAN DEFAULT false,
  verification_date TIMESTAMP WITH TIME ZONE,
  verification_notes TEXT,
  
  -- Application Status
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  approval_notes TEXT,
  
  -- Metadata
  terms_accepted BOOLEAN NOT NULL DEFAULT false,
  privacy_accepted BOOLEAN NOT NULL DEFAULT false,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT supplier_valid_status CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  CONSTRAINT supplier_valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  CONSTRAINT supplier_valid_phone CHECK (phone ~ '^\+?[0-9]{9,15}$'),
  CONSTRAINT supplier_valid_business_type CHECK (business_type IN ('manufacturer', 'wholesaler', 'retailer', 'distributor', 'hardware')),
  CONSTRAINT supplier_one_registration_per_user UNIQUE (auth_user_id), -- One registration per user
  CONSTRAINT supplier_terms_required CHECK (terms_accepted = true)
);

-- Indexes for supplier_registrations
CREATE INDEX IF NOT EXISTS idx_supplier_reg_email ON public.supplier_registrations(email);
CREATE INDEX IF NOT EXISTS idx_supplier_reg_status ON public.supplier_registrations(status);
CREATE INDEX IF NOT EXISTS idx_supplier_reg_county ON public.supplier_registrations(county);
CREATE INDEX IF NOT EXISTS idx_supplier_reg_categories ON public.supplier_registrations USING GIN(material_categories);
CREATE INDEX IF NOT EXISTS idx_supplier_reg_created ON public.supplier_registrations(created_at DESC);

-- ===================================================================
-- DELIVERY PROVIDER REGISTRATIONS TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS public.delivery_provider_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to authenticated user (required - user must sign up first)
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Personal/Contact Information
  full_name TEXT NOT NULL,
  email TEXT NOT NULL, -- Pre-filled from auth account, same as signup email
  phone TEXT NOT NULL,
  id_number TEXT, -- National ID
  
  -- Business Information (for companies)
  company_name TEXT,
  business_registration_number TEXT,
  is_company BOOLEAN DEFAULT false,
  
  -- Location
  county TEXT NOT NULL,
  town TEXT,
  physical_address TEXT,
  service_areas TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], -- Counties they operate in
  
  -- Vehicle Information
  vehicle_type TEXT NOT NULL, -- 'motorcycle', 'pickup', 'lorry_small', 'lorry_medium', 'lorry_large', 'trailer'
  vehicle_registration TEXT NOT NULL,
  vehicle_capacity_kg INTEGER,
  vehicle_capacity_description TEXT,
  vehicle_photo_url TEXT,
  
  -- Driver Information
  driving_license_number TEXT NOT NULL,
  driving_license_class TEXT, -- BCE, etc.
  driving_license_expiry DATE,
  years_driving_experience INTEGER DEFAULT 0,
  
  -- Insurance & Compliance
  insurance_provider TEXT,
  insurance_policy_number TEXT,
  insurance_expiry DATE,
  ntsa_compliance BOOLEAN DEFAULT false, -- National Transport & Safety Authority
  good_conduct_certificate_url TEXT,
  
  -- Pricing
  base_rate_per_km DECIMAL(10,2),
  minimum_charge DECIMAL(10,2),
  pricing_notes TEXT,
  
  -- Availability
  available_days TEXT[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']::TEXT[],
  available_hours_start TIME,
  available_hours_end TIME,
  accepts_weekend_jobs BOOLEAN DEFAULT false,
  accepts_night_jobs BOOLEAN DEFAULT false,
  
  -- Documents (URLs to uploaded files)
  id_document_url TEXT,
  driving_license_url TEXT,
  vehicle_logbook_url TEXT,
  insurance_certificate_url TEXT,
  good_conduct_url TEXT,
  profile_photo_url TEXT,
  
  -- Application Status
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  approval_notes TEXT,
  
  -- Metadata
  terms_accepted BOOLEAN NOT NULL DEFAULT false,
  privacy_accepted BOOLEAN NOT NULL DEFAULT false,
  background_check_consent BOOLEAN NOT NULL DEFAULT false,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT delivery_valid_status CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  CONSTRAINT delivery_valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  CONSTRAINT delivery_valid_phone CHECK (phone ~ '^\+?[0-9]{9,15}$'),
  CONSTRAINT delivery_valid_vehicle CHECK (vehicle_type IN ('motorcycle', 'pickup', 'lorry_small', 'lorry_medium', 'lorry_large', 'trailer', 'tuk_tuk')),
  CONSTRAINT delivery_one_registration_per_user UNIQUE (auth_user_id), -- One registration per user
  CONSTRAINT delivery_terms_required CHECK (terms_accepted = true),
  CONSTRAINT delivery_background_check_required CHECK (background_check_consent = true)
);

-- Indexes for delivery_provider_registrations
CREATE INDEX IF NOT EXISTS idx_delivery_reg_email ON public.delivery_provider_registrations(email);
CREATE INDEX IF NOT EXISTS idx_delivery_reg_status ON public.delivery_provider_registrations(status);
CREATE INDEX IF NOT EXISTS idx_delivery_reg_county ON public.delivery_provider_registrations(county);
CREATE INDEX IF NOT EXISTS idx_delivery_reg_vehicle ON public.delivery_provider_registrations(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_delivery_reg_areas ON public.delivery_provider_registrations USING GIN(service_areas);
CREATE INDEX IF NOT EXISTS idx_delivery_reg_created ON public.delivery_provider_registrations(created_at DESC);

-- ===================================================================
-- ENABLE ROW LEVEL SECURITY
-- ===================================================================
ALTER TABLE public.builder_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builder_registrations FORCE ROW LEVEL SECURITY;

ALTER TABLE public.supplier_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_registrations FORCE ROW LEVEL SECURITY;

ALTER TABLE public.delivery_provider_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_provider_registrations FORCE ROW LEVEL SECURITY;

-- ===================================================================
-- RLS POLICIES - BUILDER REGISTRATIONS
-- ===================================================================

-- Only authenticated users can submit a registration (must sign up first)
CREATE POLICY "builder_reg_authenticated_insert"
ON public.builder_registrations
FOR INSERT
TO authenticated
WITH CHECK (auth_user_id = auth.uid()); -- Can only insert for themselves

-- Users can view their own registration
CREATE POLICY "builder_reg_view_own"
ON public.builder_registrations
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

-- Admins can view all registrations
CREATE POLICY "builder_reg_admin_view"
ON public.builder_registrations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Admins can update registrations (for approval/rejection)
CREATE POLICY "builder_reg_admin_update"
ON public.builder_registrations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- ===================================================================
-- RLS POLICIES - SUPPLIER REGISTRATIONS
-- ===================================================================

-- Only authenticated users can submit a registration (must sign up first)
CREATE POLICY "supplier_reg_authenticated_insert"
ON public.supplier_registrations
FOR INSERT
TO authenticated
WITH CHECK (auth_user_id = auth.uid()); -- Can only insert for themselves

-- Users can view their own registration
CREATE POLICY "supplier_reg_view_own"
ON public.supplier_registrations
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

CREATE POLICY "supplier_reg_admin_view"
ON public.supplier_registrations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "supplier_reg_admin_update"
ON public.supplier_registrations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- ===================================================================
-- RLS POLICIES - DELIVERY PROVIDER REGISTRATIONS
-- ===================================================================

-- Only authenticated users can submit a registration (must sign up first)
CREATE POLICY "delivery_reg_authenticated_insert"
ON public.delivery_provider_registrations
FOR INSERT
TO authenticated
WITH CHECK (auth_user_id = auth.uid()); -- Can only insert for themselves

-- Users can view their own registration
CREATE POLICY "delivery_reg_view_own"
ON public.delivery_provider_registrations
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

CREATE POLICY "delivery_reg_admin_view"
ON public.delivery_provider_registrations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "delivery_reg_admin_update"
ON public.delivery_provider_registrations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- ===================================================================
-- APPROVAL FUNCTIONS
-- ===================================================================

-- Function to approve a builder registration
CREATE OR REPLACE FUNCTION public.approve_builder_registration(
  registration_id UUID,
  admin_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  reg_record RECORD;
  new_user_id UUID;
  result JSON;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can approve registrations';
  END IF;

  -- Get registration record
  SELECT * INTO reg_record FROM public.builder_registrations WHERE id = registration_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration not found';
  END IF;
  
  IF reg_record.status != 'pending' THEN
    RAISE EXCEPTION 'Registration is not pending (current status: %)', reg_record.status;
  END IF;

  -- Update registration status
  UPDATE public.builder_registrations
  SET 
    status = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = pg_catalog.now(),
    approval_notes = admin_notes,
    updated_at = pg_catalog.now()
  WHERE id = registration_id;

  -- Return success (account creation handled separately or via edge function)
  result := pg_catalog.json_build_object(
    'success', true,
    'message', 'Builder registration approved',
    'registration_id', registration_id,
    'email', reg_record.email,
    'builder_category', reg_record.builder_category
  );
  
  RETURN result;
END;
$$;

-- Function to approve a supplier registration
CREATE OR REPLACE FUNCTION public.approve_supplier_registration(
  registration_id UUID,
  admin_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  reg_record RECORD;
  result JSON;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can approve registrations';
  END IF;

  -- Get registration record
  SELECT * INTO reg_record FROM public.supplier_registrations WHERE id = registration_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration not found';
  END IF;
  
  IF reg_record.status != 'pending' THEN
    RAISE EXCEPTION 'Registration is not pending (current status: %)', reg_record.status;
  END IF;

  -- Update registration status
  UPDATE public.supplier_registrations
  SET 
    status = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = pg_catalog.now(),
    approval_notes = admin_notes,
    is_verified = true,
    verification_date = pg_catalog.now(),
    updated_at = pg_catalog.now()
  WHERE id = registration_id;

  result := pg_catalog.json_build_object(
    'success', true,
    'message', 'Supplier registration approved',
    'registration_id', registration_id,
    'email', reg_record.email,
    'company_name', reg_record.company_name
  );
  
  RETURN result;
END;
$$;

-- Function to approve a delivery provider registration
CREATE OR REPLACE FUNCTION public.approve_delivery_registration(
  registration_id UUID,
  admin_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  reg_record RECORD;
  result JSON;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can approve registrations';
  END IF;

  -- Get registration record
  SELECT * INTO reg_record FROM public.delivery_provider_registrations WHERE id = registration_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration not found';
  END IF;
  
  IF reg_record.status != 'pending' THEN
    RAISE EXCEPTION 'Registration is not pending (current status: %)', reg_record.status;
  END IF;

  -- Update registration status
  UPDATE public.delivery_provider_registrations
  SET 
    status = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = pg_catalog.now(),
    approval_notes = admin_notes,
    updated_at = pg_catalog.now()
  WHERE id = registration_id;

  result := pg_catalog.json_build_object(
    'success', true,
    'message', 'Delivery provider registration approved',
    'registration_id', registration_id,
    'email', reg_record.email,
    'full_name', reg_record.full_name,
    'vehicle_type', reg_record.vehicle_type
  );
  
  RETURN result;
END;
$$;

-- Function to reject any registration
CREATE OR REPLACE FUNCTION public.reject_registration(
  table_name TEXT,
  registration_id UUID,
  rejection_reason_text TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can reject registrations';
  END IF;

  -- Validate table name (use safe string comparison)
  IF table_name NOT IN ('builder_registrations', 'supplier_registrations', 'delivery_provider_registrations') THEN
    RAISE EXCEPTION 'Invalid table name';
  END IF;

  -- Update based on table (using schema-qualified names)
  IF table_name = 'builder_registrations' THEN
    UPDATE public.builder_registrations
    SET 
      status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = pg_catalog.now(),
      rejection_reason = rejection_reason_text,
      updated_at = pg_catalog.now()
    WHERE id = registration_id AND status = 'pending';
  ELSIF table_name = 'supplier_registrations' THEN
    UPDATE public.supplier_registrations
    SET 
      status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = pg_catalog.now(),
      rejection_reason = rejection_reason_text,
      updated_at = pg_catalog.now()
    WHERE id = registration_id AND status = 'pending';
  ELSIF table_name = 'delivery_provider_registrations' THEN
    UPDATE public.delivery_provider_registrations
    SET 
      status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = pg_catalog.now(),
      rejection_reason = rejection_reason_text,
      updated_at = pg_catalog.now()
    WHERE id = registration_id AND status = 'pending';
  END IF;

  result := pg_catalog.json_build_object(
    'success', true,
    'message', 'Registration rejected',
    'registration_id', registration_id
  );
  
  RETURN result;
END;
$$;

-- ===================================================================
-- HELPER FUNCTION: Check registration status by email
-- ===================================================================
CREATE OR REPLACE FUNCTION public.check_registration_status(
  user_email TEXT,
  registration_type TEXT -- 'builder', 'supplier', 'delivery'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  reg_status TEXT;
  reg_id UUID;
  result JSON;
BEGIN
  IF registration_type = 'builder' THEN
    SELECT id, status INTO reg_id, reg_status 
    FROM public.builder_registrations 
    WHERE email = user_email;
  ELSIF registration_type = 'supplier' THEN
    SELECT id, status INTO reg_id, reg_status 
    FROM public.supplier_registrations 
    WHERE email = user_email;
  ELSIF registration_type = 'delivery' THEN
    SELECT id, status INTO reg_id, reg_status 
    FROM public.delivery_provider_registrations 
    WHERE email = user_email;
  ELSE
    RAISE EXCEPTION 'Invalid registration type';
  END IF;

  IF reg_id IS NULL THEN
    result := pg_catalog.json_build_object(
      'exists', false,
      'status', null,
      'message', 'No registration found for this email'
    );
  ELSE
    result := pg_catalog.json_build_object(
      'exists', true,
      'registration_id', reg_id,
      'status', reg_status,
      'message', CASE 
        WHEN reg_status = 'pending' THEN 'Your registration is under review'
        WHEN reg_status = 'approved' THEN 'Your registration has been approved'
        WHEN reg_status = 'rejected' THEN 'Your registration was rejected'
        WHEN reg_status = 'suspended' THEN 'Your registration is suspended'
        ELSE 'Unknown status'
      END
    );
  END IF;

  RETURN result;
END;
$$;

-- ===================================================================
-- UPDATED_AT TRIGGERS
-- ===================================================================
CREATE OR REPLACE FUNCTION public.update_registration_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at = pg_catalog.now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER builder_reg_updated_at
  BEFORE UPDATE ON public.builder_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_registration_updated_at();

CREATE TRIGGER supplier_reg_updated_at
  BEFORE UPDATE ON public.supplier_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_registration_updated_at();

CREATE TRIGGER delivery_reg_updated_at
  BEFORE UPDATE ON public.delivery_provider_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_registration_updated_at();

-- ===================================================================
-- GRANT PERMISSIONS
-- ===================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT INSERT ON public.builder_registrations TO anon, authenticated;
GRANT INSERT ON public.supplier_registrations TO anon, authenticated;
GRANT INSERT ON public.delivery_provider_registrations TO anon, authenticated;
GRANT SELECT ON public.builder_registrations TO anon, authenticated;
GRANT SELECT ON public.supplier_registrations TO anon, authenticated;
GRANT SELECT ON public.delivery_provider_registrations TO anon, authenticated;

-- ===================================================================
-- FUNCTION PERMISSIONS (Security Hardening)
-- ===================================================================
-- Revoke public execute from SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.approve_builder_registration(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.approve_supplier_registration(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.approve_delivery_registration(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reject_registration(TEXT, UUID, TEXT) FROM PUBLIC;

-- Grant execute only to authenticated users (admin check is inside the functions)
GRANT EXECUTE ON FUNCTION public.approve_builder_registration(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_supplier_registration(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_delivery_registration(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_registration(TEXT, UUID, TEXT) TO authenticated;

-- check_registration_status can be called by anyone (SECURITY INVOKER, uses RLS)
GRANT EXECUTE ON FUNCTION public.check_registration_status(TEXT, TEXT) TO anon, authenticated;

-- ===================================================================
-- COMMENTS FOR DOCUMENTATION
-- ===================================================================
COMMENT ON TABLE public.builder_registrations IS 'Stores builder registration applications before auth account creation';
COMMENT ON TABLE public.supplier_registrations IS 'Stores supplier registration applications before auth account creation';
COMMENT ON TABLE public.delivery_provider_registrations IS 'Stores delivery provider registration applications before auth account creation';

COMMENT ON FUNCTION public.approve_builder_registration(UUID, TEXT) IS 'Admin function to approve a pending builder registration';
COMMENT ON FUNCTION public.approve_supplier_registration(UUID, TEXT) IS 'Admin function to approve a pending supplier registration';
COMMENT ON FUNCTION public.approve_delivery_registration(UUID, TEXT) IS 'Admin function to approve a pending delivery provider registration';
COMMENT ON FUNCTION public.reject_registration(TEXT, UUID, TEXT) IS 'Admin function to reject any pending registration';
COMMENT ON FUNCTION public.check_registration_status(TEXT, TEXT) IS 'Check the status of a registration by email';


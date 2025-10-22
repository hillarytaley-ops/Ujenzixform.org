-- =====================================================================
-- CORE DATA PRIVACY AND SECURITY FIXES
-- =====================================================================

-- 1. PROFILE CONSENT MANAGEMENT SYSTEM
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.profile_contact_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('phone', 'email', 'full_contact')),
  consent_status TEXT NOT NULL DEFAULT 'pending' CHECK (consent_status IN ('pending', 'approved', 'denied', 'expired')),
  request_reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  granted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_id, requester_id, consent_type)
);

ALTER TABLE public.profile_contact_consent ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profile_consent_owner_access" ON public.profile_contact_consent;
DROP POLICY IF EXISTS "profile_consent_requester_view" ON public.profile_contact_consent;
DROP POLICY IF EXISTS "profile_consent_create" ON public.profile_contact_consent;
DROP POLICY IF EXISTS "profile_consent_admin" ON public.profile_contact_consent;

CREATE POLICY "profile_consent_owner_access" ON public.profile_contact_consent FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = profile_contact_consent.profile_id AND user_id = auth.uid()));

CREATE POLICY "profile_consent_requester_view" ON public.profile_contact_consent FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = profile_contact_consent.requester_id AND user_id = auth.uid()));

CREATE POLICY "profile_consent_create" ON public.profile_contact_consent FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = profile_contact_consent.requester_id AND user_id = auth.uid()));

CREATE POLICY "profile_consent_admin" ON public.profile_contact_consent FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. SUPPLIER CONTACT APPROVAL WORKFLOW
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.supplier_contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_reason TEXT NOT NULL,
  request_status TEXT NOT NULL DEFAULT 'pending' CHECK (request_status IN ('pending', 'approved', 'denied', 'expired')),
  fields_requested TEXT[] NOT NULL DEFAULT ARRAY['email', 'phone'],
  expires_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(supplier_id, requester_id)
);

ALTER TABLE public.supplier_contact_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "supplier_request_owner_access" ON public.supplier_contact_requests;
DROP POLICY IF EXISTS "supplier_request_requester_view" ON public.supplier_contact_requests;
DROP POLICY IF EXISTS "supplier_request_create" ON public.supplier_contact_requests;
DROP POLICY IF EXISTS "supplier_request_admin" ON public.supplier_contact_requests;

CREATE POLICY "supplier_request_owner_access" ON public.supplier_contact_requests FOR ALL
  USING (EXISTS (SELECT 1 FROM suppliers WHERE id = supplier_contact_requests.supplier_id AND user_id = auth.uid()));

CREATE POLICY "supplier_request_requester_view" ON public.supplier_contact_requests FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = supplier_contact_requests.requester_id AND user_id = auth.uid()));

CREATE POLICY "supplier_request_create" ON public.supplier_contact_requests FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = supplier_contact_requests.requester_id AND user_id = auth.uid()));

CREATE POLICY "supplier_request_admin" ON public.supplier_contact_requests FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. ENHANCED DRIVER CONTACT DATA PROTECTION
-- =====================================================================

DROP TABLE IF EXISTS public.driver_contact_data CASCADE;

CREATE TABLE public.driver_contact_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL UNIQUE REFERENCES public.deliveries(id) ON DELETE CASCADE,
  driver_name TEXT NOT NULL,
  driver_phone TEXT NOT NULL,
  driver_email TEXT,
  access_expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '2 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_contact_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "driver_contact_admin_access" ON public.driver_contact_data FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "driver_contact_builder_limited" ON public.driver_contact_data FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deliveries d JOIN profiles p ON p.id = d.builder_id
      WHERE d.id = driver_contact_data.delivery_id AND p.user_id = auth.uid()
      AND driver_contact_data.access_expires_at > now()
      AND d.status IN ('in_progress', 'out_for_delivery', 'delivered')
    )
  );

-- Migrate existing driver data if columns exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'deliveries' AND column_name = 'driver_phone'
  ) THEN
    INSERT INTO public.driver_contact_data (delivery_id, driver_name, driver_phone, access_expires_at)
    SELECT id, COALESCE(driver_name, 'Driver'), driver_phone,
      CASE WHEN actual_delivery_time IS NOT NULL THEN actual_delivery_time + INTERVAL '2 hours'
      ELSE now() + INTERVAL '24 hours' END
    FROM public.deliveries WHERE driver_phone IS NOT NULL
    ON CONFLICT (delivery_id) DO NOTHING;
  END IF;
END $$;

-- Remove driver contact from deliveries table
ALTER TABLE public.deliveries DROP COLUMN IF EXISTS driver_phone;
ALTER TABLE public.deliveries DROP COLUMN IF EXISTS driver_name;

-- 4. UPDATE PROFILES RLS - REQUIRE CONSENT FOR CONTACT
-- =====================================================================

DROP POLICY IF EXISTS "profiles_verified_business_read" ON public.profiles;

CREATE POLICY "profiles_limited_view" ON public.profiles FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR user_id = auth.uid()
    OR (role = 'builder' AND user_type = 'company')
  );

-- 5. UPDATE SUPPLIERS RLS - REQUIRE APPROVAL FOR CONTACT
-- =====================================================================

DROP POLICY IF EXISTS "suppliers_verified_business_read" ON public.suppliers;

CREATE POLICY "suppliers_limited_view" ON public.suppliers FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR user_id = auth.uid() OR is_verified = true);

-- 6. SECURE ACCESS FUNCTIONS
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_profile_with_consent(target_profile_id UUID)
RETURNS TABLE(id UUID, company_name TEXT, email TEXT, phone_number TEXT, full_name TEXT, location TEXT, role TEXT, access_level TEXT, consent_status TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_user_profile_id UUID; has_consent BOOLEAN;
BEGIN
  SELECT p.id INTO current_user_profile_id FROM profiles p WHERE p.user_id = auth.uid();
  
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN QUERY SELECT p.id, p.company_name, p.email, p.phone_number, p.full_name, p.location, p.role, 'admin'::TEXT, 'full_access'::TEXT
    FROM profiles p WHERE p.id = target_profile_id; RETURN;
  END IF;
  
  IF current_user_profile_id = target_profile_id THEN
    RETURN QUERY SELECT p.id, p.company_name, p.email, p.phone_number, p.full_name, p.location, p.role, 'owner'::TEXT, 'full_access'::TEXT
    FROM profiles p WHERE p.id = target_profile_id; RETURN;
  END IF;
  
  SELECT EXISTS (
    SELECT 1 FROM profile_contact_consent
    WHERE profile_id = target_profile_id AND requester_id = current_user_profile_id
    AND consent_status = 'approved' AND (expires_at IS NULL OR expires_at > now())
  ) INTO has_consent;
  
  IF has_consent THEN
    RETURN QUERY SELECT p.id, p.company_name, p.email, p.phone_number, p.full_name, p.location, p.role, 'consented'::TEXT, 'approved'::TEXT
    FROM profiles p WHERE p.id = target_profile_id; RETURN;
  END IF;
  
  RETURN QUERY SELECT p.id, p.company_name, 'Contact requires consent'::TEXT, 'Contact requires consent'::TEXT, 
    'Contact requires consent'::TEXT, 'Location requires consent'::TEXT, p.role, 'limited'::TEXT, 'consent_required'::TEXT
  FROM profiles p WHERE p.id = target_profile_id;
END; $$;

CREATE OR REPLACE FUNCTION public.get_supplier_contact_with_approval(target_supplier_id UUID)
RETURNS TABLE(id UUID, company_name TEXT, contact_person TEXT, email TEXT, phone TEXT, address TEXT, access_granted BOOLEAN, access_reason TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_user_profile_id UUID; has_approval BOOLEAN;
BEGIN
  SELECT p.id INTO current_user_profile_id FROM profiles p WHERE p.user_id = auth.uid();
  
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN QUERY SELECT s.id, s.company_name, s.contact_person, s.email, s.phone, s.address, true, 'Admin access'::TEXT
    FROM suppliers s WHERE s.id = target_supplier_id; RETURN;
  END IF;
  
  IF EXISTS (SELECT 1 FROM suppliers WHERE id = target_supplier_id AND user_id = auth.uid()) THEN
    RETURN QUERY SELECT s.id, s.company_name, s.contact_person, s.email, s.phone, s.address, true, 'Owner access'::TEXT
    FROM suppliers s WHERE s.id = target_supplier_id; RETURN;
  END IF;
  
  SELECT EXISTS (
    SELECT 1 FROM supplier_contact_requests
    WHERE supplier_id = target_supplier_id AND requester_id = current_user_profile_id
    AND request_status = 'approved' AND (expires_at IS NULL OR expires_at > now())
  ) INTO has_approval;
  
  IF has_approval THEN
    RETURN QUERY SELECT s.id, s.company_name, s.contact_person, s.email, s.phone, s.address, true, 'Approved request'::TEXT
    FROM suppliers s WHERE s.id = target_supplier_id; RETURN;
  END IF;
  
  RETURN QUERY SELECT target_supplier_id, 'Information available'::TEXT, 'Requires approval'::TEXT, 'Requires approval'::TEXT,
    'Requires approval'::TEXT, 'Requires approval'::TEXT, false, 'Approval required'::TEXT;
END; $$;

-- 7. INDEXES
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_consent_profile ON profile_contact_consent(profile_id);
CREATE INDEX IF NOT EXISTS idx_consent_requester ON profile_contact_consent(requester_id);
CREATE INDEX IF NOT EXISTS idx_consent_status ON profile_contact_consent(consent_status);
CREATE INDEX IF NOT EXISTS idx_supplier_req_supplier ON supplier_contact_requests(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_req_requester ON supplier_contact_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_supplier_req_status ON supplier_contact_requests(request_status);
CREATE INDEX IF NOT EXISTS idx_driver_contact_delivery ON driver_contact_data(delivery_id);
CREATE INDEX IF NOT EXISTS idx_driver_contact_expires ON driver_contact_data(access_expires_at);
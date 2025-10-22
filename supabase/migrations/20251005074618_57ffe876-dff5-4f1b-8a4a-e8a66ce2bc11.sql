-- Comprehensive Data Privacy & Security Enhancement

-- 1. Profile Contact Consent System
CREATE TABLE IF NOT EXISTS public.profile_contact_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('phone', 'email', 'full_contact')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired')),
  request_reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  granted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_id, requester_id, consent_type)
);

ALTER TABLE public.profile_contact_consent ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profile_consent_owner" ON public.profile_contact_consent;
DROP POLICY IF EXISTS "profile_consent_requester" ON public.profile_contact_consent;
DROP POLICY IF EXISTS "profile_consent_insert" ON public.profile_contact_consent;
DROP POLICY IF EXISTS "profile_consent_admin" ON public.profile_contact_consent;

CREATE POLICY "profile_consent_owner" ON public.profile_contact_consent FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = profile_contact_consent.profile_id AND profiles.user_id = auth.uid()));
CREATE POLICY "profile_consent_requester" ON public.profile_contact_consent FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = profile_contact_consent.requester_id AND profiles.user_id = auth.uid()));
CREATE POLICY "profile_consent_insert" ON public.profile_contact_consent FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = profile_contact_consent.requester_id AND profiles.user_id = auth.uid()));
CREATE POLICY "profile_consent_admin" ON public.profile_contact_consent FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Supplier Contact Request System
CREATE TABLE IF NOT EXISTS public.supplier_contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired')),
  fields_requested TEXT[] NOT NULL DEFAULT ARRAY['email', 'phone'],
  expires_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(supplier_id, requester_id)
);

ALTER TABLE public.supplier_contact_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "supplier_request_owner" ON public.supplier_contact_requests;
DROP POLICY IF EXISTS "supplier_request_requester" ON public.supplier_contact_requests;
DROP POLICY IF EXISTS "supplier_request_insert" ON public.supplier_contact_requests;
DROP POLICY IF EXISTS "supplier_request_admin" ON public.supplier_contact_requests;

CREATE POLICY "supplier_request_owner" ON public.supplier_contact_requests FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.suppliers WHERE suppliers.id = supplier_contact_requests.supplier_id AND suppliers.user_id = auth.uid()));
CREATE POLICY "supplier_request_requester" ON public.supplier_contact_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = supplier_contact_requests.requester_id AND profiles.user_id = auth.uid()));
CREATE POLICY "supplier_request_insert" ON public.supplier_contact_requests FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = supplier_contact_requests.requester_id AND profiles.user_id = auth.uid()));
CREATE POLICY "supplier_request_admin" ON public.supplier_contact_requests FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Driver Contact Data (Admin-only)
DROP TABLE IF EXISTS public.driver_contact_data CASCADE;
CREATE TABLE public.driver_contact_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE UNIQUE,
  driver_name TEXT NOT NULL,
  driver_phone TEXT NOT NULL,
  driver_email TEXT,
  access_expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '2 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_contact_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "driver_contact_admin" ON public.driver_contact_data FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Delivery Tracking with Time-Based Restrictions
DROP TABLE IF EXISTS public.delivery_tracking CASCADE;
CREATE TABLE public.delivery_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.delivery_providers(id) ON DELETE CASCADE,
  current_latitude NUMERIC(10, 8) NOT NULL,
  current_longitude NUMERIC(11, 8) NOT NULL,
  tracking_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  delivery_status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tracking_admin" ON public.delivery_tracking FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "tracking_provider_insert" ON public.delivery_tracking FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.delivery_providers WHERE id = delivery_tracking.provider_id AND user_id = auth.uid()));
CREATE POLICY "tracking_provider_view" ON public.delivery_tracking FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.delivery_providers WHERE id = delivery_tracking.provider_id AND user_id = auth.uid()));

-- 5. Privacy Audit Log
CREATE TABLE IF NOT EXISTS public.privacy_consent_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  consent_type TEXT NOT NULL,
  action TEXT NOT NULL,
  target_profile_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.privacy_consent_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "privacy_audit_admin" ON public.privacy_consent_audit FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. Update Profiles RLS
DROP POLICY IF EXISTS "profiles_verified_business_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_limited_view" ON public.profiles;
CREATE POLICY "profiles_own_and_admin_only" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR user_id = auth.uid());

-- 7. Update Suppliers RLS
DROP POLICY IF EXISTS "suppliers_verified_business_read" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_limited_view" ON public.suppliers;
CREATE POLICY "suppliers_own_and_admin_only" ON public.suppliers FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR user_id = auth.uid());

-- 8. Security Functions
CREATE OR REPLACE FUNCTION public.get_profile_with_consent(target_profile_id UUID)
RETURNS TABLE(id UUID, company_name TEXT, email TEXT, phone_number TEXT, full_name TEXT, location TEXT, role TEXT, access_level TEXT, consent_status TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE curr_profile_id UUID; has_consent BOOLEAN;
BEGIN
  SELECT p.id INTO curr_profile_id FROM profiles p WHERE p.user_id = auth.uid();
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN QUERY SELECT p.id, p.company_name, p.email, p.phone_number, p.full_name, p.location, p.role, 'admin'::TEXT, 'admin'::TEXT FROM profiles p WHERE p.id = target_profile_id; RETURN;
  END IF;
  IF curr_profile_id = target_profile_id THEN
    RETURN QUERY SELECT p.id, p.company_name, p.email, p.phone_number, p.full_name, p.location, p.role, 'owner'::TEXT, 'own'::TEXT FROM profiles p WHERE p.id = target_profile_id; RETURN;
  END IF;
  SELECT EXISTS (SELECT 1 FROM profile_contact_consent WHERE profile_id = target_profile_id AND requester_id = curr_profile_id AND status = 'approved' AND (expires_at IS NULL OR expires_at > now())) INTO has_consent;
  IF has_consent THEN
    RETURN QUERY SELECT p.id, p.company_name, p.email, p.phone_number, p.full_name, p.location, p.role, 'consented'::TEXT, 'approved'::TEXT FROM profiles p WHERE p.id = target_profile_id; RETURN;
  END IF;
  RETURN QUERY SELECT p.id, p.company_name, 'Protected'::TEXT, 'Protected'::TEXT, 'Protected'::TEXT, 'Protected'::TEXT, p.role, 'limited'::TEXT, 'consent_required'::TEXT FROM profiles p WHERE p.id = target_profile_id;
END; $$;

CREATE OR REPLACE FUNCTION public.get_supplier_contact_with_approval(target_supplier_id UUID)
RETURNS TABLE(id UUID, company_name TEXT, contact_person TEXT, email TEXT, phone TEXT, address TEXT, access_granted BOOLEAN, access_reason TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE curr_profile_id UUID; has_approval BOOLEAN;
BEGIN
  SELECT p.id INTO curr_profile_id FROM profiles p WHERE p.user_id = auth.uid();
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN QUERY SELECT s.id, s.company_name, s.contact_person, s.email, s.phone, s.address, true, 'Admin'::TEXT FROM suppliers s WHERE s.id = target_supplier_id; RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM suppliers WHERE id = target_supplier_id AND user_id = auth.uid()) THEN
    RETURN QUERY SELECT s.id, s.company_name, s.contact_person, s.email, s.phone, s.address, true, 'Owner'::TEXT FROM suppliers s WHERE s.id = target_supplier_id; RETURN;
  END IF;
  SELECT EXISTS (SELECT 1 FROM supplier_contact_requests WHERE supplier_id = target_supplier_id AND requester_id = curr_profile_id AND status = 'approved' AND (expires_at IS NULL OR expires_at > now())) INTO has_approval;
  IF has_approval THEN
    RETURN QUERY SELECT s.id, s.company_name, s.contact_person, s.email, s.phone, s.address, true, 'Approved'::TEXT FROM suppliers s WHERE s.id = target_supplier_id; RETURN;
  END IF;
  RETURN QUERY SELECT target_supplier_id, 'Protected'::TEXT, 'Protected'::TEXT, 'Protected'::TEXT, 'Protected'::TEXT, 'Protected'::TEXT, false, 'Approval required'::TEXT;
END; $$;

-- 9. Indexes
CREATE INDEX IF NOT EXISTS idx_profile_consent_profile ON public.profile_contact_consent(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_consent_requester ON public.profile_contact_consent(requester_id);
CREATE INDEX IF NOT EXISTS idx_supplier_request_supplier ON public.supplier_contact_requests(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_request_requester ON public.supplier_contact_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_delivery ON public.delivery_tracking(delivery_id);
CREATE INDEX IF NOT EXISTS idx_driver_contact_delivery ON public.driver_contact_data(delivery_id);
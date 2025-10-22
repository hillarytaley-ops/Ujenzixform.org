-- Drop all existing policies on new tables
DROP POLICY IF EXISTS "profile_consent_owner" ON public.profile_contact_consent;
DROP POLICY IF EXISTS "profile_consent_requester" ON public.profile_contact_consent;
DROP POLICY IF EXISTS "profile_consent_insert" ON public.profile_contact_consent;
DROP POLICY IF EXISTS "profile_consent_admin" ON public.profile_contact_consent;
DROP POLICY IF EXISTS "supplier_request_owner" ON public.supplier_contact_requests;
DROP POLICY IF EXISTS "supplier_request_requester" ON public.supplier_contact_requests;
DROP POLICY IF EXISTS "supplier_request_insert" ON public.supplier_contact_requests;
DROP POLICY IF EXISTS "supplier_request_admin" ON public.supplier_contact_requests;
DROP POLICY IF EXISTS "driver_contact_admin" ON public.driver_contact_data;
DROP POLICY IF EXISTS "tracking_admin" ON public.delivery_tracking;
DROP POLICY IF EXISTS "tracking_provider_insert" ON public.delivery_tracking;
DROP POLICY IF EXISTS "tracking_provider_view" ON public.delivery_tracking;
DROP POLICY IF EXISTS "privacy_audit_admin" ON public.privacy_consent_audit;

-- Create policies for profile consent
CREATE POLICY "profile_consent_owner" ON public.profile_contact_consent FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = profile_contact_consent.profile_id AND profiles.user_id = auth.uid()));
CREATE POLICY "profile_consent_requester" ON public.profile_contact_consent FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = profile_contact_consent.requester_id AND profiles.user_id = auth.uid()));
CREATE POLICY "profile_consent_insert" ON public.profile_contact_consent FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = profile_contact_consent.requester_id AND profiles.user_id = auth.uid()));
CREATE POLICY "profile_consent_admin" ON public.profile_contact_consent FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create policies for supplier requests
CREATE POLICY "supplier_request_owner" ON public.supplier_contact_requests FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.suppliers WHERE suppliers.id = supplier_contact_requests.supplier_id AND suppliers.user_id = auth.uid()));
CREATE POLICY "supplier_request_requester" ON public.supplier_contact_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = supplier_contact_requests.requester_id AND profiles.user_id = auth.uid()));
CREATE POLICY "supplier_request_insert" ON public.supplier_contact_requests FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = supplier_contact_requests.requester_id AND profiles.user_id = auth.uid()));
CREATE POLICY "supplier_request_admin" ON public.supplier_contact_requests FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create policies for driver contact data
CREATE POLICY "driver_contact_admin" ON public.driver_contact_data FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Create policies for delivery tracking
CREATE POLICY "tracking_admin" ON public.delivery_tracking FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "tracking_provider_insert" ON public.delivery_tracking FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.delivery_providers WHERE id = delivery_tracking.provider_id AND user_id = auth.uid()));
CREATE POLICY "tracking_provider_view" ON public.delivery_tracking FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.delivery_providers WHERE id = delivery_tracking.provider_id AND user_id = auth.uid()));

-- Create policy for privacy audit
CREATE POLICY "privacy_audit_admin" ON public.privacy_consent_audit FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Update Profiles RLS
DROP POLICY IF EXISTS "profiles_verified_business_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_limited_view" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_and_admin_only" ON public.profiles;
CREATE POLICY "profiles_own_and_admin_only" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR user_id = auth.uid());

-- Update Suppliers RLS
DROP POLICY IF EXISTS "suppliers_verified_business_read" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_limited_view" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_own_and_admin_only" ON public.suppliers;
CREATE POLICY "suppliers_own_and_admin_only" ON public.suppliers FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR user_id = auth.uid());

-- Security Functions
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
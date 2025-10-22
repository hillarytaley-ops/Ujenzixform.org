-- ============================================================================
-- COMPREHENSIVE DATA SECURITY ENHANCEMENT
-- Simplified approach with inline constraints
-- ============================================================================

-- Drop existing conflicting policies first
DROP POLICY IF EXISTS "profiles_owner_and_admin_only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_read_only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_strict_self_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_strict_self_only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_update_only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_insert_only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_delete_only" ON public.profiles;
DROP POLICY IF EXISTS "suppliers_block_direct_select" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_self_update_only" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_strict_consent_only" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_self_update_strict" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_admin_insert" ON public.suppliers;

-- Drop tables if they exist to recreate them fresh
DROP TABLE IF EXISTS public.business_relationship_verifications CASCADE;
DROP TABLE IF EXISTS public.supplier_contact_consents CASCADE;
DROP TABLE IF EXISTS public.payment_transaction_audit_log CASCADE;
DROP TABLE IF EXISTS public.payment_contact_vault CASCADE;

-- ============================================================================
-- CREATE NEW SECURITY TABLES
-- ============================================================================

-- Business relationship verifications with time-limited access
CREATE TABLE public.business_relationship_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('supplier', 'buyer', 'partner', 'contractor')),
  verification_evidence JSONB DEFAULT '{}'::jsonb,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(requester_profile_id, target_profile_id, relationship_type)
);

-- Supplier contact consents with time limits
CREATE TABLE public.supplier_contact_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  requester_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('email', 'phone', 'address', 'full_contact')),
  granted_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  consent_reason TEXT,
  granted_by UUID,
  revoked_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(supplier_id, requester_profile_id, consent_type)
);

-- Payment transaction audit logging
CREATE TABLE public.payment_transaction_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  payment_id UUID,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('view', 'create', 'update', 'delete', 'export')),
  accessed_fields TEXT[],
  field_values_hash TEXT,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  access_granted BOOLEAN DEFAULT false,
  denial_reason TEXT,
  security_risk_level TEXT CHECK (security_risk_level IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Payment contact vault with encryption
CREATE TABLE public.payment_contact_vault (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL,
  phone_number_encrypted TEXT,
  email_encrypted TEXT,
  encryption_key_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  accessed_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.business_relationship_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_contact_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transaction_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_contact_vault ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECURITY FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.has_verified_business_relationship(_profile_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM business_relationship_verifications brv
    JOIN profiles p ON p.id = brv.requester_profile_id
    WHERE p.user_id = auth.uid() AND brv.target_profile_id = _profile_id
      AND brv.is_active = true AND brv.expires_at > now() AND brv.verified_at IS NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.has_supplier_contact_consent(_supplier_id UUID, _consent_type TEXT DEFAULT 'full_contact')
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM supplier_contact_consents scc
    JOIN profiles p ON p.id = scc.requester_profile_id
    WHERE p.user_id = auth.uid() AND scc.supplier_id = _supplier_id
      AND scc.consent_type IN (_consent_type, 'full_contact')
      AND scc.is_active = true AND scc.expires_at > now() AND scc.revoked_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.log_payment_transaction_access(
  _payment_id UUID, _transaction_type TEXT, _accessed_fields TEXT[], 
  _access_granted BOOLEAN, _denial_reason TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO payment_transaction_audit_log (user_id, payment_id, transaction_type, accessed_fields, access_granted, denial_reason, security_risk_level)
  VALUES (auth.uid(), _payment_id, _transaction_type, _accessed_fields, _access_granted, _denial_reason,
    CASE WHEN _access_granted THEN 'low' WHEN _transaction_type = 'export' THEN 'critical' ELSE 'high' END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_payment_vault_secure(_payment_id UUID)
RETURNS TABLE(id UUID, phone_number_encrypted TEXT, email_encrypted TEXT, access_granted BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _has_access BOOLEAN;
BEGIN
  _has_access := has_role(auth.uid(), 'admin'::app_role) OR EXISTS (SELECT 1 FROM payments p WHERE p.id = _payment_id AND p.user_id = auth.uid());
  PERFORM log_payment_transaction_access(_payment_id, 'view', ARRAY['phone_number', 'email'], _has_access,
    CASE WHEN NOT _has_access THEN 'Unauthorized' ELSE NULL END);
  IF _has_access THEN
    UPDATE payment_contact_vault SET accessed_count = accessed_count + 1, last_accessed_at = now() WHERE payment_id = _payment_id;
    RETURN QUERY SELECT pcv.id, pcv.phone_number_encrypted, pcv.email_encrypted, true FROM payment_contact_vault pcv WHERE pcv.payment_id = _payment_id;
  ELSE
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, false;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_security_grants()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE business_relationship_verifications SET is_active = false WHERE expires_at < now() AND is_active = true;
  UPDATE supplier_contact_consents SET is_active = false WHERE expires_at < now() AND is_active = true AND revoked_at IS NULL;
  INSERT INTO security_events (event_type, severity, details) VALUES ('security_cleanup_automated', 'low', jsonb_build_object('action', 'expired_grants_cleanup', 'timestamp', now()));
END;
$$;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Profiles: Self-only with verified business relationship exceptions
CREATE POLICY "profiles_strict_self_only" ON public.profiles FOR SELECT
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_verified_business_relationship(id));

CREATE POLICY "profiles_self_update_only" ON public.profiles FOR UPDATE
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_self_insert_only" ON public.profiles FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_admin_delete_only" ON public.profiles FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Suppliers: Consent-based access only
CREATE POLICY "suppliers_strict_consent_only" ON public.suppliers FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR user_id = auth.uid() OR has_supplier_contact_consent(id, 'full_contact'));

CREATE POLICY "suppliers_self_update_strict" ON public.suppliers FOR UPDATE
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "suppliers_admin_insert" ON public.suppliers FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Business verifications
CREATE POLICY "business_verifications_admin_all" ON public.business_relationship_verifications FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "business_verifications_self_view" ON public.business_relationship_verifications FOR SELECT
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND (id = requester_profile_id OR id = target_profile_id)));

-- Supplier consents
CREATE POLICY "supplier_consents_admin_all" ON public.supplier_contact_consents FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "supplier_consents_owner_manage" ON public.supplier_contact_consents FOR ALL
USING (EXISTS (SELECT 1 FROM suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid()));

CREATE POLICY "supplier_consents_requester_view" ON public.supplier_contact_consents FOR SELECT
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = requester_profile_id AND p.user_id = auth.uid()));

-- Payment audit
CREATE POLICY "payment_audit_admin_only" ON public.payment_transaction_audit_log FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "payment_audit_system_insert" ON public.payment_transaction_audit_log FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Payment vault
CREATE POLICY "payment_vault_strict_access" ON public.payment_contact_vault FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR EXISTS (SELECT 1 FROM payments p WHERE p.id = payment_id AND p.user_id = auth.uid()));

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_business_verifications_requester ON business_relationship_verifications(requester_profile_id) WHERE is_active = true;
CREATE INDEX idx_business_verifications_target ON business_relationship_verifications(target_profile_id) WHERE is_active = true;
CREATE INDEX idx_supplier_consents_supplier ON supplier_contact_consents(supplier_id) WHERE is_active = true;
CREATE INDEX idx_supplier_consents_requester ON supplier_contact_consents(requester_profile_id) WHERE is_active = true;
CREATE INDEX idx_payment_audit_user ON payment_transaction_audit_log(user_id, created_at DESC);
CREATE INDEX idx_payment_audit_payment ON payment_transaction_audit_log(payment_id, created_at DESC);
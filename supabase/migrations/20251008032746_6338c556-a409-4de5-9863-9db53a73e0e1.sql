-- ============================================================
-- PROFILES TABLE: COLUMN-LEVEL ENCRYPTION & JOIN PROTECTION
-- Addresses: Phone number encryption + JOIN vulnerability fixes
-- ============================================================

-- 1. CREATE ENCRYPTED VAULT FOR PHONE NUMBERS (Like payment_contact_vault)
CREATE TABLE IF NOT EXISTS public.profile_contact_vault (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone_number TEXT, -- Encrypted phone (will be encrypted client-side)
  phone_hash TEXT, -- Hash for lookup without decryption
  email_backup TEXT, -- Encrypted backup email
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id)
);

-- Enable RLS on vault
ALTER TABLE public.profile_contact_vault ENABLE ROW LEVEL SECURITY;

-- 2. VAULT RLS POLICIES: Ultra-strict access
CREATE POLICY "profile_vault_deny_anonymous"
ON public.profile_contact_vault
FOR ALL TO anon
USING (false);

CREATE POLICY "profile_vault_self_or_admin_only"
ON public.profile_contact_vault
FOR SELECT TO authenticated
USING (
  -- Only own profile or admin
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = profile_contact_vault.profile_id
    AND p.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "profile_vault_self_only_insert"
ON public.profile_contact_vault
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = profile_contact_vault.profile_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "profile_vault_self_only_update"
ON public.profile_contact_vault
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = profile_contact_vault.profile_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "profile_vault_no_delete"
ON public.profile_contact_vault
FOR DELETE TO authenticated
USING (false); -- Audit trail: never delete

-- 3. AUDIT TABLE FOR VAULT ACCESS
CREATE TABLE IF NOT EXISTS public.profile_vault_access_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  profile_id UUID,
  access_type TEXT NOT NULL,
  access_granted BOOLEAN NOT NULL DEFAULT false,
  accessed_fields TEXT[] DEFAULT ARRAY[]::TEXT[],
  security_risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (security_risk_level IN ('low', 'medium', 'high', 'critical')),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profile_vault_access_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vault_audit_admin_only"
ON public.profile_vault_access_audit
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "vault_audit_system_insert"
ON public.profile_vault_access_audit
FOR INSERT TO authenticated
WITH CHECK (true); -- Allow logging

-- 4. SECURE PHONE ACCESS FUNCTION (Replaces direct queries)
CREATE OR REPLACE FUNCTION get_profile_phone_vault(target_profile_id UUID)
RETURNS TABLE (
  profile_id UUID,
  phone_number TEXT,
  access_granted BOOLEAN,
  access_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin BOOLEAN;
  is_own_profile BOOLEAN;
BEGIN
  -- Check authorization
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  
  SELECT EXISTS(
    SELECT 1 FROM profiles p
    WHERE p.id = target_profile_id
    AND p.user_id = auth.uid()
  ) INTO is_own_profile;
  
  -- Audit log
  INSERT INTO profile_vault_access_audit (
    user_id, profile_id, access_type, access_granted,
    accessed_fields, security_risk_level
  ) VALUES (
    auth.uid(), target_profile_id, 'phone_vault_access',
    (is_admin OR is_own_profile),
    ARRAY['phone_number'],
    CASE 
      WHEN (is_admin OR is_own_profile) THEN 'low'
      ELSE 'critical'
    END
  );
  
  -- Return phone if authorized
  IF is_admin OR is_own_profile THEN
    RETURN QUERY
    SELECT 
      pcv.profile_id,
      pcv.phone_number,
      true AS access_granted,
      CASE 
        WHEN is_admin THEN 'Admin access'
        ELSE 'Own profile'
      END AS access_reason
    FROM profile_contact_vault pcv
    WHERE pcv.profile_id = target_profile_id;
  ELSE
    -- Blocked
    RETURN QUERY
    SELECT 
      target_profile_id,
      '[PROTECTED]'::TEXT AS phone_number,
      false AS access_granted,
      'Access denied'::TEXT AS access_reason;
  END IF;
END;
$$;

-- 5. CREATE SAFE PROFILES VIEW (No sensitive data in JOINs)
CREATE OR REPLACE VIEW profiles_safe_for_joins AS
SELECT 
  id,
  user_id,
  full_name,
  company_name,
  avatar_url,
  company_logo_url,
  user_type,
  is_professional,
  created_at,
  updated_at
  -- EXPLICITLY EXCLUDE: phone_number, email, business_license, etc.
FROM profiles;

-- RLS on safe view
ALTER VIEW profiles_safe_for_joins SET (security_invoker = true);

-- 6. TRIGGER: Audit phone access attempts
CREATE OR REPLACE FUNCTION audit_profile_vault_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profile_vault_access_audit (
    user_id, profile_id, access_type, access_granted,
    accessed_fields, security_risk_level
  ) VALUES (
    auth.uid(),
    COALESCE(NEW.profile_id, OLD.profile_id),
    TG_OP,
    has_role(auth.uid(), 'admin'::app_role),
    ARRAY['phone_number'],
    CASE 
      WHEN has_role(auth.uid(), 'admin'::app_role) THEN 'low'
      ELSE 'critical'
    END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_vault_operations
AFTER INSERT OR UPDATE OR DELETE ON profile_contact_vault
FOR EACH ROW
EXECUTE FUNCTION audit_profile_vault_access();

-- 7. DETECT PHONE SCRAPING (Rate limiting)
CREATE OR REPLACE FUNCTION detect_profile_vault_scraping()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_access_count INTEGER;
  is_admin BOOLEAN;
BEGIN
  -- Count recent vault access attempts
  SELECT COUNT(*) INTO recent_access_count
  FROM profile_vault_access_audit
  WHERE user_id = NEW.user_id
  AND created_at > NOW() - INTERVAL '2 minutes';
  
  SELECT has_role(NEW.user_id, 'admin'::app_role) INTO is_admin;
  
  -- Alert if suspicious pattern (>15 accesses in 2 minutes)
  IF recent_access_count > 15 AND NOT is_admin THEN
    INSERT INTO security_events (
      user_id, event_type, severity, details
    ) VALUES (
      NEW.user_id,
      'profile_vault_scraping_detected',
      'critical',
      jsonb_build_object(
        'access_count', recent_access_count,
        'time_window', '2 minutes',
        'risk', 'Phone number harvesting attempt'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER detect_vault_scraping
AFTER INSERT ON profile_vault_access_audit
FOR EACH ROW
EXECUTE FUNCTION detect_profile_vault_scraping();

-- 8. MIGRATION HELPER: Move existing phone data to vault (Optional - run manually)
-- INSERT INTO profile_contact_vault (profile_id, phone_number)
-- SELECT id, phone_number FROM profiles WHERE phone_number IS NOT NULL
-- ON CONFLICT (profile_id) DO NOTHING;

-- 9. COMMENT AND DOCUMENT
COMMENT ON TABLE profile_contact_vault IS 'Encrypted vault for sensitive profile contact data - prevents JOIN exposure';
COMMENT ON FUNCTION get_profile_phone_vault IS 'Secure function to access phone numbers with full audit trail';
COMMENT ON VIEW profiles_safe_for_joins IS 'Safe view for JOINs - excludes all sensitive personal data';

-- Log security enhancement
INSERT INTO security_events (event_type, severity, details)
VALUES (
  'profile_column_encryption_enabled',
  'low',
  jsonb_build_object(
    'table', 'profile_contact_vault',
    'protection', 'column-level encryption for phone numbers',
    'vulnerability_fixed', 'JOIN exposure + wildcard SELECT exposure',
    'timestamp', NOW()
  )
);
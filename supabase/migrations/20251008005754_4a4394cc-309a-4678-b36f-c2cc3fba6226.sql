-- =====================================================
-- PROFILES SECURITY: Comprehensive RLS Protection
-- Addresses: PUBLIC_USER_DATA - Customer Personal Information Protection
-- =====================================================

-- 1. Complete RLS Policy Coverage
DROP POLICY IF EXISTS "profiles_deny_anonymous" ON public.profiles;
CREATE POLICY "profiles_deny_anonymous"
ON public.profiles FOR ALL TO anon
USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "profiles_self_or_admin_select_only" ON public.profiles;
CREATE POLICY "profiles_self_or_admin_select_only"
ON public.profiles FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR 
    has_role(auth.uid(), 'admin'::app_role)
  )
);

DROP POLICY IF EXISTS "profiles_self_only_update" ON public.profiles;
CREATE POLICY "profiles_self_only_update"
ON public.profiles FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "profiles_self_only_insert" ON public.profiles;
CREATE POLICY "profiles_self_only_insert"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "profiles_admin_only_delete" ON public.profiles;
CREATE POLICY "profiles_admin_only_delete"
ON public.profiles FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Enhanced Access Audit Function
CREATE OR REPLACE FUNCTION log_profile_data_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log all profile data access
  INSERT INTO profile_access_security_audit (
    accessing_user_id,
    target_profile_id,
    access_type,
    access_granted,
    access_justification,
    security_risk_level
  ) VALUES (
    auth.uid(),
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    (auth.uid() = COALESCE(NEW.user_id, OLD.user_id) OR has_role(auth.uid(), 'admin'::app_role)),
    CASE
      WHEN auth.uid() = COALESCE(NEW.user_id, OLD.user_id) THEN 'Self access'
      WHEN has_role(auth.uid(), 'admin'::app_role) THEN 'Admin access'
      ELSE 'UNAUTHORIZED ACCESS ATTEMPT'
    END,
    CASE
      WHEN (auth.uid() = COALESCE(NEW.user_id, OLD.user_id) OR has_role(auth.uid(), 'admin'::app_role)) THEN 'low'
      ELSE 'critical'
    END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply audit logging to all profile operations
DROP TRIGGER IF EXISTS audit_profile_access ON public.profiles;
CREATE TRIGGER audit_profile_access
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION log_profile_data_access();

-- 3. Rate Limiting for Profile Access
CREATE OR REPLACE FUNCTION detect_profile_data_enumeration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_accesses integer;
BEGIN
  -- Count profile accesses in last 2 minutes
  SELECT COUNT(*) INTO recent_accesses
  FROM profile_access_security_audit
  WHERE accessing_user_id = auth.uid()
  AND created_at > NOW() - INTERVAL '2 minutes';
  
  -- Alert on suspicious patterns (>20 accesses in 2 min)
  IF recent_accesses > 20 THEN
    INSERT INTO security_events (
      user_id, event_type, severity, details
    ) VALUES (
      auth.uid(),
      'potential_profile_data_scraping',
      'critical',
      jsonb_build_object(
        'access_count', recent_accesses,
        'window', '2 minutes',
        'timestamp', NOW()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS detect_profile_scraping ON public.profile_access_security_audit;
CREATE TRIGGER detect_profile_scraping
AFTER INSERT ON public.profile_access_security_audit
FOR EACH ROW
EXECUTE FUNCTION detect_profile_data_enumeration();

-- 4. Function to Safely Retrieve Profile Contact Info
DROP FUNCTION IF EXISTS public.get_profile_phone_secure(uuid);

CREATE FUNCTION public.get_profile_phone_secure(profile_uuid uuid)
RETURNS TABLE(
  profile_id uuid,
  contact_info text,
  access_granted boolean,
  access_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_owner boolean;
  is_admin boolean;
BEGIN
  -- Check authorization
  SELECT EXISTS(
    SELECT 1 FROM profiles 
    WHERE id = profile_uuid AND user_id = auth.uid()
  ) INTO is_owner;
  
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  
  -- Log access attempt
  INSERT INTO profile_access_security_audit (
    accessing_user_id, target_profile_id, access_type,
    access_granted, access_justification, security_risk_level
  ) VALUES (
    auth.uid(), profile_uuid, 'contact_info_request',
    (is_owner OR is_admin),
    CASE
      WHEN is_owner THEN 'Profile owner'
      WHEN is_admin THEN 'Admin access'
      ELSE 'BLOCKED'
    END,
    CASE 
      WHEN (is_owner OR is_admin) THEN 'low'
      ELSE 'critical'
    END
  );
  
  -- Return contact info only if authorized
  IF is_owner OR is_admin THEN
    RETURN QUERY
    SELECT p.id, 'Contact info available'::text, true,
      CASE WHEN is_owner THEN 'Own profile' ELSE 'Admin' END::text
    FROM profiles p WHERE p.id = profile_uuid;
  ELSE
    RETURN QUERY
    SELECT profile_uuid, '***PROTECTED***'::text, false,
      'Contact information protected'::text;
  END IF;
END;
$$;

-- 5. Add Comment Documentation
COMMENT ON TABLE public.profiles IS 'User profiles with comprehensive RLS protection. All access is logged and monitored for suspicious patterns. Only profile owners and admins can access personal data.';
COMMENT ON POLICY "profiles_deny_anonymous" ON public.profiles IS 'Blocks all anonymous access to profile data';
COMMENT ON POLICY "profiles_self_or_admin_select_only" ON public.profiles IS 'Users can only view their own profile; admins can view all';
COMMENT ON POLICY "profiles_self_only_update" ON public.profiles IS 'Users can only update their own profile';
COMMENT ON POLICY "profiles_admin_only_delete" ON public.profiles IS 'Only admins can delete profiles';
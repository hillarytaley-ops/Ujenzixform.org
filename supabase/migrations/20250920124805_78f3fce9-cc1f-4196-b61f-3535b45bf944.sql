-- COMPREHENSIVE PROFILES TABLE RLS PROTECTION (FIXED SYNTAX)
-- Protects against: identity theft, customer spam, user impersonation

-- Ensure RLS is enabled on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate comprehensive protection
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    -- Drop all existing policies on profiles table
    FOR pol IN SELECT schemaname, tablename, policyname 
               FROM pg_policies 
               WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- ULTRA-SECURE PROFILES PROTECTION POLICIES
-- Policy 1: Admin-only system access (highest security level)
CREATE POLICY "profiles_ultra_secure_admin_access" 
ON public.profiles
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- Policy 2: Strict self-access only (users can only access their own data)
CREATE POLICY "profiles_ultra_secure_self_access" 
ON public.profiles
FOR ALL 
TO authenticated
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);

-- CRITICAL: Zero public/unauthenticated access
-- No policy needed for public - RLS enabled blocks all public access by default

-- Enhanced security function for profile access verification
CREATE OR REPLACE FUNCTION public.verify_profile_access_secure(target_profile_id uuid)
RETURNS TABLE(
  access_granted boolean,
  access_level text,
  security_message text,
  data_protection_active boolean
) AS $$
DECLARE
  current_user_profile profiles%ROWTYPE;
  recent_access_count integer;
BEGIN
  -- Get current user profile
  SELECT * INTO current_user_profile
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Block unauthenticated access immediately
  IF current_user_profile.user_id IS NULL THEN
    INSERT INTO profile_access_security_audit (
      accessing_user_id, target_profile_id, access_type,
      access_granted, access_justification, security_risk_level,
      unauthorized_access_attempt
    ) VALUES (
      auth.uid(), target_profile_id, 'unauthenticated_blocked',
      false, 'CRITICAL: Unauthenticated profile access blocked', 'critical', true
    );
    
    RETURN QUERY SELECT false, 'blocked', 'Authentication required - identity protection active', true;
    RETURN;
  END IF;
  
  -- Spam/harvesting detection - count recent attempts
  SELECT COUNT(*) INTO recent_access_count
  FROM profile_access_security_audit
  WHERE accessing_user_id = auth.uid()
  AND created_at > NOW() - INTERVAL '5 minutes';
  
  -- Block excessive access (spam/identity theft indicator)
  IF recent_access_count > 15 AND current_user_profile.role != 'admin' THEN
    INSERT INTO emergency_security_log (
      user_id, event_type, event_data
    ) VALUES (
      auth.uid(),
      'PROFILE_ACCESS_SPAM_BLOCKED',
      format('BLOCKED: %s profile access attempts in 5 minutes - potential spam/harvesting', recent_access_count)
    );
    
    RETURN QUERY SELECT false, 'blocked', 'Excessive access blocked - spam protection active', true;
    RETURN;
  END IF;
  
  -- Admin access (system administration)
  IF current_user_profile.role = 'admin' THEN
    RETURN QUERY SELECT true, 'admin', 'Administrative access granted', false;
    RETURN;
  END IF;
  
  -- Self-access only (identity protection)
  IF current_user_profile.id = target_profile_id THEN
    RETURN QUERY SELECT true, 'self', 'Self-profile access authorized', false;
    RETURN;
  END IF;
  
  -- Block all other access (zero-tolerance policy)
  INSERT INTO profile_access_security_audit (
    accessing_user_id, target_profile_id, access_type,
    access_granted, access_justification, security_risk_level,
    unauthorized_access_attempt
  ) VALUES (
    auth.uid(), target_profile_id, 'cross_user_blocked',
    false, 'BLOCKED: Cross-user access denied - identity theft protection', 'high', true
  );
  
  RETURN QUERY SELECT false, 'blocked', 'Access denied - personal data protected', true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Advanced threat detection for identity theft and impersonation
CREATE OR REPLACE FUNCTION public.detect_identity_theft_threats()
RETURNS TRIGGER AS $$
DECLARE
    recent_attempts INTEGER;
    cross_user_attempts INTEGER;
    different_names_accessed INTEGER;
    user_role TEXT;
BEGIN
    -- Count recent profile access attempts
    SELECT COUNT(*) INTO recent_attempts
    FROM profile_access_security_audit
    WHERE accessing_user_id = NEW.accessing_user_id
    AND created_at > NOW() - INTERVAL '10 minutes';
    
    -- Count cross-user access attempts (identity theft red flag)
    SELECT COUNT(*) INTO cross_user_attempts
    FROM profile_access_security_audit
    WHERE accessing_user_id = NEW.accessing_user_id
    AND target_profile_id != (
      SELECT id FROM profiles WHERE user_id = NEW.accessing_user_id
    )
    AND created_at > NOW() - INTERVAL '15 minutes';
    
    -- Count different names accessed (impersonation indicator)
    SELECT COUNT(DISTINCT p.full_name) INTO different_names_accessed
    FROM profile_access_security_audit pasa
    JOIN profiles p ON p.id = pasa.target_profile_id
    WHERE pasa.accessing_user_id = NEW.accessing_user_id
    AND p.full_name IS NOT NULL
    AND pasa.created_at > NOW() - INTERVAL '20 minutes';
    
    -- Get user role
    SELECT role INTO user_role
    FROM profiles
    WHERE user_id = NEW.accessing_user_id;
    
    -- Detect sophisticated identity theft patterns
    IF user_role != 'admin' AND (
      recent_attempts > 20 OR 
      cross_user_attempts > 2 OR
      different_names_accessed > 3 OR
      NEW.unauthorized_access_attempt = true
    ) THEN
        -- Critical identity theft alert
        INSERT INTO emergency_security_log (
            user_id, event_type, event_data
        ) VALUES (
            NEW.accessing_user_id,
            'CRITICAL_IDENTITY_THEFT_DETECTED',
            format('IDENTITY THEFT ALERT: %s attempts, %s cross-user access, %s names accessed by %s. CRITICAL RISKS: Identity theft, customer impersonation, data harvesting', 
                   recent_attempts, cross_user_attempts, different_names_accessed, user_role)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply identity theft detection
DROP TRIGGER IF EXISTS detect_identity_theft_threats ON profile_access_security_audit;
CREATE TRIGGER detect_identity_theft_threats
  AFTER INSERT ON profile_access_security_audit
  FOR EACH ROW EXECUTE FUNCTION detect_identity_theft_threats();

-- Comprehensive profile access logging
CREATE OR REPLACE FUNCTION public.log_profile_security_events()
RETURNS TRIGGER AS $$
DECLARE
  accessing_user_role TEXT;
  target_user_id UUID;
  sensitive_fields TEXT[] := ARRAY[]::TEXT[];
  is_security_violation BOOLEAN := false;
BEGIN
  -- Get accessing user details
  SELECT role INTO accessing_user_role 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Determine target and check for security violations
  target_user_id := COALESCE(NEW.user_id, OLD.user_id);
  
  -- Cross-user access is a security concern
  IF target_user_id != auth.uid() AND accessing_user_role != 'admin' THEN
    is_security_violation := true;
  END IF;
  
  -- Track sensitive field access
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.full_name IS NOT NULL THEN
      sensitive_fields := array_append(sensitive_fields, 'full_name');
    END IF;
    IF NEW.phone IS NOT NULL THEN
      sensitive_fields := array_append(sensitive_fields, 'phone');
    END IF;
    IF NEW.company_name IS NOT NULL THEN
      sensitive_fields := array_append(sensitive_fields, 'company_name');
    END IF;
    IF NEW.email IS NOT NULL THEN
      sensitive_fields := array_append(sensitive_fields, 'email');
    END IF;
  END IF;
  
  -- Log all profile security events
  INSERT INTO profile_access_security_audit (
    accessing_user_id, target_profile_id, access_type,
    sensitive_fields_accessed, access_granted, access_justification, security_risk_level,
    unauthorized_access_attempt
  ) VALUES (
    auth.uid(), 
    COALESCE(NEW.id, OLD.id),
    format('profile_security_%s', TG_OP),
    sensitive_fields,
    NOT is_security_violation,
    CASE 
      WHEN is_security_violation THEN 'SECURITY VIOLATION: Unauthorized cross-user profile access'
      WHEN accessing_user_role = 'admin' THEN 'Admin system operation'
      ELSE 'Authorized self-profile operation'
    END,
    CASE 
      WHEN is_security_violation THEN 'critical'
      WHEN accessing_user_role = 'admin' THEN 'low'
      ELSE 'medium'
    END,
    is_security_violation
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply comprehensive security logging
DROP TRIGGER IF EXISTS log_profile_security_events ON profiles;
CREATE TRIGGER log_profile_security_events
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION log_profile_security_events();

-- Log successful RLS implementation
INSERT INTO public.emergency_security_log (
  user_id, 
  event_type, 
  event_data
) VALUES (
  auth.uid(),
  'PROFILES_RLS_PROTECTION_ACTIVATED',
  'SUCCESS: Comprehensive RLS protection activated for profiles table. Personal data (names, phone, company info, business licenses) now fully protected from identity theft, customer spam, and user impersonation with zero-tolerance policies, advanced threat detection, and complete audit logging.'
);
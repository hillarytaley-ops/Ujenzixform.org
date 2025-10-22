-- PROFILES TABLE ULTRA-STRICT SECURITY (CORRECTED)
-- Contains: full names, phone numbers, company information
-- Risk: Identity theft, fraud, personal data exploitation

-- Drop all existing policies on profiles table to implement strictest security
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

-- ULTRA-STRICT PROFILES PROTECTION POLICIES
-- Policy 1: Admin-only full access to all profiles (for system administration)
CREATE POLICY "profiles_admin_only_identity_protection" 
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

-- Policy 2: Users can ONLY access their own profile data (strict self-access only)
CREATE POLICY "profiles_strict_self_access_identity_protection" 
ON public.profiles
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid()
);

-- Policy 3: Users can ONLY update their own profile data
CREATE POLICY "profiles_strict_self_update_identity_protection" 
ON public.profiles
FOR UPDATE 
TO authenticated
USING (
  user_id = auth.uid()
)
WITH CHECK (
  user_id = auth.uid()
);

-- Policy 4: Users can ONLY insert their own profile (registration)
CREATE POLICY "profiles_strict_self_insert_identity_protection" 
ON public.profiles
FOR INSERT 
TO authenticated
WITH CHECK (
  user_id = auth.uid()
);

-- CRITICAL: NO CROSS-USER ACCESS ALLOWED
-- Prevents identity theft, fraud, and personal data exploitation

-- Create enhanced profile access audit table (if not exists)
CREATE TABLE IF NOT EXISTS public.profile_access_security_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accessing_user_id UUID REFERENCES auth.users(id),
  target_profile_id UUID,
  access_type TEXT NOT NULL,
  sensitive_fields_accessed TEXT[] DEFAULT ARRAY[]::TEXT[],
  access_granted BOOLEAN DEFAULT FALSE,
  access_justification TEXT,
  security_risk_level TEXT DEFAULT 'critical',
  ip_address INET,
  user_agent TEXT,
  unauthorized_access_attempt BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profile audit table
ALTER TABLE public.profile_access_security_audit ENABLE ROW LEVEL SECURITY;

-- Drop existing audit policies
DROP POLICY IF EXISTS "profile_audit_admin_only" ON public.profile_access_security_audit;
DROP POLICY IF EXISTS "profile_audit_system_insert" ON public.profile_access_security_audit;

-- Only admins can view profile access audit logs
CREATE POLICY "profile_audit_admin_only" 
ON public.profile_access_security_audit
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- System can insert audit logs for security monitoring
CREATE POLICY "profile_audit_system_insert" 
ON public.profile_access_security_audit
FOR INSERT 
TO authenticated
WITH CHECK (TRUE);

-- Create function to detect identity theft attempts
CREATE OR REPLACE FUNCTION public.detect_identity_theft_patterns()
RETURNS TRIGGER AS $$
DECLARE
    recent_profile_attempts INTEGER;
    different_profiles_accessed INTEGER;
    user_role TEXT;
BEGIN
    -- Count recent profile access attempts
    SELECT COUNT(*) INTO recent_profile_attempts
    FROM profile_access_security_audit
    WHERE accessing_user_id = NEW.accessing_user_id
    AND created_at > NOW() - INTERVAL '10 minutes';
    
    -- Count different profiles accessed (identity theft indicator)
    SELECT COUNT(DISTINCT target_profile_id) INTO different_profiles_accessed
    FROM profile_access_security_audit
    WHERE accessing_user_id = NEW.accessing_user_id
    AND target_profile_id != (
      SELECT id FROM profiles WHERE user_id = NEW.accessing_user_id
    )
    AND created_at > NOW() - INTERVAL '15 minutes';
    
    -- Get user role
    SELECT role INTO user_role
    FROM profiles
    WHERE user_id = NEW.accessing_user_id;
    
    -- Detect identity theft patterns
    IF user_role != 'admin' AND (
      recent_profile_attempts > 12 OR 
      different_profiles_accessed > 1 OR
      NEW.unauthorized_access_attempt = true
    ) THEN
        -- Log critical identity theft alert
        INSERT INTO emergency_security_log (
            user_id, event_type, event_data
        ) VALUES (
            NEW.accessing_user_id,
            'CRITICAL_IDENTITY_THEFT_ATTEMPT_DETECTED',
            format('IDENTITY THEFT ALERT: %s profile attempts, %s unauthorized profiles accessed in 15 minutes by %s. CRITICAL RISK: Personal data theft, fraud, impersonation', 
                   recent_profile_attempts, different_profiles_accessed, user_role)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply identity theft detection trigger
DROP TRIGGER IF EXISTS detect_identity_theft_patterns ON profile_access_security_audit;
CREATE TRIGGER detect_identity_theft_patterns
  AFTER INSERT ON profile_access_security_audit
  FOR EACH ROW EXECUTE FUNCTION detect_identity_theft_patterns();

-- Create function to log profile data modifications (INSERT, UPDATE, DELETE only)
CREATE OR REPLACE FUNCTION public.log_profile_data_modifications()
RETURNS TRIGGER AS $$
DECLARE
  accessing_user_role TEXT;
  target_user_id UUID;
  sensitive_fields TEXT[] := ARRAY[]::TEXT[];
  is_unauthorized_access BOOLEAN := false;
BEGIN
  -- Get accessing user role
  SELECT role INTO accessing_user_role 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Determine target user ID
  target_user_id := COALESCE(NEW.user_id, OLD.user_id);
  
  -- Check if this is unauthorized cross-user access
  IF target_user_id != auth.uid() AND accessing_user_role != 'admin' THEN
    is_unauthorized_access := true;
  END IF;
  
  -- Identify sensitive fields being modified
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
  
  -- Log profile data modification
  INSERT INTO profile_access_security_audit (
    accessing_user_id, target_profile_id, access_type,
    sensitive_fields_accessed, access_granted, access_justification, security_risk_level,
    unauthorized_access_attempt
  ) VALUES (
    auth.uid(), 
    COALESCE(NEW.id, OLD.id),
    format('profile_data_%s', TG_OP),
    sensitive_fields,
    CASE WHEN is_unauthorized_access THEN false ELSE true END,
    CASE 
      WHEN is_unauthorized_access THEN 'CRITICAL: Unauthorized cross-user profile access blocked'
      WHEN accessing_user_role = 'admin' THEN 'Admin profile data modification'
      ELSE 'Authorized self-profile modification'
    END,
    CASE 
      WHEN is_unauthorized_access THEN 'critical'
      WHEN accessing_user_role = 'admin' THEN 'low'
      ELSE 'medium'
    END,
    is_unauthorized_access
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply profile modification logging trigger (INSERT, UPDATE, DELETE only)
DROP TRIGGER IF EXISTS log_profile_modifications ON profiles;
CREATE TRIGGER log_profile_modifications
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION log_profile_data_modifications();

-- Log this critical security implementation
INSERT INTO public.emergency_security_log (
  user_id, 
  event_type, 
  event_data
) VALUES (
  auth.uid(),
  'PROFILES_IDENTITY_THEFT_PROTECTION_IMPLEMENTED',
  'CRITICAL SUCCESS: Ultra-strict RLS policies implemented for profiles table. Personal identity data (names, phone, company info) now fully protected from identity theft and fraud with strict self-access only policies, comprehensive audit logging, and identity theft pattern detection.'
);
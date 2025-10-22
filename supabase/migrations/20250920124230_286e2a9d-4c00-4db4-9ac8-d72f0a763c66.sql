-- ENHANCED PROFILES SECURITY: LEGITIMATE ACCESS WITH STRONG PROTECTION
-- Addresses: spam, identity theft, business impersonation
-- Balances legitimate business access with maximum security

-- Drop existing policies to implement enhanced security model
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

-- ENHANCED SECURITY MODEL WITH LEGITIMATE BUSINESS ACCESS
-- Policy 1: Admin-only full access (system administration)
CREATE POLICY "profiles_admin_comprehensive_access" 
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

-- Policy 2: Strict self-access (users can access their own data)
CREATE POLICY "profiles_verified_self_access" 
ON public.profiles
FOR ALL 
TO authenticated
USING (
  user_id = auth.uid()
)
WITH CHECK (
  user_id = auth.uid()
);

-- Policy 3: VERIFIED business relationship access (anti-spam protection)
CREATE POLICY "profiles_verified_business_access_anti_spam" 
ON public.profiles
FOR SELECT 
TO authenticated
USING (
  -- Allow access ONLY if there's a verified active business relationship
  EXISTS (
    SELECT 1 FROM profiles accessing_user
    WHERE accessing_user.user_id = auth.uid()
    AND (
      -- Builders can access supplier profiles with active deliveries
      (accessing_user.role = 'builder' AND profiles.role = 'supplier' AND
       EXISTS (
         SELECT 1 FROM deliveries d
         WHERE d.supplier_id = profiles.id
         AND d.builder_id = accessing_user.id
         AND d.status IN ('pending', 'in_progress', 'out_for_delivery')
         AND d.created_at > NOW() - INTERVAL '45 days'
       ))
      OR
      -- Suppliers can access builder profiles with active deliveries
      (accessing_user.role = 'supplier' AND profiles.role = 'builder' AND
       EXISTS (
         SELECT 1 FROM deliveries d
         WHERE d.builder_id = profiles.id
         AND d.supplier_id = accessing_user.id
         AND d.status IN ('pending', 'in_progress', 'out_for_delivery')
         AND d.created_at > NOW() - INTERVAL '45 days'
       ))
    )
  )
);

-- Enhanced business relationship verification with anti-fraud protection
CREATE OR REPLACE FUNCTION public.verify_profile_access_anti_fraud(target_profile_id uuid)
RETURNS TABLE(
  can_access boolean,
  access_level text,
  security_message text,
  contact_masked boolean
) AS $$
DECLARE
  current_user_profile profiles%ROWTYPE;
  target_profile profiles%ROWTYPE;
  has_business_relationship boolean := false;
  recent_access_attempts integer;
BEGIN
  -- Get current user profile
  SELECT * INTO current_user_profile
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Get target profile
  SELECT * INTO target_profile
  FROM profiles 
  WHERE id = target_profile_id;
  
  -- Count recent access attempts (spam detection)
  SELECT COUNT(*) INTO recent_access_attempts
  FROM profile_access_security_audit
  WHERE accessing_user_id = auth.uid()
  AND created_at > NOW() - INTERVAL '10 minutes';
  
  -- Block if too many access attempts (spam indicator)
  IF recent_access_attempts > 15 AND current_user_profile.role != 'admin' THEN
    INSERT INTO emergency_security_log (
      user_id, event_type, event_data
    ) VALUES (
      auth.uid(),
      'PROFILE_SPAM_ACCESS_BLOCKED',
      format('Blocked potential spammer: %s profile access attempts in 10 minutes', recent_access_attempts)
    );
    
    RETURN QUERY SELECT false, 'blocked', 'Access blocked - too many requests', true;
    RETURN;
  END IF;
  
  -- Admin access
  IF current_user_profile.role = 'admin' THEN
    RETURN QUERY SELECT true, 'admin', 'Administrative access granted', false;
    RETURN;
  END IF;
  
  -- Self access
  IF current_user_profile.id = target_profile_id THEN
    RETURN QUERY SELECT true, 'self', 'Self-profile access', false;
    RETURN;
  END IF;
  
  -- Verify business relationship (anti-impersonation protection)
  IF current_user_profile.role = 'builder' AND target_profile.role = 'supplier' THEN
    SELECT EXISTS (
      SELECT 1 FROM deliveries d
      WHERE d.supplier_id = target_profile_id
      AND d.builder_id = current_user_profile.id
      AND d.status IN ('pending', 'in_progress', 'out_for_delivery')
      AND d.created_at > NOW() - INTERVAL '45 days'
    ) INTO has_business_relationship;
  ELSIF current_user_profile.role = 'supplier' AND target_profile.role = 'builder' THEN
    SELECT EXISTS (
      SELECT 1 FROM deliveries d
      WHERE d.builder_id = target_profile_id
      AND d.supplier_id = current_user_profile.id
      AND d.status IN ('pending', 'in_progress', 'out_for_delivery')
      AND d.created_at > NOW() - INTERVAL '45 days'
    ) INTO has_business_relationship;
  END IF;
  
  -- Log all access attempts for security monitoring
  INSERT INTO profile_access_security_audit (
    accessing_user_id, target_profile_id, access_type,
    access_granted, business_relationship_verified, access_justification, security_risk_level,
    unauthorized_access_attempt
  ) VALUES (
    auth.uid(), target_profile_id, 'verified_business_access',
    has_business_relationship, has_business_relationship,
    CASE WHEN has_business_relationship 
         THEN 'Verified active business relationship'
         ELSE 'BLOCKED: No verified business relationship - potential spam/impersonation attempt'
    END,
    CASE WHEN has_business_relationship THEN 'low' ELSE 'high' END,
    NOT has_business_relationship
  );
  
  IF has_business_relationship THEN
    RETURN QUERY SELECT true, 'business', 'Verified business relationship access', false;
  ELSE
    RETURN QUERY SELECT false, 'blocked', 'Access denied - no verified business relationship', true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enhanced threat detection for identity theft and business impersonation
CREATE OR REPLACE FUNCTION public.detect_profile_exploitation_threats()
RETURNS TRIGGER AS $$
DECLARE
    recent_profile_attempts INTEGER;
    cross_role_attempts INTEGER;
    different_companies_accessed INTEGER;
    user_role TEXT;
BEGIN
    -- Count recent profile access attempts
    SELECT COUNT(*) INTO recent_profile_attempts
    FROM profile_access_security_audit
    WHERE accessing_user_id = NEW.accessing_user_id
    AND created_at > NOW() - INTERVAL '15 minutes';
    
    -- Count cross-role access attempts (impersonation indicator)
    SELECT COUNT(*) INTO cross_role_attempts
    FROM profile_access_security_audit pasa
    JOIN profiles target_p ON target_p.id = pasa.target_profile_id
    JOIN profiles accessing_p ON accessing_p.user_id = pasa.accessing_user_id
    WHERE pasa.accessing_user_id = NEW.accessing_user_id
    AND target_p.role != accessing_p.role
    AND pasa.created_at > NOW() - INTERVAL '20 minutes';
    
    -- Count different companies accessed (business impersonation indicator)
    SELECT COUNT(DISTINCT target_p.company_name) INTO different_companies_accessed
    FROM profile_access_security_audit pasa
    JOIN profiles target_p ON target_p.id = pasa.target_profile_id
    WHERE pasa.accessing_user_id = NEW.accessing_user_id
    AND target_p.company_name IS NOT NULL
    AND pasa.created_at > NOW() - INTERVAL '30 minutes';
    
    -- Get user role
    SELECT role INTO user_role
    FROM profiles
    WHERE user_id = NEW.accessing_user_id;
    
    -- Detect sophisticated exploitation patterns
    IF user_role != 'admin' AND (
      recent_profile_attempts > 10 OR 
      cross_role_attempts > 5 OR
      different_companies_accessed > 3 OR
      NEW.unauthorized_access_attempt = true
    ) THEN
        -- Log critical exploitation alert
        INSERT INTO emergency_security_log (
            user_id, event_type, event_data
        ) VALUES (
            NEW.accessing_user_id,
            'CRITICAL_PROFILE_EXPLOITATION_DETECTED',
            format('EXPLOITATION ALERT: %s profile attempts, %s cross-role attempts, %s companies accessed by %s. RISKS: Identity theft, business impersonation, spam campaigns', 
                   recent_profile_attempts, cross_role_attempts, different_companies_accessed, user_role)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply enhanced threat detection
DROP TRIGGER IF EXISTS detect_profile_exploitation ON profile_access_security_audit;
CREATE TRIGGER detect_profile_exploitation
  AFTER INSERT ON profile_access_security_audit
  FOR EACH ROW EXECUTE FUNCTION detect_profile_exploitation_threats();

-- Enhanced profile modification logging with business context
CREATE OR REPLACE FUNCTION public.log_profile_modifications_enhanced()
RETURNS TRIGGER AS $$
DECLARE
  accessing_user_role TEXT;
  target_user_id UUID;
  sensitive_fields TEXT[] := ARRAY[]::TEXT[];
  is_unauthorized_access BOOLEAN := false;
  business_context TEXT := 'none';
BEGIN
  -- Get accessing user details
  SELECT role INTO accessing_user_role 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Determine target user ID and business context
  target_user_id := COALESCE(NEW.user_id, OLD.user_id);
  
  -- Check if this is unauthorized cross-user access
  IF target_user_id != auth.uid() AND accessing_user_role != 'admin' THEN
    is_unauthorized_access := true;
    
    -- Determine business context for legitimate access
    IF accessing_user_role = 'builder' THEN
      SELECT CASE WHEN EXISTS (
        SELECT 1 FROM deliveries d
        JOIN profiles target_p ON target_p.id = d.supplier_id
        WHERE target_p.user_id = target_user_id
        AND d.builder_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        AND d.status IN ('pending', 'in_progress', 'out_for_delivery')
        AND d.created_at > NOW() - INTERVAL '45 days'
      ) THEN 'active_supplier_relationship' ELSE 'no_relationship' END INTO business_context;
    ELSIF accessing_user_role = 'supplier' THEN
      SELECT CASE WHEN EXISTS (
        SELECT 1 FROM deliveries d
        JOIN profiles target_p ON target_p.id = d.builder_id
        WHERE target_p.user_id = target_user_id
        AND d.supplier_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        AND d.status IN ('pending', 'in_progress', 'out_for_delivery')
        AND d.created_at > NOW() - INTERVAL '45 days'
      ) THEN 'active_builder_relationship' ELSE 'no_relationship' END INTO business_context;
    END IF;
  END IF;
  
  -- Identify sensitive fields for identity theft protection
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
  
  -- Log with enhanced business context
  INSERT INTO profile_access_security_audit (
    accessing_user_id, target_profile_id, access_type,
    sensitive_fields_accessed, access_granted, access_justification, security_risk_level,
    unauthorized_access_attempt
  ) VALUES (
    auth.uid(), 
    COALESCE(NEW.id, OLD.id),
    format('profile_modification_%s', TG_OP),
    sensitive_fields,
    CASE WHEN is_unauthorized_access AND business_context = 'no_relationship' THEN false ELSE true END,
    format('Profile %s by %s (%s) - Business context: %s', 
           TG_OP, accessing_user_role, 
           CASE WHEN is_unauthorized_access THEN 'cross-user' ELSE 'authorized' END,
           business_context),
    CASE 
      WHEN is_unauthorized_access AND business_context = 'no_relationship' THEN 'critical'
      WHEN accessing_user_role = 'admin' THEN 'low'
      ELSE 'medium'
    END,
    is_unauthorized_access AND business_context = 'no_relationship'
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply enhanced modification logging
DROP TRIGGER IF EXISTS log_profile_modifications_enhanced ON profiles;
CREATE TRIGGER log_profile_modifications_enhanced
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION log_profile_modifications_enhanced();

-- Log this enhanced security implementation
INSERT INTO public.emergency_security_log (
  user_id, 
  event_type, 
  event_data
) VALUES (
  auth.uid(),
  'PROFILES_ENHANCED_SECURITY_IMPLEMENTED',
  'SUCCESS: Enhanced profiles security with legitimate business access. Protection against spam, identity theft, and business impersonation implemented with verified relationship requirements, comprehensive threat detection, and intelligent access control.'
);
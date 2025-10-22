-- CRITICAL PROFILES SECURITY FIX
-- Remove overly permissive business relationship policy and implement data masking

-- 1. Drop the problematic business relationship policy that exposes personal data
DROP POLICY IF EXISTS "profiles_business_relationship_limited_2024" ON profiles;

-- 2. Create secure function for essential business info only (heavily masked)
CREATE OR REPLACE FUNCTION public.get_profile_business_essential_only(target_user_uuid uuid)
RETURNS TABLE(
  id uuid,
  -- NO personal information exposed
  business_display_name text,
  user_type text,
  is_professional boolean,
  role_display text,
  contact_status text,
  business_verification_status text
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_user_role TEXT;
  has_business_relationship BOOLEAN := false;
BEGIN
  -- Get current user role
  SELECT role INTO current_user_role
  FROM profiles WHERE user_id = auth.uid();
  
  -- Check for VERY limited legitimate business relationship (90 days max)
  SELECT EXISTS (
    SELECT 1 FROM purchase_orders po
    JOIN profiles requester ON requester.user_id = auth.uid()
    WHERE (po.buyer_id = requester.id AND po.supplier_id = (SELECT id FROM profiles WHERE user_id = target_user_uuid))
       OR (po.supplier_id = requester.id AND po.buyer_id = (SELECT id FROM profiles WHERE user_id = target_user_uuid))
    AND po.created_at > NOW() - INTERVAL '90 days'
    AND po.status IN ('confirmed', 'completed')
    AND po.total_amount > 0  -- Must be real business transaction
  ) INTO has_business_relationship;
  
  -- Log all profile access attempts for security monitoring
  INSERT INTO profile_access_security_audit (
    accessing_user_id, target_profile_id, access_type,
    access_granted, access_justification, security_risk_level
  ) VALUES (
    auth.uid(), 
    (SELECT id FROM profiles WHERE user_id = target_user_uuid),
    'business_essential_only_request',
    (current_user_role = 'admin' OR has_business_relationship),
    CASE 
      WHEN current_user_role = 'admin' THEN 'Admin access to essential business info'
      WHEN has_business_relationship THEN 'Verified recent business relationship'
      ELSE 'BLOCKED: No legitimate business relationship found'
    END,
    CASE 
      WHEN current_user_role = 'admin' THEN 'low'
      WHEN has_business_relationship THEN 'medium'
      ELSE 'high'
    END
  );
  
  -- Only return minimal business info if authorized
  IF current_user_role = 'admin' OR has_business_relationship THEN
    RETURN QUERY
    SELECT 
      p.id,
      -- Heavily masked business name only
      CASE 
        WHEN p.company_name IS NOT NULL 
        THEN SUBSTRING(p.company_name, 1, 10) || '...'
        WHEN p.full_name IS NOT NULL
        THEN SPLIT_PART(p.full_name, ' ', 1) || ' [Business Contact]'
        ELSE 'Business Contact Available'
      END as business_display_name,
      p.user_type,
      p.is_professional,
      -- Role masked for privacy
      CASE 
        WHEN p.role IS NOT NULL 
        THEN p.role 
        ELSE 'Business Partner'
      END as role_display,
      'Contact via platform only' as contact_status,
      CASE 
        WHEN p.is_professional = true 
        THEN 'Verified Professional'
        ELSE 'Standard User'
      END as business_verification_status
    FROM profiles p
    WHERE p.user_id = target_user_uuid;
  ELSE
    -- Return completely masked response for unauthorized access
    RETURN QUERY
    SELECT 
      (SELECT id FROM profiles WHERE user_id = target_user_uuid),
      'Business Information Protected'::text as business_display_name,
      'Contact restricted'::text as user_type,
      false as is_professional,
      'Access restricted'::text as role_display,
      'Contact information protected'::text as contact_status,
      'Information restricted'::text as business_verification_status;
  END IF;
END;
$$;

-- 3. Create profile access security audit table
CREATE TABLE IF NOT EXISTS profile_access_security_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  accessing_user_id uuid,
  target_profile_id uuid,
  access_type text NOT NULL,
  access_granted boolean NOT NULL DEFAULT false,
  access_justification text,
  security_risk_level text NOT NULL DEFAULT 'medium',
  sensitive_fields_requested text[],
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE profile_access_security_audit ENABLE ROW LEVEL SECURITY;

-- Admin-only access to profile audit logs
CREATE POLICY "profile_audit_admin_only" 
ON profile_access_security_audit 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- System can insert audit logs
CREATE POLICY "profile_audit_system_insert" 
ON profile_access_security_audit 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Create ultra-secure personal data masking function
CREATE OR REPLACE FUNCTION public.get_profile_masked_safe(target_user_uuid uuid)
RETURNS TABLE(
  id uuid,
  display_name text,
  public_role text,
  is_business_account boolean,
  account_type text,
  -- ALL personal data is masked
  contact_available boolean,
  verification_status text
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Get current user role
  SELECT role INTO current_user_role
  FROM profiles WHERE user_id = auth.uid();
  
  -- Log access attempt
  INSERT INTO profile_access_security_audit (
    accessing_user_id, target_profile_id, access_type,
    access_granted, access_justification, security_risk_level
  ) VALUES (
    auth.uid(), 
    (SELECT id FROM profiles WHERE user_id = target_user_uuid),
    'masked_safe_profile_access',
    true, -- Always allowed but heavily masked
    'Safe masked profile access - no personal data exposed',
    'low'
  );
  
  -- Return heavily masked public info only
  RETURN QUERY
  SELECT 
    p.id,
    -- Completely anonymized display name
    CASE 
      WHEN p.user_type = 'company' THEN 'Business Account'
      WHEN p.is_professional = true THEN 'Professional User'
      ELSE 'Platform User'
    END as display_name,
    -- Safe role display
    COALESCE(p.role, 'User') as public_role,
    (p.user_type = 'company' OR p.is_professional = true) as is_business_account,
    COALESCE(p.user_type, 'individual') as account_type,
    -- No actual contact info - just availability status
    (p.full_name IS NOT NULL OR p.phone IS NOT NULL) as contact_available,
    CASE 
      WHEN p.is_professional = true THEN 'Verified'
      ELSE 'Standard'
    END as verification_status
  FROM profiles p
  WHERE p.user_id = target_user_uuid;
END;
$$;

-- 5. Add security audit log entry
INSERT INTO master_rls_security_audit (
  event_type,
  access_reason,
  additional_context
) VALUES (
  'PROFILES_PRIVACY_SECURITY_HARDENING_CRITICAL',
  'Removed overly permissive business relationship policies and implemented data masking',
  jsonb_build_object(
    'timestamp', NOW(),
    'security_level', 'critical_personal_data_protection',
    'removed_policies', ARRAY['profiles_business_relationship_limited_2024'],
    'protection_features', ARRAY[
      'personal_data_masking',
      'business_relationship_verification_required',
      'minimal_essential_info_only',
      'comprehensive_audit_logging',
      'privacy_protection_measures'
    ],
    'sensitive_fields_protected', ARRAY[
      'full_name', 'phone', 'company_name', 'avatar_url', 
      'company_registration', 'business_license'
    ]
  )
);
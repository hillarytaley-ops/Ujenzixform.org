-- Ultra-strict suppliers table security with complete contact protection
-- Drop any existing policies that might be less restrictive
DROP POLICY IF EXISTS "suppliers_ultra_secure_admin_only" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_directory_admin_full_access" ON public.suppliers_directory_safe;
DROP POLICY IF EXISTS "suppliers_directory_admin_only_access_2024" ON public.suppliers_directory_safe;

-- Create the most restrictive suppliers table policy - ADMIN ONLY
CREATE POLICY "suppliers_absolute_admin_only_2024" 
ON public.suppliers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Update the get_suppliers_admin_only function to be even more secure
CREATE OR REPLACE FUNCTION public.get_suppliers_admin_only()
RETURNS TABLE(
  id uuid, 
  company_name text, 
  specialties text[], 
  materials_offered text[], 
  rating numeric, 
  is_verified boolean, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone, 
  contact_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Get current user role with double verification
  SELECT role INTO current_user_role
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- ABSOLUTE RESTRICTION: Only admins can access suppliers directory
  IF current_user_role != 'admin' THEN
    -- Log unauthorized access attempt
    INSERT INTO supplier_contact_security_audit (
      user_id, supplier_id, contact_field_requested, access_granted,
      access_justification, security_risk_level
    ) VALUES (
      auth.uid(), null, 'suppliers_directory_access', false,
      'CRITICAL: Non-admin attempted suppliers directory access',
      'critical'
    );
    
    -- Return empty result for non-admin users
    RETURN;
  END IF;
  
  -- Admin users get suppliers data - NO CONTACT DETAILS EVER
  RETURN QUERY
  SELECT 
    s.id,
    s.company_name,
    s.specialties,
    s.materials_offered,
    s.rating,
    s.is_verified,
    s.created_at,
    s.updated_at,
    'admin_directory_access'::text as contact_status
  FROM suppliers s
  ORDER BY s.company_name;
END;
$$;

-- Create ultra-strict business verification function with time limits
CREATE OR REPLACE FUNCTION public.verify_business_relationship_ultra_strict(
  target_supplier_id uuid,
  verification_evidence jsonb DEFAULT '{}'::jsonb,
  requested_access_level text DEFAULT 'basic'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_role TEXT;
  current_user_profile_id uuid;
  existing_verification supplier_business_verification%ROWTYPE;
BEGIN
  -- Get current user info
  SELECT p.role, p.id INTO current_user_role, current_user_profile_id
  FROM profiles p WHERE p.user_id = auth.uid();
  
  -- Log ALL verification attempts for security monitoring
  INSERT INTO supplier_contact_security_audit (
    user_id, supplier_id, contact_field_requested, access_granted,
    access_justification, security_risk_level
  ) VALUES (
    auth.uid(), target_supplier_id, 'business_verification_request',
    (current_user_role = 'admin'),
    CASE 
      WHEN current_user_role = 'admin' THEN 'Admin business verification request'
      ELSE 'CRITICAL: Non-admin business verification attempt blocked'
    END,
    CASE WHEN current_user_role = 'admin' THEN 'low' ELSE 'critical' END
  );
  
  -- ONLY admins can perform business verification
  IF current_user_role != 'admin' THEN
    RETURN jsonb_build_object(
      'access_granted', false,
      'access_level', 'none',
      'reason', 'Business verification restricted to administrators only',
      'requirements', 'Admin privileges required for supplier contact access',
      'security_level', 'ultra_strict'
    );
  END IF;
  
  -- Check for existing valid verification
  SELECT * INTO existing_verification
  FROM supplier_business_verification sbv
  WHERE sbv.user_id = auth.uid()
    AND sbv.supplier_id = target_supplier_id
    AND sbv.expires_at > now()
    AND sbv.is_active = true;
  
  IF FOUND THEN
    -- Update existing verification with new 2-hour window
    UPDATE supplier_business_verification 
    SET expires_at = now() + INTERVAL '2 hours',
        updated_at = now()
    WHERE id = existing_verification.id;
    
    RETURN jsonb_build_object(
      'access_granted', true,
      'access_level', 'admin_verified_extended',
      'expires_at', (now() + INTERVAL '2 hours'),
      'verification_method', 'admin_renewal'
    );
  END IF;
  
  -- Create new time-limited verification (2 hours only)
  INSERT INTO supplier_business_verification (
    user_id, supplier_id, verification_type, verification_evidence,
    granted_by, expires_at, access_level
  ) VALUES (
    auth.uid(), target_supplier_id, 'admin_verified',
    verification_evidence, auth.uid(),
    now() + INTERVAL '2 hours', requested_access_level
  ) ON CONFLICT (user_id, supplier_id, verification_type)
  DO UPDATE SET
    expires_at = now() + INTERVAL '2 hours',
    verification_evidence = EXCLUDED.verification_evidence,
    access_level = EXCLUDED.access_level,
    updated_at = now(),
    is_active = true;
  
  RETURN jsonb_build_object(
    'access_granted', true,
    'access_level', 'admin_verified_time_limited',
    'expires_at', (now() + INTERVAL '2 hours'),
    'verification_method', 'admin_approval_strict',
    'time_limit', '2_hours_maximum'
  );
END;
$$;

-- Create emergency contact access function with maximum security
CREATE OR REPLACE FUNCTION public.get_supplier_contact_maximum_security(
  supplier_uuid uuid
)
RETURNS TABLE(
  id uuid, 
  company_name text, 
  contact_person text, 
  email text, 
  phone text, 
  address text, 
  access_granted boolean, 
  access_reason text,
  security_level text,
  time_limit_remaining interval
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_role TEXT;
  supplier_exists BOOLEAN;
  verification_record supplier_business_verification%ROWTYPE;
BEGIN
  -- Get current user role
  SELECT role INTO current_user_role
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Check if supplier exists
  SELECT EXISTS(SELECT 1 FROM suppliers WHERE suppliers.id = supplier_uuid) INTO supplier_exists;
  
  IF NOT supplier_exists THEN
    RETURN;
  END IF;
  
  -- Log ALL contact access attempts - maximum security logging
  INSERT INTO supplier_contact_security_audit (
    user_id, supplier_id, contact_field_requested, access_granted,
    access_justification, security_risk_level
  ) VALUES (
    auth.uid(), supplier_uuid, 'maximum_security_contact_access', 
    (current_user_role = 'admin'),
    CASE 
      WHEN current_user_role = 'admin' THEN 'Admin maximum security contact access'
      ELSE 'CRITICAL: Non-admin maximum security access attempt blocked'
    END,
    CASE WHEN current_user_role = 'admin' THEN 'medium' ELSE 'critical' END
  );
  
  -- Check business verification for time-limited access
  SELECT * INTO verification_record
  FROM supplier_business_verification sbv
  WHERE sbv.user_id = auth.uid()
    AND sbv.supplier_id = supplier_uuid
    AND sbv.expires_at > now()
    AND sbv.is_active = true;
  
  -- Only admin with valid time-limited verification gets contact info
  IF current_user_role = 'admin' AND FOUND THEN
    RETURN QUERY
    SELECT 
      s.id,
      s.company_name,
      s.contact_person,
      s.email,
      s.phone,
      s.address,
      true as access_granted,
      'Admin verified time-limited access'::text as access_reason,
      'maximum_security_verified'::text as security_level,
      (verification_record.expires_at - now()) as time_limit_remaining
    FROM suppliers s
    WHERE s.id = supplier_uuid;
  ELSE
    -- Return protected response
    RETURN QUERY
    SELECT 
      supplier_uuid,
      'Contact information maximum security protected'::text,
      'Admin verification with time-limited access required'::text,
      'Admin verification with time-limited access required'::text,
      'Admin verification with time-limited access required'::text,
      'Admin verification with time-limited access required'::text,
      false as access_granted,
      CASE 
        WHEN current_user_role != 'admin' THEN 'Maximum security: Admin access required'
        WHEN NOT FOUND THEN 'Business verification required for time-limited access'
        ELSE 'Access verification expired'
      END as access_reason,
      'maximum_security_blocked'::text as security_level,
      '00:00:00'::interval as time_limit_remaining;
  END IF;
END;
$$;

-- Create automatic cleanup for expired verifications
CREATE OR REPLACE FUNCTION public.cleanup_expired_verifications_strict()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Mark expired verifications as inactive instead of deleting for audit trail
  UPDATE supplier_business_verification
  SET is_active = false
  WHERE expires_at < now() AND is_active = true;
  
  -- Log cleanup
  INSERT INTO supplier_contact_security_audit (
    user_id, supplier_id, contact_field_requested, access_granted,
    access_justification, security_risk_level
  ) VALUES (
    null, null, 'verification_cleanup',
    false, 'Automatic cleanup of expired business verifications', 'low'
  );
END;
$$;

-- Create trigger for automatic verification cleanup
DROP TRIGGER IF EXISTS cleanup_expired_verifications_trigger ON supplier_business_verification;
CREATE TRIGGER cleanup_expired_verifications_trigger
AFTER INSERT OR UPDATE ON supplier_business_verification
FOR EACH STATEMENT
EXECUTE FUNCTION cleanup_expired_verifications_strict();
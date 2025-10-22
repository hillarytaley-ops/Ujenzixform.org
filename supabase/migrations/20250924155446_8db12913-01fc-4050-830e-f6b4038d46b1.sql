-- Fix supplier directory security - Final: Correct syntax and implement secure policies

-- Drop all existing supplier-related functions to avoid conflicts
DROP FUNCTION IF EXISTS public.get_secure_suppliers_directory();
DROP FUNCTION IF EXISTS public.get_supplier_secure_with_contact_verification(uuid);
DROP FUNCTION IF EXISTS public.get_suppliers_safe_directory();
DROP FUNCTION IF EXISTS public.get_suppliers_directory_public_safe();

-- Drop existing permissive policies on suppliers table
DROP POLICY IF EXISTS "suppliers_directory_public_no_contact_info" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_business_relationship_limited_access" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_ultra_secure_admin_owner_only" ON public.suppliers;

-- Create ultra-restrictive policy for suppliers table (only admin and owner access)
CREATE POLICY "suppliers_ultra_secure_admin_owner_only" ON public.suppliers
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) OR user_id = auth.uid()
);

-- Create business relationship verification table
CREATE TABLE IF NOT EXISTS public.business_relationship_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  relationship_type text NOT NULL,
  verification_evidence jsonb DEFAULT '{}',
  verified_by uuid,
  expires_at timestamp with time zone NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(requester_id, supplier_id, relationship_type)
);

-- Enable RLS on business relationship verifications  
ALTER TABLE public.business_relationship_verifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and create new one
DROP POLICY IF EXISTS "business_verifications_admin_only" ON public.business_relationship_verifications;
CREATE POLICY "business_verifications_admin_only" ON public.business_relationship_verifications
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create secure function to verify business relationships
CREATE OR REPLACE FUNCTION public.verify_business_relationship(
  target_supplier_id uuid,
  relationship_evidence jsonb DEFAULT '{}'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_role text;
  current_user_profile_id uuid;
BEGIN
  -- Get current user info
  SELECT p.role, p.id INTO current_user_role, current_user_profile_id
  FROM profiles p WHERE p.user_id = auth.uid();
  
  -- Admin users get automatic verification
  IF current_user_role = 'admin' THEN
    RETURN jsonb_build_object(
      'access_granted', true,
      'access_level', 'admin_override',
      'expires_at', (now() + INTERVAL '1 hour'),
      'verification_required', false
    );
  END IF;
  
  -- Check for recent purchase orders (automatic verification)
  IF EXISTS (
    SELECT 1 FROM purchase_orders po
    WHERE po.buyer_id = current_user_profile_id
      AND po.supplier_id = target_supplier_id
      AND po.status IN ('confirmed', 'completed')
      AND po.created_at > (now() - INTERVAL '30 days')
  ) THEN
    RETURN jsonb_build_object(
      'access_granted', true,
      'access_level', 'recent_purchase_verification',
      'expires_at', (now() + INTERVAL '7 days'),
      'verification_method', 'automatic_purchase_order'
    );
  END IF;
  
  -- No valid business relationship found
  RETURN jsonb_build_object(
    'access_granted', false,
    'access_level', 'none',
    'reason', 'No verified business relationship found',
    'requirements', 'Recent purchase order or admin approval required for contact access'
  );
END;
$$;

-- Create supplier secure contact function with proper business verification
CREATE OR REPLACE FUNCTION public.get_supplier_secure_with_contact_verification(
  supplier_uuid uuid
) RETURNS TABLE(
  id uuid, company_name text, specialties text[], materials_offered text[], 
  rating numeric, is_verified boolean, created_at timestamp with time zone, 
  updated_at timestamp with time zone, contact_person text, email text, 
  phone text, address text, access_granted boolean, access_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_role text;
  verification_result jsonb;
  access_granted_val boolean := false;
  access_reason_val text;
BEGIN
  -- Get current user role
  SELECT role INTO current_user_role
  FROM profiles WHERE user_id = auth.uid();
  
  -- Verify business relationship
  SELECT verify_business_relationship(supplier_uuid) INTO verification_result;
  
  SELECT (verification_result->>'access_granted')::boolean INTO access_granted_val;
  SELECT verification_result->>'access_level' INTO access_reason_val;
  
  -- Log access attempt for security audit
  INSERT INTO supplier_contact_security_audit (
    user_id, supplier_id, contact_field_requested, 
    business_relationship_verified, access_granted,
    access_justification, security_risk_level
  ) VALUES (
    auth.uid(), supplier_uuid, 'full_contact_verification',
    access_granted_val, access_granted_val,
    CASE WHEN access_granted_val THEN access_reason_val ELSE 'Access denied - no business relationship' END,
    CASE WHEN access_granted_val THEN 'low' ELSE 'high' END
  );
  
  -- Return data based on verification result
  IF access_granted_val THEN
    RETURN QUERY
    SELECT 
      s.id, s.company_name, s.specialties, s.materials_offered,
      s.rating, s.is_verified, s.created_at, s.updated_at,
      s.contact_person, s.email, s.phone, s.address,
      true as access_granted, access_reason_val as access_reason
    FROM suppliers s
    WHERE s.id = supplier_uuid;
  ELSE
    -- Return basic info only, no contact details
    RETURN QUERY
    SELECT 
      s.id, s.company_name, s.specialties, s.materials_offered,
      s.rating, s.is_verified, s.created_at, s.updated_at,
      'Contact verification required'::text as contact_person,
      'Business relationship required'::text as email,
      'Business relationship required'::text as phone,
      'Business relationship required'::text as address,
      false as access_granted, 'No verified business relationship'::text as access_reason
    FROM suppliers s
    WHERE s.id = supplier_uuid AND s.is_verified = true;
  END IF;
END;
$$;

-- Create admin-only supplier directory function
CREATE OR REPLACE FUNCTION public.get_secure_suppliers_directory()
RETURNS TABLE(
  id uuid, company_name text, specialties text[], materials_offered text[], 
  rating numeric, is_verified boolean, created_at timestamp with time zone, 
  updated_at timestamp with time zone, contact_available boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_role text;
BEGIN
  -- Get current user role
  SELECT role INTO current_user_role
  FROM profiles WHERE user_id = auth.uid();
  
  -- Only admins can access full suppliers directory
  IF current_user_role = 'admin' THEN
    -- Log admin directory access
    INSERT INTO suppliers_access_audit (
      user_id, access_type, access_granted,
      access_justification, security_risk_level
    ) VALUES (
      auth.uid(), 'admin_directory_access', true,
      'Admin full directory access granted', 'low'
    );
    
    RETURN QUERY
    SELECT 
      s.id, s.company_name, s.specialties, s.materials_offered,
      s.rating, s.is_verified, s.created_at, s.updated_at,
      (s.contact_person IS NOT NULL OR s.email IS NOT NULL OR s.phone IS NOT NULL) as contact_available
    FROM suppliers s
    ORDER BY s.company_name;
  ELSE
    -- Log unauthorized access attempt
    INSERT INTO suppliers_access_audit (
      user_id, access_type, access_granted,
      access_justification, security_risk_level
    ) VALUES (
      auth.uid(), 'unauthorized_directory_access', false,
      'BLOCKED: Non-admin attempted suppliers directory access', 'critical'
    );
    
    -- Return empty for non-admin users
    RETURN;
  END IF;
END;
$$;
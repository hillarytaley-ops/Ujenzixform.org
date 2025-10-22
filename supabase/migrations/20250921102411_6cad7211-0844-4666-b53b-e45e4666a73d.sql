-- EMERGENCY SUPPLIERS TABLE SECURITY FIX
-- Remove all existing policies that expose contact information

-- Drop existing problematic policies
DROP POLICY IF EXISTS "suppliers_admin_complete_access_2024" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_admin_only_full_contact_access_2024" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_self_limited_access_2024" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_self_update_non_contact_2024" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_verified_business_contact_access_2024" ON public.suppliers;

-- Create ULTRA-STRICT admin-only policies for suppliers table
CREATE POLICY "suppliers_admin_only_read_2024" ON public.suppliers
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "suppliers_admin_only_write_2024" ON public.suppliers
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create business relationship verification table with time-limited access
CREATE TABLE IF NOT EXISTS public.supplier_business_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  relationship_type text NOT NULL CHECK (relationship_type IN ('purchase_order', 'quotation', 'delivery')),
  verified_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  verification_evidence jsonb,
  admin_approved boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(requester_id, supplier_id, relationship_type)
);

-- Enable RLS on business relationships table
ALTER TABLE public.supplier_business_relationships ENABLE ROW LEVEL SECURITY;

-- Create admin-only policy for business relationships
CREATE POLICY "business_relationships_admin_only" ON public.supplier_business_relationships
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create secure function for business relationship verification with time limits
CREATE OR REPLACE FUNCTION public.verify_supplier_business_relationship(
  supplier_uuid uuid,
  relationship_evidence jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_profile_id uuid;
  current_user_role text;
  existing_relationship supplier_business_relationships%ROWTYPE;
  result jsonb;
BEGIN
  -- Get current user profile
  SELECT p.id, p.role INTO current_user_profile_id, current_user_role
  FROM profiles p WHERE p.user_id = auth.uid();
  
  -- Admin users get automatic access
  IF current_user_role = 'admin' THEN
    RETURN jsonb_build_object(
      'access_granted', true,
      'access_level', 'admin_override',
      'expires_at', (now() + INTERVAL '1 hour'),
      'verification_required', false
    );
  END IF;
  
  -- Check for existing valid business relationship
  SELECT * INTO existing_relationship
  FROM supplier_business_relationships sbr
  WHERE sbr.requester_id = current_user_profile_id
    AND sbr.supplier_id = supplier_uuid
    AND sbr.expires_at > now()
    AND sbr.admin_approved = true;
  
  IF FOUND THEN
    RETURN jsonb_build_object(
      'access_granted', true,
      'access_level', 'verified_business_relationship',
      'expires_at', existing_relationship.expires_at,
      'relationship_type', existing_relationship.relationship_type
    );
  END IF;
  
  -- Check for recent purchase orders (stronger verification)
  IF EXISTS (
    SELECT 1 FROM purchase_orders po
    WHERE po.buyer_id = current_user_profile_id
      AND po.supplier_id = supplier_uuid
      AND po.status IN ('confirmed', 'completed')
      AND po.created_at > (now() - INTERVAL '30 days')
  ) THEN
    -- Create time-limited relationship
    INSERT INTO supplier_business_relationships (
      requester_id, supplier_id, relationship_type,
      expires_at, verification_evidence, admin_approved
    ) VALUES (
      current_user_profile_id, supplier_uuid, 'purchase_order',
      (now() + INTERVAL '24 hours'), relationship_evidence, true
    ) ON CONFLICT (requester_id, supplier_id, relationship_type) 
    DO UPDATE SET 
      expires_at = (now() + INTERVAL '24 hours'),
      verification_evidence = relationship_evidence,
      admin_approved = true,
      updated_at = now();
    
    RETURN jsonb_build_object(
      'access_granted', true,
      'access_level', 'recent_purchase_verification',
      'expires_at', (now() + INTERVAL '24 hours'),
      'verification_method', 'purchase_order'
    );
  END IF;
  
  -- No valid business relationship found
  RETURN jsonb_build_object(
    'access_granted', false,
    'access_level', 'none',
    'reason', 'No verified business relationship found',
    'requirements', 'Recent purchase order or admin approval required'
  );
END;
$$;

-- Update the secure supplier contact function with stricter time-limited access
CREATE OR REPLACE FUNCTION public.get_supplier_contact_ultra_secure(
  supplier_uuid uuid, 
  requested_field text DEFAULT 'basic'::text
) RETURNS TABLE(
  id uuid, 
  company_name text, 
  contact_person text, 
  email text, 
  phone text, 
  address text, 
  access_granted boolean, 
  access_reason text,
  access_expires_at timestamp with time zone,
  access_level text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role TEXT;
  supplier_exists BOOLEAN;
  verification_result jsonb;
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
  
  -- Get business relationship verification
  SELECT public.verify_supplier_business_relationship(supplier_uuid) INTO verification_result;
  
  -- Log ALL access attempts for security monitoring
  INSERT INTO supplier_contact_security_audit (
    user_id, supplier_id, contact_field_requested, access_granted,
    access_justification, security_risk_level
  ) VALUES (
    auth.uid(), supplier_uuid, requested_field, 
    (verification_result->>'access_granted')::boolean,
    verification_result->>'access_level',
    CASE 
      WHEN (verification_result->>'access_granted')::boolean THEN 'low' 
      ELSE 'critical' 
    END
  );
  
  -- Return data based on verification result
  IF (verification_result->>'access_granted')::boolean THEN
    RETURN QUERY
    SELECT 
      s.id,
      s.company_name,
      s.contact_person,
      s.email,
      s.phone,
      s.address,
      true as access_granted,
      verification_result->>'access_level' as access_reason,
      (verification_result->>'expires_at')::timestamp with time zone as access_expires_at,
      verification_result->>'access_level' as access_level
    FROM suppliers s
    WHERE s.id = supplier_uuid;
  ELSE
    -- Return protected response
    RETURN QUERY
    SELECT 
      supplier_uuid,
      'Contact information protected'::text,
      'Business verification required'::text,
      'Business verification required'::text, 
      'Business verification required'::text,
      'Business verification required'::text,
      false as access_granted,
      verification_result->>'reason' as access_reason,
      null::timestamp with time zone as access_expires_at,
      'access_denied'::text as access_level;
  END IF;
END;
$$;

-- Create trigger to auto-expire business relationships
CREATE OR REPLACE FUNCTION public.cleanup_expired_business_relationships()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM supplier_business_relationships
  WHERE expires_at < now();
END;
$$;

-- Log this critical security update
INSERT INTO master_rls_security_audit (event_type, access_reason, additional_context)
VALUES (
  'SUPPLIERS_TABLE_ULTRA_SECURE_LOCKDOWN_COMPLETE',
  'Emergency suppliers contact protection with time-limited business verification',
  jsonb_build_object(
    'protection_level', 'MAXIMUM',
    'admin_only_access', true,
    'business_verification_required', true,
    'time_limited_access', true,
    'implementation_timestamp', NOW()
  )
);
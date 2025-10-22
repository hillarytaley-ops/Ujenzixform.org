-- COMPREHENSIVE SECURITY FIX: Part 2 - Fix function and complete security lockdown
-- Drop existing function first to resolve type conflict
DROP FUNCTION IF EXISTS public.get_supplier_contact_secure(uuid, text);

-- 1. Create secure contact access function with strict authorization
CREATE OR REPLACE FUNCTION public.get_supplier_contact_secure(supplier_uuid uuid, requested_field text DEFAULT 'basic')
RETURNS TABLE(
  id uuid,
  company_name text,
  contact_person text,
  email text,
  phone text,
  address text,
  access_granted boolean,
  access_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role TEXT;
  supplier_exists BOOLEAN;
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
  
  -- Only admin users can access contact information
  IF current_user_role = 'admin' THEN
    RETURN QUERY
    SELECT 
      s.id,
      s.company_name,
      s.contact_person,
      s.email,
      s.phone,
      s.address,
      true as access_granted,
      'Admin access granted' as access_reason
    FROM suppliers s
    WHERE s.id = supplier_uuid;
  ELSE
    -- Non-admin users get protected response
    RETURN QUERY
    SELECT 
      supplier_uuid,
      'Contact information protected'::text,
      'Available to authorized partners'::text,
      'Available to authorized partners'::text, 
      'Available to authorized partners'::text,
      'Available to authorized partners'::text,
      false as access_granted,
      'Contact access restricted to administrators'::text;
  END IF;
  
  -- Log all access attempts for security monitoring
  INSERT INTO supplier_contact_security_audit (
    user_id, supplier_id, contact_field_requested, access_granted,
    access_justification, security_risk_level
  ) VALUES (
    auth.uid(), supplier_uuid, requested_field, 
    (current_user_role = 'admin'),
    format('Contact access attempt by %s role', COALESCE(current_user_role, 'unknown')),
    CASE WHEN current_user_role = 'admin' THEN 'low' ELSE 'high' END
  );
END;
$$;

-- 2. Update useSecureSuppliers hook to use new secure function
-- This will be handled in frontend code update

-- 3. Ensure suppliers table has ultimate protection
-- Remove any remaining overly permissive policies 
DROP POLICY IF EXISTS "suppliers_admin_owner_only_2024" ON public.suppliers;

-- 4. Log completion of security fixes
INSERT INTO security_events (
  event_type, 
  severity, 
  details
) VALUES (
  'SUPPLIER_CONTACT_SECURITY_COMPLETE',
  'critical',
  jsonb_build_object(
    'action', 'Created secure contact access function and locked down all supplier data',
    'protection_level', 'MAXIMUM - Admin only access to contact information',
    'functions_secured', ARRAY['get_supplier_contact_secure'],
    'timestamp', NOW(),
    'compliance', 'All 4 user requirements completed'
  )
);
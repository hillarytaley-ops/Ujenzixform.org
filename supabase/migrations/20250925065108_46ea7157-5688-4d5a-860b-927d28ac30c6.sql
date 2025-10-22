-- FINAL SECURITY FIX: Update existing secure function to block contact data
-- Since previous migrations had issues, update the working function

-- Update the existing secure function to be more restrictive
CREATE OR REPLACE FUNCTION public.get_suppliers_public_safe()
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
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  -- Get user role safely
  SELECT role INTO user_role FROM profiles WHERE user_id = auth.uid();
  
  -- Only admins can access supplier directory - NO exceptions
  IF user_role != 'admin' THEN
    -- Log unauthorized access attempt
    INSERT INTO supplier_contact_security_audit (
      user_id, supplier_id, contact_field_requested, access_granted,
      access_justification, security_risk_level
    ) VALUES (
      auth.uid(), null, 'directory_access_denied',
      false, 'Non-admin user blocked from supplier directory', 'high'
    );
    RETURN; -- Empty result
  END IF;
  
  -- Return directory for admins - but NO contact information
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
    'PROTECTED: Contact information requires secure business verification'::text as contact_status
  FROM suppliers s
  WHERE s.is_verified = true
  ORDER BY s.company_name;
END;
$$;

-- Update the secure contact function to be more restrictive
CREATE OR REPLACE FUNCTION public.get_supplier_contact_secure(supplier_uuid uuid, requested_field text DEFAULT 'basic'::text)
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
  user_role text;
  is_admin boolean := false;
BEGIN
  -- Block unauthenticated users immediately
  IF auth.uid() IS NULL THEN
    RETURN QUERY
    SELECT supplier_uuid, 'Authentication required'::text, 'Access denied'::text,
      'Access denied'::text, 'Access denied'::text, 'Access denied'::text,
      false, 'Authentication required for contact access'::text;
    RETURN;
  END IF;
  
  -- Get user role
  SELECT role INTO user_role FROM profiles WHERE user_id = auth.uid();
  is_admin := (user_role = 'admin');
  
  -- Log all contact access attempts
  INSERT INTO supplier_contact_security_audit (
    user_id, supplier_id, contact_field_requested, access_granted,
    access_justification, security_risk_level
  ) VALUES (
    auth.uid(), supplier_uuid, requested_field,
    is_admin, 
    CASE WHEN is_admin THEN 'Admin contact access' ELSE 'Contact access denied - admin only' END,
    CASE WHEN is_admin THEN 'low' ELSE 'critical' END
  );
  
  -- Only admins get actual contact information
  IF is_admin THEN
    RETURN QUERY
    SELECT s.id, s.company_name, 
      COALESCE(s.contact_person, 'Not provided'),
      COALESCE(s.email, 'Not provided'),
      COALESCE(s.phone, 'Not provided'),
      COALESCE(s.address, 'Not provided'),
      true, 'Admin access granted'::text
    FROM suppliers s WHERE s.id = supplier_uuid;
  ELSE
    -- All non-admin users get blocked response
    RETURN QUERY
    SELECT supplier_uuid, 'Contact protected'::text, 
      'Admin access required'::text, 'Admin access required'::text,
      'Admin access required'::text, 'Admin access required'::text,
      false, 'Contact information restricted - admin access required'::text;
  END IF;
END; 
$$;

-- Verification
SELECT 'Supplier contact security enhanced - directory restricted to admins only' as status;
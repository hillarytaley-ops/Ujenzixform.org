-- Fix secure functions to handle read-only contexts while maintaining security

CREATE OR REPLACE FUNCTION public.get_suppliers_safe_directory()
RETURNS TABLE(
  id uuid, company_name text, specialties text[], materials_offered text[], 
  rating numeric, is_verified boolean, created_at timestamp with time zone, 
  updated_at timestamp with time zone
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
  
  -- Only admins can access suppliers directory
  IF current_user_role = 'admin' THEN
    -- Try to log admin directory access (ignore if read-only)
    BEGIN
      INSERT INTO suppliers_access_audit (
        user_id, access_type, access_granted,
        access_justification, security_risk_level
      ) VALUES (
        auth.uid(), 'admin_directory_access', true,
        'Admin full directory access granted', 'low'
      );
    EXCEPTION WHEN OTHERS THEN
      -- Ignore logging errors in read-only contexts
      NULL;
    END;
    
    RETURN QUERY
    SELECT 
      s.id, s.company_name, s.specialties, s.materials_offered,
      s.rating, s.is_verified, s.created_at, s.updated_at
    FROM suppliers s
    WHERE s.is_verified = true
    ORDER BY s.company_name;
  ELSE
    -- Try to log unauthorized access attempt (ignore if read-only)
    BEGIN
      INSERT INTO suppliers_access_audit (
        user_id, access_type, access_granted,
        access_justification, security_risk_level
      ) VALUES (
        auth.uid(), 'unauthorized_directory_access', false,
        'BLOCKED: Non-admin attempted suppliers directory access', 'critical'
      );
    EXCEPTION WHEN OTHERS THEN
      -- Ignore logging errors in read-only contexts
      NULL;
    END;
    
    -- Return empty for non-admin users
    RETURN;
  END IF;
END;
$$;

-- Update the contact verification function as well
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
  current_user_profile_id uuid;
  has_purchase_order boolean := false;
  access_granted_val boolean := false;
  access_reason_val text := 'No business relationship verified';
BEGIN
  -- Get current user info
  SELECT p.role, p.id INTO current_user_role, current_user_profile_id
  FROM profiles p WHERE p.user_id = auth.uid();
  
  -- Admin users get automatic access
  IF current_user_role = 'admin' THEN
    access_granted_val := true;
    access_reason_val := 'Admin access granted';
  ELSE
    -- Check for recent purchase orders (business relationship verification)
    SELECT EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.buyer_id = current_user_profile_id
        AND po.supplier_id = supplier_uuid
        AND po.status IN ('confirmed', 'completed')
        AND po.created_at > (now() - INTERVAL '30 days')
    ) INTO has_purchase_order;
    
    IF has_purchase_order THEN
      access_granted_val := true;
      access_reason_val := 'Verified business relationship - recent purchase order';
    END IF;
  END IF;
  
  -- Try to log access attempt for security audit (ignore if read-only)
  BEGIN
    INSERT INTO supplier_contact_security_audit (
      user_id, supplier_id, contact_field_requested, 
      business_relationship_verified, access_granted,
      access_justification, security_risk_level
    ) VALUES (
      auth.uid(), supplier_uuid, 'contact_info_request',
      access_granted_val, access_granted_val,
      access_reason_val,
      CASE WHEN access_granted_val THEN 'low' ELSE 'high' END
    );
  EXCEPTION WHEN OTHERS THEN
    -- Ignore logging errors in read-only contexts
    NULL;
  END;
  
  -- Return data based on access level
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
      false as access_granted, access_reason_val as access_reason
    FROM suppliers s
    WHERE s.id = supplier_uuid AND s.is_verified = true;
  END IF;
END;
$$;
-- ================================================================
-- CRITICAL SECURITY FIX: Supplier Contact Information Protection
-- Prevents unauthorized access to supplier emails, phones, addresses
-- ================================================================

-- Step 1: Revoke ALL grants that might expose supplier data
REVOKE ALL ON TABLE public.suppliers FROM public;
REVOKE ALL ON TABLE public.suppliers FROM anon;
REVOKE ALL ON TABLE public.suppliers FROM authenticated;

-- Step 2: Drop existing potentially permissive policies
DROP POLICY IF EXISTS "suppliers_authenticated_insert" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_own_and_admin_only" ON public.suppliers;

-- Step 3: Create ultra-strict RLS policies

-- 3a. Explicit DENY for anonymous users (defense in depth)
CREATE POLICY "suppliers_block_anonymous_all"
ON public.suppliers
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 3b. Admin gets full access (for management purposes)
CREATE POLICY "suppliers_admin_full_access_strict"
ON public.suppliers
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);

-- 3c. Suppliers can ONLY manage their OWN records
CREATE POLICY "suppliers_owner_full_access_strict"
ON public.suppliers
FOR ALL
TO authenticated
USING (
  user_id = auth.uid() AND auth.uid() IS NOT NULL
)
WITH CHECK (
  user_id = auth.uid() AND auth.uid() IS NOT NULL
);

-- 3d. Authenticated users can insert ONLY their own supplier records
CREATE POLICY "suppliers_owner_insert_only"
ON public.suppliers
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND auth.uid() IS NOT NULL
);

-- Step 4: Create a SAFE directory view that EXCLUDES all contact information
CREATE OR REPLACE VIEW public.suppliers_directory_public AS
SELECT 
  id,
  company_name,
  specialties,
  materials_offered,
  rating,
  is_verified,
  created_at,
  updated_at,
  'Contact info protected - request access through platform'::text as contact_status,
  false as can_view_contact
FROM public.suppliers
WHERE is_verified = true;

-- Grant SELECT on the safe view to authenticated users only
GRANT SELECT ON public.suppliers_directory_public TO authenticated;
REVOKE ALL ON public.suppliers_directory_public FROM anon;
REVOKE ALL ON public.suppliers_directory_public FROM public;

-- Step 5: Drop and recreate ultra-secure contact access function
DROP FUNCTION IF EXISTS public.get_supplier_contact_ultra_secure(UUID, TEXT);
CREATE FUNCTION public.get_supplier_contact_ultra_secure(
  supplier_uuid UUID,
  access_justification TEXT DEFAULT 'contact_request'
)
RETURNS TABLE(
  id UUID,
  company_name TEXT,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  access_granted BOOLEAN,
  access_reason TEXT,
  business_relationship_verified BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin BOOLEAN;
  is_owner BOOLEAN;
  has_active_purchase BOOLEAN;
  has_approved_relationship BOOLEAN;
BEGIN
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  
  SELECT EXISTS(
    SELECT 1 FROM suppliers 
    WHERE id = supplier_uuid AND user_id = auth.uid()
  ) INTO is_owner;
  
  SELECT EXISTS(
    SELECT 1 FROM purchase_orders po
    JOIN profiles p ON p.id = po.buyer_id
    WHERE po.supplier_id = supplier_uuid
    AND p.user_id = auth.uid()
    AND po.status IN ('confirmed', 'completed')
    AND po.created_at > NOW() - INTERVAL '30 days'
  ) INTO has_active_purchase;
  
  SELECT EXISTS(
    SELECT 1 FROM supplier_business_relationships sbr
    JOIN profiles p ON p.id = sbr.requester_id
    WHERE sbr.supplier_id = supplier_uuid
    AND p.user_id = auth.uid()
    AND sbr.admin_approved = true
    AND sbr.expires_at > NOW()
  ) INTO has_approved_relationship;
  
  INSERT INTO supplier_contact_security_audit (
    user_id, supplier_id, contact_field_requested,
    business_relationship_verified, access_granted,
    access_justification, security_risk_level
  ) VALUES (
    auth.uid(), supplier_uuid, 'full_contact_info',
    (has_active_purchase OR has_approved_relationship),
    (is_admin OR is_owner OR has_active_purchase OR has_approved_relationship),
    CASE
      WHEN is_admin THEN format('Admin access: %s', access_justification)
      WHEN is_owner THEN 'Supplier owner accessing own record'
      WHEN has_approved_relationship THEN 'Approved business relationship'
      WHEN has_active_purchase THEN 'Active purchase order relationship'
      ELSE format('DENIED: %s - No valid business relationship', access_justification)
    END,
    CASE 
      WHEN (is_admin OR is_owner OR has_active_purchase OR has_approved_relationship) THEN 'low'
      ELSE 'critical'
    END
  );
  
  IF is_admin OR is_owner OR has_active_purchase OR has_approved_relationship THEN
    RETURN QUERY
    SELECT 
      s.id, s.company_name, s.contact_person, s.email, s.phone, s.address,
      true as access_granted,
      CASE
        WHEN is_admin THEN 'Admin access granted'
        WHEN is_owner THEN 'Supplier owner - own record'
        WHEN has_approved_relationship THEN 'Approved business relationship'
        ELSE 'Active purchase order relationship'
      END as access_reason,
      (has_active_purchase OR has_approved_relationship) as business_relationship_verified
    FROM suppliers s
    WHERE s.id = supplier_uuid;
  ELSE
    RETURN QUERY
    SELECT 
      supplier_uuid as id,
      'Contact Information Protected'::TEXT as company_name,
      'Protected - Business relationship required'::TEXT as contact_person,
      'Protected - Business relationship required'::TEXT as email,
      'Protected - Business relationship required'::TEXT as phone,
      'Protected - Business relationship required'::TEXT as address,
      false as access_granted,
      'Contact access requires verified business relationship or admin approval'::TEXT as access_reason,
      false as business_relationship_verified;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_supplier_contact_ultra_secure(UUID, TEXT) TO authenticated;

-- Step 6: Drop and recreate safe directory listing function
DROP FUNCTION IF EXISTS public.get_suppliers_directory_safe();
CREATE FUNCTION public.get_suppliers_directory_safe()
RETURNS TABLE(
  id UUID,
  company_name TEXT,
  specialties TEXT[],
  materials_offered TEXT[],
  rating NUMERIC,
  is_verified BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  contact_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO supplier_contact_security_audit (
    user_id, contact_field_requested, access_granted,
    access_justification, security_risk_level
  ) VALUES (
    auth.uid(), 'directory_listing_no_contact', true,
    'Safe directory access - no contact information exposed', 'low'
  );
  
  RETURN QUERY
  SELECT 
    s.id, s.company_name, s.specialties, s.materials_offered,
    s.rating, s.is_verified, s.created_at, s.updated_at,
    'Contact info protected - use secure access request'::TEXT as contact_status
  FROM suppliers s
  WHERE s.is_verified = true
  ORDER BY s.rating DESC, s.company_name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_suppliers_directory_safe() TO authenticated;

-- Step 7: Create business relationship request function
DROP FUNCTION IF EXISTS public.request_supplier_contact_access(UUID, TEXT);
CREATE FUNCTION public.request_supplier_contact_access(
  target_supplier_id UUID,
  reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_profile_id UUID;
  existing_request_id UUID;
BEGIN
  SELECT id INTO requester_profile_id
  FROM profiles WHERE user_id = auth.uid();
  
  IF requester_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'User profile not found');
  END IF;
  
  SELECT id INTO existing_request_id
  FROM supplier_business_relationships
  WHERE requester_id = requester_profile_id
  AND supplier_id = target_supplier_id
  AND (admin_approved = false OR expires_at > NOW());
  
  IF existing_request_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Request already exists - pending admin approval');
  END IF;
  
  INSERT INTO supplier_business_relationships (
    requester_id, supplier_id, request_reason, admin_approved, expires_at
  ) VALUES (
    requester_profile_id, target_supplier_id, reason, false, NOW() + INTERVAL '30 days'
  );
  
  INSERT INTO supplier_contact_security_audit (
    user_id, supplier_id, contact_field_requested,
    access_granted, access_justification, security_risk_level
  ) VALUES (
    auth.uid(), target_supplier_id, 'contact_access_request',
    false, format('Business relationship request: %s', reason), 'low'
  );
  
  RETURN jsonb_build_object('success', true, 'message', 'Contact access request submitted - awaiting admin approval');
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_supplier_contact_access(UUID, TEXT) TO authenticated;

-- Step 8: Add trigger to audit direct table access
DROP TRIGGER IF EXISTS audit_supplier_access_trigger ON public.suppliers;
DROP FUNCTION IF EXISTS public.audit_supplier_direct_access();

CREATE FUNCTION public.audit_supplier_direct_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO supplier_contact_security_audit (
    user_id, supplier_id, contact_field_requested,
    access_granted, access_justification, security_risk_level
  ) VALUES (
    auth.uid(), COALESCE(NEW.id, OLD.id), format('direct_table_%s', TG_OP), true,
    format('Direct table access via %s operation', TG_OP),
    CASE 
      WHEN has_role(auth.uid(), 'admin'::app_role) THEN 'low'
      WHEN auth.uid() = COALESCE(NEW.user_id, OLD.user_id) THEN 'low'
      ELSE 'medium'
    END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_supplier_access_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_supplier_direct_access();
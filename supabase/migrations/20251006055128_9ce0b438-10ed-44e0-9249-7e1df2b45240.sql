-- ===================================================================
-- CRITICAL SECURITY FIX: Block Direct Supplier Contact Scraping
-- ===================================================================
-- Issue: suppliers_directory_verified_only policy allows ANY authenticated 
-- user to SELECT all verified suppliers including sensitive contact info
-- (email, phone, address, contact_person). Competitors can scrape this.
--
-- Solution: Remove direct SELECT access. Force all directory access through
-- secure RPC functions that mask contact information.
-- ===================================================================

-- 1. DROP THE VULNERABLE POLICY
DROP POLICY IF EXISTS "suppliers_directory_verified_only" ON suppliers;

-- 2. Add comment explaining the security model
COMMENT ON TABLE suppliers IS 
'SECURITY MODEL: Direct SELECT access is BLOCKED for all users except admins and self.
All directory browsing MUST go through get_suppliers_directory_safe() RPC which masks contact info.
Contact details (email, phone, address) are ONLY accessible via get_supplier_contact_secure() 
or get_supplier_contact_ultra_secure() with verified business relationships.';

-- 3. Drop and recreate the secure directory function with proper signature
DROP FUNCTION IF EXISTS get_suppliers_directory_safe();

CREATE FUNCTION get_suppliers_directory_safe()
RETURNS TABLE(
  id uuid,
  company_name text,
  specialties text[],
  materials_offered text[],
  rating numeric,
  is_verified boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only authenticated users can browse directory
  IF auth.uid() IS NULL THEN
    -- Log unauthorized access attempt
    INSERT INTO supplier_contact_security_audit (
      user_id, contact_field_requested, access_granted,
      access_justification, security_risk_level
    ) VALUES (
      NULL, 'directory_blocked_anonymous', false,
      'Anonymous user blocked from supplier directory', 'high'
    );
    RETURN;
  END IF;
  
  -- Log legitimate directory access (without contact info)
  INSERT INTO supplier_contact_security_audit (
    user_id, contact_field_requested, access_granted,
    access_justification, security_risk_level
  ) VALUES (
    auth.uid(), 'directory_browse_no_contact', true,
    'Authenticated user browsing supplier directory (contact info masked)', 'low'
  );
  
  -- Return directory WITHOUT contact information
  RETURN QUERY
  SELECT 
    s.id,
    s.company_name,
    s.specialties,
    s.materials_offered,
    s.rating,
    s.is_verified,
    s.created_at,
    s.updated_at
  FROM suppliers s
  WHERE s.is_verified = true
  ORDER BY s.company_name;
END;
$$;

-- 4. Drop and recreate contact access function with business verification
DROP FUNCTION IF EXISTS get_supplier_contact_ultra_secure(uuid, text);

CREATE FUNCTION get_supplier_contact_ultra_secure(
  supplier_uuid uuid,
  access_justification text DEFAULT 'contact_request'
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
  business_relationship_verified boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  is_owner boolean;
  has_business_relationship boolean;
BEGIN
  -- Block unauthenticated access
  IF auth.uid() IS NULL THEN
    INSERT INTO supplier_contact_security_audit (
      user_id, supplier_id, contact_field_requested,
      business_relationship_verified, access_granted,
      access_justification, security_risk_level
    ) VALUES (
      NULL, supplier_uuid, 'contact_blocked_anonymous',
      false, false, 'Anonymous access blocked', 'critical'
    );
    
    RETURN QUERY SELECT 
      supplier_uuid, 'Access Denied'::text, 'Protected'::text, 
      'Protected'::text, 'Protected'::text, 'Protected'::text,
      false, 'Authentication required', false;
    RETURN;
  END IF;

  -- Check authorization levels
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  SELECT user_id = auth.uid() FROM suppliers WHERE id = supplier_uuid INTO is_owner;
  SELECT has_supplier_business_relationship(supplier_uuid) INTO has_business_relationship;
  
  -- Audit the access attempt
  INSERT INTO supplier_contact_security_audit (
    user_id, supplier_id, contact_field_requested,
    business_relationship_verified, access_granted,
    access_justification, security_risk_level
  ) VALUES (
    auth.uid(), supplier_uuid, access_justification,
    has_business_relationship,
    (is_admin OR is_owner OR has_business_relationship),
    CASE
      WHEN is_admin THEN 'Admin access'
      WHEN is_owner THEN 'Supplier owner access'
      WHEN has_business_relationship THEN 'Verified business relationship'
      ELSE 'BLOCKED - No authorization'
    END,
    CASE 
      WHEN (is_admin OR is_owner OR has_business_relationship) THEN 'low'
      ELSE 'critical'
    END
  );
  
  -- Return contact info ONLY if authorized
  IF is_admin OR is_owner OR has_business_relationship THEN
    RETURN QUERY
    SELECT 
      s.id, s.company_name, s.contact_person, s.email, s.phone, s.address,
      true as access_granted,
      CASE
        WHEN is_admin THEN 'Admin access granted'
        WHEN is_owner THEN 'Supplier owner access'
        ELSE 'Verified business relationship'
      END as access_reason,
      has_business_relationship as business_relationship_verified
    FROM suppliers s
    WHERE s.id = supplier_uuid;
  ELSE
    -- Return masked response
    RETURN QUERY
    SELECT 
      supplier_uuid, 
      (SELECT company_name FROM suppliers WHERE id = supplier_uuid),
      '[PROTECTED - Request business relationship]'::text as contact_person,
      '[PROTECTED - Request business relationship]'::text as email,
      '[PROTECTED - Request business relationship]'::text as phone,
      '[PROTECTED - Request business relationship]'::text as address,
      false as access_granted,
      'Contact information requires verified business relationship'::text as access_reason,
      false as business_relationship_verified;
  END IF;
END;
$$;

-- 5. Grant execute permissions
GRANT EXECUTE ON FUNCTION get_suppliers_directory_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION get_supplier_contact_ultra_secure(uuid, text) TO authenticated;

-- 6. Verification query
DO $$
DECLARE
  policy_count int;
  dangerous_policy_exists boolean;
BEGIN
  -- Check that the vulnerable policy is gone
  SELECT EXISTS(
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'suppliers' 
    AND policyname = 'suppliers_directory_verified_only'
  ) INTO dangerous_policy_exists;
  
  IF dangerous_policy_exists THEN
    RAISE EXCEPTION 'SECURITY FAILURE: Vulnerable directory policy still exists!';
  END IF;
  
  -- Count remaining policies (should be 3: admin, self, block_anon)
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'suppliers';
  
  RAISE NOTICE '✓ SECURITY FIX APPLIED: Supplier contact scraping blocked';
  RAISE NOTICE '  - Removed vulnerable directory SELECT policy';
  RAISE NOTICE '  - Remaining policies: % (admin, self-access, block-anon)', policy_count;
  RAISE NOTICE '  - All directory access now goes through secure RPC';
  RAISE NOTICE '  - Contact info requires business relationship verification';
END $$;
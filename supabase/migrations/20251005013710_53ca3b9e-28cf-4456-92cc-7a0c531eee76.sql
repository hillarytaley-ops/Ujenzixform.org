-- ============================================================================
-- SUPPLIERS TABLE SECURITY FIX - Clean Policy Reset
-- ============================================================================

-- Step 1: Drop ALL existing policies comprehensively
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'suppliers' AND schemaname = 'public')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.suppliers CASCADE', r.policyname);
  END LOOP;
END $$;

-- Step 2: Create security definer helper functions
CREATE OR REPLACE FUNCTION public.is_supplier_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_own_supplier_record(supplier_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT supplier_user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.has_verified_supplier_relationship(supplier_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.supplier_business_relationships sbr
    JOIN public.profiles p ON p.id = sbr.requester_id
    WHERE p.user_id = auth.uid()
      AND sbr.supplier_id = supplier_uuid
      AND sbr.admin_approved = true
      AND sbr.expires_at > now()
  );
$$;

-- Step 3: Revoke all table-level grants
REVOKE ALL ON public.suppliers FROM PUBLIC;
REVOKE ALL ON public.suppliers FROM anon;
REVOKE ALL ON public.suppliers FROM authenticated;

-- Step 4: Create new non-conflicting policies
CREATE POLICY "suppliers_admin_access_only"
ON public.suppliers
FOR ALL
TO authenticated
USING (is_supplier_admin())
WITH CHECK (is_supplier_admin());

CREATE POLICY "suppliers_owner_access_only"
ON public.suppliers
FOR ALL
TO authenticated
USING (is_own_supplier_record(user_id))
WITH CHECK (is_own_supplier_record(user_id));

-- Step 5: Update secure functions
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
  SELECT role INTO user_role FROM profiles WHERE user_id = auth.uid();
  
  IF user_role != 'admin' THEN
    INSERT INTO supplier_contact_security_audit (
      user_id, contact_field_requested, access_granted,
      access_justification, security_risk_level
    ) VALUES (
      auth.uid(), 'directory_blocked', false,
      'Non-admin user blocked', 'high'
    );
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    s.id, s.company_name, s.specialties, s.materials_offered,
    s.rating, s.is_verified, s.created_at, s.updated_at,
    'PROTECTED - Business verification required'::text as contact_status
  FROM suppliers s
  WHERE s.is_verified = true
  ORDER BY s.company_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_supplier_contact_secure(supplier_uuid uuid)
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
  has_relationship boolean;
  is_owner boolean;
BEGIN
  SELECT role INTO user_role FROM profiles WHERE user_id = auth.uid();
  SELECT has_verified_supplier_relationship(supplier_uuid) INTO has_relationship;
  SELECT is_own_supplier_record((SELECT user_id FROM suppliers WHERE id = supplier_uuid)) INTO is_owner;
  
  INSERT INTO supplier_contact_security_audit (
    user_id, supplier_id, contact_field_requested,
    business_relationship_verified, access_granted,
    access_justification, security_risk_level
  ) VALUES (
    auth.uid(), supplier_uuid, 'contact_request',
    has_relationship,
    (user_role = 'admin' OR has_relationship OR is_owner),
    CASE
      WHEN user_role = 'admin' THEN 'Admin'
      WHEN is_owner THEN 'Owner'
      WHEN has_relationship THEN 'Verified relationship'
      ELSE 'DENIED'
    END,
    CASE WHEN (user_role = 'admin' OR has_relationship OR is_owner) THEN 'low' ELSE 'critical' END
  );
  
  IF user_role = 'admin' OR has_relationship OR is_owner THEN
    RETURN QUERY
    SELECT
      s.id, s.company_name, s.contact_person, s.email, s.phone, s.address,
      true as access_granted,
      CASE
        WHEN user_role = 'admin' THEN 'Admin'
        WHEN is_owner THEN 'Owner'
        ELSE 'Verified'
      END as access_reason
    FROM suppliers s WHERE s.id = supplier_uuid;
  ELSE
    RETURN QUERY
    SELECT
      supplier_uuid, 'Protected'::text, 'Protected'::text, 'Protected'::text,
      'Protected'::text, 'Protected'::text,
      false as access_granted, 'Verification required'::text as access_reason;
  END IF;
END;
$$;

-- Step 6: Grant function permissions
GRANT EXECUTE ON FUNCTION public.get_suppliers_public_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_supplier_contact_secure(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_supplier_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_own_supplier_record(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_verified_supplier_relationship(uuid) TO authenticated;

-- Step 7: Verification
DO $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE tablename = 'suppliers';
  RAISE NOTICE 'Supplier table secured with % policies. Contact access: VERIFIED RELATIONSHIPS ONLY', policy_count;
END $$;
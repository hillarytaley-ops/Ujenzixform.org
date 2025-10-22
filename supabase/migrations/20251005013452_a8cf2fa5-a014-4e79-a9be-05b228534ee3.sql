-- ============================================================================
-- CRITICAL SECURITY FIX: Suppliers Table RLS Policy Consolidation (FIXED)
-- ============================================================================

-- Step 1: Drop ALL existing conflicting policies
DROP POLICY IF EXISTS "suppliers_admin_only" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_deny_all_default" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_no_anon" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_self_only" ON public.suppliers;

-- Step 2: Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_supplier_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  );
$$;

-- Step 3: Create helper function to check if user owns the supplier record
CREATE OR REPLACE FUNCTION public.is_own_supplier_record(supplier_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT supplier_user_id = auth.uid();
$$;

-- Step 4: Create helper function to check verified business relationship
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

-- Step 5: Revoke all existing grants
REVOKE ALL ON public.suppliers FROM PUBLIC;
REVOKE ALL ON public.suppliers FROM anon;
REVOKE ALL ON public.suppliers FROM authenticated;

-- Step 6: Create consolidated RLS policies

CREATE POLICY "suppliers_admin_full_access"
ON public.suppliers
FOR ALL
TO authenticated
USING (is_supplier_admin())
WITH CHECK (is_supplier_admin());

CREATE POLICY "suppliers_self_management"
ON public.suppliers
FOR ALL
TO authenticated
USING (is_own_supplier_record(user_id))
WITH CHECK (is_own_supplier_record(user_id));

CREATE POLICY "suppliers_no_direct_access"
ON public.suppliers
FOR SELECT
TO authenticated
USING (false);

-- Step 7: Create audit logging
CREATE OR REPLACE FUNCTION public.audit_supplier_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role text;
BEGIN
  SELECT role INTO current_user_role
  FROM public.profiles
  WHERE user_id = auth.uid();
  
  INSERT INTO public.supplier_contact_security_audit (
    user_id,
    supplier_id,
    contact_field_requested,
    access_granted,
    access_justification,
    security_risk_level
  ) VALUES (
    auth.uid(),
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    (is_supplier_admin() OR is_own_supplier_record(COALESCE(NEW.user_id, OLD.user_id))),
    CASE
      WHEN is_supplier_admin() THEN 'Admin access'
      WHEN is_own_supplier_record(COALESCE(NEW.user_id, OLD.user_id)) THEN 'Self-access'
      ELSE 'BLOCKED: Unauthorized'
    END,
    CASE
      WHEN is_supplier_admin() OR is_own_supplier_record(COALESCE(NEW.user_id, OLD.user_id)) THEN 'low'
      ELSE 'critical'
    END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS audit_supplier_access_trigger ON public.suppliers;

CREATE TRIGGER audit_supplier_access_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.audit_supplier_access();

-- Step 8: Update secure functions
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
      auth.uid(), 'directory_access_denied', false,
      'Non-admin blocked from supplier directory', 'high'
    );
    RETURN;
  END IF;
  
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
    'PROTECTED - Requires business verification'::text as contact_status
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
    auth.uid(), supplier_uuid, 'full_contact_access',
    has_relationship,
    (user_role = 'admin' OR has_relationship OR is_owner),
    CASE
      WHEN user_role = 'admin' THEN 'Admin access'
      WHEN is_owner THEN 'Self-access'
      WHEN has_relationship THEN 'Verified business relationship'
      ELSE 'BLOCKED: No verified business relationship'
    END,
    CASE
      WHEN user_role = 'admin' OR has_relationship OR is_owner THEN 'low'
      ELSE 'critical'
    END
  );
  
  IF user_role = 'admin' OR has_relationship OR is_owner THEN
    RETURN QUERY
    SELECT
      s.id,
      s.company_name,
      s.contact_person,
      s.email,
      s.phone,
      s.address,
      true as access_granted,
      CASE
        WHEN user_role = 'admin' THEN 'Admin access'
        WHEN is_owner THEN 'Self-access'
        ELSE 'Verified business relationship'
      END as access_reason
    FROM suppliers s
    WHERE s.id = supplier_uuid;
  ELSE
    RETURN QUERY
    SELECT
      supplier_uuid,
      'Protected'::text,
      'Requires verified business relationship'::text,
      'Requires verified business relationship'::text,
      'Requires verified business relationship'::text,
      'Requires verified business relationship'::text,
      false as access_granted,
      'No verified business relationship'::text as access_reason;
  END IF;
END;
$$;

-- Step 9: Grant permissions
GRANT EXECUTE ON FUNCTION public.get_suppliers_public_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_supplier_contact_secure(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_supplier_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_own_supplier_record(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_verified_supplier_relationship(uuid) TO authenticated;

-- Step 10: Verify implementation
DO $$
DECLARE
  policy_count integer;
  public_grant_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE tablename = 'suppliers';
  SELECT COUNT(*) INTO public_grant_count
  FROM information_schema.table_privileges
  WHERE table_name = 'suppliers' AND grantee IN ('PUBLIC', 'anon');
  
  IF public_grant_count > 0 THEN
    RAISE EXCEPTION 'SECURITY FAILURE: Public grants exist';
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SECURITY FIX COMPLETED';
  RAISE NOTICE 'Policies: % | Public Grants: %', policy_count, public_grant_count;
  RAISE NOTICE 'Contact access: VERIFIED RELATIONSHIPS ONLY';
  RAISE NOTICE '========================================';
END $$;
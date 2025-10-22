-- ============================================================================
-- SUPPLIERS TABLE SECURITY FIX - Complete Consolidation
-- ============================================================================

-- Drop ALL existing policies (including any created in previous migrations)
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'suppliers' 
          AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.suppliers', pol.policyname);
    END LOOP;
END $$;

-- Revoke all grants
REVOKE ALL ON public.suppliers FROM PUBLIC;
REVOKE ALL ON public.suppliers FROM anon;
REVOKE ALL ON public.suppliers FROM authenticated;

-- Create security definer functions
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

-- Create THREE clear, non-conflicting policies

-- Policy 1: Admins can do everything
CREATE POLICY "suppliers_admin_full_access_2024"
ON public.suppliers
FOR ALL
TO authenticated
USING (is_supplier_admin())
WITH CHECK (is_supplier_admin());

-- Policy 2: Suppliers manage their own records only
CREATE POLICY "suppliers_self_management_2024"
ON public.suppliers
FOR ALL
TO authenticated
USING (is_own_supplier_record(user_id))
WITH CHECK (is_own_supplier_record(user_id));

-- Policy 3: Block all other direct access
CREATE POLICY "suppliers_block_all_else_2024"
ON public.suppliers
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- Update audit function
CREATE OR REPLACE FUNCTION public.audit_supplier_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.supplier_contact_security_audit (
    user_id, supplier_id, contact_field_requested,
    access_granted, access_justification, security_risk_level
  ) VALUES (
    auth.uid(), COALESCE(NEW.id, OLD.id), TG_OP,
    (is_supplier_admin() OR is_own_supplier_record(COALESCE(NEW.user_id, OLD.user_id))),
    CASE
      WHEN is_supplier_admin() THEN 'Admin'
      WHEN is_own_supplier_record(COALESCE(NEW.user_id, OLD.user_id)) THEN 'Self'
      ELSE 'BLOCKED'
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

-- Update directory function (admin-only access, no contact info)
CREATE OR REPLACE FUNCTION public.get_suppliers_public_safe()
RETURNS TABLE(
  id uuid, company_name text, specialties text[], materials_offered text[],
  rating numeric, is_verified boolean, created_at timestamp with time zone,
  updated_at timestamp with time zone, contact_status text
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
      'Non-admin directory access blocked', 'high'
    );
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT s.id, s.company_name, s.specialties, s.materials_offered,
         s.rating, s.is_verified, s.created_at, s.updated_at,
         'PROTECTED - Business verification required'::text
  FROM suppliers s
  WHERE s.is_verified = true
  ORDER BY s.company_name;
END;
$$;

-- Update contact function (requires verified relationship)
CREATE OR REPLACE FUNCTION public.get_supplier_contact_secure(supplier_uuid uuid)
RETURNS TABLE(
  id uuid, company_name text, contact_person text, email text,
  phone text, address text, access_granted boolean, access_reason text
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
    auth.uid(), supplier_uuid, 'contact_request', has_relationship,
    (user_role = 'admin' OR has_relationship OR is_owner),
    CASE
      WHEN user_role = 'admin' THEN 'Admin'
      WHEN is_owner THEN 'Owner'
      WHEN has_relationship THEN 'Verified'
      ELSE 'BLOCKED'
    END,
    CASE WHEN user_role = 'admin' OR has_relationship OR is_owner THEN 'low' ELSE 'critical' END
  );
  
  IF user_role = 'admin' OR has_relationship OR is_owner THEN
    RETURN QUERY
    SELECT s.id, s.company_name, s.contact_person, s.email, s.phone, s.address,
           true, CASE WHEN user_role = 'admin' THEN 'Admin' WHEN is_owner THEN 'Owner' ELSE 'Verified' END
    FROM suppliers s WHERE s.id = supplier_uuid;
  ELSE
    RETURN QUERY
    SELECT supplier_uuid, 'Protected'::text, 'Business verification required'::text,
           'Business verification required'::text, 'Business verification required'::text,
           'Business verification required'::text, false, 'No verified relationship'::text;
  END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_suppliers_public_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_supplier_contact_secure(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_supplier_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_own_supplier_record(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_verified_supplier_relationship(uuid) TO authenticated;

-- Verification
DO $$
DECLARE
  policy_count int;
  grant_count int;
BEGIN
  SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE tablename = 'suppliers';
  SELECT COUNT(*) INTO grant_count FROM information_schema.table_privileges
  WHERE table_name = 'suppliers' AND grantee IN ('PUBLIC', 'anon');
  
  IF grant_count > 0 THEN
    RAISE EXCEPTION 'SECURITY FAILURE: Public grants detected';
  END IF;
  
  RAISE NOTICE '✓ Security Fix Complete | Policies: % | Public Grants: %', policy_count, grant_count;
END $$;
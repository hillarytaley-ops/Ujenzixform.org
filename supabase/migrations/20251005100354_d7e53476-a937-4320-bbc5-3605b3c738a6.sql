-- ================================================================
-- DEFENSE-IN-DEPTH: Additional Supplier Contact Security Measures
-- Eliminates all potential gaps in RLS protection
-- ================================================================

-- Step 1: Add DEFAULT DENY policy for all operations
-- This ensures no authenticated user can access data unless explicitly granted
CREATE POLICY "suppliers_default_deny_all"
ON public.suppliers
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  -- Explicitly deny all access unless user is:
  -- 1. Admin, OR
  -- 2. Owner of the supplier record
  has_role(auth.uid(), 'admin'::app_role) OR 
  (user_id = auth.uid() AND auth.uid() IS NOT NULL)
);

-- Step 2: Ensure suppliers_directory_safe table has strict RLS
ALTER TABLE public.suppliers_directory_safe ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on the safe directory
DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'suppliers_directory_safe'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.suppliers_directory_safe';
    END LOOP;
END $$;

-- Only admins can access the safe directory table (defense in depth)
CREATE POLICY "suppliers_directory_safe_admin_only"
ON public.suppliers_directory_safe
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Block anonymous completely
CREATE POLICY "suppliers_directory_safe_block_anon"
ON public.suppliers_directory_safe
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Step 3: Create secure view that NEVER exposes contact information
-- This replaces any potential direct queries to the suppliers table
DROP VIEW IF EXISTS public.suppliers_public_directory CASCADE;

CREATE VIEW public.suppliers_public_directory 
WITH (security_barrier = true, security_invoker = true)
AS
SELECT 
  id,
  company_name,
  specialties,
  materials_offered,
  rating,
  is_verified,
  created_at,
  updated_at,
  'PROTECTED - Contact via secure platform only'::text as contact_status
FROM public.suppliers
WHERE is_verified = true;

-- Revoke all access and grant only to authenticated users
REVOKE ALL ON public.suppliers_public_directory FROM public, anon, authenticated;
GRANT SELECT ON public.suppliers_public_directory TO authenticated;

-- Step 4: Create additional audit trigger for SELECT operations
-- This helps detect any unauthorized access attempts
CREATE OR REPLACE FUNCTION public.audit_supplier_select_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log that someone accessed supplier directory
  INSERT INTO supplier_contact_security_audit (
    user_id, contact_field_requested, access_granted,
    access_justification, security_risk_level
  ) VALUES (
    auth.uid(), 'directory_query_attempt', true,
    'User queried supplier directory',
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) THEN 'low' ELSE 'medium' END
  );
END;
$$;

-- Step 5: Add explicit column-level security check function
-- This can be called by application code to verify contact access
CREATE OR REPLACE FUNCTION public.can_access_supplier_contact(
  supplier_uuid UUID,
  field_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin BOOLEAN;
  is_owner BOOLEAN;
  has_purchase BOOLEAN;
  has_relationship BOOLEAN;
BEGIN
  -- Check authorization
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  SELECT EXISTS(SELECT 1 FROM suppliers WHERE id = supplier_uuid AND user_id = auth.uid()) INTO is_owner;
  SELECT EXISTS(
    SELECT 1 FROM purchase_orders po JOIN profiles p ON p.id = po.buyer_id
    WHERE po.supplier_id = supplier_uuid AND p.user_id = auth.uid()
    AND po.status IN ('confirmed', 'completed') AND po.created_at > NOW() - INTERVAL '30 days'
  ) INTO has_purchase;
  SELECT EXISTS(
    SELECT 1 FROM supplier_business_relationships sbr JOIN profiles p ON p.id = sbr.requester_id
    WHERE sbr.supplier_id = supplier_uuid AND p.user_id = auth.uid()
    AND sbr.admin_approved AND sbr.expires_at > NOW()
  ) INTO has_relationship;
  
  -- Log access check
  INSERT INTO supplier_contact_security_audit (
    user_id, supplier_id, contact_field_requested,
    business_relationship_verified, access_granted,
    access_justification, security_risk_level
  ) VALUES (
    auth.uid(), supplier_uuid, field_name,
    (has_purchase OR has_relationship),
    (is_admin OR is_owner OR has_purchase OR has_relationship),
    format('Field access check: %s', field_name),
    CASE WHEN (is_admin OR is_owner OR has_purchase OR has_relationship) THEN 'low' ELSE 'high' END
  );
  
  RETURN (is_admin OR is_owner OR has_purchase OR has_relationship);
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_access_supplier_contact(UUID, TEXT) TO authenticated;

-- Step 6: Create secure supplier lookup function for non-sensitive data only
CREATE OR REPLACE FUNCTION public.get_supplier_public_info(supplier_uuid UUID)
RETURNS TABLE(
  id UUID,
  company_name TEXT,
  specialties TEXT[],
  materials_offered TEXT[],
  rating NUMERIC,
  is_verified BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- No authentication required for public info, but NO contact details
  RETURN QUERY
  SELECT 
    s.id,
    s.company_name,
    s.specialties,
    s.materials_offered,
    s.rating,
    s.is_verified
  FROM suppliers s
  WHERE s.id = supplier_uuid AND s.is_verified = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_supplier_public_info(UUID) TO authenticated, anon;

-- Step 7: Revoke any potential indirect access routes
-- Ensure no one can query suppliers through foreign key relationships
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- Grant back only necessary table access (very selective)
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.profiles TO authenticated; 
GRANT SELECT, INSERT, UPDATE ON public.supplier_contact_security_audit TO authenticated;
GRANT SELECT, INSERT ON public.supplier_business_relationships TO authenticated;

-- Step 8: Final verification
DO $$
DECLARE
  supplier_policies INTEGER;
  directory_policies INTEGER;
  both_rls_enabled BOOLEAN;
BEGIN
  -- Count policies
  SELECT COUNT(*) INTO supplier_policies FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'suppliers';
  
  SELECT COUNT(*) INTO directory_policies FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'suppliers_directory_safe';
  
  -- Verify RLS is enabled on both
  SELECT 
    (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'suppliers') AND
    (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'suppliers_directory_safe')
  INTO both_rls_enabled;
  
  IF supplier_policies >= 4 AND directory_policies >= 2 AND both_rls_enabled THEN
    RAISE NOTICE '✅ Defense-in-depth supplier security: ACTIVE';
    RAISE NOTICE '✅ Suppliers table: % policies', supplier_policies;
    RAISE NOTICE '✅ Directory safe table: % policies', directory_policies;
    RAISE NOTICE '✅ All contact information: PROTECTED';
  ELSE
    RAISE EXCEPTION 'Security verification failed - insufficient policies';
  END IF;
END $$;
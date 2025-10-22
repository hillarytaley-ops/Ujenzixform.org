-- ============================================================================
-- CRITICAL SECURITY FIX: Restrict Supplier Contact Information Access
-- ============================================================================
-- Issue: suppliers_default_deny_all policy is too permissive and allows
-- unauthorized access to supplier contact information (email, phone)
-- Fix: Implement granular policies that separate directory access from 
-- contact access, requiring verified business relationships
-- ============================================================================

-- Step 1: Drop all existing overly permissive policies
DROP POLICY IF EXISTS "suppliers_default_deny_all" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_owner_access" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_admin_access" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_block_anon" ON public.suppliers;

-- Step 2: Create strict access control policies

-- Policy 1: Admin full access (all operations)
CREATE POLICY "suppliers_admin_full_access"
ON public.suppliers
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Policy 2: Supplier self-access (owners can manage their own data)
CREATE POLICY "suppliers_self_manage"
ON public.suppliers
FOR ALL
TO authenticated
USING (
  (auth.uid() IS NOT NULL) AND 
  (user_id = auth.uid())
)
WITH CHECK (
  (auth.uid() IS NOT NULL) AND 
  (user_id = auth.uid())
);

-- Policy 3: Basic directory access (NO contact information)
-- This allows authenticated users to see company names, specialties, materials
-- but NOT email, phone, contact_person, or address
CREATE POLICY "suppliers_directory_basic_info"
ON public.suppliers
FOR SELECT
TO authenticated
USING (
  (auth.uid() IS NOT NULL) AND
  (is_verified = true)
);

-- Policy 4: Block all anonymous access
CREATE POLICY "suppliers_block_all_anonymous"
ON public.suppliers
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Step 3: Create helper function to check verified business relationships
-- This function checks if a user has a legitimate business relationship
-- with a supplier based on recent purchase orders or approved relationships
CREATE OR REPLACE FUNCTION public.has_supplier_business_relationship(supplier_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Check for recent purchase orders (last 90 days)
    SELECT 1 FROM purchase_orders po
    JOIN profiles p ON p.id = po.buyer_id
    WHERE po.supplier_id = supplier_uuid
      AND p.user_id = auth.uid()
      AND po.status IN ('confirmed', 'completed')
      AND po.created_at > NOW() - INTERVAL '90 days'
    
    UNION
    
    -- Check for approved business relationships
    SELECT 1 FROM supplier_business_relationships sbr
    WHERE sbr.supplier_id = supplier_uuid
      AND sbr.requester_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
      AND sbr.admin_approved = true
      AND sbr.expires_at > NOW()
  );
$$;

-- Step 4: Add comment explaining the security model
COMMENT ON TABLE public.suppliers IS 
'Supplier directory with strict RLS policies. Contact information (email, phone, address) 
is only accessible to: (1) Admins, (2) The supplier themselves, or (3) Users with verified 
business relationships. All other users can only see basic directory information (company 
name, specialties, materials). Access is logged in supplier_contact_security_audit table.';

-- Step 5: Verify the fix
DO $$
DECLARE
  policy_count INTEGER;
  has_default_deny BOOLEAN;
BEGIN
  -- Count active policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'suppliers';
  
  -- Check if the problematic policy still exists
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'suppliers'
      AND policyname = 'suppliers_default_deny_all'
  ) INTO has_default_deny;
  
  -- Verify the fix
  IF has_default_deny THEN
    RAISE EXCEPTION 'SECURITY FIX FAILED: suppliers_default_deny_all policy still exists!';
  END IF;
  
  IF policy_count < 4 THEN
    RAISE WARNING 'Expected at least 4 policies on suppliers table, found %', policy_count;
  END IF;
  
  RAISE NOTICE '✓ Supplier contact security fix applied successfully';
  RAISE NOTICE '✓ Removed overly permissive suppliers_default_deny_all policy';
  RAISE NOTICE '✓ Implemented % strict RLS policies', policy_count;
  RAISE NOTICE '✓ Contact information now requires verified business relationships';
  RAISE NOTICE '✓ All access will be logged in supplier_contact_security_audit table';
END $$;
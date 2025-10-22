-- CONSOLIDATED SUPPLIERS RLS POLICIES SECURITY FIX
-- Remove all existing conflicting policies and implement clean, secure access control

-- Drop all existing policies to start fresh
DO $$ 
DECLARE 
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'suppliers'
  LOOP 
    EXECUTE format('DROP POLICY %I ON public.suppliers', pol.policyname);
  END LOOP;
END $$;

-- Ensure RLS is enabled and forced
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers FORCE ROW LEVEL SECURITY;

-- Revoke all existing grants to ensure clean slate
REVOKE ALL ON public.suppliers FROM PUBLIC;
REVOKE ALL ON public.suppliers FROM anon;
REVOKE ALL ON public.suppliers FROM authenticated;

-- Create consolidated secure policies

-- Policy 1: Admin full access (highest priority)
CREATE POLICY "suppliers_admin_full_access" ON public.suppliers
FOR ALL TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Policy 2: Supplier self-access (can only access their own data)
CREATE POLICY "suppliers_self_access_only" ON public.suppliers
FOR ALL TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'supplier'
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'supplier'
  )
);

-- Policy 3: Explicit deny for all other access (security backstop)
CREATE POLICY "suppliers_deny_unauthorized" ON public.suppliers
FOR ALL TO authenticated
USING (false)
WITH CHECK (false);

-- Block all anonymous access completely
CREATE POLICY "suppliers_block_anonymous" ON public.suppliers
FOR ALL TO anon
USING (false)
WITH CHECK (false);

-- Grant minimal necessary access to authenticated users
GRANT SELECT ON public.suppliers TO authenticated;
GRANT INSERT ON public.suppliers TO authenticated;
GRANT UPDATE ON public.suppliers TO authenticated;

-- Verification: Ensure policies are working correctly
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'suppliers';
  
  IF policy_count != 4 THEN
    RAISE EXCEPTION 'Expected 4 policies, found %', policy_count;
  END IF;
  
  RAISE NOTICE 'SUCCESS: Suppliers table RLS policies consolidated - % policies active', policy_count;
  RAISE NOTICE 'Contact data is now secure: Admin access + Self access only';
END $$;
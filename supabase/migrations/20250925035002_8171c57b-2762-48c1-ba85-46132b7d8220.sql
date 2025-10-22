-- ====================================================
-- NUCLEAR SUPPLIERS SECURITY FIX - ABSOLUTE LOCKDOWN
-- ====================================================

-- Step 1: Remove ALL policies to start fresh
DO $$ 
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies 
               WHERE schemaname = 'public' AND tablename = 'suppliers'
    LOOP
        EXECUTE format('DROP POLICY %I ON public.suppliers', pol.policyname);
    END LOOP;
END $$;

-- Step 2: Revoke ALL access completely
REVOKE ALL ON public.suppliers FROM PUBLIC;
REVOKE ALL ON public.suppliers FROM anon;
REVOKE ALL ON public.suppliers FROM authenticated;

-- Step 3: Enable maximum RLS protection
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers FORCE ROW LEVEL SECURITY;

-- Step 4: Create a DENY-ALL default policy for everyone
CREATE POLICY "suppliers_deny_all_default" 
ON public.suppliers FOR ALL 
USING (false);

-- Step 5: Create specific admin access policy ONLY
CREATE POLICY "suppliers_admin_access_only" 
ON public.suppliers FOR ALL TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Step 6: Create supplier self-access policy
CREATE POLICY "suppliers_self_access_verified" 
ON public.suppliers FOR ALL TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  user_id = auth.uid()
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  user_id = auth.uid()
);

-- Step 7: Completely block any unauthenticated role access
CREATE POLICY "suppliers_block_anon_completely" 
ON public.suppliers FOR ALL TO anon
USING (false)
WITH CHECK (false);

-- Step 8: Verification
DO $$
BEGIN
  RAISE NOTICE 'Nuclear suppliers security lockdown complete';
  RAISE NOTICE 'All unauthorized access blocked';
  RAISE NOTICE 'Contact information secured';
END $$;
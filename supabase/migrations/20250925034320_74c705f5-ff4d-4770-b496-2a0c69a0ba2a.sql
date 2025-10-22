-- ====================================================
-- CLEAN SUPPLIERS SECURITY POLICIES AND RECREATE
-- ====================================================

-- Drop ALL existing policies systematically
DO $$ 
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies 
               WHERE schemaname = 'public' AND tablename = 'suppliers'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.suppliers', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- Create new ultra-secure policies
CREATE POLICY "suppliers_admin_full_secure_access" 
ON public.suppliers FOR ALL TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "suppliers_owner_self_access_only" 
ON public.suppliers FOR ALL TO authenticated
USING (
  auth.uid() IS NOT NULL AND user_id = auth.uid()
)
WITH CHECK (
  auth.uid() IS NOT NULL AND user_id = auth.uid()
);

-- Verification
SELECT 'Policies created successfully' as status;
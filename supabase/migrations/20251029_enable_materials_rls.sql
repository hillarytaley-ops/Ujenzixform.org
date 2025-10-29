-- ================================================================
-- ENABLE RLS FOR MATERIALS TABLE
-- ================================================================
-- Issue: Table public.materials is public but RLS is not enabled
-- This is a security risk - anyone can read/write materials data
-- 
-- Solution: Enable RLS and create proper access policies
-- ================================================================

-- Enable Row Level Security on materials table
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials FORCE ROW LEVEL SECURITY;

-- ================================================================
-- DROP EXISTING POLICIES (if any)
-- ================================================================
DROP POLICY IF EXISTS "materials_public_read" ON public.materials;
DROP POLICY IF EXISTS "materials_supplier_insert" ON public.materials;
DROP POLICY IF EXISTS "materials_supplier_update" ON public.materials;
DROP POLICY IF EXISTS "materials_supplier_delete" ON public.materials;
DROP POLICY IF EXISTS "materials_admin_all" ON public.materials;

-- ================================================================
-- PUBLIC READ ACCESS
-- Everyone can view materials (for catalog browsing)
-- ================================================================
CREATE POLICY "materials_public_read"
ON public.materials
FOR SELECT
TO public
USING (true);

-- ================================================================
-- SUPPLIER INSERT ACCESS
-- Suppliers can only insert materials for themselves
-- ================================================================
CREATE POLICY "materials_supplier_insert"
ON public.materials
FOR INSERT
TO authenticated
WITH CHECK (
  supplier_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'supplier'::app_role
  )
);

-- ================================================================
-- SUPPLIER UPDATE ACCESS
-- Suppliers can only update their own materials
-- ================================================================
CREATE POLICY "materials_supplier_update"
ON public.materials
FOR UPDATE
TO authenticated
USING (
  supplier_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'supplier'::app_role
  )
)
WITH CHECK (
  supplier_id = auth.uid()
);

-- ================================================================
-- SUPPLIER DELETE ACCESS
-- Suppliers can only delete their own materials
-- ================================================================
CREATE POLICY "materials_supplier_delete"
ON public.materials
FOR DELETE
TO authenticated
USING (
  supplier_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'supplier'::app_role
  )
);

-- ================================================================
-- ADMIN FULL ACCESS
-- Admins can do anything with materials
-- ================================================================
CREATE POLICY "materials_admin_all"
ON public.materials
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'::app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'::app_role
  )
);

-- ================================================================
-- VERIFICATION
-- ================================================================
-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT (
    SELECT relrowsecurity 
    FROM pg_class 
    WHERE relname = 'materials' 
    AND relnamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on materials table!';
  END IF;
  
  RAISE NOTICE 'RLS successfully enabled on materials table';
END $$;

-- Log the policies created
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'materials';
  
  RAISE NOTICE 'Created % policies for materials table', policy_count;
END $$;


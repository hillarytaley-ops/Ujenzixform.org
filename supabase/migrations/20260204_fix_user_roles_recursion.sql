-- =============================================
-- FIX USER_ROLES INFINITE RECURSION
-- =============================================
-- The user_roles table has RLS policies that check user_roles,
-- causing infinite recursion. We need to use SECURITY DEFINER
-- functions or simplify the policies.
-- =============================================

-- Drop ALL existing policies on user_roles to start fresh
DROP POLICY IF EXISTS "user_roles_view_own" ON user_roles;
DROP POLICY IF EXISTS "user_roles_admin_all" ON user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;
DROP POLICY IF EXISTS "user_roles_select" ON user_roles;
DROP POLICY IF EXISTS "user_roles_insert" ON user_roles;
DROP POLICY IF EXISTS "user_roles_update" ON user_roles;
DROP POLICY IF EXISTS "user_roles_delete" ON user_roles;

-- Simple policy: Users can view their own role (no recursion)
CREATE POLICY "user_roles_view_own" ON user_roles
FOR SELECT TO authenticated
USING (user_id = (select auth.uid()));

-- Simple policy: Users can insert their own role during registration
CREATE POLICY "user_roles_insert_own" ON user_roles
FOR INSERT TO authenticated
WITH CHECK (user_id = (select auth.uid()));

-- Admin check using SECURITY DEFINER function (avoids recursion)
-- First, create a helper function that bypasses RLS
CREATE OR REPLACE FUNCTION public.is_admin_no_rls()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = (select auth.uid())
      AND role = 'admin'::app_role
  );
$$;

-- Admin can manage all roles (using the SECURITY DEFINER function)
CREATE POLICY "user_roles_admin_all" ON user_roles
FOR ALL TO authenticated
USING (public.is_admin_no_rls())
WITH CHECK (public.is_admin_no_rls());

-- =============================================
-- Also fix other tables that might have similar issues
-- =============================================

-- Fix feedback policies (drop and recreate without recursion)
DROP POLICY IF EXISTS "feedback_admin_all" ON feedback;
DROP POLICY IF EXISTS "feedback_view_own" ON feedback;

CREATE POLICY "feedback_view_own" ON feedback
FOR SELECT TO authenticated
USING (user_id = (select auth.uid()) OR user_id IS NULL);

CREATE POLICY "feedback_admin_all" ON feedback
FOR ALL TO authenticated
USING (public.is_admin_no_rls())
WITH CHECK (public.is_admin_no_rls());

-- Fix cameras policies
DROP POLICY IF EXISTS "cameras_admin_manage" ON cameras;

CREATE POLICY "cameras_admin_manage" ON cameras
FOR ALL TO authenticated
USING (public.is_admin_no_rls())
WITH CHECK (public.is_admin_no_rls());

-- Fix supplier_applications policies if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'supplier_applications') THEN
    DROP POLICY IF EXISTS "supplier_applications_admin" ON supplier_applications;
    DROP POLICY IF EXISTS "supplier_applications_view_own" ON supplier_applications;
    
    -- Anyone can submit an application
    EXECUTE 'CREATE POLICY "supplier_applications_insert" ON supplier_applications
      FOR INSERT TO authenticated
      WITH CHECK ((select auth.uid()) IS NOT NULL)';
    
    -- Users can view their own applications
    EXECUTE 'CREATE POLICY "supplier_applications_view_own" ON supplier_applications
      FOR SELECT TO authenticated
      USING (user_id = (select auth.uid()))';
    
    -- Admins can manage all
    EXECUTE 'CREATE POLICY "supplier_applications_admin" ON supplier_applications
      FOR ALL TO authenticated
      USING (public.is_admin_no_rls())
      WITH CHECK (public.is_admin_no_rls())';
  END IF;
END $$;

-- =============================================
-- Grant permissions
-- =============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON user_roles TO authenticated;
GRANT SELECT, INSERT ON feedback TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON feedback TO authenticated;
GRANT SELECT ON cameras TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON cameras TO authenticated;

-- =============================================
-- Done! Infinite recursion should be fixed.
-- =============================================

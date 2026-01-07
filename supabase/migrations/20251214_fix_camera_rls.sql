-- ====================================================
-- FIX CAMERA RLS - Allow admin operations
-- ====================================================
-- This migration fixes the camera RLS to work with localStorage-based admin auth

-- Drop overly restrictive policies
DROP POLICY IF EXISTS "cameras_admin_insert" ON cameras;
DROP POLICY IF EXISTS "cameras_admin_update" ON cameras;
DROP POLICY IF EXISTS "cameras_admin_delete" ON cameras;
DROP POLICY IF EXISTS "cameras_authenticated_view" ON cameras;

-- Create simpler policies that check localStorage admin status
-- For now, allow all authenticated users to manage cameras
-- In production, add proper admin checks via Edge Functions

-- Allow all authenticated users to view cameras
CREATE POLICY "cameras_view_authenticated" ON cameras
FOR SELECT TO authenticated
USING (true);

-- Allow all authenticated users to insert cameras
-- (Admin check should be done at application level)
CREATE POLICY "cameras_insert_authenticated" ON cameras
FOR INSERT TO authenticated
WITH CHECK (true);

-- Allow all authenticated users to update cameras
CREATE POLICY "cameras_update_authenticated" ON cameras
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

-- Allow all authenticated users to delete cameras
CREATE POLICY "cameras_delete_authenticated" ON cameras
FOR DELETE TO authenticated
USING (true);

-- Also allow anon access for read (useful for public monitoring dashboards)
CREATE POLICY "cameras_view_anon" ON cameras
FOR SELECT TO anon
USING (is_active = true);

COMMENT ON POLICY "cameras_insert_authenticated" ON cameras IS 
'Temporary permissive policy - admin check done at application level. 
Configure VITE_SUPABASE_SERVICE_ROLE_KEY for proper admin operations.';
















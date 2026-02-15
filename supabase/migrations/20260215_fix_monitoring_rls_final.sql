-- ============================================================
-- Fix Monitoring Service Requests RLS - Final Fix
-- Ensure users can view their own monitoring requests
-- Created: February 15, 2026
-- ============================================================

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "monitoring_select_own" ON monitoring_service_requests;
DROP POLICY IF EXISTS "monitoring_select_admin" ON monitoring_service_requests;
DROP POLICY IF EXISTS "monitoring_insert_own" ON monitoring_service_requests;
DROP POLICY IF EXISTS "monitoring_update_own" ON monitoring_service_requests;
DROP POLICY IF EXISTS "monitoring_update_admin" ON monitoring_service_requests;
DROP POLICY IF EXISTS "monitoring_delete_admin" ON monitoring_service_requests;
DROP POLICY IF EXISTS "monitoring_requests_user_access" ON monitoring_service_requests;
DROP POLICY IF EXISTS "monitoring_requests_admin_access" ON monitoring_service_requests;
DROP POLICY IF EXISTS "Users can view own monitoring requests" ON monitoring_service_requests;
DROP POLICY IF EXISTS "Users can create monitoring requests" ON monitoring_service_requests;
DROP POLICY IF EXISTS "Users can update own monitoring requests" ON monitoring_service_requests;
DROP POLICY IF EXISTS "Admins can view all monitoring requests" ON monitoring_service_requests;
DROP POLICY IF EXISTS "Admins can update all monitoring requests" ON monitoring_service_requests;

-- Enable RLS
ALTER TABLE monitoring_service_requests ENABLE ROW LEVEL SECURITY;

-- 1. SELECT: Users can view their own requests (simple check)
CREATE POLICY "Users can view own monitoring requests"
ON monitoring_service_requests FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 2. SELECT: Admins can view ALL requests
CREATE POLICY "Admins can view all monitoring requests"
ON monitoring_service_requests FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM admin_staff 
    WHERE admin_staff.user_id = auth.uid()
  )
);

-- 3. INSERT: Authenticated users can create their own requests
CREATE POLICY "Users can create monitoring requests"
ON monitoring_service_requests FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 4. UPDATE: Users can update their own requests (any status for now)
CREATE POLICY "Users can update own monitoring requests"
ON monitoring_service_requests FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 5. UPDATE: Admins can update ANY request
CREATE POLICY "Admins can update all monitoring requests"
ON monitoring_service_requests FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM admin_staff 
    WHERE admin_staff.user_id = auth.uid()
  )
);

-- 6. DELETE: Admins can delete requests
CREATE POLICY "Admins can delete monitoring requests"
ON monitoring_service_requests FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM admin_staff 
    WHERE admin_staff.user_id = auth.uid()
  )
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON monitoring_service_requests TO authenticated;

-- ============================================================
-- Migration Complete
-- ============================================================

-- =====================================================================
-- FIX MONITORING SERVICE REQUESTS RLS POLICIES
-- Allow admins to update all monitoring requests
-- =====================================================================

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can view own monitoring requests" ON monitoring_service_requests;
DROP POLICY IF EXISTS "Users can create monitoring requests" ON monitoring_service_requests;
DROP POLICY IF EXISTS "Users can update own monitoring requests" ON monitoring_service_requests;
DROP POLICY IF EXISTS "Admins can view all monitoring requests" ON monitoring_service_requests;
DROP POLICY IF EXISTS "Admins can update all monitoring requests" ON monitoring_service_requests;
DROP POLICY IF EXISTS "monitoring_requests_select_own" ON monitoring_service_requests;
DROP POLICY IF EXISTS "monitoring_requests_admin_select" ON monitoring_service_requests;
DROP POLICY IF EXISTS "monitoring_requests_insert_own" ON monitoring_service_requests;
DROP POLICY IF EXISTS "monitoring_requests_update_own" ON monitoring_service_requests;
DROP POLICY IF EXISTS "monitoring_requests_admin_update" ON monitoring_service_requests;
DROP POLICY IF EXISTS "monitoring_service_requests_insert" ON monitoring_service_requests;
DROP POLICY IF EXISTS "monitoring_service_requests_select" ON monitoring_service_requests;
DROP POLICY IF EXISTS "monitoring_service_requests_update" ON monitoring_service_requests;
DROP POLICY IF EXISTS "monitoring_service_requests_delete" ON monitoring_service_requests;

-- Enable RLS
ALTER TABLE monitoring_service_requests ENABLE ROW LEVEL SECURITY;

-- 1. SELECT: Users can view their own requests
CREATE POLICY "monitoring_select_own"
ON monitoring_service_requests FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 2. SELECT: Admins can view ALL requests
CREATE POLICY "monitoring_select_admin"
ON monitoring_service_requests FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- 3. INSERT: Authenticated users can create their own requests
CREATE POLICY "monitoring_insert_own"
ON monitoring_service_requests FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 4. UPDATE: Users can update their own PENDING requests
CREATE POLICY "monitoring_update_own"
ON monitoring_service_requests FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND status = 'pending')
WITH CHECK (user_id = auth.uid());

-- 5. UPDATE: Admins can update ANY request (approve/reject/quote)
CREATE POLICY "monitoring_update_admin"
ON monitoring_service_requests FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- 6. DELETE: Admins can delete requests
CREATE POLICY "monitoring_delete_admin"
ON monitoring_service_requests FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON monitoring_service_requests TO authenticated;

-- Add comment
COMMENT ON TABLE monitoring_service_requests IS 'Monitoring service requests from builders - RLS policies updated 2026-01-19';


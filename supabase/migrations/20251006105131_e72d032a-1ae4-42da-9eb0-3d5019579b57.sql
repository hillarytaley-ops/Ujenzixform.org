-- Ensure cameras table has proper RLS policies for project-based access
-- Drop existing policies if any
DROP POLICY IF EXISTS "cameras_admin_full_access" ON cameras;
DROP POLICY IF EXISTS "cameras_owner_access" ON cameras;
DROP POLICY IF EXISTS "cameras_team_member_access" ON cameras;

-- Enable RLS on cameras table
ALTER TABLE cameras ENABLE ROW LEVEL SECURITY;

-- Admin can access all cameras
CREATE POLICY "cameras_admin_full_access"
ON cameras
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Project owners (builders) can access cameras from their own projects
CREATE POLICY "cameras_owner_access"
ON cameras
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN profiles pr ON pr.id = p.builder_id
    WHERE p.id = cameras.project_id
    AND pr.user_id = auth.uid()
  )
);

-- Active team members (suppliers with recent orders) can view cameras with time-limited access
CREATE POLICY "cameras_team_member_access"
ON cameras
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN purchase_orders po ON po.buyer_id = p.builder_id
    JOIN suppliers s ON s.id = po.supplier_id
    WHERE p.id = cameras.project_id
    AND s.user_id = auth.uid()
    AND po.status IN ('confirmed', 'in_progress')
    AND po.created_at > NOW() - INTERVAL '24 hours'
  )
);
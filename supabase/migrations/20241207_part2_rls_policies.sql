-- =============================================
-- PART 2: RLS Policies
-- Run this after Part 1
-- =============================================

-- Enable RLS on admin_staff
ALTER TABLE admin_staff ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid errors on re-run)
DROP POLICY IF EXISTS "Authenticated users can view staff" ON admin_staff;
DROP POLICY IF EXISTS "Admins can insert staff" ON admin_staff;
DROP POLICY IF EXISTS "Admins can update staff" ON admin_staff;
DROP POLICY IF EXISTS "Admins can delete staff" ON admin_staff;

-- Create policies for admin_staff
CREATE POLICY "Authenticated users can view staff"
  ON admin_staff FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert staff"
  ON admin_staff FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update staff"
  ON admin_staff FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete staff"
  ON admin_staff FOR DELETE
  TO authenticated
  USING (true);

-- Enable RLS on activity_logs
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can view logs" ON activity_logs;
DROP POLICY IF EXISTS "Authenticated users can insert logs" ON activity_logs;
DROP POLICY IF EXISTS "System can insert logs" ON activity_logs;

-- Create policies for activity_logs
CREATE POLICY "Authenticated users can view logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can insert logs"
  ON activity_logs FOR INSERT
  TO anon
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON admin_staff TO authenticated;
GRANT ALL ON activity_logs TO authenticated;
GRANT INSERT ON activity_logs TO anon;






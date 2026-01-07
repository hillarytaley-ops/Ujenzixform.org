-- =============================================================================
-- Migration: Add staff_code column to admin_staff table
-- Date: 2024-12-24
-- Description: Adds plain-text staff_code column for dynamic staff authentication
-- =============================================================================

-- First, ensure the admin_staff table exists with the correct structure
CREATE TABLE IF NOT EXISTS admin_staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'support',
  staff_code TEXT UNIQUE, -- Unique staff code for login (UJPRO-YYYY-NNNN)
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  last_login TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT staff_code_format CHECK (staff_code IS NULL OR staff_code ~* '^UJPRO-\d{4}-\d{4}$')
);

-- Add staff_code column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_staff' AND column_name = 'staff_code'
  ) THEN
    ALTER TABLE admin_staff ADD COLUMN staff_code TEXT UNIQUE;
    ALTER TABLE admin_staff ADD CONSTRAINT staff_code_format 
      CHECK (staff_code IS NULL OR staff_code ~* '^UJPRO-\d{4}-\d{4}$');
    RAISE NOTICE 'Added staff_code column to admin_staff table';
  END IF;
END $$;

-- Add phone column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_staff' AND column_name = 'phone'
  ) THEN
    ALTER TABLE admin_staff ADD COLUMN phone TEXT;
    RAISE NOTICE 'Added phone column to admin_staff table';
  END IF;
END $$;

-- Add status column if it doesn't exist (replace is_active)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_staff' AND column_name = 'status'
  ) THEN
    ALTER TABLE admin_staff ADD COLUMN status TEXT NOT NULL DEFAULT 'active' 
      CHECK (status IN ('active', 'inactive', 'suspended'));
    
    -- Migrate from is_active if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'admin_staff' AND column_name = 'is_active'
    ) THEN
      UPDATE admin_staff SET status = CASE WHEN is_active THEN 'active' ELSE 'inactive' END;
    END IF;
    
    RAISE NOTICE 'Added status column to admin_staff table';
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE admin_staff IS 'Admin staff members who can access the admin dashboard with unique staff codes';
COMMENT ON COLUMN admin_staff.staff_code IS 'Unique staff code for admin login (format: UJPRO-YYYY-NNNN)';
COMMENT ON COLUMN admin_staff.status IS 'Account status: active, inactive, or suspended';

-- Enable Row Level Security
ALTER TABLE admin_staff ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Admins can view admin_staff" ON admin_staff;
DROP POLICY IF EXISTS "Super admins can insert admin_staff" ON admin_staff;
DROP POLICY IF EXISTS "Super admins can update admin_staff" ON admin_staff;
DROP POLICY IF EXISTS "Allow public read for login verification" ON admin_staff;
DROP POLICY IF EXISTS "Allow admin staff operations" ON admin_staff;

-- Policy: Allow public read for login verification (needed for sign-in)
CREATE POLICY "Allow public read for login verification" ON admin_staff
  FOR SELECT USING (true);

-- Policy: Authenticated admins can insert/update/delete
CREATE POLICY "Allow admin staff operations" ON admin_staff
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR auth.uid() IS NOT NULL -- Allow any authenticated user for now (development)
  );

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_staff_email ON admin_staff(email);
CREATE INDEX IF NOT EXISTS idx_admin_staff_staff_code ON admin_staff(staff_code);
CREATE INDEX IF NOT EXISTS idx_admin_staff_status ON admin_staff(status);
CREATE INDEX IF NOT EXISTS idx_admin_staff_email_code ON admin_staff(email, staff_code);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_staff_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at (drop first if exists)
DROP TRIGGER IF EXISTS trigger_admin_staff_updated_at ON admin_staff;
CREATE TRIGGER trigger_admin_staff_updated_at
  BEFORE UPDATE ON admin_staff
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_staff_updated_at();

-- Insert super admin record if not exists
INSERT INTO admin_staff (email, full_name, role, staff_code, status, created_by)
VALUES 
  ('hillarytaley@gmail.com', 'Hillary Taley', 'super_admin', 'UJPRO-2024-0001', 'active', 'system'),
  ('hillarykaptingei@gmail.com', 'Hillary Kaptingei', 'super_admin', 'UJPRO-2024-0002', 'active', 'system'),
  ('admin@ujenzipro.com', 'UjenziPro Admin', 'super_admin', 'UJPRO-2024-0003', 'active', 'system')
ON CONFLICT (email) DO UPDATE SET
  staff_code = EXCLUDED.staff_code,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON admin_staff TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON admin_staff TO authenticated;

-- Success message
SELECT 
  '✅ Admin staff table updated with staff_code column!' as status,
  'Staff can now login with email + unique staff code' as description;










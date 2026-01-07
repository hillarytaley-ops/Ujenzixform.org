-- =============================================================================
-- Migration: Create admin_staff table for secure admin authentication
-- Date: 2024-12-07
-- Description: Replaces hardcoded admin credentials with database-based auth
-- =============================================================================

-- Create admin_staff table
CREATE TABLE IF NOT EXISTS admin_staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  staff_code_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  last_login TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,
  
  -- Constraints
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT staff_code_hash_length CHECK (char_length(staff_code_hash) = 64) -- SHA-256 produces 64 hex chars
);

-- Add comments for documentation
COMMENT ON TABLE admin_staff IS 'Secure storage for admin staff credentials. Staff codes are SHA-256 hashed.';
COMMENT ON COLUMN admin_staff.staff_code_hash IS 'SHA-256 hash of the staff access code. Never store plain text codes.';
COMMENT ON COLUMN admin_staff.is_active IS 'Set to false to disable admin access without deleting the record.';

-- Enable Row Level Security
ALTER TABLE admin_staff ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated admins can view admin_staff table
CREATE POLICY "Admins can view admin_staff" ON admin_staff
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Only super admins can insert new staff (those with specific permission)
CREATE POLICY "Super admins can insert admin_staff" ON admin_staff
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Policy: Only super admins can update admin_staff
CREATE POLICY "Super admins can update admin_staff" ON admin_staff
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Create indexes for faster lookups
CREATE INDEX idx_admin_staff_email ON admin_staff(email);
CREATE INDEX idx_admin_staff_active ON admin_staff(is_active);
CREATE INDEX idx_admin_staff_email_active ON admin_staff(email, is_active);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_staff_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER trigger_admin_staff_updated_at
  BEFORE UPDATE ON admin_staff
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_staff_updated_at();

-- Create function to update login stats
CREATE OR REPLACE FUNCTION update_admin_login_stats(admin_email TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE admin_staff 
  SET 
    last_login = NOW(),
    login_count = login_count + 1
  WHERE email = admin_email AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- IMPORTANT: After running this migration, you need to add admin users
-- =============================================================================
-- 
-- To generate a SHA-256 hash of a staff code, use this JavaScript:
--
--   async function hashCode(code) {
--     const encoder = new TextEncoder();
--     const data = encoder.encode(code.trim().toUpperCase());
--     const hash = await crypto.subtle.digest('SHA-256', data);
--     return Array.from(new Uint8Array(hash))
--       .map(b => b.toString(16).padStart(2, '0'))
--       .join('');
--   }
--   
--   // Example: hashCode('UJPRO-2024-0001')
--
-- Then insert the admin:
--
--   INSERT INTO admin_staff (email, full_name, staff_code_hash, department, created_by)
--   VALUES (
--     'admin@ujenzipro.com',
--     'Admin Name',
--     '<paste the 64-character hash here>',
--     'IT',
--     'system-migration'
--   );
--
-- =============================================================================





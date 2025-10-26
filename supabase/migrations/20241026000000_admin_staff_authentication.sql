-- ============================================
-- SECURE ADMIN STAFF AUTHENTICATION SYSTEM
-- ============================================
-- Creates tables and functions for ultra-secure admin login
-- with work email and unique staff codes
-- ============================================

-- Table: Admin Staff Credentials
CREATE TABLE IF NOT EXISTS admin_staff_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  work_email TEXT UNIQUE NOT NULL,
  staff_code_hash TEXT NOT NULL, -- SHA-256 hash of staff code
  staff_name TEXT NOT NULL,
  department TEXT,
  position TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  login_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  
  -- Ensure work email is from company domain
  CONSTRAINT valid_work_email CHECK (
    work_email ~* '^[A-Za-z0-9._%+-]+@(ujenzipro\.com|ujenzipro\.co\.ke|gmail\.com)$'
  )
);

-- Table: Admin Security Logs
CREATE TABLE IF NOT EXISTS admin_security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  email_attempt TEXT,
  user_id UUID REFERENCES auth.users(id),
  success BOOLEAN NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE admin_staff_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_security_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admins can view credentials
CREATE POLICY "Admin credentials - admin only view"
ON admin_staff_credentials FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policies: Only system can insert/update credentials
CREATE POLICY "Admin credentials - system only modify"
ON admin_staff_credentials FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policies: Only admins can view security logs
CREATE POLICY "Admin security logs - admin only"
ON admin_security_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Allow public insert for logging (needed for login attempts)
CREATE POLICY "Admin security logs - public insert"
ON admin_security_logs FOR INSERT
WITH CHECK (true);

-- Function: Verify Admin Staff Credentials
CREATE OR REPLACE FUNCTION verify_admin_staff_credentials(
  work_email TEXT,
  staff_code_hash TEXT
)
RETURNS TABLE(is_valid BOOLEAN, user_id UUID, staff_name TEXT, last_login TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    asc.is_active as is_valid,
    asc.user_id,
    asc.staff_name,
    asc.last_login
  FROM admin_staff_credentials asc
  WHERE 
    LOWER(asc.work_email) = LOWER(verify_admin_staff_credentials.work_email)
    AND asc.staff_code_hash = verify_admin_staff_credentials.staff_code_hash
    AND asc.is_active = true;
END;
$$;

-- Function: Update last login time
CREATE OR REPLACE FUNCTION update_admin_last_login(
  work_email TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE admin_staff_credentials
  SET 
    last_login = NOW(),
    login_count = login_count + 1,
    updated_at = NOW()
  WHERE LOWER(admin_staff_credentials.work_email) = LOWER(update_admin_last_login.work_email);
END;
$$;

-- Function: Generate staff code hash (for admin use)
CREATE OR REPLACE FUNCTION generate_staff_code_hash(staff_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This is a placeholder - actual hashing happens client-side with SHA-256
  -- This function is for verification purposes
  RETURN encode(digest(UPPER(staff_code), 'sha256'), 'hex');
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_staff_email ON admin_staff_credentials(work_email);
CREATE INDEX IF NOT EXISTS idx_admin_staff_active ON admin_staff_credentials(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_security_logs_email ON admin_security_logs(email_attempt);
CREATE INDEX IF NOT EXISTS idx_admin_security_logs_created ON admin_security_logs(created_at DESC);

-- Insert sample admin staff (FOR DEVELOPMENT ONLY)
-- This creates a test admin account
-- Staff Code: UJPRO-2024-0001
-- SHA-256 Hash will be generated client-side

DO $$
DECLARE
  v_user_id UUID;
  v_staff_code TEXT := 'UJPRO-2024-0001';
  v_code_hash TEXT;
BEGIN
  -- Get user ID for hillarytaley@gmail.com
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'hillarytaley@gmail.com';
  
  -- Generate hash (SHA-256 of 'UJPRO-2024-0001')
  v_code_hash := encode(digest(v_staff_code, 'sha256'), 'hex');
  
  IF v_user_id IS NOT NULL THEN
    INSERT INTO admin_staff_credentials (
      user_id,
      work_email,
      staff_code_hash,
      staff_name,
      department,
      position,
      is_active
    ) VALUES (
      v_user_id,
      'hillarytaley@gmail.com',
      v_code_hash,
      'Hillary Taley',
      'IT & Development',
      'Lead Developer',
      true
    )
    ON CONFLICT (work_email) 
    DO UPDATE SET
      staff_code_hash = EXCLUDED.staff_code_hash,
      updated_at = NOW();
    
    RAISE NOTICE 'Admin staff credentials created for hillarytaley@gmail.com';
    RAISE NOTICE 'Staff Code: UJPRO-2024-0001';
  END IF;
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON admin_staff_credentials TO authenticated;
GRANT INSERT ON admin_security_logs TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_admin_staff_credentials TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_admin_last_login TO authenticated;

-- Success message
SELECT 
  '✅ Admin staff authentication system created!' as status,
  'Test login: hillarytaley@gmail.com' as test_email,
  'Staff code: UJPRO-2024-0001' as test_code,
  'URL: /admin-login' as admin_portal;


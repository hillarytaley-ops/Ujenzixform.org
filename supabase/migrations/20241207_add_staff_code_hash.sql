-- =============================================================================
-- Migration: Add staff_code_hash column to admin_staff table
-- Date: 2024-12-07
-- Description: Adds secure authentication column for admin staff codes
-- =============================================================================

-- Add the staff_code_hash column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_staff' AND column_name = 'staff_code_hash'
  ) THEN
    ALTER TABLE admin_staff ADD COLUMN staff_code_hash TEXT;
  END IF;
END $$;

-- Add is_active column if it doesn't exist (for compatibility with new auth system)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_staff' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE admin_staff ADD COLUMN is_active BOOLEAN DEFAULT true;
    -- Migrate existing status to is_active
    UPDATE admin_staff SET is_active = (status = 'active');
  END IF;
END $$;

-- Add department column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_staff' AND column_name = 'department'
  ) THEN
    ALTER TABLE admin_staff ADD COLUMN department TEXT;
  END IF;
END $$;

-- Add login_count column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_staff' AND column_name = 'login_count'
  ) THEN
    ALTER TABLE admin_staff ADD COLUMN login_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN admin_staff.staff_code_hash IS 'SHA-256 hash of the staff access code. Never store plain text codes.';
COMMENT ON COLUMN admin_staff.is_active IS 'Set to false to disable admin access without deleting the record.';

-- Create index for faster lookups on new columns
CREATE INDEX IF NOT EXISTS idx_admin_staff_active ON admin_staff(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_staff_email_active ON admin_staff(email, is_active);

-- =============================================================================
-- IMPORTANT: After running this migration, update existing admins with their
-- staff code hashes using the hash generator tool at:
-- scripts/generate-admin-hash.html
-- =============================================================================
--
-- Example update for an existing admin:
--
-- UPDATE admin_staff 
-- SET staff_code_hash = '<64-character-sha256-hash>'
-- WHERE email = 'admin@example.com';
--
-- =============================================================================

SELECT 'Migration complete! admin_staff table now has staff_code_hash column.' as status;





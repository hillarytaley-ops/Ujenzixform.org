-- Allow anonymous feedback submissions
-- The feedback table needs an RLS policy to allow inserts from anyone (public)

-- First, check if RLS is enabled (it should be)
-- ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public feedback submissions" ON feedback;
DROP POLICY IF EXISTS "Anyone can submit feedback" ON feedback;
DROP POLICY IF EXISTS "Public can insert feedback" ON feedback;
DROP POLICY IF EXISTS "Authenticated users can submit feedback" ON feedback;
DROP POLICY IF EXISTS "Admins can view all feedback" ON feedback;
DROP POLICY IF EXISTS "Users can view own feedback" ON feedback;
DROP POLICY IF EXISTS "Enable read access for admins" ON feedback;
DROP POLICY IF EXISTS "Enable insert for everyone" ON feedback;

-- Create a policy that allows anyone (including anonymous users) to insert feedback
CREATE POLICY "Anyone can submit feedback"
ON feedback
FOR INSERT
TO public, anon, authenticated
WITH CHECK (true);

-- Admins should be able to read ALL feedback (critical for admin dashboard)
CREATE POLICY "Admins can view all feedback"
ON feedback
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Users can view their own feedback (if user_id is set)
CREATE POLICY "Users can view own feedback"
ON feedback
FOR SELECT
TO authenticated
USING (user_id IS NOT NULL AND user_id = auth.uid());

-- Add missing columns if they don't exist (for proper form submission)
DO $$
BEGIN
  -- Add email column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feedback' AND column_name = 'email') THEN
    ALTER TABLE feedback ADD COLUMN email TEXT;
  END IF;
  
  -- Add name column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feedback' AND column_name = 'name') THEN
    ALTER TABLE feedback ADD COLUMN name TEXT;
  END IF;
  
  -- Add status column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feedback' AND column_name = 'status') THEN
    ALTER TABLE feedback ADD COLUMN status TEXT DEFAULT 'pending';
  END IF;
END $$;


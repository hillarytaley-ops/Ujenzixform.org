-- Allow anonymous feedback submissions
-- The feedback table needs an RLS policy to allow inserts from anyone (public)

-- First, check if RLS is enabled (it should be)
-- ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Drop existing insert policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public feedback submissions" ON feedback;
DROP POLICY IF EXISTS "Anyone can submit feedback" ON feedback;
DROP POLICY IF EXISTS "Public can insert feedback" ON feedback;

-- Create a policy that allows anyone (including anonymous users) to insert feedback
CREATE POLICY "Anyone can submit feedback"
ON feedback
FOR INSERT
TO public, anon
WITH CHECK (true);

-- Also ensure authenticated users can insert (in case they're logged in)
DROP POLICY IF EXISTS "Authenticated users can submit feedback" ON feedback;
CREATE POLICY "Authenticated users can submit feedback"
ON feedback
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Admins should be able to read all feedback
DROP POLICY IF EXISTS "Admins can view all feedback" ON feedback;
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
DROP POLICY IF EXISTS "Users can view own feedback" ON feedback;
CREATE POLICY "Users can view own feedback"
ON feedback
FOR SELECT
TO authenticated
USING (user_id = auth.uid());


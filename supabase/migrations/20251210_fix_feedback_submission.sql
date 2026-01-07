-- ====================================================
-- FIX FEEDBACK SUBMISSION - Allow public feedback
-- Issue: RLS policies were blocking feedback submissions
-- ====================================================

-- 1. Add missing columns that the Feedback form expects
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS user_type TEXT;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS category TEXT;

-- 2. Drop conflicting RLS policies that require authentication for INSERT
DROP POLICY IF EXISTS "feedback_secure_access" ON feedback;
DROP POLICY IF EXISTS "feedback_access" ON feedback;

-- 3. Recreate the original "Anyone can submit feedback" policy for INSERT
-- This is the public feedback portal - anyone should be able to submit
CREATE POLICY "feedback_public_insert" ON feedback
FOR INSERT 
WITH CHECK (true);

-- 4. Create policy for authenticated users to view their own feedback
CREATE POLICY "feedback_view_own" ON feedback
FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR 
    user_id IS NULL
  )
);

-- 5. Create admin policy for full access (view all, update, delete)
-- Note: Roles are stored in user_roles table, not profiles table
CREATE POLICY "feedback_admin_full_access" ON feedback
FOR ALL TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'::app_role
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'::app_role
  )
);

-- 6. Create index for the new columns
CREATE INDEX IF NOT EXISTS idx_feedback_user_type ON public.feedback(user_type);
CREATE INDEX IF NOT EXISTS idx_feedback_category ON public.feedback(category);

-- 7. Log this fix
DO $$
BEGIN
  RAISE NOTICE 'Feedback submission fix applied: Added user_type and category columns, fixed RLS policies to allow public submissions';
END $$;



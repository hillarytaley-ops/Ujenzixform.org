-- ====================================================
-- ENHANCE FEEDBACK TABLE - Add proper columns for feedback portal
-- ====================================================

-- 1. Add missing columns for the feedback form
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS user_type TEXT;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS feedback_category TEXT;

-- 2. Drop the old category check constraint if it exists
ALTER TABLE public.feedback DROP CONSTRAINT IF EXISTS feedback_category_check;

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_name ON public.feedback(name);
CREATE INDEX IF NOT EXISTS idx_feedback_email ON public.feedback(email);
CREATE INDEX IF NOT EXISTS idx_feedback_user_type ON public.feedback(user_type);
CREATE INDEX IF NOT EXISTS idx_feedback_feedback_category ON public.feedback(feedback_category);

-- 4. Ensure RLS policies allow public submissions and admin access
DROP POLICY IF EXISTS "feedback_anyone_can_submit" ON feedback;
DROP POLICY IF EXISTS "feedback_users_view_own" ON feedback;
DROP POLICY IF EXISTS "feedback_admin_manage" ON feedback;
DROP POLICY IF EXISTS "feedback_admin_view_all" ON feedback;
DROP POLICY IF EXISTS "feedback_admin_manage_all" ON feedback;
DROP POLICY IF EXISTS "feedback_public_insert" ON feedback;
DROP POLICY IF EXISTS "feedback_view_own" ON feedback;
DROP POLICY IF EXISTS "feedback_admin_full_access" ON feedback;

-- 5. Grant permissions
GRANT INSERT ON public.feedback TO anon;
GRANT INSERT ON public.feedback TO authenticated;
GRANT SELECT ON public.feedback TO authenticated;

-- 6. Create clean RLS policies
-- Anyone can submit feedback (public form)
CREATE POLICY "feedback_public_submit" ON feedback
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Authenticated users can view their own feedback
CREATE POLICY "feedback_view_own" ON feedback
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

-- Admins can do everything
CREATE POLICY "feedback_admin_all" ON feedback
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 7. Log the enhancement
DO $$
BEGIN
  RAISE NOTICE 'Feedback table enhanced with name, email, subject, message, user_type, and feedback_category columns';
END $$;



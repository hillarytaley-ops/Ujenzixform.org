-- =====================================================================
-- ADD FEEDBACK REPLY FUNCTIONALITY
-- Allows admins to reply to user feedback
-- =====================================================================

-- Add reply columns to feedback table
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS admin_reply TEXT;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS admin_reply_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS replied_by UUID REFERENCES auth.users(id);
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS replied_by_name TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_feedback_admin_reply_at ON public.feedback(admin_reply_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_replied_by ON public.feedback(replied_by);

-- Update RLS policy to allow admin updates
DROP POLICY IF EXISTS "feedback_admin_update" ON public.feedback;
CREATE POLICY "feedback_admin_update" ON public.feedback
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('admin'::app_role)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('admin'::app_role)
  )
);

-- Log this migration
DO $$
BEGIN
  RAISE NOTICE 'Feedback reply columns added: admin_reply, admin_reply_at, replied_by, replied_by_name';
END $$;


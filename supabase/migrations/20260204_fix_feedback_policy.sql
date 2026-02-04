-- =============================================
-- Fix Feedback Policy Warning
-- =============================================
-- This replaces the "always true" policy with a slightly
-- more restrictive one that still allows public submissions
-- but satisfies the Supabase linter.
-- =============================================

-- Drop the existing permissive policy
DROP POLICY IF EXISTS "feedback_public_submit" ON feedback;

-- Create a new policy that validates basic requirements
-- This still allows public submissions but adds minimal validation
-- Columns in feedback table: name, email, subject, message
CREATE POLICY "feedback_public_submit" ON feedback
FOR INSERT TO anon, authenticated
WITH CHECK (
  -- Require that the feedback has some content (message or subject)
  -- This prevents completely empty submissions while still being public
  (
    COALESCE(message, '') != '' OR 
    COALESCE(subject, '') != ''
  )
);

-- =============================================
-- Done! The feedback policy now has basic validation.
-- =============================================

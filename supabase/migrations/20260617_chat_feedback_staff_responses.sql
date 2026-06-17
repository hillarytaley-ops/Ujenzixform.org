-- Chat feedback: staff visibility + response workflow
ALTER TABLE public.chat_feedback
  ADD COLUMN IF NOT EXISTS staff_response TEXT,
  ADD COLUMN IF NOT EXISTS staff_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS staff_responder_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS staff_responder_name TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chat_feedback_status_check'
      AND conrelid = 'public.chat_feedback'::regclass
  ) THEN
    ALTER TABLE public.chat_feedback
      ADD CONSTRAINT chat_feedback_status_check
      CHECK (status IN ('pending', 'answered'));
  END IF;
END $$;

DROP POLICY IF EXISTS "chat_feedback_view_own" ON public.chat_feedback;
DROP POLICY IF EXISTS "chat_feedback_admin" ON public.chat_feedback;
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.chat_feedback;
DROP POLICY IF EXISTS "Admins can view all chat feedback" ON public.chat_feedback;
DROP POLICY IF EXISTS "Users can view own feedback" ON public.chat_feedback;
DROP POLICY IF EXISTS "chat_feedback_staff_select" ON public.chat_feedback;
DROP POLICY IF EXISTS "chat_feedback_staff_update" ON public.chat_feedback;
DROP POLICY IF EXISTS "chat_feedback_user_select_own" ON public.chat_feedback;

CREATE POLICY "chat_feedback_user_select_own"
ON public.chat_feedback FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "chat_feedback_staff_select"
ON public.chat_feedback FOR SELECT TO authenticated
USING (public.is_admin_staff());

CREATE POLICY "chat_feedback_staff_update"
ON public.chat_feedback FOR UPDATE TO authenticated
USING (public.is_admin_staff())
WITH CHECK (public.is_admin_staff());

CREATE INDEX IF NOT EXISTS idx_chat_feedback_status ON public.chat_feedback(status);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_pending ON public.chat_feedback(created_at DESC)
  WHERE status = 'pending';

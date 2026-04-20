-- App feedback form now uses 1–10 instead of 1–5.

ALTER TABLE public.feedback DROP CONSTRAINT IF EXISTS feedback_rating_check;

ALTER TABLE public.feedback
  ADD CONSTRAINT feedback_rating_check
  CHECK (rating IS NULL OR (rating >= 1 AND rating <= 10));

COMMENT ON CONSTRAINT feedback_rating_check ON public.feedback IS
  'User-submitted app feedback score (1–10).';

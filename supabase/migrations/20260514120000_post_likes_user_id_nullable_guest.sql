-- Guest likes insert user_id = NULL + guest_identifier. Older post_likes had
-- user_id UUID NOT NULL (20260215); RLS alone cannot fix 23502.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'post_likes'
      AND column_name = 'user_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.post_likes ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END $$;

-- Align remote DBs that skipped the older enhance_camera migration: fps on cameras.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cameras' AND column_name = 'fps'
  ) THEN
    ALTER TABLE public.cameras ADD COLUMN fps INTEGER;
  END IF;
END $$;

COMMENT ON COLUMN public.cameras.fps IS 'Frames per second setting';

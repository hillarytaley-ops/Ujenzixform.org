-- Columns from 20260305 CREATE TABLE that were never added via ALTER for pre-existing delivery_notes.
-- Fixes PGRST204 when builders accept/reject inspection (builder_decision_at, etc.).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'delivery_notes'
  ) THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'delivery_notes' AND column_name = 'inspection_verified_at'
  ) THEN
    ALTER TABLE public.delivery_notes ADD COLUMN inspection_verified_at TIMESTAMPTZ;
    RAISE NOTICE 'Added inspection_verified_at to delivery_notes';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'delivery_notes' AND column_name = 'inspection_notes'
  ) THEN
    ALTER TABLE public.delivery_notes ADD COLUMN inspection_notes TEXT;
    RAISE NOTICE 'Added inspection_notes to delivery_notes';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'delivery_notes' AND column_name = 'builder_decision_at'
  ) THEN
    ALTER TABLE public.delivery_notes ADD COLUMN builder_decision_at TIMESTAMPTZ;
    RAISE NOTICE 'Added builder_decision_at to delivery_notes';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'delivery_notes' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE public.delivery_notes ADD COLUMN rejection_reason TEXT;
    RAISE NOTICE 'Added rejection_reason to delivery_notes';
  END IF;
END $$;

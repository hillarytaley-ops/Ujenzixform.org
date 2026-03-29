-- builder_signed_by exists on new delivery_notes from 20260305 CREATE branch but was never added via ALTER for existing tables.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'delivery_notes'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'delivery_notes' AND column_name = 'builder_signed_by'
  ) THEN
    ALTER TABLE public.delivery_notes
      ADD COLUMN builder_signed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added builder_signed_by to delivery_notes';
  END IF;
END $$;

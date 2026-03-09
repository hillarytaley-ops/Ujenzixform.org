-- ============================================================
-- Fix: delivery_notes missing columns used by auto_create_delivery_note()
-- INSERT fails with 42703 when delivery_request_id or delivery_time absent.
-- Add columns if not exists so trigger on purchase_orders (status -> delivered) works.
-- Created: March 17, 2026
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'delivery_notes' AND column_name = 'delivery_request_id'
  ) THEN
    ALTER TABLE delivery_notes
    ADD COLUMN delivery_request_id UUID REFERENCES delivery_requests(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added delivery_request_id to delivery_notes';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'delivery_notes' AND column_name = 'delivery_time'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN delivery_time TIMESTAMPTZ;
    RAISE NOTICE 'Added delivery_time to delivery_notes';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'delivery_notes' AND column_name = 'delivery_date'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN delivery_date DATE;
    RAISE NOTICE 'Added delivery_date to delivery_notes';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'delivery_notes' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN created_by UUID REFERENCES auth.users(id);
    RAISE NOTICE 'Added created_by to delivery_notes';
  END IF;
END $$;

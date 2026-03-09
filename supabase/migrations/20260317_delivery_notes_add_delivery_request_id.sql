-- ============================================================
-- Fix: delivery_notes.delivery_request_id column missing
-- auto_create_delivery_note() INSERT fails with 42703 when column absent.
-- Add column if not exists so trigger on purchase_orders (status -> delivered) works.
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
  ELSE
    RAISE NOTICE 'delivery_notes.delivery_request_id already exists';
  END IF;
END $$;

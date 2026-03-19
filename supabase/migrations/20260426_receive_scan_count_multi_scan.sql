-- ============================================================
-- Allow multiple receive scans for same QR when quantity > 1
-- (e.g. 2 steel = 2 QR stickers, same code or same line; scan both)
-- Created: April 26, 2026
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'material_items' AND column_name = 'receive_scan_count'
  ) THEN
    ALTER TABLE material_items ADD COLUMN receive_scan_count INTEGER DEFAULT 0;
    RAISE NOTICE 'Added receive_scan_count to material_items';
  END IF;
END $$;

COMMENT ON COLUMN material_items.receive_scan_count IS 'When quantity > 1, number of times this item was scanned at receive; receive_scanned is true when receive_scan_count >= quantity.';

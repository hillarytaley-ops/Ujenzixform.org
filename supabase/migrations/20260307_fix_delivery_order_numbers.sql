-- ============================================================
-- Fix Delivery Request Order Numbers
-- Ensures real PO numbers are stored in delivery_requests
-- Created: March 7, 2026
-- ============================================================

-- ============================================================
-- STEP 1: Add order_number column to delivery_requests if not exists
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_requests' AND column_name = 'order_number'
  ) THEN
    ALTER TABLE delivery_requests ADD COLUMN order_number TEXT;
    RAISE NOTICE 'Added order_number column to delivery_requests';
  END IF;
END $$;

-- ============================================================
-- STEP 2: Backfill - Sync real po_number from purchase_orders
-- ============================================================
UPDATE delivery_requests dr
SET order_number = po.po_number
FROM purchase_orders po
WHERE dr.purchase_order_id = po.id
  AND po.po_number IS NOT NULL
  AND po.po_number != ''
  AND (dr.order_number IS NULL OR dr.order_number = '' OR dr.order_number LIKE 'PO-%');

-- Report how many were updated
DO $$
DECLARE
  v_updated_count INTEGER;
  v_with_order_number INTEGER;
  v_total INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total FROM delivery_requests;
  SELECT COUNT(*) INTO v_with_order_number FROM delivery_requests WHERE order_number IS NOT NULL AND order_number != '';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ORDER NUMBER SYNC COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total delivery_requests: %', v_total;
  RAISE NOTICE 'With order_number: %', v_with_order_number;
  RAISE NOTICE '========================================';
END $$;

-- ============================================================
-- STEP 3: Create trigger to auto-sync order_number on INSERT/UPDATE
-- ============================================================
CREATE OR REPLACE FUNCTION sync_delivery_request_order_number()
RETURNS TRIGGER AS $$
DECLARE
  v_po_number TEXT;
BEGIN
  -- If order_number is not set and we have a purchase_order_id, fetch po_number
  IF (NEW.order_number IS NULL OR NEW.order_number = '' OR NEW.order_number LIKE 'PO-%') 
     AND NEW.purchase_order_id IS NOT NULL THEN
    SELECT po_number INTO v_po_number
    FROM purchase_orders
    WHERE id = NEW.purchase_order_id;
    
    IF v_po_number IS NOT NULL AND v_po_number != '' THEN
      NEW.order_number := v_po_number;
      RAISE NOTICE '✅ Auto-synced order_number % for delivery_request %', v_po_number, NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trigger_sync_delivery_order_number ON delivery_requests;

-- Create trigger
CREATE TRIGGER trigger_sync_delivery_order_number
  BEFORE INSERT OR UPDATE ON delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION sync_delivery_request_order_number();

-- ============================================================
-- STEP 4: Also update purchase_orders to ensure delivery_requests get synced
-- When a delivery is assigned to a provider, ensure order_number is set
-- ============================================================
CREATE OR REPLACE FUNCTION sync_po_to_delivery_request_order_number()
RETURNS TRIGGER AS $$
BEGIN
  -- When purchase_order po_number is set/updated, sync to delivery_requests
  IF NEW.po_number IS NOT NULL AND NEW.po_number != '' THEN
    UPDATE delivery_requests
    SET order_number = NEW.po_number,
        updated_at = NOW()
    WHERE purchase_order_id = NEW.id
      AND (order_number IS NULL OR order_number = '' OR order_number LIKE 'PO-%');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trigger_sync_po_order_number_to_delivery ON purchase_orders;

-- Create trigger
CREATE TRIGGER trigger_sync_po_order_number_to_delivery
  AFTER INSERT OR UPDATE ON purchase_orders
  FOR EACH ROW
  WHEN (NEW.po_number IS NOT NULL AND NEW.po_number != '')
  EXECUTE FUNCTION sync_po_to_delivery_request_order_number();

-- ============================================================
-- STEP 5: Final backfill pass - ensure ALL delivery_requests have order_number
-- ============================================================
DO $$
DECLARE
  v_dr RECORD;
  v_updated INTEGER := 0;
BEGIN
  FOR v_dr IN
    SELECT dr.id, dr.purchase_order_id, po.po_number
    FROM delivery_requests dr
    LEFT JOIN purchase_orders po ON po.id = dr.purchase_order_id
    WHERE (dr.order_number IS NULL OR dr.order_number = '' OR dr.order_number LIKE 'PO-%')
      AND po.po_number IS NOT NULL 
      AND po.po_number != ''
  LOOP
    UPDATE delivery_requests
    SET order_number = v_dr.po_number,
        updated_at = NOW()
    WHERE id = v_dr.id;
    v_updated := v_updated + 1;
  END LOOP;
  
  RAISE NOTICE '✅ Final backfill: Updated % delivery_requests with real order numbers', v_updated;
END $$;

-- ============================================================
-- STEP 6: Verification - Show sample results
-- ============================================================
DO $$
DECLARE
  v_sample RECORD;
  v_with_real INTEGER;
  v_with_fallback INTEGER;
  v_total INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total FROM delivery_requests;
  SELECT COUNT(*) INTO v_with_real FROM delivery_requests 
    WHERE order_number IS NOT NULL 
      AND order_number != '' 
      AND order_number NOT LIKE 'PO-%';
  SELECT COUNT(*) INTO v_with_fallback FROM delivery_requests 
    WHERE order_number LIKE 'PO-%' OR order_number IS NULL OR order_number = '';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICATION RESULTS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total delivery_requests: %', v_total;
  RAISE NOTICE 'With REAL order numbers: %', v_with_real;
  RAISE NOTICE 'With fallback/missing: %', v_with_fallback;
  RAISE NOTICE '';
  RAISE NOTICE 'Sample delivery_requests with order_number:';
  
  FOR v_sample IN
    SELECT dr.id, dr.order_number, dr.status, dr.provider_id
    FROM delivery_requests dr
    WHERE dr.order_number IS NOT NULL AND dr.order_number != ''
    ORDER BY dr.created_at DESC
    LIMIT 10
  LOOP
    RAISE NOTICE '  % | Order: % | Status: %', 
      v_sample.id::TEXT, 
      COALESCE(v_sample.order_number, 'NULL'),
      v_sample.status;
  END LOOP;
  
  RAISE NOTICE '========================================';
END $$;

-- ============================================================
-- Migration Complete
-- ============================================================

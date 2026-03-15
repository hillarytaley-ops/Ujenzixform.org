-- ============================================================
-- Recover and Protect Delivery Addresses
-- Created: March 16, 2026
-- ============================================================
-- This migration:
-- 1. Attempts to recover real addresses from purchase_orders for delivery_requests with placeholders
-- 2. Adds a trigger to prevent real addresses from being overwritten with placeholders
-- 3. Adds logging to track address changes

DO $$
DECLARE
  dr_record RECORD;
  po_address TEXT;
  recovered_count INTEGER := 0;
  placeholder_patterns TEXT[] := ARRAY[
    'to be provided', 'tbd', 't.b.d.', 'n/a', 'na', 'tba', 
    'to be determined', 'delivery location', 'address not found',
    'address not specified by builder'
  ];
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Starting recovery of delivery addresses...';
  RAISE NOTICE '========================================';
  
  -- Find delivery_requests with placeholder addresses that have a purchase_order_id
  FOR dr_record IN
    SELECT 
      dr.id,
      dr.delivery_address,
      dr.purchase_order_id,
      dr.status,
      dr.created_at
    FROM delivery_requests dr
    WHERE 
      dr.delivery_address IS NOT NULL
      AND LOWER(TRIM(dr.delivery_address)) = ANY(
        SELECT LOWER(TRIM(unnest(placeholder_patterns)))
      )
      AND dr.purchase_order_id IS NOT NULL
      AND dr.status IN ('pending', 'requested', 'assigned', 'accepted', 'scheduled')
  LOOP
    RAISE NOTICE '----------------------------------------';
    RAISE NOTICE 'Processing delivery_request: % (Status: %)', dr_record.id, dr_record.status;
    RAISE NOTICE '  Current delivery_address: "%"', dr_record.delivery_address;
    RAISE NOTICE '  Purchase Order ID: %', dr_record.purchase_order_id;
    
    -- Try to get real address from purchase_order
    SELECT delivery_address INTO po_address
    FROM purchase_orders
    WHERE id = dr_record.purchase_order_id;
    
    IF po_address IS NOT NULL 
       AND TRIM(po_address) != ''
       AND LOWER(TRIM(po_address)) NOT IN (
         SELECT LOWER(TRIM(unnest(placeholder_patterns)))
       )
       AND LENGTH(TRIM(po_address)) > 10 THEN
      
      -- Found a real address in purchase_order - recover it
      UPDATE delivery_requests
      SET 
        delivery_address = TRIM(po_address),
        updated_at = NOW()
      WHERE id = dr_record.id;
      
      recovered_count := recovered_count + 1;
      RAISE NOTICE '  ✅ RECOVERED: Updated delivery_request % with address from purchase_order: "%"', 
        dr_record.id, SUBSTRING(TRIM(po_address), 1, 50);
    ELSE
      RAISE NOTICE '  ⚠️ SKIPPED: Purchase order has no valid address (address: "%")', 
        COALESCE(po_address, 'NULL');
    END IF;
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Recovery completed: % delivery requests recovered', recovered_count;
  RAISE NOTICE '========================================';
END $$;

-- Create trigger to prevent address overwrite (from previous migration)
-- This is already created in 20260316_prevent_delivery_address_overwrite.sql
-- But we'll ensure it exists here as well

CREATE OR REPLACE FUNCTION prevent_delivery_address_overwrite()
RETURNS TRIGGER AS $$
BEGIN
  -- If the NEW delivery_address is a placeholder and OLD delivery_address was NOT a placeholder,
  -- prevent the update (this protects real addresses from being overwritten)
  IF NEW.delivery_address IS NOT NULL AND OLD.delivery_address IS NOT NULL THEN
    -- Check if NEW is a placeholder
    IF LOWER(TRIM(NEW.delivery_address)) IN (
      'to be provided', 'tbd', 't.b.d.', 'n/a', 'na', 'tba', 
      'to be determined', 'delivery location', 'address not found',
      'address not specified by builder'
    ) THEN
      -- Check if OLD was NOT a placeholder (had a real address)
      IF LOWER(TRIM(OLD.delivery_address)) NOT IN (
        'to be provided', 'tbd', 't.b.d.', 'n/a', 'na', 'tba', 
        'to be determined', 'delivery location', 'address not found',
        'address not specified by builder'
      ) AND LENGTH(TRIM(OLD.delivery_address)) > 10 THEN
        -- Prevent overwriting a real address with a placeholder
        RAISE EXCEPTION 'Cannot overwrite real delivery address (%) with placeholder (%). Once a builder provides a real address, it cannot be replaced with a placeholder.', 
          OLD.delivery_address, NEW.delivery_address;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS prevent_delivery_address_overwrite_trigger ON delivery_requests;
CREATE TRIGGER prevent_delivery_address_overwrite_trigger
  BEFORE UPDATE OF delivery_address ON delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION prevent_delivery_address_overwrite();

-- Add comment
COMMENT ON FUNCTION prevent_delivery_address_overwrite() IS 'Prevents real delivery addresses from being overwritten with placeholder values like "To be provided". Once a builder provides a real address, it is protected.';

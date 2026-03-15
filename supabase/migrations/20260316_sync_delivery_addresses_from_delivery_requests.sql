-- ============================================================
-- Sync Delivery Addresses from delivery_requests to purchase_orders
-- Created: March 16, 2026
-- ============================================================
-- This migration updates purchase_orders.delivery_address with the real address
-- from delivery_requests when the purchase_order has a placeholder

DO $$
DECLARE
  po_record RECORD;
  dr_address TEXT;
  updated_count INTEGER := 0;
  rows_updated INTEGER;
  placeholder_patterns TEXT[] := ARRAY[
    'to be provided', 'tbd', 't.b.d.', 'n/a', 'na', 'tba', 
    'to be determined', 'delivery location', 'address not found',
    'address not specified by builder'
  ];
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Syncing delivery addresses from delivery_requests to purchase_orders...';
  RAISE NOTICE '========================================';
  
  -- Find purchase_orders with placeholder addresses that have delivery_requests with real addresses
  FOR po_record IN
    SELECT DISTINCT ON (po.id)
      po.id,
      po.po_number,
      po.delivery_address AS po_address,
      dr.delivery_address AS dr_address,
      dr.id AS dr_id,
      dr.status AS dr_status,
      dr.created_at -- CRITICAL: Must be in SELECT list for ORDER BY
    FROM purchase_orders po
    INNER JOIN delivery_requests dr ON dr.purchase_order_id = po.id
    WHERE 
      -- Purchase order has placeholder
      po.delivery_address IS NOT NULL
      AND LOWER(TRIM(po.delivery_address)) = ANY(
        SELECT LOWER(TRIM(unnest(placeholder_patterns)))
      )
      -- Delivery request has real address (not placeholder)
      AND dr.delivery_address IS NOT NULL
      AND LOWER(TRIM(dr.delivery_address)) NOT IN (
        SELECT LOWER(TRIM(unnest(placeholder_patterns)))
      )
      AND LENGTH(TRIM(dr.delivery_address)) > 10
      -- Only active delivery requests
      AND dr.status IN ('pending', 'requested', 'assigned', 'accepted', 'scheduled', 'in_transit', 'picked_up', 'out_for_delivery')
    ORDER BY po.id, dr.created_at DESC -- CRITICAL: dr.created_at must be in SELECT list above
  LOOP
    RAISE NOTICE '----------------------------------------';
    RAISE NOTICE 'Processing purchase_order: % (PO: %)', po_record.id, po_record.po_number;
    RAISE NOTICE '  Current PO address: "%"', po_record.po_address;
    RAISE NOTICE '  Delivery request address: "%"', SUBSTRING(po_record.dr_address, 1, 60);
    RAISE NOTICE '  Delivery request ID: % (Status: %)', po_record.dr_id, po_record.dr_status;
    
    -- Update purchase_order with real address from delivery_request
    UPDATE purchase_orders
    SET 
      delivery_address = TRIM(po_record.dr_address),
      updated_at = NOW()
    WHERE id = po_record.id;
    
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    updated_count := updated_count + rows_updated;
    
    IF rows_updated > 0 THEN
      RAISE NOTICE '  ✅ SYNCED: Updated purchase_order % with address from delivery_request', po_record.id;
    ELSE
      RAISE NOTICE '  ⚠️ SKIPPED: Could not update purchase_order %', po_record.id;
    END IF;
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Sync completed: % purchase_orders updated', updated_count;
  RAISE NOTICE '========================================';
END $$;

-- Also create a trigger to automatically sync addresses when delivery_request is created/updated
CREATE OR REPLACE FUNCTION sync_delivery_address_to_purchase_order()
RETURNS TRIGGER AS $$
DECLARE
  is_placeholder BOOLEAN;
  existing_po_address TEXT;
  is_existing_placeholder BOOLEAN;
BEGIN
  -- Only sync if delivery_request has a real address (not placeholder)
  IF NEW.delivery_address IS NOT NULL AND NEW.purchase_order_id IS NOT NULL THEN
    -- Check if new address is a placeholder
    is_placeholder := LOWER(TRIM(NEW.delivery_address)) IN (
      'to be provided', 'tbd', 't.b.d.', 'n/a', 'na', 'tba', 
      'to be determined', 'delivery location', 'address not found',
      'address not specified by builder'
    );
    
    -- Only sync if it's NOT a placeholder and has reasonable length
    IF NOT is_placeholder AND LENGTH(TRIM(NEW.delivery_address)) > 10 THEN
      -- Get existing purchase_order address
      SELECT delivery_address INTO existing_po_address
      FROM purchase_orders
      WHERE id = NEW.purchase_order_id;
      
      -- Check if existing is a placeholder
      is_existing_placeholder := existing_po_address IS NULL OR
        LOWER(TRIM(existing_po_address)) IN (
          'to be provided', 'tbd', 't.b.d.', 'n/a', 'na', 'tba', 
          'to be determined', 'delivery location', 'address not found'
        ) OR
        LENGTH(TRIM(existing_po_address)) <= 10;
      
      -- Only update if existing is placeholder or doesn't exist
      IF is_existing_placeholder THEN
        UPDATE purchase_orders
        SET 
          delivery_address = TRIM(NEW.delivery_address),
          updated_at = NOW()
        WHERE id = NEW.purchase_order_id;
        
        RAISE NOTICE '✅ Auto-synced delivery_address from delivery_request % to purchase_order %', NEW.id, NEW.purchase_order_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-sync on INSERT and UPDATE
DROP TRIGGER IF EXISTS sync_delivery_address_trigger ON delivery_requests;
CREATE TRIGGER sync_delivery_address_trigger
  AFTER INSERT OR UPDATE OF delivery_address ON delivery_requests
  FOR EACH ROW
  WHEN (NEW.delivery_address IS NOT NULL AND NEW.purchase_order_id IS NOT NULL)
  EXECUTE FUNCTION sync_delivery_address_to_purchase_order();

-- Add comment
COMMENT ON FUNCTION sync_delivery_address_to_purchase_order() IS 'Automatically syncs real delivery addresses from delivery_requests to purchase_orders when a builder provides an address. Only updates if purchase_order has a placeholder.';

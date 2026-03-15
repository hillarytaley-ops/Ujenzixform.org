-- ============================================================
-- Diagnose and Fix NULL Delivery Addresses
-- Created: March 16, 2026
-- ============================================================
-- This migration:
-- 1. Finds delivery_requests with NULL delivery_address
-- 2. Attempts to recover addresses from purchase_orders or delivery_coordinates
-- 3. Logs diagnostic information about why addresses might be missing

DO $$
DECLARE
  dr_record RECORD;
  recovered_address TEXT;
  recovered_count INTEGER := 0;
  still_null_count INTEGER := 0;
  placeholder_patterns TEXT[] := ARRAY[
    'to be provided', 'tbd', 't.b.d.', 'n/a', 'na', 'tba', 
    'to be determined', 'delivery location', 'address not found',
    'address not specified by builder'
  ];
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Diagnosing NULL delivery_addresses in delivery_requests...';
  RAISE NOTICE '========================================';
  
  -- Find all delivery_requests with NULL delivery_address
  FOR dr_record IN
    SELECT 
      dr.id,
      dr.delivery_address,
      dr.delivery_coordinates,
      dr.purchase_order_id,
      dr.status,
      dr.created_at,
      dr.updated_at,
      po.delivery_address AS po_delivery_address,
      po.po_number,
      po.id AS po_id
    FROM delivery_requests dr
    LEFT JOIN purchase_orders po ON dr.purchase_order_id = po.id
    WHERE 
      dr.delivery_address IS NULL
      AND dr.status IN ('pending', 'requested', 'assigned', 'accepted', 'scheduled', 'in_transit', 'picked_up', 'out_for_delivery')
    ORDER BY dr.created_at DESC
  LOOP
    RAISE NOTICE '----------------------------------------';
    RAISE NOTICE 'Processing delivery_request: % (Status: %)', dr_record.id, dr_record.status;
    RAISE NOTICE '  Created: %', dr_record.created_at;
    RAISE NOTICE '  Updated: %', dr_record.updated_at;
    RAISE NOTICE '  Purchase Order: % (ID: %)', COALESCE(dr_record.po_number, 'N/A'), COALESCE(dr_record.purchase_order_id::TEXT, 'NULL');
    RAISE NOTICE '  Delivery Coordinates: %', COALESCE(dr_record.delivery_coordinates, 'NULL');
    
    recovered_address := NULL;
    
    -- Try 1: Get address from purchase_order
    IF dr_record.purchase_order_id IS NOT NULL AND dr_record.po_delivery_address IS NOT NULL THEN
      RAISE NOTICE '  Purchase Order Address: "%"', dr_record.po_delivery_address;
      
      -- Check if purchase_order address is valid (not a placeholder)
      IF LOWER(TRIM(dr_record.po_delivery_address)) NOT IN (
        SELECT LOWER(TRIM(unnest(placeholder_patterns)))
      ) AND LENGTH(TRIM(dr_record.po_delivery_address)) > 10 THEN
        recovered_address := TRIM(dr_record.po_delivery_address);
        RAISE NOTICE '  ✅ Found valid address from purchase_order: "%"', SUBSTRING(recovered_address, 1, 60);
      ELSE
        RAISE NOTICE '  ⚠️ Purchase order address is placeholder or invalid: "%"', dr_record.po_delivery_address;
      END IF;
    ELSE
      IF dr_record.purchase_order_id IS NULL THEN
        RAISE NOTICE '  ⚠️ No purchase_order_id - cannot recover from purchase_order';
      ELSE
        RAISE NOTICE '  ⚠️ Purchase order not found or has no delivery_address';
      END IF;
    END IF;
    
    -- Try 2: Use delivery_coordinates if no address found
    IF recovered_address IS NULL AND dr_record.delivery_coordinates IS NOT NULL 
       AND TRIM(dr_record.delivery_coordinates) != '' THEN
      recovered_address := TRIM(dr_record.delivery_coordinates);
      RAISE NOTICE '  ✅ Using delivery_coordinates as address: "%"', recovered_address;
    END IF;
    
    -- Try 3: Combine coordinates with purchase_order address if both exist
    IF recovered_address IS NOT NULL 
       AND dr_record.delivery_coordinates IS NOT NULL 
       AND TRIM(dr_record.delivery_coordinates) != ''
       AND NOT (recovered_address LIKE '%' || TRIM(dr_record.delivery_coordinates) || '%') THEN
      recovered_address := TRIM(dr_record.delivery_coordinates) || ' | ' || recovered_address;
      RAISE NOTICE '  ✅ Combined coordinates with address: "%"', SUBSTRING(recovered_address, 1, 60);
    END IF;
    
    -- Update if we found a valid address
    IF recovered_address IS NOT NULL AND TRIM(recovered_address) != '' THEN
      UPDATE delivery_requests
      SET 
        delivery_address = TRIM(recovered_address),
        updated_at = NOW()
      WHERE id = dr_record.id;
      
      GET DIAGNOSTICS recovered_count = recovered_count + ROW_COUNT;
      RAISE NOTICE '  ✅✅✅ RECOVERED: Updated delivery_request % with address: "%"', 
        dr_record.id, SUBSTRING(TRIM(recovered_address), 1, 60);
    ELSE
      still_null_count := still_null_count + 1;
      RAISE NOTICE '  ❌❌❌ CANNOT RECOVER: No valid address found for delivery_request %', dr_record.id;
      RAISE NOTICE '     Builder must provide address manually.';
    END IF;
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Diagnosis and recovery completed:';
  RAISE NOTICE '  ✅ Recovered: % delivery requests', recovered_count;
  RAISE NOTICE '  ❌ Still NULL: % delivery requests (builder must provide)', still_null_count;
  RAISE NOTICE '========================================';
END $$;

-- Also check for delivery_requests with empty string addresses (treat as NULL)
DO $$
DECLARE
  empty_count INTEGER := 0;
BEGIN
  UPDATE delivery_requests
  SET 
    delivery_address = NULL,
    updated_at = NOW()
  WHERE 
    (delivery_address = '' OR TRIM(delivery_address) = '')
    AND status IN ('pending', 'requested', 'assigned', 'accepted', 'scheduled', 'in_transit', 'picked_up', 'out_for_delivery');
  
  GET DIAGNOSTICS empty_count = ROW_COUNT;
  
  IF empty_count > 0 THEN
    RAISE NOTICE '✅ Cleaned up % delivery requests with empty string addresses (set to NULL).', empty_count;
  END IF;
END $$;

-- Migration: Update placeholder addresses in delivery_requests to fetch from purchase_orders
-- This ensures that delivery requests with placeholder addresses get the actual address from the purchase order
-- Created: 2026-03-16

DO $$
DECLARE
  placeholder_patterns TEXT[] := ARRAY[
    'To be provided',
    'to be provided',
    'TO BE PROVIDED',
    'TBD',
    'tbd',
    'T.B.D.',
    'N/A',
    'n/a',
    'NA',
    'na',
    'TBA',
    'tba',
    'To be determined',
    'to be determined',
    'Delivery location',
    'delivery location',
    'Address not found',
    'address not found',
    'Address not specified by builder',
    'address not specified by builder'
  ];
  
  dr_record RECORD;
  real_address TEXT;
  updated_count INTEGER := 0;
  no_address_count INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Updating placeholder addresses in delivery_requests...';
  RAISE NOTICE '========================================';
  
  -- Find all delivery_requests with placeholder addresses that have a purchase_order_id
  FOR dr_record IN
    SELECT 
      dr.id,
      dr.delivery_address,
      dr.purchase_order_id,
      dr.status,
      dr.delivery_coordinates,
      po.delivery_address AS po_delivery_address,
      po.po_number
    FROM delivery_requests dr
    LEFT JOIN purchase_orders po ON dr.purchase_order_id = po.id
    WHERE 
      dr.delivery_address IS NOT NULL
      AND (
        -- Check for exact placeholder matches
        LOWER(TRIM(dr.delivery_address)) = ANY(
          SELECT LOWER(TRIM(unnest(placeholder_patterns)))
        )
        -- Or check if it's just whitespace/empty after trimming
        OR TRIM(dr.delivery_address) = ''
      )
      -- Only update active/pending requests (not delivered/cancelled)
      AND dr.status IN ('pending', 'requested', 'assigned', 'accepted', 'scheduled', 'in_transit', 'picked_up', 'out_for_delivery')
  LOOP
    RAISE NOTICE '----------------------------------------';
    RAISE NOTICE 'Processing delivery_request: %', dr_record.id;
    RAISE NOTICE '  Current address: "%"', dr_record.delivery_address;
    RAISE NOTICE '  Status: %', dr_record.status;
    RAISE NOTICE '  Purchase Order: %', COALESCE(dr_record.po_number, 'NULL') || ' (' || COALESCE(dr_record.purchase_order_id::TEXT, 'NULL') || ')';
    
    -- Try to get real address from purchase_order or delivery_coordinates
    real_address := NULL;
    
    IF dr_record.purchase_order_id IS NOT NULL THEN
      -- First, try purchase_order.delivery_address (if it's not a placeholder)
      IF dr_record.po_delivery_address IS NOT NULL 
         AND TRIM(dr_record.po_delivery_address) != ''
         AND NOT (LOWER(TRIM(dr_record.po_delivery_address)) = ANY(SELECT LOWER(TRIM(unnest(placeholder_patterns))))) THEN
        real_address := TRIM(dr_record.po_delivery_address);
        RAISE NOTICE '  ✅ Found real address from purchase_order: "%"', real_address;
      END IF;
      
      -- If still no address, try to get from delivery_coordinates if available
      IF real_address IS NULL AND dr_record.delivery_coordinates IS NOT NULL AND TRIM(dr_record.delivery_coordinates) != '' THEN
        real_address := TRIM(dr_record.delivery_coordinates);
        RAISE NOTICE '  ✅ Found coordinates: "%"', real_address;
      END IF;
    END IF;
    
    -- If we found a real address, update the delivery_request
    IF real_address IS NOT NULL AND TRIM(real_address) != '' THEN
      UPDATE delivery_requests
      SET 
        delivery_address = real_address,
        updated_at = NOW()
      WHERE id = dr_record.id;
      
      GET DIAGNOSTICS updated_count = updated_count + ROW_COUNT;
      RAISE NOTICE '  ✅ UPDATED: Replaced placeholder with real address: "%"', real_address;
    ELSE
      -- No real address found - set to NULL so builder can provide it
      UPDATE delivery_requests
      SET 
        delivery_address = NULL,
        updated_at = NOW()
      WHERE id = dr_record.id;
      
      RAISE NOTICE '  ⚠️ WARNING: No real address found for delivery (ID: %) - set to NULL. Builder must provide address.', dr_record.id;
      no_address_count := no_address_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Update process completed:';
  RAISE NOTICE '  ✅ Updated: % delivery requests', updated_count;
  RAISE NOTICE '  ⚠️ Set to NULL: % deliveries without address (builder must provide)', no_address_count;
  RAISE NOTICE '========================================';
END $$;

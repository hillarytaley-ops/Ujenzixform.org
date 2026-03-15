-- ============================================================
-- Replace "To be provided" placeholder addresses with real addresses
-- Created: March 16, 2026
-- ============================================================

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
    'address not found'
  ];
  
  dr_record RECORD;
  real_address TEXT;
  updated_count INTEGER := 0;
  deleted_count INTEGER := 0;
  no_address_count INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Starting replacement of placeholder delivery addresses...';
  RAISE NOTICE '========================================';
  
  -- Find all delivery_requests with placeholder addresses
  FOR dr_record IN
    SELECT 
      dr.id,
      dr.delivery_address,
      dr.purchase_order_id,
      dr.status,
      dr.created_at,
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
    RAISE NOTICE '  Purchase Order: %', dr_record.po_number || ' (' || COALESCE(dr_record.purchase_order_id::TEXT, 'NULL') || ')';
    
    -- Try to get real address from purchase_order
    real_address := NULL;
    
    IF dr_record.purchase_order_id IS NOT NULL THEN
      -- First, try purchase_order.delivery_address
      IF dr_record.po_delivery_address IS NOT NULL 
         AND TRIM(dr_record.po_delivery_address) != ''
         AND LOWER(TRIM(dr_record.po_delivery_address)) != 'to be provided'
         AND LOWER(TRIM(dr_record.po_delivery_address)) != 'tbd'
         AND LOWER(TRIM(dr_record.po_delivery_address)) != 'n/a' THEN
        real_address := TRIM(dr_record.po_delivery_address);
        RAISE NOTICE '  ✅ Found real address from purchase_order: "%"', real_address;
      END IF;
      
      -- If still no address, try to get from delivery_coordinates if available
      IF real_address IS NULL THEN
        SELECT delivery_coordinates INTO real_address
        FROM delivery_requests
        WHERE id = dr_record.id
          AND delivery_coordinates IS NOT NULL
          AND TRIM(delivery_coordinates) != '';
        
        IF real_address IS NOT NULL THEN
          RAISE NOTICE '  ✅ Found coordinates: "%"', real_address;
        END IF;
      END IF;
    END IF;
    
    -- If we found a real address, update the delivery_request
    IF real_address IS NOT NULL AND TRIM(real_address) != '' THEN
      UPDATE delivery_requests
      SET 
        delivery_address = real_address,
        updated_at = NOW()
      WHERE id = dr_record.id;
      
      GET DIAGNOSTICS updated_count = ROW_COUNT;
      RAISE NOTICE '  ✅ UPDATED: Replaced placeholder with real address: "%"', real_address;
      updated_count := updated_count + 1;
    ELSE
      -- No real address found - mark for deletion or set to NULL
      -- CRITICAL: Only delete if status is pending/requested (not yet accepted)
      -- For accepted/scheduled deliveries, we should keep them but mark as needing address
      IF dr_record.status IN ('pending', 'requested') THEN
        -- Delete pending requests without addresses (they're invalid)
        DELETE FROM delivery_requests WHERE id = dr_record.id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE '  🗑️ DELETED: No real address found and status is pending/requested - deleted invalid delivery request';
        deleted_count := deleted_count + 1;
      ELSE
        -- For accepted/scheduled deliveries, set to NULL and log warning
        UPDATE delivery_requests
        SET 
          delivery_address = NULL,
          updated_at = NOW()
        WHERE id = dr_record.id;
        
        RAISE NOTICE '  ⚠️ WARNING: No real address found for accepted delivery (ID: %) - set to NULL. Builder must provide address.', dr_record.id;
        no_address_count := no_address_count + 1;
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Replacement process completed:';
  RAISE NOTICE '  ✅ Updated: % delivery requests', updated_count;
  RAISE NOTICE '  🗑️ Deleted: % invalid delivery requests (pending without address)', deleted_count;
  RAISE NOTICE '  ⚠️ Set to NULL: % accepted deliveries without address', no_address_count;
  RAISE NOTICE '========================================';
END $$;

-- Also clean up any delivery_requests that have empty or whitespace-only addresses
DO $$
DECLARE
  cleaned_count INTEGER := 0;
BEGIN
  -- Update empty/whitespace addresses to NULL for pending requests
  UPDATE delivery_requests
  SET 
    delivery_address = NULL,
    updated_at = NOW()
  WHERE 
    (delivery_address IS NULL OR TRIM(delivery_address) = '')
    AND status IN ('pending', 'requested');
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  IF cleaned_count > 0 THEN
    RAISE NOTICE '✅ Cleaned up % delivery requests with empty addresses', cleaned_count;
  END IF;
END $$;

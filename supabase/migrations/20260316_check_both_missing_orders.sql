-- ============================================================
-- Diagnostic Query: Check BOTH missing orders
-- Orders: QR-1773490484717-QHDSE and QR-1773487443217-4GJMG
-- Created: March 16, 2026
-- ============================================================

-- Check for BOTH orders
DO $$
DECLARE
  po_record RECORD;
  dr_record RECORD;
  order_numbers TEXT[] := ARRAY['QR-1773490484717-QHDSE', 'QR-1773487443217-4GJMG'];
  order_num TEXT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Checking for BOTH missing orders...';
  RAISE NOTICE '========================================';
  
  FOREACH order_num IN ARRAY order_numbers
  LOOP
    RAISE NOTICE '';
    RAISE NOTICE '--- Checking order: % ---', order_num;
    
    -- Find purchase_order by po_number
    SELECT id, po_number, status, delivery_required, delivery_address, created_at
    INTO po_record
    FROM purchase_orders
    WHERE po_number = order_num
       OR po_number ILIKE '%' || order_num || '%'
    LIMIT 1;
    
    IF po_record.id IS NOT NULL THEN
      RAISE NOTICE '✅ Found purchase_order:';
      RAISE NOTICE '   ID: %', po_record.id;
      RAISE NOTICE '   po_number: %', po_record.po_number;
      RAISE NOTICE '   status: %', po_record.status;
      RAISE NOTICE '   delivery_required: %', po_record.delivery_required;
      RAISE NOTICE '   delivery_address: %', po_record.delivery_address;
      RAISE NOTICE '   created_at: %', po_record.created_at;
      
      -- Check for delivery_requests for this purchase_order
      SELECT id, status, provider_id, delivery_address, builder_id, created_at, pickup_address
      INTO dr_record
      FROM delivery_requests
      WHERE purchase_order_id = po_record.id
      ORDER BY created_at DESC
      LIMIT 1;
      
      IF dr_record.id IS NOT NULL THEN
        RAISE NOTICE '✅ Found delivery_request:';
        RAISE NOTICE '   ID: %', dr_record.id;
        RAISE NOTICE '   status: %', dr_record.status;
        RAISE NOTICE '   provider_id: %', dr_record.provider_id;
        RAISE NOTICE '   delivery_address: %', dr_record.delivery_address;
        RAISE NOTICE '   pickup_address: %', dr_record.pickup_address;
        RAISE NOTICE '   builder_id: %', dr_record.builder_id;
        RAISE NOTICE '   created_at: %', dr_record.created_at;
        
        -- Check if address is valid
        IF dr_record.delivery_address IS NULL OR 
           dr_record.delivery_address = '' OR
           LOWER(TRIM(dr_record.delivery_address)) = 'to be provided' OR
           LOWER(TRIM(dr_record.delivery_address)) = 'tbd' OR
           LOWER(TRIM(dr_record.delivery_address)) = 'n/a' THEN
          RAISE NOTICE '⚠️ WARNING: delivery_address is INVALID/PLACEHOLDER - will be filtered out!';
        ELSE
          RAISE NOTICE '✅ delivery_address is VALID';
        END IF;
        
        -- Check if status allows it to appear in Alerts tab
        IF dr_record.status NOT IN ('pending', 'assigned', 'requested') THEN
          RAISE NOTICE '⚠️ WARNING: status is "%" - will NOT appear in Alerts tab (only pending/assigned/requested appear)', dr_record.status;
        ELSE
          RAISE NOTICE '✅ status allows it to appear in Alerts tab';
        END IF;
        
        -- Check if provider_id is set (if set, might be filtered)
        IF dr_record.provider_id IS NOT NULL THEN
          RAISE NOTICE '⚠️ WARNING: provider_id is set to "%" - might be filtered if it matches current provider', dr_record.provider_id;
        ELSE
          RAISE NOTICE '✅ provider_id is NULL - should appear for all providers';
        END IF;
        
      ELSE
        RAISE NOTICE '❌ NO delivery_request found for purchase_order %!', po_record.id;
        RAISE NOTICE '   This means the delivery request was never created or was deleted.';
      END IF;
    ELSE
      RAISE NOTICE '❌ Purchase_order NOT found with po_number: %', order_num;
      RAISE NOTICE '   Trying broader search...';
      
      -- Try broader search
      SELECT COUNT(*) INTO po_record.id
      FROM purchase_orders
      WHERE po_number ILIKE '%' || SPLIT_PART(order_num, '-', 2) || '%';
      
      RAISE NOTICE '   Found % purchase_orders with similar pattern', po_record.id;
    END IF;
  END LOOP;
END $$;

-- Check RLS policies
DO $$
DECLARE
  policy_rec RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Checking RLS policies for delivery_requests...';
  RAISE NOTICE '========================================';
  
  -- List all policies
  FOR policy_rec IN 
    SELECT policyname, cmd, qual 
    FROM pg_policies 
    WHERE tablename = 'delivery_requests' AND schemaname = 'public'
    ORDER BY policyname
  LOOP
    RAISE NOTICE 'Policy: % (Command: %)', policy_rec.policyname, policy_rec.cmd;
    RAISE NOTICE '  Condition: %', policy_rec.qual;
  END LOOP;
END $$;

-- ============================================================
-- Migration Complete
-- ============================================================

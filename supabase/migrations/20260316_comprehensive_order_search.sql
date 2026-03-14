-- ============================================================
-- Comprehensive Diagnostic: Search for missing orders
-- This will search more broadly and list recent orders
-- Created: March 16, 2026
-- ============================================================

-- First, let's see ALL recent purchase_orders to understand what's in the database
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 1: Listing ALL recent purchase_orders (last 24 hours)';
  RAISE NOTICE '========================================';
END $$;

SELECT 
  id,
  po_number,
  status,
  delivery_required,
  delivery_address,
  created_at
FROM purchase_orders
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;

-- Now search for the specific orders with multiple patterns
DO $$
DECLARE
  po_record RECORD;
  dr_record RECORD;
  dr_count INTEGER;
  partial_count INTEGER;
  search_patterns TEXT[] := ARRAY[
    'QR-1773490484717-QHDSE',
    '1773490484717',
    'QHDSE',
    'QR-1773487443217-4GJMG',
    '1773487443217',
    '4GJMG'
  ];
  pattern TEXT;
  found_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 2: Searching for specific orders with multiple patterns';
  RAISE NOTICE '========================================';
  
  FOREACH pattern IN ARRAY search_patterns
  LOOP
    RAISE NOTICE '';
    RAISE NOTICE '--- Searching for pattern: % ---', pattern;
    
    -- Try exact match first
    SELECT id, po_number, status, delivery_required, delivery_address, created_at
    INTO po_record
    FROM purchase_orders
    WHERE po_number = pattern
    LIMIT 1;
    
    IF po_record.id IS NOT NULL THEN
      found_count := found_count + 1;
      RAISE NOTICE '✅ FOUND (exact match):';
      RAISE NOTICE '   ID: %', po_record.id;
      RAISE NOTICE '   po_number: %', po_record.po_number;
      RAISE NOTICE '   status: %', po_record.status;
      RAISE NOTICE '   delivery_address: %', po_record.delivery_address;
      
      -- Check for delivery_requests
      SELECT COUNT(*) INTO dr_count
      FROM delivery_requests
      WHERE purchase_order_id = po_record.id;
      
      RAISE NOTICE '   delivery_requests count: %', dr_count;
      
      IF dr_count > 0 THEN
        SELECT id, status, provider_id, delivery_address, created_at
        INTO dr_record
        FROM delivery_requests
        WHERE purchase_order_id = po_record.id
        ORDER BY created_at DESC
        LIMIT 1;
        
        RAISE NOTICE '   Latest delivery_request:';
        RAISE NOTICE '     ID: %', dr_record.id;
        RAISE NOTICE '     status: %', dr_record.status;
        RAISE NOTICE '     provider_id: %', dr_record.provider_id;
        RAISE NOTICE '     delivery_address: %', dr_record.delivery_address;
      END IF;
    ELSE
      -- Try partial match
      SELECT COUNT(*) INTO partial_count
      FROM purchase_orders
      WHERE po_number ILIKE '%' || pattern || '%';
      
      IF partial_count > 0 THEN
        RAISE NOTICE '   Found % purchase_orders with pattern "%" (partial match)', partial_count, pattern;
        
        -- Show the matches
        FOR po_record IN 
          SELECT id, po_number, status, delivery_address
          FROM purchase_orders
          WHERE po_number ILIKE '%' || pattern || '%'
          LIMIT 5
        LOOP
          RAISE NOTICE '     - ID: %, po_number: %, status: %', 
            po_record.id, po_record.po_number, po_record.status;
        END LOOP;
      ELSE
        RAISE NOTICE '   ❌ No matches found for pattern: %', pattern;
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 3: Summary';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total exact matches found: %', found_count;
  
  IF found_count = 0 THEN
    RAISE NOTICE '⚠️ WARNING: No purchase_orders found with the exact po_numbers!';
    RAISE NOTICE '   This means either:';
    RAISE NOTICE '   1. The orders were never created';
    RAISE NOTICE '   2. The orders have different po_numbers';
    RAISE NOTICE '   3. The orders were deleted';
  END IF;
END $$;

-- Check ALL pending delivery_requests to see what's actually there
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 4: Listing ALL pending delivery_requests (last 24 hours)';
  RAISE NOTICE '========================================';
END $$;

SELECT 
  dr.id,
  dr.purchase_order_id,
  dr.status,
  dr.provider_id,
  dr.delivery_address,
  dr.created_at,
  po.po_number
FROM delivery_requests dr
LEFT JOIN purchase_orders po ON dr.purchase_order_id = po.id
WHERE dr.created_at >= NOW() - INTERVAL '24 hours'
  AND dr.status IN ('pending', 'assigned', 'requested')
ORDER BY dr.created_at DESC
LIMIT 20;

-- ============================================================
-- Diagnostic Complete
-- ============================================================

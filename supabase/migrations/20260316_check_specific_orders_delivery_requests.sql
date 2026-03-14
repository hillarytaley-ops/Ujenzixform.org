-- ============================================================
-- Check Specific Orders and Their Delivery Requests
-- Check for QR-1773490484717-QHDSE and QR-1773487443217-4GJMG
-- Created: March 16, 2026
-- ============================================================

DO $$
DECLARE
  po_record RECORD;
  dr_record RECORD;
  dr_count INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Checking Order: QR-1773490484717-QHDSE';
  RAISE NOTICE '========================================';
  
  -- Find purchase_order by po_number
  SELECT id, po_number, status, delivery_required, delivery_address, created_at
  INTO po_record
  FROM purchase_orders
  WHERE po_number = 'QR-1773490484717-QHDSE'
  LIMIT 1;
  
  IF po_record.id IS NOT NULL THEN
    RAISE NOTICE '✅ Found purchase_order:';
    RAISE NOTICE '   ID: %', po_record.id;
    RAISE NOTICE '   po_number: %', po_record.po_number;
    RAISE NOTICE '   status: %', po_record.status;
    RAISE NOTICE '   delivery_required: %', po_record.delivery_required;
    RAISE NOTICE '   delivery_address: %', po_record.delivery_address;
    RAISE NOTICE '   created_at: %', po_record.created_at;
    
    -- Check for delivery_requests
    SELECT COUNT(*) INTO dr_count
    FROM delivery_requests
    WHERE purchase_order_id = po_record.id;
    
    RAISE NOTICE '   delivery_requests count: %', dr_count;
    
    IF dr_count > 0 THEN
      RAISE NOTICE '';
      RAISE NOTICE '   Delivery Requests:';
      FOR dr_record IN
        SELECT id, status, provider_id, delivery_address, builder_id, created_at, rejection_reason
        FROM delivery_requests
        WHERE purchase_order_id = po_record.id
        ORDER BY created_at DESC
      LOOP
        RAISE NOTICE '     - ID: %', dr_record.id;
        RAISE NOTICE '       Status: %', dr_record.status;
        RAISE NOTICE '       Provider ID: %', dr_record.provider_id;
        RAISE NOTICE '       Delivery Address: %', dr_record.delivery_address;
        RAISE NOTICE '       Builder ID: %', dr_record.builder_id;
        RAISE NOTICE '       Created: %', dr_record.created_at;
        IF dr_record.rejection_reason THEN
          RAISE NOTICE '       Rejection Reason: %', dr_record.rejection_reason;
        END IF;
      END LOOP;
    ELSE
      RAISE NOTICE '   ❌ NO delivery_requests found for this purchase_order!';
    END IF;
  ELSE
    RAISE NOTICE '❌ Purchase_order NOT found with po_number: QR-1773490484717-QHDSE';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Checking Order: QR-1773487443217-4GJMG';
  RAISE NOTICE '========================================';
  
  -- Find purchase_order by po_number
  SELECT id, po_number, status, delivery_required, delivery_address, created_at
  INTO po_record
  FROM purchase_orders
  WHERE po_number = 'QR-1773487443217-4GJMG'
  LIMIT 1;
  
  IF po_record.id IS NOT NULL THEN
    RAISE NOTICE '✅ Found purchase_order:';
    RAISE NOTICE '   ID: %', po_record.id;
    RAISE NOTICE '   po_number: %', po_record.po_number;
    RAISE NOTICE '   status: %', po_record.status;
    RAISE NOTICE '   delivery_required: %', po_record.delivery_required;
    RAISE NOTICE '   delivery_address: %', po_record.delivery_address;
    RAISE NOTICE '   created_at: %', po_record.created_at;
    
    -- Check for delivery_requests
    SELECT COUNT(*) INTO dr_count
    FROM delivery_requests
    WHERE purchase_order_id = po_record.id;
    
    RAISE NOTICE '   delivery_requests count: %', dr_count;
    
    IF dr_count > 0 THEN
      RAISE NOTICE '';
      RAISE NOTICE '   Delivery Requests:';
      FOR dr_record IN
        SELECT id, status, provider_id, delivery_address, builder_id, created_at, rejection_reason
        FROM delivery_requests
        WHERE purchase_order_id = po_record.id
        ORDER BY created_at DESC
      LOOP
        RAISE NOTICE '     - ID: %', dr_record.id;
        RAISE NOTICE '       Status: %', dr_record.status;
        RAISE NOTICE '       Provider ID: %', dr_record.provider_id;
        RAISE NOTICE '       Delivery Address: %', dr_record.delivery_address;
        RAISE NOTICE '       Builder ID: %', dr_record.builder_id;
        RAISE NOTICE '       Created: %', dr_record.created_at;
        IF dr_record.rejection_reason THEN
          RAISE NOTICE '       Rejection Reason: %', dr_record.rejection_reason;
        END IF;
      END LOOP;
    ELSE
      RAISE NOTICE '   ❌ NO delivery_requests found for this purchase_order!';
      RAISE NOTICE '   This means the delivery request was never created or was deleted.';
    END IF;
  ELSE
    RAISE NOTICE '❌ Purchase_order NOT found with po_number: QR-1773487443217-4GJMG';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Summary';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'If delivery_requests exist but are not showing:';
  RAISE NOTICE '1. Check RLS policies - delivery providers must be able to SELECT pending/assigned/requested requests';
  RAISE NOTICE '2. Check status - must be pending, assigned, or requested';
  RAISE NOTICE '3. Check delivery_address - must not be "To be provided" or empty';
  RAISE NOTICE '4. Check provider_id - must be NULL or not match the viewing provider';
END $$;

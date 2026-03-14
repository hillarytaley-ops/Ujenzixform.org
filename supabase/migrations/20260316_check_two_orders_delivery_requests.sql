-- ============================================================
-- Check Delivery Requests for Two Specific Orders
-- Orders: QR-1773490484717-QHDSE and QR-1773487443217-4GJMG
-- Created: March 16, 2026
-- ============================================================

DO $$
DECLARE
  po_record RECORD;
  dr_record RECORD;
  order_patterns TEXT[] := ARRAY[
    'QR-1773490484717-QHDSE',
    '1773490484717',
    'QHDSE',
    'QR-1773487443217-4GJMG',
    '1773487443217',
    '4GJMG'
  ];
  pattern TEXT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Checking delivery requests for two specific orders';
  RAISE NOTICE '========================================';
  
  -- Check first order: QR-1773490484717-QHDSE
  RAISE NOTICE '';
  RAISE NOTICE '--- Order 1: QR-1773490484717-QHDSE ---';
  
  SELECT id, po_number, status, delivery_required, delivery_address, created_at
  INTO po_record
  FROM purchase_orders
  WHERE po_number ILIKE '%1773490484717%' 
     OR po_number ILIKE '%QHDSE%'
  LIMIT 1;
  
  IF po_record.id IS NOT NULL THEN
    RAISE NOTICE '✅ Found purchase_order: ID=%, po_number=%, status=%, delivery_required=%', 
      po_record.id, po_record.po_number, po_record.status, po_record.delivery_required;
    RAISE NOTICE '   Delivery address: %', po_record.delivery_address;
    RAISE NOTICE '   Created: %', po_record.created_at;
    
    -- Check for delivery_requests
    SELECT id, status, provider_id, delivery_address, builder_id, created_at, purchase_order_id
    INTO dr_record
    FROM delivery_requests
    WHERE purchase_order_id = po_record.id
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF dr_record.id IS NOT NULL THEN
      RAISE NOTICE '✅ Found delivery_request: ID=%, status=%, provider_id=%', 
        dr_record.id, dr_record.status, dr_record.provider_id;
      RAISE NOTICE '   Delivery address: %', dr_record.delivery_address;
      RAISE NOTICE '   Builder ID: %, Created: %', dr_record.builder_id, dr_record.created_at;
    ELSE
      RAISE NOTICE '❌ NO delivery_request found for purchase_order %!', po_record.id;
      RAISE NOTICE '   This order needs a delivery_request to be created.';
    END IF;
  ELSE
    RAISE NOTICE '❌ Purchase_order NOT found for QR-1773490484717-QHDSE';
  END IF;
  
  -- Check second order: QR-1773487443217-4GJMG
  RAISE NOTICE '';
  RAISE NOTICE '--- Order 2: QR-1773487443217-4GJMG ---';
  
  SELECT id, po_number, status, delivery_required, delivery_address, created_at
  INTO po_record
  FROM purchase_orders
  WHERE po_number ILIKE '%1773487443217%' 
     OR po_number ILIKE '%4GJMG%'
  LIMIT 1;
  
  IF po_record.id IS NOT NULL THEN
    RAISE NOTICE '✅ Found purchase_order: ID=%, po_number=%, status=%, delivery_required=%', 
      po_record.id, po_record.po_number, po_record.status, po_record.delivery_required;
    RAISE NOTICE '   Delivery address: %', po_record.delivery_address;
    RAISE NOTICE '   Created: %', po_record.created_at;
    
    -- Check for delivery_requests
    SELECT id, status, provider_id, delivery_address, builder_id, created_at, purchase_order_id
    INTO dr_record
    FROM delivery_requests
    WHERE purchase_order_id = po_record.id
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF dr_record.id IS NOT NULL THEN
      RAISE NOTICE '✅ Found delivery_request: ID=%, status=%, provider_id=%', 
        dr_record.id, dr_record.status, dr_record.provider_id;
      RAISE NOTICE '   Delivery address: %', dr_record.delivery_address;
      RAISE NOTICE '   Builder ID: %, Created: %', dr_record.builder_id, dr_record.created_at;
    ELSE
      RAISE NOTICE '❌ NO delivery_request found for purchase_order %!', po_record.id;
      RAISE NOTICE '   This order needs a delivery_request to be created.';
    END IF;
  ELSE
    RAISE NOTICE '❌ Purchase_order NOT found for QR-1773487443217-4GJMG';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Summary: Check complete';
  RAISE NOTICE '========================================';
END $$;

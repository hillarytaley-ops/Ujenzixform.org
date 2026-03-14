-- ============================================================
-- Delete Ghost Delivery Request and Ensure Two Orders Are Visible
-- 
-- 1. Delete ghost delivery request 4909d8de-85f3-484a-bbad-8075bff226d6
--    (This has a purchase_order_id that doesn't exist - orphaned)
-- 2. Check and ensure delivery_requests exist for:
--    - QR-1773490484717-QHDSE
--    - QR-1773487443217-4GJMG
-- 
-- Created: March 16, 2026
-- ============================================================

DO $$
DECLARE
  ghost_dr_id UUID := '4909d8de-85f3-484a-bbad-8075bff226d6';
  po_record RECORD;
  dr_record RECORD;
  deleted_count INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Step 1: Deleting ghost delivery request';
  RAISE NOTICE '========================================';
  
  -- Delete the ghost delivery request
  IF EXISTS (SELECT 1 FROM delivery_requests WHERE id = ghost_dr_id) THEN
    DELETE FROM delivery_requests WHERE id = ghost_dr_id;
    deleted_count := 1;
    RAISE NOTICE '✅ Deleted ghost delivery request: %', ghost_dr_id;
  ELSE
    RAISE NOTICE '⚠️ Ghost delivery request % not found (may have already been deleted)', ghost_dr_id;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Step 2: Checking Order 1: QR-1773490484717-QHDSE';
  RAISE NOTICE '========================================';
  
  -- Check first order
  SELECT id, po_number, status, delivery_required, delivery_address, created_at
  INTO po_record
  FROM purchase_orders
  WHERE po_number ILIKE '%1773490484717%' 
     OR po_number ILIKE '%QHDSE%'
  LIMIT 1;
  
  IF po_record.id IS NOT NULL THEN
    RAISE NOTICE '✅ Found purchase_order: ID=%, po_number=%, status=%, delivery_required=%', 
      po_record.id, po_record.po_number, po_record.status, po_record.delivery_required;
    
    -- Check for delivery_requests
    SELECT id, status, provider_id, delivery_address, builder_id, created_at
    INTO dr_record
    FROM delivery_requests
    WHERE purchase_order_id = po_record.id
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF dr_record.id IS NOT NULL THEN
      RAISE NOTICE '✅ Found delivery_request: ID=%, status=%, provider_id=%', 
        dr_record.id, dr_record.status, dr_record.provider_id;
      RAISE NOTICE '   Delivery address: %', dr_record.delivery_address;
      
      -- Ensure it's visible: status should be pending/requested/assigned
      IF NOT dr_record.status IN ('pending', 'requested', 'assigned') THEN
        RAISE NOTICE '⚠️ WARNING: Delivery request status is % (not pending/requested/assigned) - may not appear in Alert tab', dr_record.status;
      END IF;
      
      -- Ensure it has provider_id = NULL (not accepted yet)
      IF dr_record.provider_id IS NOT NULL THEN
        RAISE NOTICE '⚠️ WARNING: Delivery request has provider_id % - may not appear in Alert tab (already accepted)', dr_record.provider_id;
      END IF;
    ELSE
      RAISE NOTICE '❌ NO delivery_request found for purchase_order %!', po_record.id;
      RAISE NOTICE '   This order needs a delivery_request to be created by the builder.';
    END IF;
  ELSE
    RAISE NOTICE '❌ Purchase_order NOT found for QR-1773490484717-QHDSE';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Step 3: Checking Order 2: QR-1773487443217-4GJMG';
  RAISE NOTICE '========================================';
  
  -- Check second order
  SELECT id, po_number, status, delivery_required, delivery_address, created_at
  INTO po_record
  FROM purchase_orders
  WHERE po_number ILIKE '%1773487443217%' 
     OR po_number ILIKE '%4GJMG%'
  LIMIT 1;
  
  IF po_record.id IS NOT NULL THEN
    RAISE NOTICE '✅ Found purchase_order: ID=%, po_number=%, status=%, delivery_required=%', 
      po_record.id, po_record.po_number, po_record.status, po_record.delivery_required;
    
    -- Check for delivery_requests
    SELECT id, status, provider_id, delivery_address, builder_id, created_at
    INTO dr_record
    FROM delivery_requests
    WHERE purchase_order_id = po_record.id
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF dr_record.id IS NOT NULL THEN
      RAISE NOTICE '✅ Found delivery_request: ID=%, status=%, provider_id=%', 
        dr_record.id, dr_record.status, dr_record.provider_id;
      RAISE NOTICE '   Delivery address: %', dr_record.delivery_address;
      
      -- Ensure it's visible: status should be pending/requested/assigned
      IF NOT dr_record.status IN ('pending', 'requested', 'assigned') THEN
        RAISE NOTICE '⚠️ WARNING: Delivery request status is % (not pending/requested/assigned) - may not appear in Alert tab', dr_record.status;
      END IF;
      
      -- Ensure it has provider_id = NULL (not accepted yet)
      IF dr_record.provider_id IS NOT NULL THEN
        RAISE NOTICE '⚠️ WARNING: Delivery request has provider_id % - may not appear in Alert tab (already accepted)', dr_record.provider_id;
      END IF;
    ELSE
      RAISE NOTICE '❌ NO delivery_request found for purchase_order %!', po_record.id;
      RAISE NOTICE '   This order needs a delivery_request to be created by the builder.';
    END IF;
  ELSE
    RAISE NOTICE '❌ Purchase_order NOT found for QR-1773487443217-4GJMG';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Summary: Deleted % ghost delivery request(s)', deleted_count;
  RAISE NOTICE '========================================';
END $$;

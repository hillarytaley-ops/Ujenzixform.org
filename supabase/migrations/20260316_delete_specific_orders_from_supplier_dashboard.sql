-- ============================================================
-- Delete Specific Orders from Supplier Dashboard
-- Orders: QR-1773500200063-2SXKA, QR-1773498348706-W2DHV, QR-1773490484717-QHDSE
-- Created: March 16, 2026
-- ============================================================

DO $$
DECLARE
  order_numbers TEXT[] := ARRAY[
    'QR-1773500200063-2SXKA',
    'QR-1773498348706-W2DHV',
    'QR-1773490484717-QHDSE'
  ];
  po_id UUID;
  deleted_count INTEGER := 0;
  total_deleted INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Deleting specific orders and related data';
  RAISE NOTICE '========================================';
  
  -- Loop through each order number
  FOREACH po_id IN ARRAY (
    SELECT ARRAY_AGG(id)
    FROM purchase_orders
    WHERE po_number = ANY(order_numbers)
  )
  LOOP
    IF po_id IS NULL THEN
      CONTINUE;
    END IF;
    
    RAISE NOTICE 'Processing order ID: %', po_id;
    
    -- Delete related tracking_numbers
    DELETE FROM tracking_numbers WHERE purchase_order_id = po_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN
      RAISE NOTICE '  ✅ Deleted % tracking_numbers', deleted_count;
      total_deleted := total_deleted + deleted_count;
    END IF;
    
    -- Delete related material_items
    DELETE FROM material_items WHERE purchase_order_id = po_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN
      RAISE NOTICE '  ✅ Deleted % material_items', deleted_count;
      total_deleted := total_deleted + deleted_count;
    END IF;
    
    -- Delete related delivery_requests
    DELETE FROM delivery_requests WHERE purchase_order_id = po_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN
      RAISE NOTICE '  ✅ Deleted % delivery_requests', deleted_count;
      total_deleted := total_deleted + deleted_count;
    END IF;
    
    -- Delete related notifications (if delivery_request_id column exists)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'notifications' AND column_name = 'delivery_request_id'
    ) THEN
      DELETE FROM notifications 
      WHERE delivery_request_id IN (
        SELECT id FROM delivery_requests WHERE purchase_order_id = po_id
      );
      GET DIAGNOSTICS deleted_count = ROW_COUNT;
      IF deleted_count > 0 THEN
        RAISE NOTICE '  ✅ Deleted % notifications (by delivery_request_id)', deleted_count;
        total_deleted := total_deleted + deleted_count;
      END IF;
    END IF;
    
    -- Delete notifications by related_id (if column exists)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'notifications' AND column_name = 'related_id'
    ) THEN
      DELETE FROM notifications WHERE related_id = po_id;
      GET DIAGNOSTICS deleted_count = ROW_COUNT;
      IF deleted_count > 0 THEN
        RAISE NOTICE '  ✅ Deleted % notifications (by related_id)', deleted_count;
        total_deleted := total_deleted + deleted_count;
      END IF;
    END IF;
    
    -- Delete notifications by order_id (if column exists)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'notifications' AND column_name = 'order_id'
    ) THEN
      DELETE FROM notifications WHERE order_id = po_id;
      GET DIAGNOSTICS deleted_count = ROW_COUNT;
      IF deleted_count > 0 THEN
        RAISE NOTICE '  ✅ Deleted % notifications (by order_id)', deleted_count;
        total_deleted := total_deleted + deleted_count;
      END IF;
    END IF;
    
    -- Delete the purchase_order itself
    DELETE FROM purchase_orders WHERE id = po_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN
      RAISE NOTICE '  ✅ Deleted purchase_order: %', po_id;
      total_deleted := total_deleted + deleted_count;
    ELSE
      RAISE NOTICE '  ⚠️ Purchase order % not found', po_id;
    END IF;
  END LOOP;
  
  -- Also try deleting by po_number directly (in case IDs weren't found)
  DELETE FROM purchase_orders WHERE po_number = ANY(order_numbers);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count > 0 THEN
    RAISE NOTICE '  ✅ Deleted % purchase_orders by po_number', deleted_count;
    total_deleted := total_deleted + deleted_count;
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Deletion complete. Total records deleted: %', total_deleted;
  RAISE NOTICE '========================================';
END $$;

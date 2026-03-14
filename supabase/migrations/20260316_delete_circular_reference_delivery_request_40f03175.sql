-- ============================================================
-- DELETE CIRCULAR REFERENCE DELIVERY REQUEST
-- 
-- This migration will delete the delivery_request that is causing a circular reference:
-- - delivery_request.id = 40f03175-2a2b-44d2-a6b1-d38ad216a9b4
-- - This ID is being used as purchase_order_id by another delivery_request (62f60e5d-6796-40e1-bfb0-bcab776bac47)
-- 
-- This creates a circular reference that prevents the delivery_request from being updated.
-- 
-- Created: March 16, 2026
-- ============================================================

DO $$
DECLARE
  corrupted_dr_id UUID := '40f03175-2a2b-44d2-a6b1-d38ad216a9b4';
  referencing_dr_id UUID;
  deleted_count INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Deleting circular reference delivery_request';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- STEP 1: Find which delivery_request is using this ID as purchase_order_id
  RAISE NOTICE 'STEP 1: Finding delivery_requests that reference this ID as purchase_order_id...';
  
  SELECT id INTO referencing_dr_id
  FROM delivery_requests
  WHERE purchase_order_id = corrupted_dr_id
  LIMIT 1;
  
  IF referencing_dr_id IS NOT NULL THEN
    RAISE NOTICE '  ✅ Found delivery_request % that uses % as purchase_order_id', referencing_dr_id, corrupted_dr_id;
    RAISE NOTICE '  This creates a circular reference - both will be deleted';
    
    -- Delete the referencing delivery_request first
    DELETE FROM delivery_requests WHERE id = referencing_dr_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN
      RAISE NOTICE '  ✅ Deleted referencing delivery_request: %', referencing_dr_id;
    END IF;
    
    -- Also delete associated tracking_numbers
    DELETE FROM tracking_numbers WHERE delivery_request_id = referencing_dr_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN
      RAISE NOTICE '  ✅ Deleted % tracking_numbers for referencing delivery_request', deleted_count;
    END IF;
  ELSE
    RAISE NOTICE '  ⚠️ No delivery_request found using % as purchase_order_id', corrupted_dr_id;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'STEP 2: Deleting the corrupted delivery_request: %', corrupted_dr_id;
  
  -- Delete the corrupted delivery_request
  DELETE FROM delivery_requests WHERE id = corrupted_dr_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  IF deleted_count > 0 THEN
    RAISE NOTICE '  ✅ Successfully deleted corrupted delivery_request: %', corrupted_dr_id;
  ELSE
    RAISE NOTICE '  ⚠️ Delivery_request % not found or already deleted', corrupted_dr_id;
  END IF;
  
  -- Also delete associated tracking_numbers
  DELETE FROM tracking_numbers WHERE delivery_request_id = corrupted_dr_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count > 0 THEN
    RAISE NOTICE '  ✅ Deleted % tracking_numbers for corrupted delivery_request', deleted_count;
  END IF;
  
  -- Also delete associated notifications if the column exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'delivery_request_id') THEN
    DELETE FROM notifications WHERE delivery_request_id = corrupted_dr_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN
      RAISE NOTICE '  ✅ Deleted % notifications for corrupted delivery_request', deleted_count;
    END IF;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Deletion complete';
  RAISE NOTICE '========================================';
  
  -- Verify no circular references remain
  RAISE NOTICE '';
  RAISE NOTICE 'STEP 3: Verifying no circular references remain...';
  
  SELECT COUNT(*) INTO deleted_count
  FROM delivery_requests dr1
  WHERE EXISTS (
    SELECT 1 
    FROM delivery_requests dr2 
    WHERE dr2.purchase_order_id = dr1.id
      AND dr2.id != dr1.id
  )
  AND dr1.id != dr1.purchase_order_id;
  
  IF deleted_count > 0 THEN
    RAISE WARNING '⚠️ WARNING: % circular references still exist!', deleted_count;
  ELSE
    RAISE NOTICE '✅ SUCCESS: No circular references found!';
  END IF;
  
END $$;

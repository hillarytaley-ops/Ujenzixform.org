-- ============================================================
-- DELETE ALL CIRCULAR REFERENCE DELIVERY REQUESTS
-- 
-- This migration will delete ALL delivery_requests that have circular references:
-- - delivery_requests where id is used as purchase_order_id by another delivery_request
-- - This creates data corruption and prevents updates
-- 
-- Created: March 16, 2026
-- ============================================================

DO $$
DECLARE
  corrupted_dr RECORD;
  referencing_dr RECORD;
  deleted_count INTEGER := 0;
  total_deleted INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DELETING ALL CIRCULAR REFERENCE DELIVERY_REQUESTS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- STEP 1: Find and delete ALL delivery_requests where their ID is used as purchase_order_id by another delivery_request
  RAISE NOTICE 'STEP 1: Finding delivery_requests whose IDs are used as purchase_order_id by other delivery_requests...';
  
  FOR corrupted_dr IN
    SELECT DISTINCT dr1.id, dr1.purchase_order_id, dr1.status, dr1.created_at
    FROM delivery_requests dr1
    WHERE EXISTS (
      SELECT 1 
      FROM delivery_requests dr2 
      WHERE dr2.purchase_order_id = dr1.id
        AND dr2.id != dr1.id
    )
    AND dr1.id != dr1.purchase_order_id -- Exclude ones where id = purchase_order_id (handled separately)
  LOOP
    RAISE NOTICE '  Found circular reference: delivery_request % is used as purchase_order_id by another delivery_request', corrupted_dr.id;
    
    -- First, find and delete the delivery_requests that reference this ID as purchase_order_id
    FOR referencing_dr IN
      SELECT id, purchase_order_id, status, created_at
      FROM delivery_requests
      WHERE purchase_order_id = corrupted_dr.id
        AND id != corrupted_dr.id
    LOOP
      RAISE NOTICE '    Deleting referencing delivery_request: % (uses % as purchase_order_id)', referencing_dr.id, corrupted_dr.id;
      
      -- Delete associated tracking_numbers
      DELETE FROM tracking_numbers WHERE delivery_request_id = referencing_dr.id;
      
      -- Delete associated notifications if column exists
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'delivery_request_id') THEN
        DELETE FROM notifications WHERE delivery_request_id = referencing_dr.id;
      END IF;
      
      -- Delete the referencing delivery_request
      DELETE FROM delivery_requests WHERE id = referencing_dr.id;
      deleted_count := deleted_count + 1;
      RAISE NOTICE '      ✅ Deleted referencing delivery_request: %', referencing_dr.id;
    END LOOP;
    
    -- Now delete the corrupted delivery_request itself
    RAISE NOTICE '    Deleting corrupted delivery_request: %', corrupted_dr.id;
    
    -- Delete associated tracking_numbers
    DELETE FROM tracking_numbers WHERE delivery_request_id = corrupted_dr.id;
    
    -- Delete associated notifications if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'delivery_request_id') THEN
      DELETE FROM notifications WHERE delivery_request_id = corrupted_dr.id;
    END IF;
    
    -- Delete the corrupted delivery_request
    DELETE FROM delivery_requests WHERE id = corrupted_dr.id;
    deleted_count := deleted_count + 1;
    RAISE NOTICE '      ✅ Deleted corrupted delivery_request: %', corrupted_dr.id;
  END LOOP;
  
  total_deleted := deleted_count;
  RAISE NOTICE '';
  RAISE NOTICE '  Total deleted in STEP 1: %', deleted_count;
  RAISE NOTICE '';
  
  -- STEP 2: Also delete delivery_requests where id = purchase_order_id (self-reference corruption)
  RAISE NOTICE 'STEP 2: Deleting delivery_requests where id = purchase_order_id (self-reference corruption)...';
  deleted_count := 0;
  
  FOR corrupted_dr IN
    SELECT id, purchase_order_id, status, created_at
    FROM delivery_requests
    WHERE id = purchase_order_id
  LOOP
    RAISE NOTICE '  Found self-reference corruption: delivery_request % has id = purchase_order_id', corrupted_dr.id;
    
    -- Delete associated tracking_numbers
    DELETE FROM tracking_numbers WHERE delivery_request_id = corrupted_dr.id;
    
    -- Delete associated notifications if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'delivery_request_id') THEN
      DELETE FROM notifications WHERE delivery_request_id = corrupted_dr.id;
    END IF;
    
    -- Delete the corrupted delivery_request
    DELETE FROM delivery_requests WHERE id = corrupted_dr.id;
    deleted_count := deleted_count + 1;
    RAISE NOTICE '    ✅ Deleted self-reference corrupted delivery_request: %', corrupted_dr.id;
  END LOOP;
  
  total_deleted := total_deleted + deleted_count;
  RAISE NOTICE '';
  RAISE NOTICE '  Total deleted in STEP 2: %', deleted_count;
  RAISE NOTICE '';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TOTAL DELETED: % circular reference delivery_requests', total_deleted;
  RAISE NOTICE '========================================';
END $$;

-- Verify no circular references remain
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICATION: Checking for remaining circular references...';
  RAISE NOTICE '========================================';
  
  -- Check for circular references (id used as purchase_order_id)
  SELECT COUNT(*) INTO remaining_count
  FROM delivery_requests dr1
  WHERE EXISTS (
    SELECT 1 
    FROM delivery_requests dr2 
    WHERE dr2.purchase_order_id = dr1.id
      AND dr2.id != dr1.id
  )
  AND dr1.id != dr1.purchase_order_id;
  
  IF remaining_count > 0 THEN
    RAISE WARNING '⚠️ WARNING: % circular references still exist!', remaining_count;
  ELSE
    RAISE NOTICE '✅ No circular references found (id used as purchase_order_id)';
  END IF;
  
  -- Check for self-references (id = purchase_order_id)
  SELECT COUNT(*) INTO remaining_count
  FROM delivery_requests
  WHERE id = purchase_order_id;
  
  IF remaining_count > 0 THEN
    RAISE WARNING '⚠️ WARNING: % self-references still exist (id = purchase_order_id)!', remaining_count;
  ELSE
    RAISE NOTICE '✅ No self-references found (id = purchase_order_id)';
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Verification complete';
  RAISE NOTICE '========================================';
END $$;

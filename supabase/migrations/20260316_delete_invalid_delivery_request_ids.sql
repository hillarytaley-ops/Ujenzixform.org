-- ============================================================
-- Delete Invalid Delivery Requests
-- Some delivery_requests have IDs that match purchase_order_ids
-- This creates duplicates and data integrity issues
-- Created: March 16, 2026
-- ============================================================

DO $$
DECLARE
  invalid_dr RECORD;
  deleted_count INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Deleting invalid delivery_requests where id = purchase_order_id';
  RAISE NOTICE '========================================';
  
  -- Find and delete delivery_requests where the id matches a purchase_order_id
  -- This indicates a data integrity issue where the delivery_request was created
  -- with the wrong ID (should be a UUID, not a purchase_order_id)
  FOR invalid_dr IN
    SELECT dr.id, dr.purchase_order_id, dr.status, dr.created_at
    FROM delivery_requests dr
    WHERE dr.id = dr.purchase_order_id
  LOOP
    RAISE NOTICE 'Found invalid delivery_request: ID=%, purchase_order_id=%, status=%', 
      invalid_dr.id, invalid_dr.purchase_order_id, invalid_dr.status;
    
    -- Delete the invalid delivery_request
    DELETE FROM delivery_requests WHERE id = invalid_dr.id;
    deleted_count := deleted_count + 1;
    
    RAISE NOTICE '  ✅ Deleted invalid delivery_request: %', invalid_dr.id;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Summary: Deleted % invalid delivery_requests', deleted_count;
  RAISE NOTICE '========================================';
  
  -- Also check for delivery_requests where id matches another delivery_request's purchase_order_id
  -- This is another form of data corruption
  RAISE NOTICE '';
  RAISE NOTICE 'Checking for delivery_requests where id matches another delivery_request''s purchase_order_id...';
  
  FOR invalid_dr IN
    SELECT dr1.id, dr1.purchase_order_id, dr1.status, dr1.created_at
    FROM delivery_requests dr1
    WHERE EXISTS (
      SELECT 1 
      FROM delivery_requests dr2 
      WHERE dr2.purchase_order_id = dr1.id
    )
    AND dr1.id != dr1.purchase_order_id  -- Exclude ones we already handled
  LOOP
    RAISE NOTICE 'Found delivery_request where id is used as purchase_order_id by another request: ID=%, purchase_order_id=%, status=%', 
      invalid_dr.id, invalid_dr.purchase_order_id, invalid_dr.status;
    
    -- Delete this one too (it's the "parent" that shouldn't exist)
    DELETE FROM delivery_requests WHERE id = invalid_dr.id;
    deleted_count := deleted_count + 1;
    
    RAISE NOTICE '  ✅ Deleted invalid delivery_request: %', invalid_dr.id;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total deleted: % invalid delivery_requests', deleted_count;
  RAISE NOTICE '========================================';
END $$;

-- Verify the fix
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM delivery_requests dr
  WHERE dr.id = dr.purchase_order_id
     OR EXISTS (
       SELECT 1 
       FROM delivery_requests dr2 
       WHERE dr2.purchase_order_id = dr.id
     );
  
  IF remaining_count > 0 THEN
    RAISE WARNING '⚠️ WARNING: % invalid delivery_requests still remain!', remaining_count;
  ELSE
    RAISE NOTICE '✅ SUCCESS: All invalid delivery_requests have been deleted!';
  END IF;
END $$;

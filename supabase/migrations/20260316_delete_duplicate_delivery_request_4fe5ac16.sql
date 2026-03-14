-- ============================================================
-- Delete Duplicate Delivery Request
-- Delete delivery request 4fe5ac16-eec9-4435-8b40-953c073db069
-- This is a duplicate of already-accepted delivery 4909d8de-85f3-484a-bbad-8075bff226d6
-- Created: March 16, 2026
-- ============================================================

DO $$
DECLARE
  duplicate_id UUID := '4fe5ac16-eec9-4435-8b40-953c073db069';
  deleted_count INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Deleting duplicate delivery request: %', duplicate_id;
  RAISE NOTICE '========================================';
  
  -- Check if it exists
  IF EXISTS (SELECT 1 FROM delivery_requests WHERE id = duplicate_id) THEN
    -- Delete the duplicate
    DELETE FROM delivery_requests WHERE id = duplicate_id;
    deleted_count := 1;
    RAISE NOTICE '✅ Deleted duplicate delivery request: %', duplicate_id;
  ELSE
    RAISE NOTICE '⚠️ Delivery request % not found (may have already been deleted)', duplicate_id;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Summary: Deleted % duplicate delivery request(s)', deleted_count;
  RAISE NOTICE '========================================';
END $$;

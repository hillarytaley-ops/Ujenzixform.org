-- =====================================================================
-- DELETE ALL DELIVERY REQUEST ALERTS (Delivery Dashboard – Alerts tab)
-- =====================================================================
-- Run this in Supabase SQL Editor with sufficient privileges (e.g. service role).
-- Removes all rows from delivery_requests, which clears the "New Delivery Request!"
-- and "Delivery accepted" items from the Alerts/Notifications list.
--
-- Note: delivery_notes.delivery_request_id references this table with ON DELETE SET NULL,
-- so those columns will be set to NULL. Purchase orders and material_items are NOT
-- deleted. If you get an FK error from another table, run the optional steps below.
-- =====================================================================

DO $$
DECLARE
  v_deleted INT;
BEGIN
  -- Optional: set delivery_notes.delivery_request_id to NULL so the delete doesn't hit FK issues
  UPDATE delivery_notes SET delivery_request_id = NULL WHERE delivery_request_id IS NOT NULL;

  -- Delete all delivery_requests (this clears the Alerts list)
  DELETE FROM delivery_requests;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RAISE NOTICE 'Deleted % delivery_requests. Alerts/Notifications list should now be empty.', v_deleted;
END $$;

-- =====================================================================
-- If the above fails with "violates foreign key constraint", run these
-- in order (uncomment and replace TABLE_NAME with the one in the error):
-- =====================================================================
-- UPDATE tracking_numbers SET delivery_request_id = NULL WHERE delivery_request_id IS NOT NULL;
-- UPDATE delivery_notes SET delivery_request_id = NULL WHERE delivery_request_id IS NOT NULL;
-- DELETE FROM delivery_requests;

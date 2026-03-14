-- ============================================================
-- Prevent Invalid Delivery Request IDs
-- This migration prevents delivery_requests from being created
-- with IDs that match purchase_order_ids (data integrity issue)
-- Created: March 16, 2026
-- ============================================================

-- Add a CHECK constraint to prevent id = purchase_order_id
-- This ensures data integrity at the database level
DO $$
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE delivery_requests DROP CONSTRAINT IF EXISTS delivery_requests_id_not_equal_purchase_order_id;
  
  -- Add CHECK constraint to prevent id = purchase_order_id
  ALTER TABLE delivery_requests 
  ADD CONSTRAINT delivery_requests_id_not_equal_purchase_order_id 
  CHECK (id != purchase_order_id);
  
  RAISE NOTICE '✅ Added CHECK constraint: delivery_requests.id != purchase_order_id';
END $$;

-- Create a trigger function to validate delivery_request IDs
-- This provides an additional layer of protection
CREATE OR REPLACE FUNCTION validate_delivery_request_id()
RETURNS TRIGGER AS $$
BEGIN
  -- CRITICAL: Ensure the delivery_request ID is NOT the same as purchase_order_id
  IF NEW.id = NEW.purchase_order_id THEN
    RAISE EXCEPTION 'Invalid delivery_request ID: id (%) cannot equal purchase_order_id (%). This indicates a data integrity issue.', 
      NEW.id, NEW.purchase_order_id;
  END IF;
  
  -- CRITICAL: Ensure the delivery_request ID is a valid UUID (not a purchase_order_id)
  -- Check if the ID exists as a purchase_order_id in purchase_orders table
  IF EXISTS (SELECT 1 FROM purchase_orders WHERE id = NEW.id) THEN
    RAISE EXCEPTION 'Invalid delivery_request ID: id (%) already exists as a purchase_order_id. Delivery requests must have unique UUIDs.', 
      NEW.id;
  END IF;
  
  -- CRITICAL: Ensure the delivery_request ID is not used as purchase_order_id by another delivery_request
  IF EXISTS (
    SELECT 1 
    FROM delivery_requests 
    WHERE purchase_order_id = NEW.id 
    AND id != NEW.id  -- Exclude self
  ) THEN
    RAISE EXCEPTION 'Invalid delivery_request ID: id (%) is already used as purchase_order_id by another delivery_request. This creates circular references.', 
      NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger BEFORE INSERT to validate delivery_request IDs
DROP TRIGGER IF EXISTS validate_delivery_request_id_trigger ON delivery_requests;
CREATE TRIGGER validate_delivery_request_id_trigger
  BEFORE INSERT OR UPDATE ON delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_delivery_request_id();

-- Add comment to document the constraint
COMMENT ON CONSTRAINT delivery_requests_id_not_equal_purchase_order_id ON delivery_requests IS 
  'Prevents delivery_request IDs from matching purchase_order_ids to maintain data integrity';

COMMENT ON FUNCTION validate_delivery_request_id() IS 
  'Validates that delivery_request IDs are unique UUIDs and do not conflict with purchase_order_ids';

-- ============================================================
-- Migration Complete
-- ============================================================
-- This migration ensures:
-- 1. CHECK constraint prevents id = purchase_order_id
-- 2. Trigger validates ID is not a purchase_order_id
-- 3. Trigger validates ID is not used as purchase_order_id by another delivery_request
-- ============================================================

-- ============================================================
-- Prevent NULL Delivery Addresses for Active Delivery Requests
-- Created: March 16, 2026
-- ============================================================
-- This migration adds a trigger to prevent NULL delivery_address
-- for active delivery requests (pending, requested, assigned, etc.)
-- Uses a trigger instead of a constraint to avoid failing on existing NULL data

-- Create trigger function to validate delivery_address is not NULL for active requests
CREATE OR REPLACE FUNCTION validate_delivery_address_not_null()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate for active statuses
  IF NEW.status IN ('pending', 'requested', 'assigned', 'accepted', 'scheduled', 'in_transit', 'picked_up', 'out_for_delivery') THEN
    -- Check if delivery_address is NULL or empty
    IF NEW.delivery_address IS NULL OR TRIM(NEW.delivery_address) = '' THEN
      RAISE EXCEPTION 'Delivery address is required for active delivery requests (status: %). Builders must provide a delivery address before creating or updating a delivery request.', NEW.status;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger BEFORE INSERT OR UPDATE
DROP TRIGGER IF EXISTS validate_delivery_address_not_null_trigger ON delivery_requests;
CREATE TRIGGER validate_delivery_address_not_null_trigger
  BEFORE INSERT OR UPDATE OF delivery_address, status ON delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_delivery_address_not_null();

-- Add comment
COMMENT ON FUNCTION validate_delivery_address_not_null() IS 
'Prevents NULL or empty delivery_address for active delivery requests (pending, requested, assigned, accepted, scheduled, in_transit, picked_up, out_for_delivery). Builders must provide a delivery address before creating a delivery request.';

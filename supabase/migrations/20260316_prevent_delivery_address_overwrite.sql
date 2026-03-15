-- ============================================================
-- Prevent delivery_address from being overwritten with placeholders
-- Created: March 16, 2026
-- ============================================================

-- CRITICAL: Add a trigger to prevent delivery_address from being overwritten with placeholders
-- This ensures that once a builder provides a real address, it cannot be replaced with "To be provided"

CREATE OR REPLACE FUNCTION prevent_delivery_address_overwrite()
RETURNS TRIGGER AS $$
BEGIN
  -- If the NEW delivery_address is a placeholder and OLD delivery_address was NOT a placeholder,
  -- prevent the update (this protects real addresses from being overwritten)
  IF NEW.delivery_address IS NOT NULL AND OLD.delivery_address IS NOT NULL THEN
    -- Check if NEW is a placeholder
    IF LOWER(TRIM(NEW.delivery_address)) IN (
      'to be provided', 'tbd', 't.b.d.', 'n/a', 'na', 'tba', 
      'to be determined', 'delivery location', 'address not found',
      'address not specified by builder'
    ) THEN
      -- Check if OLD was NOT a placeholder (had a real address)
      IF LOWER(TRIM(OLD.delivery_address)) NOT IN (
        'to be provided', 'tbd', 't.b.d.', 'n/a', 'na', 'tba', 
        'to be determined', 'delivery location', 'address not found',
        'address not specified by builder'
      ) AND LENGTH(TRIM(OLD.delivery_address)) > 10 THEN
        -- Prevent overwriting a real address with a placeholder
        RAISE EXCEPTION 'Cannot overwrite real delivery address (%) with placeholder (%). Once a builder provides a real address, it cannot be replaced with a placeholder.', 
          OLD.delivery_address, NEW.delivery_address;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to prevent address overwrite
DROP TRIGGER IF EXISTS prevent_delivery_address_overwrite_trigger ON delivery_requests;
CREATE TRIGGER prevent_delivery_address_overwrite_trigger
  BEFORE UPDATE OF delivery_address ON delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION prevent_delivery_address_overwrite();

-- Add comment
COMMENT ON FUNCTION prevent_delivery_address_overwrite() IS 'Prevents real delivery addresses from being overwritten with placeholder values like "To be provided". Once a builder provides a real address, it is protected.';

-- ============================================================
-- Reject placeholder delivery_address for active delivery requests
-- Created: March 16, 2026
-- Ensures under NO circumstance does the provider see a request
-- with "To be provided" / TBD / N/A etc. — address must come from
-- the builder's form and be shared directly to the provider.
-- ============================================================

CREATE OR REPLACE FUNCTION validate_delivery_address_not_null()
RETURNS TRIGGER AS $$
DECLARE
  addr TEXT;
  lower_addr TEXT;
BEGIN
  IF NEW.status IN ('pending', 'requested', 'assigned', 'accepted', 'scheduled', 'in_transit', 'picked_up', 'out_for_delivery') THEN
    addr := COALESCE(TRIM(NEW.delivery_address), '');
    IF addr = '' THEN
      RAISE EXCEPTION 'Delivery address is required for active delivery requests. The builder must provide the address on the delivery form — it is shared directly to the delivery provider.';
    END IF;
    lower_addr := LOWER(addr);
    IF lower_addr IN (
      'to be provided', 'tbd', 't.b.d.', 'n/a', 'na', 'tba', 'to be determined',
      'delivery location', 'address not found', 'address not specified by builder',
      'to be confirmed', 'to be confirmed.'
    ) THEN
      RAISE EXCEPTION 'Delivery address cannot be a placeholder (e.g. "To be provided", "TBD"). The builder must enter the real address on the delivery form so it is shared directly to the delivery provider.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger (function replaced above)
DROP TRIGGER IF EXISTS validate_delivery_address_not_null_trigger ON delivery_requests;
CREATE TRIGGER validate_delivery_address_not_null_trigger
  BEFORE INSERT OR UPDATE OF delivery_address, status ON delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_delivery_address_not_null();

COMMENT ON FUNCTION validate_delivery_address_not_null() IS
'Prevents NULL, empty, or placeholder delivery_address for active delivery requests. Ensures address is always from the builder form and shared directly to the provider.';

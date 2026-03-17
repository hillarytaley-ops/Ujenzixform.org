-- ============================================================
-- Allow delivery requests to reach the dashboard (fix "not going through")
-- Created: March 16, 2026
--
-- Problem: validate_delivery_address_not_null was blocking INSERT when
-- delivery_address was null/empty, so some requests never got created
-- and never appeared on the delivery dashboard.
--
-- Fix: On INSERT with status = 'pending', allow null/empty delivery_address
-- so the row is created and appears on the Alerts tab. Address can be
-- added later via "Check Address". Require non-placeholder address only
-- when updating to accepted/assigned/etc. Also allow coordinates-only
-- (delivery_coordinates present) as valid for INSERT.
-- ============================================================

CREATE OR REPLACE FUNCTION validate_delivery_address_not_null()
RETURNS TRIGGER AS $$
DECLARE
  addr TEXT;
  lower_addr TEXT;
  coords TEXT;
BEGIN
  -- For INSERT with status = 'pending': allow through so request appears on dashboard.
  -- Builder can add address later via "Check Address". Block only placeholder strings.
  IF (TG_OP = 'INSERT' AND NEW.status = 'pending') THEN
    addr := COALESCE(TRIM(NEW.delivery_address), '');
    coords := COALESCE(TRIM(NEW.delivery_coordinates), '');
    -- Allow if we have coordinates (provider can use for delivery)
    IF coords <> '' AND LENGTH(coords) >= 5 THEN
      RETURN NEW;
    END IF;
    -- Allow empty address on INSERT so request is created and shows on dashboard
    IF addr = '' THEN
      RETURN NEW;
    END IF;
    -- Block placeholder strings even on INSERT
    lower_addr := LOWER(addr);
    IF lower_addr IN (
      'to be provided', 'tbd', 't.b.d.', 'n/a', 'na', 'tba', 'to be determined',
      'delivery location', 'address not found', 'address not specified by builder',
      'to be confirmed', 'to be confirmed.'
    ) THEN
      RAISE EXCEPTION 'Delivery address cannot be a placeholder (e.g. "To be provided", "TBD"). Please enter the real address or use GPS / Search on Map.';
    END IF;
    RETURN NEW;
  END IF;

  -- For all other statuses or UPDATE: require non-empty, non-placeholder address
  IF NEW.status IN ('pending', 'requested', 'assigned', 'accepted', 'scheduled', 'in_transit', 'picked_up', 'out_for_delivery') THEN
    addr := COALESCE(TRIM(NEW.delivery_address), '');
    coords := COALESCE(TRIM(NEW.delivery_coordinates), '');
    -- Allow coordinates-only
    IF addr = '' AND coords <> '' AND LENGTH(coords) >= 5 THEN
      RETURN NEW;
    END IF;
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

-- Trigger unchanged (already exists from previous migration)
DROP TRIGGER IF EXISTS validate_delivery_address_not_null_trigger ON delivery_requests;
CREATE TRIGGER validate_delivery_address_not_null_trigger
  BEFORE INSERT OR UPDATE OF delivery_address, delivery_coordinates, status ON delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_delivery_address_not_null();

COMMENT ON FUNCTION validate_delivery_address_not_null() IS
'Allows INSERT with status=pending so delivery requests reach the dashboard; rejects placeholders. For other statuses/UPDATE requires non-empty address or coordinates.';

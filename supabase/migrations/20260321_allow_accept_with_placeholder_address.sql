-- ============================================================
-- Allow provider to accept delivery when address is still placeholder
-- Created: March 21, 2026
--
-- Problem: When provider clicks "Accept" on an Alert that has
-- delivery_address = "To be provided", the PATCH (status -> accepted)
-- is blocked by validate_delivery_address_not_null with:
-- "Delivery address cannot be a placeholder..."
--
-- Fix: On UPDATE, if we are NOT changing delivery_address or
-- delivery_coordinates (only status/provider_id/etc.), allow the
-- transition to accepted/assigned. Address can be added later via
-- "Check Address". Still require non-placeholder when someone
-- explicitly updates the address field.
-- ============================================================

CREATE OR REPLACE FUNCTION validate_delivery_address_not_null()
RETURNS TRIGGER AS $$
DECLARE
  addr TEXT;
  lower_addr TEXT;
  coords TEXT;
BEGIN
  -- For INSERT with status = 'pending': allow through so request appears on dashboard.
  IF (TG_OP = 'INSERT' AND NEW.status = 'pending') THEN
    addr := COALESCE(TRIM(NEW.delivery_address), '');
    coords := COALESCE(TRIM(NEW.delivery_coordinates), '');
    IF coords <> '' AND LENGTH(coords) >= 5 THEN
      RETURN NEW;
    END IF;
    IF addr = '' THEN
      RETURN NEW;
    END IF;
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

  -- For UPDATE: if we are only changing status/provider_id (not address), allow accept/assigned
  -- so provider can accept from Alerts and address can be added later via "Check Address".
  IF (TG_OP = 'UPDATE') THEN
    IF (OLD.delivery_address IS NOT DISTINCT FROM NEW.delivery_address
        AND OLD.delivery_coordinates IS NOT DISTINCT FROM NEW.delivery_coordinates) THEN
      -- Address fields unchanged — allow status transition (e.g. pending -> accepted)
      RETURN NEW;
    END IF;
  END IF;

  -- When address is being set or updated: require non-empty, non-placeholder for active statuses
  IF NEW.status IN ('pending', 'requested', 'assigned', 'accepted', 'scheduled', 'in_transit', 'picked_up', 'out_for_delivery') THEN
    addr := COALESCE(TRIM(NEW.delivery_address), '');
    coords := COALESCE(TRIM(NEW.delivery_coordinates), '');
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

COMMENT ON FUNCTION validate_delivery_address_not_null() IS
'Allows INSERT with status=pending and UPDATE that only changes status (e.g. accept) so provider can accept before address is set; requires real address when address field is updated.';

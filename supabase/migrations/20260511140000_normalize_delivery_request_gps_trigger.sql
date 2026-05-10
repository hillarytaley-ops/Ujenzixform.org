-- ============================================================
-- BEFORE INSERT/UPDATE: copy GPS from delivery_address / delivery_coordinates text
-- into delivery_latitude, delivery_longitude, delivery_coordinates when missing.
-- Runs so downstream RLS/notifications see numeric columns even if the client
-- only sent a composite "lat, lng | label" line.
-- ============================================================

CREATE OR REPLACE FUNCTION public.normalize_delivery_request_gps_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  m text[];
  head text;
  v_lat double precision;
  v_lng double precision;
  coords text;
BEGIN
  IF NEW.delivery_latitude IS NOT NULL AND NEW.delivery_longitude IS NOT NULL THEN
    IF NEW.delivery_coordinates IS NULL OR trim(COALESCE(NEW.delivery_coordinates, '')) = '' THEN
      NEW.delivery_coordinates := concat_ws(', ', NEW.delivery_latitude::text, NEW.delivery_longitude::text);
    END IF;
    RETURN NEW;
  END IF;

  v_lat := NULL;
  v_lng := NULL;

  coords := trim(COALESCE(NEW.delivery_coordinates, ''));
  IF coords <> '' THEN
    head := trim(split_part(coords, '|', 1));
    m := regexp_match(head, '^(-?[0-9]+(?:\.[0-9]+)?)\s*,\s*(-?[0-9]+(?:\.[0-9]+)?)$');
    IF m IS NOT NULL THEN
      v_lat := m[1]::double precision;
      v_lng := m[2]::double precision;
    END IF;
  END IF;

  IF v_lat IS NULL AND NEW.delivery_address IS NOT NULL AND trim(NEW.delivery_address) <> '' THEN
    m := regexp_match(
      trim(NEW.delivery_address),
      '\[\s*Coords:\s*(-?[0-9]+(?:\.[0-9]+)?)\s*,\s*(-?[0-9]+(?:\.[0-9]+)?)\s*\]',
      'i'
    );
    IF m IS NOT NULL THEN
      v_lat := m[1]::double precision;
      v_lng := m[2]::double precision;
    END IF;
  END IF;

  IF v_lat IS NULL AND NEW.delivery_address IS NOT NULL AND trim(NEW.delivery_address) <> '' THEN
    m := regexp_match(
      trim(NEW.delivery_address),
      'GPS:\s*(-?[0-9]+(?:\.[0-9]+)?)\s*,\s*(-?[0-9]+(?:\.[0-9]+)?)',
      'i'
    );
    IF m IS NOT NULL THEN
      v_lat := m[1]::double precision;
      v_lng := m[2]::double precision;
    END IF;
  END IF;

  IF v_lat IS NULL AND NEW.delivery_address IS NOT NULL AND trim(NEW.delivery_address) <> '' THEN
    head := trim(split_part(trim(NEW.delivery_address), '|', 1));
    m := regexp_match(head, '^(-?[0-9]+(?:\.[0-9]+)?)\s*,\s*(-?[0-9]+(?:\.[0-9]+)?)$');
    IF m IS NOT NULL THEN
      v_lat := m[1]::double precision;
      v_lng := m[2]::double precision;
    END IF;
  END IF;

  IF v_lat IS NOT NULL AND v_lng IS NOT NULL
     AND v_lat >= -90 AND v_lat <= 90 AND v_lng >= -180 AND v_lng <= 180 THEN
    IF NEW.delivery_latitude IS NULL THEN
      NEW.delivery_latitude := v_lat;
    END IF;
    IF NEW.delivery_longitude IS NULL THEN
      NEW.delivery_longitude := v_lng;
    END IF;
    IF NEW.delivery_coordinates IS NULL OR trim(COALESCE(NEW.delivery_coordinates, '')) = '' THEN
      NEW.delivery_coordinates := concat_ws(', ', v_lat::text, v_lng::text);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_normalize_delivery_request_gps ON public.delivery_requests;
CREATE TRIGGER trigger_normalize_delivery_request_gps
  BEFORE INSERT OR UPDATE OF delivery_address, delivery_coordinates
  ON public.delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_delivery_request_gps_columns();

COMMENT ON FUNCTION public.normalize_delivery_request_gps_columns() IS
'Fills delivery_latitude/longitude/coordinates from embedded GPS patterns in delivery_address or delivery_coordinates text.';

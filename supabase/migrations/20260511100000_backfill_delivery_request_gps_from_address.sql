-- ============================================================
-- Backfill delivery_requests GPS columns from saved text
-- Created: 2026-05-11
--
-- Fills delivery_latitude, delivery_longitude, and/or
-- delivery_coordinates when they are missing but the row
-- already contains parseable coordinates in:
--   - delivery_coordinates ("lat, lng" or "lat, lng | …")
--   - delivery_address: [Coords: lat, lng], GPS: lat, lng,
--     or leading "lat, lng | …"
-- ============================================================

DO $$
DECLARE
  r RECORD;
  m text[];
  head text;
  v_lat double precision;
  v_lng double precision;
  n integer := 0;
BEGIN
  FOR r IN
    SELECT id,
           delivery_address,
           delivery_coordinates,
           delivery_latitude,
           delivery_longitude
    FROM public.delivery_requests
    WHERE (
            delivery_latitude IS NULL
         OR delivery_longitude IS NULL
         OR delivery_coordinates IS NULL
         OR trim(COALESCE(delivery_coordinates, '')) = ''
          )
      AND (
            (delivery_address IS NOT NULL AND trim(delivery_address) <> '')
         OR (delivery_coordinates IS NOT NULL AND trim(delivery_coordinates) <> '')
          )
  LOOP
    v_lat := NULL;
    v_lng := NULL;

    -- 1) Parse from delivery_coordinates text when lat/lng columns are null
    IF (r.delivery_latitude IS NULL OR r.delivery_longitude IS NULL)
       AND r.delivery_coordinates IS NOT NULL
       AND trim(r.delivery_coordinates) <> '' THEN
      head := trim(split_part(trim(r.delivery_coordinates), '|', 1));
      m := regexp_match(head, '^(-?[0-9]+(?:\.[0-9]+)?)\s*,\s*(-?[0-9]+(?:\.[0-9]+)?)$');
      IF m IS NOT NULL THEN
        v_lat := m[1]::double precision;
        v_lng := m[2]::double precision;
      END IF;
    END IF;

    -- 2) [Coords: lat, lng] in delivery_address (legacy app format)
    IF v_lat IS NULL AND r.delivery_address IS NOT NULL AND trim(r.delivery_address) <> '' THEN
      m := regexp_match(
        trim(r.delivery_address),
        '\[\s*Coords:\s*(-?[0-9]+(?:\.[0-9]+)?)\s*,\s*(-?[0-9]+(?:\.[0-9]+)?)\s*\]',
        'i'
      );
      IF m IS NOT NULL THEN
        v_lat := m[1]::double precision;
        v_lng := m[2]::double precision;
      END IF;
    END IF;

    -- 3) GPS: lat, lng
    IF v_lat IS NULL AND r.delivery_address IS NOT NULL AND trim(r.delivery_address) <> '' THEN
      m := regexp_match(
        trim(r.delivery_address),
        'GPS:\s*(-?[0-9]+(?:\.[0-9]+)?)\s*,\s*(-?[0-9]+(?:\.[0-9]+)?)',
        'i'
      );
      IF m IS NOT NULL THEN
        v_lat := m[1]::double precision;
        v_lng := m[2]::double precision;
      END IF;
    END IF;

    -- 4) Leading "lat, lng | …" in delivery_address
    IF v_lat IS NULL AND r.delivery_address IS NOT NULL AND trim(r.delivery_address) <> '' THEN
      head := trim(split_part(trim(r.delivery_address), '|', 1));
      m := regexp_match(head, '^(-?[0-9]+(?:\.[0-9]+)?)\s*,\s*(-?[0-9]+(?:\.[0-9]+)?)$');
      IF m IS NOT NULL THEN
        v_lat := m[1]::double precision;
        v_lng := m[2]::double precision;
      END IF;
    END IF;

    IF v_lat IS NULL OR v_lng IS NULL THEN
      CONTINUE;
    END IF;

    IF v_lat < -90 OR v_lat > 90 OR v_lng < -180 OR v_lng > 180 THEN
      CONTINUE;
    END IF;

    IF (r.delivery_latitude IS NOT DISTINCT FROM v_lat)
       AND (r.delivery_longitude IS NOT DISTINCT FROM v_lng)
       AND r.delivery_coordinates IS NOT NULL
       AND trim(r.delivery_coordinates) <> '' THEN
      CONTINUE;
    END IF;

    IF r.delivery_latitude IS NULL
       OR r.delivery_longitude IS NULL
       OR r.delivery_coordinates IS NULL
       OR trim(r.delivery_coordinates) = '' THEN
      UPDATE public.delivery_requests dr
      SET
        delivery_latitude = COALESCE(dr.delivery_latitude, v_lat),
        delivery_longitude = COALESCE(dr.delivery_longitude, v_lng),
        delivery_coordinates = CASE
          WHEN dr.delivery_coordinates IS NULL OR trim(dr.delivery_coordinates) = ''
          THEN concat_ws(', ', v_lat::text, v_lng::text)
          ELSE dr.delivery_coordinates
        END,
        updated_at = NOW()
      WHERE dr.id = r.id;
      n := n + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'backfill_delivery_request_gps_from_address: updated % row(s)', n;
END;
$$;

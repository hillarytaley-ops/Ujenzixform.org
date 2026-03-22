-- ============================================================
-- Comprehensive backfill: Fix missing delivery provider
-- name/phone on supplier and builder dashboards.
--
-- Handles: provider_id can be delivery_providers.id OR auth.users.id.
-- Sources: delivery_providers, profiles, delivery_provider_registrations.
-- ============================================================

-- 1) Update existing delivery_providers with empty name/phone from approved registrations
UPDATE public.delivery_providers dp
SET
  provider_name = COALESCE(
    NULLIF(trim(r.company_name), ''),
    NULLIF(trim(r.full_name), ''),
    dp.provider_name,
    'Delivery Provider'
  ),
  phone = COALESCE(
    NULLIF(trim(r.phone), ''),
    dp.phone,
    '0000000000'
  ),
  email = COALESCE(NULLIF(trim(r.email), ''), dp.email),
  updated_at = now()
FROM public.delivery_provider_registrations r
WHERE dp.user_id = r.auth_user_id
  AND r.status = 'approved'
  AND (
    dp.provider_name IS NULL
    OR trim(dp.provider_name) = ''
    OR dp.provider_name = 'Delivery Provider'
    OR dp.phone IS NULL
    OR trim(dp.phone) = ''
    OR dp.phone = '—'
  );

-- 2) Update delivery_providers from profiles when still empty
UPDATE public.delivery_providers dp
SET
  provider_name = COALESCE(
    NULLIF(trim(p.full_name), ''),
    dp.provider_name,
    NULLIF(split_part(nullif(trim(p.email), ''), '@', 1), ''),
    'Delivery Provider'
  ),
  phone = COALESCE(NULLIF(trim(p.phone), ''), dp.phone, '0000000000'),
  updated_at = now()
FROM public.profiles p
WHERE p.user_id = dp.user_id
  AND (
    dp.provider_name IS NULL
    OR trim(dp.provider_name) = ''
    OR dp.provider_name = 'Delivery Provider'
    OR dp.phone IS NULL
    OR trim(dp.phone) = ''
  );

-- 3) Insert missing delivery_providers for users who accepted deliveries but have no row
--    (provider_id in delivery_requests / purchase_orders is often user_id)
INSERT INTO public.delivery_providers (
  user_id,
  provider_name,
  provider_type,
  phone,
  email,
  vehicle_types,
  service_areas,
  is_verified,
  is_active,
  updated_at
)
SELECT DISTINCT
  uid AS user_id,
  COALESCE(NULLIF(trim(p.full_name), ''), split_part(nullif(trim(p.email), ''), '@', 1), 'Delivery Provider'),
  'individual',
  COALESCE(NULLIF(trim(p.phone), ''), '0000000000'),
  NULLIF(trim(p.email), ''),
  ARRAY['motorcycle']::text[],
  ARRAY[]::text[],
  false,
  true,
  now()
FROM (
  SELECT dr.provider_id AS uid
  FROM public.delivery_requests dr
  WHERE dr.provider_id IS NOT NULL
  UNION
  SELECT po.delivery_provider_id AS uid
  FROM public.purchase_orders po
  WHERE po.delivery_provider_id IS NOT NULL
) ids
LEFT JOIN public.delivery_providers dp ON dp.user_id = ids.uid
LEFT JOIN public.profiles p ON p.user_id = ids.uid
WHERE dp.id IS NULL
  AND ids.uid IN (SELECT id FROM auth.users);

-- 4) Sync profiles for new inserts (ensure full_name/phone exist)
UPDATE public.profiles p
SET
  full_name = COALESCE(NULLIF(trim(r.company_name), ''), trim(r.full_name), p.full_name),
  phone = COALESCE(NULLIF(trim(r.phone), ''), p.phone),
  updated_at = now()
FROM public.delivery_provider_registrations r
WHERE p.user_id = r.auth_user_id
  AND r.status = 'approved'
  AND (p.full_name IS NULL OR trim(p.full_name) = '' OR p.phone IS NULL OR trim(p.phone) = '');

-- 5) Backfill purchase_orders: update PO name/phone from delivery_providers or profiles
--    Handle both delivery_provider_id = dp.id and = dp.user_id
UPDATE public.purchase_orders po
SET
  delivery_provider_name = v.name,
  delivery_provider_phone = COALESCE(v.phone, po.delivery_provider_phone),
  updated_at = now()
FROM (
  SELECT
    po2.id AS po_id,
    COALESCE(
      NULLIF(trim(p.full_name), ''),
      NULLIF(trim(dp.provider_name), ''),
      NULLIF(trim(p_dp.full_name), ''),
      NULLIF(split_part(nullif(trim(p.email), ''), '@', 1), ''),
      NULLIF(split_part(nullif(trim(p_dp.email), ''), '@', 1), ''),
      'Delivery Provider'
    ) AS name,
    COALESCE(
      NULLIF(trim(p.phone), ''),
      NULLIF(trim(dp.phone), ''),
      NULLIF(trim(p_dp.phone), '')
    ) AS phone
  FROM public.purchase_orders po2
  LEFT JOIN public.delivery_providers dp ON (
    dp.id = po2.delivery_provider_id OR dp.user_id = po2.delivery_provider_id
  )
  LEFT JOIN public.profiles p ON p.user_id = po2.delivery_provider_id
  LEFT JOIN public.profiles p_dp ON p_dp.user_id = dp.user_id
  WHERE po2.delivery_provider_id IS NOT NULL
    AND (
      po2.delivery_provider_name IS NULL
      OR trim(po2.delivery_provider_name) = ''
      OR lower(trim(po2.delivery_provider_name)) = 'delivery provider'
      OR po2.delivery_provider_name = 'Assigned driver'
    )
) v
WHERE po.id = v.po_id
  AND v.name IS NOT NULL
  AND v.name != '';

-- 6) Also backfill from delivery_requests when PO has no provider_id but DR has provider_id
WITH dr_providers AS (
  SELECT DISTINCT ON (dr.purchase_order_id)
    dr.purchase_order_id,
    dr.provider_id AS pid,
    dr.status AS st
  FROM public.delivery_requests dr
  WHERE dr.purchase_order_id IS NOT NULL
    AND dr.provider_id IS NOT NULL
  ORDER BY dr.purchase_order_id, dr.updated_at DESC NULLS LAST, dr.created_at DESC NULLS LAST
),
resolved AS (
  SELECT
    d.purchase_order_id,
    d.pid,
    d.st,
    COALESCE(
      (SELECT NULLIF(trim(p.full_name), '') FROM public.profiles p WHERE p.user_id = d.pid OR p.id = d.pid LIMIT 1),
      (SELECT NULLIF(trim(dp.provider_name), '') FROM public.delivery_providers dp WHERE dp.id = d.pid OR dp.user_id = d.pid LIMIT 1),
      (SELECT NULLIF(trim(p2.full_name), '') FROM public.delivery_providers dp2 JOIN public.profiles p2 ON p2.user_id = dp2.user_id WHERE dp2.id = d.pid OR dp2.user_id = d.pid LIMIT 1),
      'Delivery Provider'
    ) AS name,
    COALESCE(
      (SELECT NULLIF(trim(p.phone), '') FROM public.profiles p WHERE p.user_id = d.pid OR p.id = d.pid LIMIT 1),
      (SELECT NULLIF(trim(dp.phone), '') FROM public.delivery_providers dp WHERE dp.id = d.pid OR dp.user_id = d.pid LIMIT 1)
    ) AS phone
  FROM dr_providers d
)
UPDATE public.purchase_orders po
SET
  delivery_provider_id = r.pid,
  delivery_provider_name = r.name,
  delivery_provider_phone = COALESCE(r.phone, po.delivery_provider_phone),
  delivery_status = CASE
    WHEN po.delivery_status IS NULL OR trim(po.delivery_status) = ''
    THEN CASE r.st WHEN 'accepted' THEN 'accepted' WHEN 'assigned' THEN 'assigned' ELSE po.delivery_status END
    ELSE po.delivery_status
  END,
  updated_at = now()
FROM resolved r
WHERE po.id = r.purchase_order_id
  AND po.delivery_provider_id IS NULL
  AND r.name IS NOT NULL;

-- 7) Fix update_order_in_transit trigger: handle provider_id = user_id (not just dp.id)
CREATE OR REPLACE FUNCTION public.update_order_in_transit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    po_id UUID;
    v_provider_name TEXT;
    v_provider_phone TEXT;
BEGIN
    IF ((NEW.status = 'accepted' OR NEW.status = 'assigned')
        AND (OLD.status IS NULL OR (OLD.status != 'accepted' AND OLD.status != 'assigned'))
        AND NEW.provider_id IS NOT NULL) THEN
        po_id := NEW.purchase_order_id;

        IF po_id IS NOT NULL THEN
            BEGIN
                -- Try dp.id first, then dp.user_id (provider_id can be either)
                SELECT
                    COALESCE(NULLIF(TRIM(p.full_name), ''), NULLIF(TRIM(dp.provider_name), ''), 'Delivery Provider'),
                    COALESCE(NULLIF(TRIM(p.phone), ''), NULLIF(TRIM(dp.phone), ''), NULL)
                INTO v_provider_name, v_provider_phone
                FROM delivery_providers dp
                LEFT JOIN profiles p ON p.user_id = dp.user_id
                WHERE dp.id = NEW.provider_id OR dp.user_id = NEW.provider_id
                LIMIT 1;

                -- If no delivery_providers row, try profiles directly
                IF v_provider_name IS NULL OR v_provider_name = 'Delivery Provider' THEN
                    SELECT
                        COALESCE(NULLIF(TRIM(full_name), ''), 'Delivery Provider'),
                        NULLIF(TRIM(phone), '')
                    INTO v_provider_name, v_provider_phone
                    FROM profiles
                    WHERE user_id = NEW.provider_id OR id = NEW.provider_id
                    LIMIT 1;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                v_provider_name := 'Delivery Provider';
                v_provider_phone := NULL;
            END;

            IF v_provider_name IS NULL THEN
                v_provider_name := 'Delivery Provider';
            END IF;

            UPDATE purchase_orders
            SET
                delivery_provider_id = NEW.provider_id,
                delivery_provider_name = v_provider_name,
                delivery_provider_phone = COALESCE(v_provider_phone, delivery_provider_phone),
                delivery_status = CASE
                    WHEN status = 'dispatched' THEN 'in_transit'
                    WHEN NEW.status = 'accepted' THEN 'accepted'
                    WHEN NEW.status = 'assigned' THEN 'assigned'
                    ELSE delivery_status
                END,
                status = CASE WHEN status = 'dispatched' THEN 'in_transit' ELSE status END,
                in_transit_at = CASE WHEN status = 'dispatched' THEN NOW() ELSE in_transit_at END,
                delivery_assigned_at = COALESCE(delivery_assigned_at, NOW()),
                updated_at = NOW()
            WHERE id = po_id;

            BEGIN
                INSERT INTO order_status_history (order_id, status, notes, created_at)
                VALUES (po_id, NEW.status, 'Delivery provider ' || NEW.status || ' - ' || v_provider_name, NOW());
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_order_in_transit() IS
  'Updates purchase_orders when delivery_requests are accepted. Resolves provider name from delivery_providers and profiles. Handles provider_id as dp.id or user_id.';

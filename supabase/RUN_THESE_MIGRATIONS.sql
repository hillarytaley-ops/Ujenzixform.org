-- ============================================================
-- COPY ALL BELOW AND RUN IN SUPABASE SQL EDITOR
-- Run in order: 20260435 → 20260436 → 20260437 → 20260438 → 20260439
-- ============================================================

-- ===================== 20260435 =====================
-- All-in-one: delivery provider name + per-PO display RPCs.
-- Final behavior matches 20260432 + 20260434 (skip running 60431–60434
-- manually if you paste this file only in SQL Editor).
-- ============================================================

DROP FUNCTION IF EXISTS public.get_delivery_provider_names_for_supplier(uuid[]);
DROP FUNCTION IF EXISTS public.get_delivery_provider_names_for_builder(uuid[]);
DROP FUNCTION IF EXISTS public.get_delivery_provider_display_for_supplier_orders(uuid[]);
DROP FUNCTION IF EXISTS public.get_delivery_provider_display_for_builder_orders(uuid[]);

-- ----- Names by provider id list (60432) -----

CREATE FUNCTION public.get_delivery_provider_names_for_supplier(provider_ids UUID[])
RETURNS TABLE(id UUID, user_id UUID, provider_name TEXT, phone TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    dp.id,
    dp.user_id,
    COALESCE(
      NULLIF(TRIM(dp.provider_name), ''),
      NULLIF(TRIM(p.full_name), ''),
      NULLIF(split_part(NULLIF(TRIM(p.email), ''), '@', 1), ''),
      'Delivery Provider'
    ) AS provider_name,
    COALESCE(NULLIF(TRIM(dp.phone), ''), NULLIF(TRIM(p.phone), '')) AS phone
  FROM delivery_providers dp
  LEFT JOIN profiles p ON p.user_id = dp.user_id
  WHERE (dp.id = ANY(provider_ids) OR dp.user_id = ANY(provider_ids))
    AND (
      EXISTS (
        SELECT 1 FROM purchase_orders po
        JOIN suppliers s ON s.id = po.supplier_id AND s.user_id = auth.uid()
        WHERE po.delivery_provider_id = dp.id OR po.delivery_provider_id = dp.user_id
      )
      OR EXISTS (
        SELECT 1 FROM delivery_requests dr
        JOIN purchase_orders po ON po.id = dr.purchase_order_id
        JOIN suppliers s ON s.id = po.supplier_id AND s.user_id = auth.uid()
        WHERE dr.provider_id IS NOT NULL
          AND (dr.provider_id = dp.id OR dr.provider_id = dp.user_id)
      )
    );
$$;

COMMENT ON FUNCTION public.get_delivery_provider_names_for_supplier(UUID[]) IS
  'Names/phones for supplier POs; provider_ids may be delivery_providers.id or auth user_id.';

GRANT EXECUTE ON FUNCTION public.get_delivery_provider_names_for_supplier(uuid[]) TO authenticated;

CREATE FUNCTION public.get_delivery_provider_names_for_builder(provider_ids UUID[])
RETURNS TABLE(id UUID, user_id UUID, provider_name TEXT, phone TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT DISTINCT ON (dp.id)
    dp.id,
    dp.user_id,
    COALESCE(
      NULLIF(TRIM(po.delivery_provider_name), ''),
      NULLIF(TRIM(dp.provider_name), ''),
      NULLIF(TRIM(p.full_name), ''),
      NULLIF(split_part(NULLIF(TRIM(p.email), ''), '@', 1), ''),
      'Delivery Provider'
    ) AS provider_name,
    COALESCE(
      NULLIF(TRIM(po.delivery_provider_phone), ''),
      NULLIF(TRIM(dp.phone), ''),
      NULLIF(TRIM(p.phone), '')
    ) AS phone
  FROM delivery_providers dp
  LEFT JOIN profiles p ON p.user_id = dp.user_id
  INNER JOIN purchase_orders po ON
    (po.buyer_id = auth.uid() OR po.buyer_id IN (SELECT pr.id FROM profiles pr WHERE pr.user_id = auth.uid()))
    AND (
      po.delivery_provider_id = dp.id OR po.delivery_provider_id = dp.user_id
      OR EXISTS (
        SELECT 1 FROM delivery_requests dr
        WHERE dr.purchase_order_id = po.id
          AND dr.provider_id IS NOT NULL
          AND (dr.provider_id = dp.id OR dr.provider_id = dp.user_id)
      )
    )
  WHERE (dp.id = ANY(provider_ids) OR dp.user_id = ANY(provider_ids))
  ORDER BY dp.id, po.updated_at DESC NULLS LAST;
$$;

COMMENT ON FUNCTION public.get_delivery_provider_names_for_builder(UUID[]) IS
  'Names/phones for builder orders; provider_ids may be dp.id or auth user_id.';

GRANT EXECUTE ON FUNCTION public.get_delivery_provider_names_for_builder(uuid[]) TO authenticated;

-- ----- Per–purchase-order display (60434) -----

CREATE FUNCTION public.get_delivery_provider_display_for_supplier_orders(p_po_ids uuid[])
RETURNS TABLE(
  purchase_order_id uuid,
  delivery_provider_id uuid,
  provider_name text,
  phone text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    po.id AS purchase_order_id,
    COALESCE(dp.id, po.delivery_provider_id, drp.pid) AS delivery_provider_id,
    COALESCE(
      NULLIF(NULLIF(TRIM(po.delivery_provider_name), ''), 'Delivery Provider'),
      NULLIF(NULLIF(TRIM(dp.provider_name), ''), 'Delivery Provider'),
      NULLIF(TRIM(p.full_name), ''),
      NULLIF(TRIM(p_uid.full_name), ''),
      NULLIF(TRIM(p_prof.full_name), ''),
      NULLIF(split_part(NULLIF(TRIM(p.email), ''), '@', 1), ''),
      NULLIF(split_part(NULLIF(TRIM(p_uid.email), ''), '@', 1), ''),
      NULLIF(split_part(NULLIF(TRIM(p_prof.email), ''), '@', 1), ''),
      NULLIF(TRIM(COALESCE(
        u.raw_user_meta_data->>'full_name',
        u.raw_user_meta_data->>'name',
        u.raw_user_meta_data->>'display_name',
        u_auth.raw_user_meta_data->>'full_name',
        u_auth.raw_user_meta_data->>'name',
        u_auth.raw_user_meta_data->>'display_name',
        u_uid.raw_user_meta_data->>'full_name',
        u_uid.raw_user_meta_data->>'name',
        u_uid.raw_user_meta_data->>'display_name',
        u_prof.raw_user_meta_data->>'full_name',
        u_prof.raw_user_meta_data->>'name',
        u_prof.raw_user_meta_data->>'display_name'
      )), ''),
      'Delivery Provider'
    ) AS provider_name,
    COALESCE(
      NULLIF(TRIM(po.delivery_provider_phone), ''),
      NULLIF(TRIM(dp.phone), ''),
      NULLIF(TRIM(p.phone), ''),
      NULLIF(TRIM(p_uid.phone), ''),
      NULLIF(TRIM(p_prof.phone), '')
    ) AS phone
  FROM purchase_orders po
  INNER JOIN suppliers s ON s.id = po.supplier_id AND s.user_id = auth.uid()
  LEFT JOIN LATERAL (
    SELECT dr.provider_id AS pid
    FROM delivery_requests dr
    WHERE dr.purchase_order_id = po.id
      AND dr.provider_id IS NOT NULL
    ORDER BY dr.updated_at DESC NULLS LAST, dr.created_at DESC NULLS LAST
    LIMIT 1
  ) drp ON TRUE
  LEFT JOIN delivery_providers dp ON (
    COALESCE(po.delivery_provider_id, drp.pid) IS NOT NULL
    AND (
      dp.id = COALESCE(po.delivery_provider_id, drp.pid)
      OR dp.user_id = COALESCE(po.delivery_provider_id, drp.pid)
    )
  )
  LEFT JOIN profiles p ON p.user_id = dp.user_id
  LEFT JOIN auth.users u ON u.id = dp.user_id
  LEFT JOIN auth.users u_auth ON u_auth.id = COALESCE(po.delivery_provider_id, drp.pid)
  LEFT JOIN profiles p_uid ON p_uid.user_id = COALESCE(po.delivery_provider_id, drp.pid)
  LEFT JOIN auth.users u_uid ON u_uid.id = p_uid.user_id
  LEFT JOIN profiles p_prof ON p_prof.id = COALESCE(po.delivery_provider_id, drp.pid)
  LEFT JOIN auth.users u_prof ON u_prof.id = p_prof.user_id
  WHERE po.id = ANY(p_po_ids)
    AND COALESCE(po.delivery_provider_id, drp.pid) IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_delivery_provider_display_for_supplier_orders(uuid[]) TO authenticated;

COMMENT ON FUNCTION public.get_delivery_provider_display_for_supplier_orders(uuid[]) IS
  'Per-PO provider display; joins dp + profile + auth, plus profiles by user_id and profiles.id when pid is not a delivery_providers row.';

CREATE FUNCTION public.get_delivery_provider_display_for_builder_orders(p_po_ids uuid[])
RETURNS TABLE(
  purchase_order_id uuid,
  delivery_provider_id uuid,
  provider_name text,
  phone text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    po.id AS purchase_order_id,
    COALESCE(dp.id, po.delivery_provider_id, drp.pid) AS delivery_provider_id,
    COALESCE(
      NULLIF(NULLIF(TRIM(po.delivery_provider_name), ''), 'Delivery Provider'),
      NULLIF(NULLIF(TRIM(dp.provider_name), ''), 'Delivery Provider'),
      NULLIF(TRIM(p.full_name), ''),
      NULLIF(TRIM(p_uid.full_name), ''),
      NULLIF(TRIM(p_prof.full_name), ''),
      NULLIF(split_part(NULLIF(TRIM(p.email), ''), '@', 1), ''),
      NULLIF(split_part(NULLIF(TRIM(p_uid.email), ''), '@', 1), ''),
      NULLIF(split_part(NULLIF(TRIM(p_prof.email), ''), '@', 1), ''),
      NULLIF(TRIM(COALESCE(
        u.raw_user_meta_data->>'full_name',
        u.raw_user_meta_data->>'name',
        u.raw_user_meta_data->>'display_name',
        u_auth.raw_user_meta_data->>'full_name',
        u_auth.raw_user_meta_data->>'name',
        u_auth.raw_user_meta_data->>'display_name',
        u_uid.raw_user_meta_data->>'full_name',
        u_uid.raw_user_meta_data->>'name',
        u_uid.raw_user_meta_data->>'display_name',
        u_prof.raw_user_meta_data->>'full_name',
        u_prof.raw_user_meta_data->>'name',
        u_prof.raw_user_meta_data->>'display_name'
      )), ''),
      'Delivery Provider'
    ) AS provider_name,
    COALESCE(
      NULLIF(TRIM(po.delivery_provider_phone), ''),
      NULLIF(TRIM(dp.phone), ''),
      NULLIF(TRIM(p.phone), ''),
      NULLIF(TRIM(p_uid.phone), ''),
      NULLIF(TRIM(p_prof.phone), '')
    ) AS phone
  FROM purchase_orders po
  LEFT JOIN LATERAL (
    SELECT dr.provider_id AS pid
    FROM delivery_requests dr
    WHERE dr.purchase_order_id = po.id
      AND dr.provider_id IS NOT NULL
    ORDER BY dr.updated_at DESC NULLS LAST, dr.created_at DESC NULLS LAST
    LIMIT 1
  ) drp ON TRUE
  LEFT JOIN delivery_providers dp ON (
    COALESCE(po.delivery_provider_id, drp.pid) IS NOT NULL
    AND (
      dp.id = COALESCE(po.delivery_provider_id, drp.pid)
      OR dp.user_id = COALESCE(po.delivery_provider_id, drp.pid)
    )
  )
  LEFT JOIN profiles p ON p.user_id = dp.user_id
  LEFT JOIN auth.users u ON u.id = dp.user_id
  LEFT JOIN auth.users u_auth ON u_auth.id = COALESCE(po.delivery_provider_id, drp.pid)
  LEFT JOIN profiles p_uid ON p_uid.user_id = COALESCE(po.delivery_provider_id, drp.pid)
  LEFT JOIN auth.users u_uid ON u_uid.id = p_uid.user_id
  LEFT JOIN profiles p_prof ON p_prof.id = COALESCE(po.delivery_provider_id, drp.pid)
  LEFT JOIN auth.users u_prof ON u_prof.id = p_prof.user_id
  WHERE po.id = ANY(p_po_ids)
    AND COALESCE(po.delivery_provider_id, drp.pid) IS NOT NULL
    AND (
      po.buyer_id = auth.uid()
      OR po.buyer_id IN (SELECT pr.id FROM profiles pr WHERE pr.user_id = auth.uid())
      OR EXISTS (
        SELECT 1
        FROM delivery_requests drb
        WHERE drb.purchase_order_id = po.id
          AND drb.builder_id IS NOT NULL
          AND (
            drb.builder_id = auth.uid()
            OR drb.builder_id IN (SELECT pr2.id FROM profiles pr2 WHERE pr2.user_id = auth.uid())
          )
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_delivery_provider_display_for_builder_orders(uuid[]) TO authenticated;

COMMENT ON FUNCTION public.get_delivery_provider_display_for_builder_orders(uuid[]) IS
  'Per-PO provider display for builders; same fallbacks as supplier RPC (profiles.id / user_id).';


-- ===================== 20260436 =====================
-- When admin approves delivery_provider_registrations, upsert
-- public.delivery_providers + profiles so supplier/builder UIs
-- and RPCs see provider_name + phone (auth.users.id linkage).
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_update_delivery_provider_status(
  registration_id uuid,
  new_status text,
  admin_notes_text text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
  v_registration_exists boolean;
  r RECORD;
  v_display_name text;
  v_provider_type text;
  v_rows int;
BEGIN
  v_admin_id := auth.uid();

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_admin_id AND role = 'admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  IF new_status NOT IN ('pending', 'approved', 'rejected', 'under_review') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid status. Must be: pending, approved, rejected, or under_review'
    );
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.delivery_provider_registrations WHERE id = registration_id
  ) INTO v_registration_exists;

  IF NOT v_registration_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Registration not found');
  END IF;

  UPDATE public.delivery_provider_registrations
  SET
    status = new_status,
    reviewed_at = now(),
    reviewed_by = v_admin_id,
    admin_notes = COALESCE(admin_notes_text, admin_notes),
    updated_at = now()
  WHERE id = registration_id;

  IF new_status = 'approved' THEN
    SELECT * INTO r FROM public.delivery_provider_registrations WHERE id = registration_id;

    v_display_name := COALESCE(NULLIF(trim(r.company_name), ''), trim(r.full_name));
    IF v_display_name IS NULL OR v_display_name = '' THEN
      v_display_name := 'Delivery Provider';
    END IF;

    v_provider_type := CASE WHEN r.is_company THEN 'company' ELSE 'individual' END;

    UPDATE public.profiles p
    SET
      full_name = v_display_name,
      phone = NULLIF(trim(r.phone), ''),
      updated_at = now()
    WHERE p.user_id = r.auth_user_id;

    UPDATE public.delivery_providers dp
    SET
      provider_name = v_display_name,
      phone = NULLIF(trim(r.phone), ''),
      email = NULLIF(trim(r.email), ''),
      address = COALESCE(NULLIF(trim(r.physical_address), ''), NULLIF(trim(r.county), '')),
      provider_type = v_provider_type,
      contact_person = CASE WHEN r.is_company THEN NULLIF(trim(r.full_name), '') ELSE NULL END,
      vehicle_types = CASE
        WHEN r.vehicle_type IS NOT NULL AND trim(r.vehicle_type) <> '' THEN ARRAY[trim(r.vehicle_type)]::text[]
        ELSE ARRAY['motorcycle']::text[]
      END,
      service_areas = COALESCE(r.service_areas, ARRAY[]::text[]),
      driving_license_number = NULLIF(trim(r.driving_license_number), ''),
      is_verified = true,
      is_active = true,
      updated_at = now()
    WHERE dp.user_id = r.auth_user_id;

    GET DIAGNOSTICS v_rows = ROW_COUNT;

    IF v_rows = 0 THEN
      INSERT INTO public.delivery_providers (
        user_id,
        provider_name,
        provider_type,
        phone,
        email,
        address,
        contact_person,
        vehicle_types,
        service_areas,
        driving_license_number,
        is_verified,
        is_active,
        updated_at
      )
      VALUES (
        r.auth_user_id,
        v_display_name,
        v_provider_type,
        COALESCE(NULLIF(trim(r.phone), ''), '0000000000'),
        NULLIF(trim(r.email), ''),
        COALESCE(NULLIF(trim(r.physical_address), ''), NULLIF(trim(r.county), '')),
        CASE WHEN r.is_company THEN NULLIF(trim(r.full_name), '') ELSE NULL END,
        CASE
          WHEN r.vehicle_type IS NOT NULL AND trim(r.vehicle_type) <> '' THEN ARRAY[trim(r.vehicle_type)]::text[]
          ELSE ARRAY['motorcycle']::text[]
        END,
        COALESCE(r.service_areas, ARRAY[]::text[]),
        NULLIF(trim(r.driving_license_number), ''),
        true,
        true,
        now()
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Status updated successfully',
    'registration_id', registration_id,
    'new_status', new_status
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.admin_update_delivery_provider_status(uuid, text, text) IS
  'Admin: set registration status; on approved, upsert delivery_providers + sync profiles for name/phone display.';

GRANT EXECUTE ON FUNCTION public.admin_update_delivery_provider_status(uuid, text, text) TO authenticated;


-- ===================== 20260437 =====================
-- Backfill: Create delivery_providers rows for all approved
-- delivery_provider_registrations that don't have a matching row.
-- Fixes providers who were approved before migration 20260436.
-- ============================================================

INSERT INTO public.delivery_providers (
  user_id,
  provider_name,
  provider_type,
  phone,
  email,
  address,
  contact_person,
  vehicle_types,
  service_areas,
  driving_license_number,
  is_verified,
  is_active,
  updated_at
)
SELECT
  r.auth_user_id AS user_id,
  COALESCE(NULLIF(trim(r.company_name), ''), trim(r.full_name), 'Delivery Provider') AS provider_name,
  CASE WHEN r.is_company THEN 'company' ELSE 'individual' END AS provider_type,
  COALESCE(NULLIF(trim(r.phone), ''), '0000000000') AS phone,
  NULLIF(trim(r.email), '') AS email,
  COALESCE(NULLIF(trim(r.physical_address), ''), NULLIF(trim(r.county), '')) AS address,
  CASE WHEN r.is_company THEN NULLIF(trim(r.full_name), '') ELSE NULL END AS contact_person,
  CASE
    WHEN r.vehicle_type IS NOT NULL AND trim(r.vehicle_type) <> '' THEN ARRAY[trim(r.vehicle_type)]::text[]
    ELSE ARRAY['motorcycle']::text[]
  END AS vehicle_types,
  COALESCE(r.service_areas, ARRAY[]::text[]) AS service_areas,
  NULLIF(trim(r.driving_license_number), '') AS driving_license_number,
  true AS is_verified,
  true AS is_active,
  now() AS updated_at
FROM public.delivery_provider_registrations r
WHERE r.status = 'approved'
  AND r.auth_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.delivery_providers dp
    WHERE dp.user_id = r.auth_user_id
  );

-- Also sync profiles for these users
UPDATE public.profiles p
SET
  full_name = COALESCE(
    NULLIF(trim(r.company_name), ''),
    trim(r.full_name),
    p.full_name
  ),
  phone = COALESCE(
    NULLIF(trim(r.phone), ''),
    p.phone
  ),
  updated_at = now()
FROM public.delivery_provider_registrations r
WHERE r.status = 'approved'
  AND r.auth_user_id = p.user_id
  AND (
    p.full_name IS NULL OR p.full_name = '' OR
    p.phone IS NULL OR p.phone = ''
  );

COMMENT ON FUNCTION public.admin_update_delivery_provider_status(uuid, text, text) IS
  'Admin: set registration status; on approved, upsert delivery_providers + sync profiles. Run 20260437_backfill for existing approved registrations.';


-- ===================== 20260438 =====================
-- Comprehensive backfill: Fix missing delivery provider
-- name/phone on supplier and builder dashboards.
-- Handles provider_id = delivery_providers.id OR auth.users.id.
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

-- 4) Sync profiles for new inserts
UPDATE public.profiles p
SET
  full_name = COALESCE(NULLIF(trim(r.company_name), ''), trim(r.full_name), p.full_name),
  phone = COALESCE(NULLIF(trim(r.phone), ''), p.phone),
  updated_at = now()
FROM public.delivery_provider_registrations r
WHERE p.user_id = r.auth_user_id
  AND r.status = 'approved'
  AND (p.full_name IS NULL OR trim(p.full_name) = '' OR p.phone IS NULL OR trim(p.phone) = '');

-- 5) Backfill purchase_orders from delivery_providers or profiles
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

-- 6) Backfill from delivery_requests when PO has no provider_id but DR has provider_id
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

-- 7) Fix update_order_in_transit trigger: handle provider_id = user_id
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
                SELECT
                    COALESCE(NULLIF(TRIM(p.full_name), ''), NULLIF(TRIM(dp.provider_name), ''), 'Delivery Provider'),
                    COALESCE(NULLIF(TRIM(p.phone), ''), NULLIF(TRIM(dp.phone), ''), NULL)
                INTO v_provider_name, v_provider_phone
                FROM delivery_providers dp
                LEFT JOIN profiles p ON p.user_id = dp.user_id
                WHERE dp.id = NEW.provider_id OR dp.user_id = NEW.provider_id
                LIMIT 1;
                IF v_provider_name IS NULL OR v_provider_name = 'Delivery Provider' THEN
                    SELECT COALESCE(NULLIF(TRIM(full_name), ''), 'Delivery Provider'), NULLIF(TRIM(phone), '')
                    INTO v_provider_name, v_provider_phone
                    FROM profiles
                    WHERE user_id = NEW.provider_id OR id = NEW.provider_id
                    LIMIT 1;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                v_provider_name := 'Delivery Provider';
                v_provider_phone := NULL;
            END;
            IF v_provider_name IS NULL THEN v_provider_name := 'Delivery Provider'; END IF;
            UPDATE purchase_orders SET delivery_provider_id = NEW.provider_id, delivery_provider_name = v_provider_name,
                delivery_provider_phone = COALESCE(v_provider_phone, delivery_provider_phone),
                delivery_status = CASE WHEN status = 'dispatched' THEN 'in_transit' WHEN NEW.status = 'accepted' THEN 'accepted' WHEN NEW.status = 'assigned' THEN 'assigned' ELSE delivery_status END,
                status = CASE WHEN status = 'dispatched' THEN 'in_transit' ELSE status END,
                in_transit_at = CASE WHEN status = 'dispatched' THEN NOW() ELSE in_transit_at END,
                delivery_assigned_at = COALESCE(delivery_assigned_at, NOW()), updated_at = NOW()
            WHERE id = po_id;
            BEGIN
                INSERT INTO order_status_history (order_id, status, notes, created_at)
                VALUES (po_id, NEW.status, 'Delivery provider ' || NEW.status || ' - ' || v_provider_name, NOW());
            EXCEPTION WHEN OTHERS THEN NULL; END;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_order_in_transit() IS
  'Updates purchase_orders when delivery_requests are accepted. Resolves provider name from delivery_providers and profiles. Handles provider_id as dp.id or user_id.';


-- ===================== 20260439 =====================
-- Admin RPC: List ALL delivery providers (registrations + providers).
-- Bypasses RLS so admin sees everyone.
-- =====================

CREATE OR REPLACE FUNCTION public.admin_list_all_delivery_providers()
RETURNS TABLE(
  id uuid,
  registration_id uuid,
  source text,
  full_name text,
  provider_name text,
  email text,
  phone text,
  status text,
  auth_user_id uuid,
  created_at timestamptz,
  county text,
  address text,
  vehicle_type text,
  service_areas text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.id AS registration_id,
    'registration'::text,
    r.full_name,
    COALESCE(NULLIF(trim(r.company_name), ''), r.full_name),
    r.email,
    r.phone,
    r.status,
    r.auth_user_id,
    r.created_at,
    r.county,
    r.physical_address,
    r.vehicle_type,
    r.service_areas
  FROM delivery_provider_registrations r
  ORDER BY r.created_at DESC;

  RETURN QUERY
  SELECT
    dp.id,
    NULL::uuid AS registration_id,
    'provider'::text,
    p.full_name,
    dp.provider_name,
    dp.email,
    dp.phone,
    CASE WHEN dp.is_verified THEN 'approved'::text ELSE 'pending'::text END,
    dp.user_id,
    dp.created_at,
    NULL::text,
    dp.address,
    (dp.vehicle_types)[1]::text,
    dp.service_areas
  FROM delivery_providers dp
  LEFT JOIN profiles p ON p.user_id = dp.user_id
  WHERE NOT EXISTS (
    SELECT 1 FROM delivery_provider_registrations r
    WHERE r.auth_user_id = dp.user_id
  )
  ORDER BY dp.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.admin_list_all_delivery_providers() IS
  'Admin only: returns all delivery providers from registrations + providers table. Bypasses RLS.';

GRANT EXECUTE ON FUNCTION public.admin_list_all_delivery_providers() TO authenticated;


-- ===================== BACKFILL: profiles → purchase_orders =====================
-- Copy name/phone from profiles to POs where provider_id = user_id and data is missing
-- Run this to fix "Assigned driver" / dash for Dominic, Dennis, Mark, etc.
-- =====================

UPDATE public.purchase_orders po
SET
  delivery_provider_name = p.full_name,
  delivery_provider_phone = COALESCE(p.phone, po.delivery_provider_phone),
  updated_at = now()
FROM public.profiles p
WHERE p.user_id = po.delivery_provider_id
  AND (
    po.delivery_provider_name IS NULL
    OR trim(po.delivery_provider_name) = ''
    OR lower(trim(po.delivery_provider_name)) IN ('delivery provider', 'assigned driver')
  )
  AND p.full_name IS NOT NULL
  AND trim(p.full_name) <> '';

-- Also backfill from delivery_requests when PO has no provider_id
UPDATE public.purchase_orders po
SET
  delivery_provider_id = dr.provider_id,
  delivery_provider_name = p.full_name,
  delivery_provider_phone = COALESCE(p.phone, po.delivery_provider_phone),
  updated_at = now()
FROM (
  SELECT DISTINCT ON (purchase_order_id) purchase_order_id, provider_id
  FROM delivery_requests
  WHERE purchase_order_id IS NOT NULL AND provider_id IS NOT NULL
  ORDER BY purchase_order_id, updated_at DESC
) dr
JOIN public.profiles p ON p.user_id = dr.provider_id
WHERE po.id = dr.purchase_order_id
  AND po.delivery_provider_id IS NULL
  AND p.full_name IS NOT NULL
  AND trim(p.full_name) <> '';

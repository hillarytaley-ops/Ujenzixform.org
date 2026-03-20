-- ============================================================
-- All-in-one: delivery provider name + per-PO display RPCs.
-- Final behavior matches 20260432 + 20260434 (skip running 60431–60434
-- manually if you paste this file only in SQL Editor).
-- supabase db push: still runs 60431–60434 first (harmless), then this
-- idempotently reapplies the same end state.
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

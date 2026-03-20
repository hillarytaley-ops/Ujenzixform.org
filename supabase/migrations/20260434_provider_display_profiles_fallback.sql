-- ============================================================
-- Extend provider display RPCs: resolve name/phone when the UUID on
-- purchase_orders / delivery_requests is profiles.id or auth.users.id
-- but there is no delivery_providers row (or join on dp failed).
-- ============================================================

DROP FUNCTION IF EXISTS public.get_delivery_provider_display_for_supplier_orders(uuid[]);
DROP FUNCTION IF EXISTS public.get_delivery_provider_display_for_builder_orders(uuid[]);

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
  -- raw_pid equals auth.users.id (even if no profiles / delivery_providers row)
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

-- ============================================================
-- Resolve delivery provider name/phone per purchase order (supplier + builder).
-- Fixes cases where provider_ids on PO/DR don't match delivery_providers.id lookups
-- from the client. Joins are done server-side with SECURITY DEFINER.
-- Includes auth.users raw_user_meta_data fallback for display name.
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
      NULLIF(split_part(NULLIF(TRIM(p.email), ''), '@', 1), ''),
      NULLIF(TRIM(COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'display_name')), ''),
      'Delivery Provider'
    ) AS provider_name,
    COALESCE(
      NULLIF(TRIM(po.delivery_provider_phone), ''),
      NULLIF(TRIM(dp.phone), ''),
      NULLIF(TRIM(p.phone), '')
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
  WHERE po.id = ANY(p_po_ids)
    AND COALESCE(po.delivery_provider_id, drp.pid) IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_delivery_provider_display_for_supplier_orders(uuid[]) TO authenticated;

COMMENT ON FUNCTION public.get_delivery_provider_display_for_supplier_orders(uuid[]) IS
  'Per-PO provider display for supplier dashboard; uses PO + latest delivery_request + delivery_providers + profile + auth metadata.';

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
      NULLIF(split_part(NULLIF(TRIM(p.email), ''), '@', 1), ''),
      NULLIF(TRIM(COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'display_name')), ''),
      'Delivery Provider'
    ) AS provider_name,
    COALESCE(
      NULLIF(TRIM(po.delivery_provider_phone), ''),
      NULLIF(TRIM(dp.phone), ''),
      NULLIF(TRIM(p.phone), '')
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
  WHERE po.id = ANY(p_po_ids)
    AND COALESCE(po.delivery_provider_id, drp.pid) IS NOT NULL
    AND (
      po.buyer_id = auth.uid()
      OR po.buyer_id IN (SELECT pr.id FROM profiles pr WHERE pr.user_id = auth.uid())
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_delivery_provider_display_for_builder_orders(uuid[]) TO authenticated;

COMMENT ON FUNCTION public.get_delivery_provider_display_for_builder_orders(uuid[]) IS
  'Per-PO provider display for builder dashboard; same joins as supplier RPC with buyer check.';

-- ============================================================
-- Re-include auth.uid() in get_active_deliveries so the missing
-- in-transit order (linked by user id) appears. Same logic as 20260320
-- but FAST PATH no longer uses RPC first, so list won't disappear.
-- Created: March 23, 2026
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_active_deliveries_for_provider()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_provider_id UUID;
  v_result JSONB := '[]'::JSONB;
BEGIN
  SELECT id INTO v_provider_id FROM delivery_providers WHERE user_id = auth.uid() LIMIT 1;

  IF v_provider_id IS NULL THEN
    SELECT dp.id INTO v_provider_id
    FROM delivery_provider_registrations dpr
    JOIN delivery_providers dp ON dp.user_id = dpr.auth_user_id
    WHERE dpr.auth_user_id = auth.uid() LIMIT 1;
  END IF;

  IF v_provider_id IS NULL THEN
    SELECT dp.id INTO v_provider_id
    FROM delivery_providers dp
    JOIN auth.users u ON u.id = auth.uid() AND LOWER(TRIM(COALESCE(dp.email,''))) = LOWER(TRIM(COALESCE(u.email,'')))
    LIMIT 1;
  END IF;

  IF v_provider_id IS NULL AND EXISTS (
    SELECT 1 FROM delivery_provider_registrations
    WHERE auth_user_id = auth.uid() AND LOWER(TRIM(status)) = 'approved'
  ) THEN
    v_provider_id := auth.uid();
  END IF;

  IF v_provider_id IS NULL THEN
    RETURN v_result;
  END IF;

  -- Include both provider_id = delivery_providers.id AND auth.uid() so no in-transit order is missing
  WITH from_dr AS (
    SELECT dr.id, COALESCE(dr.purchase_order_id, po.id) AS purchase_order_id,
      COALESCE(dr.order_number, po.po_number) AS order_number,
      COALESCE(dr.status, po.status) AS status, COALESCE(po.status, dr.status) AS po_status,
      COALESCE(dr.created_at, po.created_at) AS created_at, COALESCE(dr.updated_at, po.updated_at) AS updated_at,
      COALESCE(dr.delivery_address, po.delivery_address) AS delivery_address,
      dr.pickup_location, dr.dropoff_location, po.delivery_provider_id, po.delivery_provider_name, dr.provider_id,
      dr.order_number AS dr_order_number, po.po_number AS po_number
    FROM delivery_requests dr
    LEFT JOIN purchase_orders po ON po.id = dr.purchase_order_id
    WHERE (dr.provider_id = v_provider_id OR dr.provider_id = auth.uid())
      AND dr.status NOT IN ('delivered', 'completed', 'cancelled')
      AND (po.id IS NULL OR po.status NOT IN ('cancelled', 'rejected', 'quote_rejected'))
  ),
  from_po AS (
    SELECT po.id, po.id AS purchase_order_id, po.po_number AS order_number, po.status, po.status AS po_status,
      po.created_at, po.updated_at, po.delivery_address, NULL::text AS pickup_location, NULL::text AS dropoff_location,
      po.delivery_provider_id, po.delivery_provider_name, v_provider_id AS provider_id,
      po.po_number AS dr_order_number, po.po_number
    FROM purchase_orders po
    WHERE (po.delivery_provider_id = v_provider_id OR po.delivery_provider_id = auth.uid())
      AND po.status NOT IN ('cancelled', 'rejected', 'quote_rejected')
      AND po.id NOT IN (SELECT purchase_order_id FROM from_dr WHERE purchase_order_id IS NOT NULL)
  ),
  provider_deliveries AS (
    SELECT * FROM from_dr
    UNION ALL
    SELECT * FROM from_po
  ),
  mi_stats AS (
    SELECT
      mi.purchase_order_id,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE mi.dispatch_scanned = true) AS dispatched,
      COUNT(*) FILTER (WHERE mi.receive_scanned = true) AS received
    FROM material_items mi
    WHERE mi.purchase_order_id IN (SELECT purchase_order_id FROM provider_deliveries)
    GROUP BY mi.purchase_order_id
  ),
  categorized AS (
    SELECT
      pd.*,
      COALESCE(ms.total, 0)::int AS _items_count,
      COALESCE(ms.dispatched, 0)::int AS _dispatched_count,
      COALESCE(ms.received, 0)::int AS _received_count,
      CASE
        WHEN COALESCE(ms.total, 0) = 0 THEN
          CASE
            WHEN pd.status IN ('dispatched', 'shipped', 'in_transit', 'out_for_delivery', 'delivery_arrived', 'picked_up')
              OR pd.po_status IN ('dispatched', 'shipped', 'in_transit', 'out_for_delivery', 'delivery_arrived')
            THEN 'in_transit'
            WHEN pd.status IN ('accepted', 'assigned', 'pending_pickup', 'delivery_assigned', 'ready_for_dispatch', 'provider_assigned')
            THEN 'scheduled'
            ELSE COALESCE(pd.status, 'scheduled')
          END
        WHEN ms.received = ms.total AND ms.total > 0 THEN 'delivered'
        WHEN ms.dispatched > 0 THEN 'in_transit'
        ELSE 'scheduled'
      END AS _categorized_status
    FROM provider_deliveries pd
    LEFT JOIN mi_stats ms ON ms.purchase_order_id = pd.purchase_order_id
  )
  SELECT jsonb_agg(row_to_json(c)::jsonb) INTO v_result
  FROM (
    SELECT
      id, purchase_order_id,
      COALESCE(NULLIF(TRIM(order_number), ''), dr_order_number, po_number, 'PO-' || UPPER(SUBSTRING(purchase_order_id::text, 1, 8))) AS order_number,
      status, po_status, po_status AS purchase_order_status,
      created_at, updated_at, delivery_address, pickup_location, dropoff_location,
      delivery_provider_id, delivery_provider_name, provider_id,
      _items_count, _dispatched_count, _received_count, _categorized_status,
      'rpc' AS source
    FROM categorized
    WHERE _categorized_status IN ('scheduled', 'in_transit')
    ORDER BY updated_at DESC NULLS LAST, created_at DESC
    LIMIT 150
  ) c;

  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$fn$;

COMMENT ON FUNCTION public.get_active_deliveries_for_provider() IS
  'Returns active (scheduled + in_transit) for provider. Includes provider_id = id OR auth.uid() so no order is missing.';

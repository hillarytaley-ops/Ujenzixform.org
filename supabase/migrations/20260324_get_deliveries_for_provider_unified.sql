-- ============================================================
-- Unified Deliveries RPC: Single source of truth for Delivery Dashboard
-- Returns scheduled + in_transit + delivered in one call.
-- Aligns with Supplier Orders/QR: material_items (dispatch_scanned, receive_scanned).
-- Created: March 24, 2026
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_deliveries_for_provider_unified()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_provider_id UUID;
  v_result JSONB := '[]'::JSONB;
BEGIN
  -- Same provider resolution as get_active_deliveries_for_provider
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

  -- Include ALL non-cancelled deliveries (scheduled, in_transit, delivered)
  -- so one RPC returns everything for the Deliveries tab
  WITH from_dr AS (
    SELECT dr.id, COALESCE(dr.purchase_order_id, po.id) AS purchase_order_id,
      COALESCE(dr.order_number, po.po_number) AS order_number,
      COALESCE(dr.status, po.status) AS status, COALESCE(po.status, dr.status) AS po_status,
      COALESCE(dr.created_at, po.created_at) AS created_at, COALESCE(dr.updated_at, po.updated_at) AS updated_at,
      COALESCE(dr.delivery_address, po.delivery_address) AS delivery_address,
      dr.pickup_location, dr.dropoff_location, po.delivery_provider_id, po.delivery_provider_name, dr.provider_id,
      dr.order_number AS dr_order_number, po.po_number AS po_number,
      po.delivered_at, po.delivery_address AS po_delivery_address
    FROM delivery_requests dr
    LEFT JOIN purchase_orders po ON po.id = dr.purchase_order_id
    WHERE (dr.provider_id = v_provider_id OR dr.provider_id = auth.uid())
      AND dr.status NOT IN ('cancelled')
      AND (po.id IS NULL OR po.status NOT IN ('cancelled', 'rejected', 'quote_rejected'))
  ),
  from_po AS (
    SELECT po.id, po.id AS purchase_order_id, po.po_number AS order_number, po.status, po.status AS po_status,
      po.created_at, po.updated_at, po.delivery_address, NULL::text AS pickup_location, NULL::text AS dropoff_location,
      po.delivery_provider_id, po.delivery_provider_name, v_provider_id AS provider_id,
      po.po_number AS dr_order_number, po.po_number,
      po.delivered_at, po.delivery_address AS po_delivery_address
    FROM purchase_orders po
    WHERE (po.delivery_provider_id = v_provider_id OR po.delivery_provider_id = auth.uid())
      AND po.status NOT IN ('cancelled', 'rejected', 'quote_rejected')
      AND po.id NOT IN (SELECT purchase_order_id FROM from_dr WHERE purchase_order_id IS NOT NULL)
  ),
  provider_deliveries AS (
    SELECT id, purchase_order_id, order_number, status, po_status, created_at, updated_at,
           delivery_address, pickup_location, dropoff_location, delivery_provider_id, delivery_provider_name, provider_id,
           dr_order_number, po_number, delivered_at, po_delivery_address FROM from_dr
    UNION ALL
    SELECT id, purchase_order_id, order_number, status, po_status, created_at, updated_at,
           delivery_address, pickup_location, dropoff_location, delivery_provider_id, delivery_provider_name, provider_id,
           dr_order_number, po_number, delivered_at, po_delivery_address FROM from_po
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
            WHEN pd.status IN ('delivered', 'completed') OR pd.po_status IN ('delivered', 'completed')
            THEN 'delivered'
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
      created_at, updated_at,
      COALESCE(delivery_address, po_delivery_address) AS delivery_address,
      pickup_location, dropoff_location,
      delivery_provider_id, delivery_provider_name, provider_id,
      _items_count, _dispatched_count, _received_count, _categorized_status,
      delivered_at,
      'unified' AS source
    FROM categorized
    ORDER BY updated_at DESC NULLS LAST, created_at DESC
    LIMIT 250
  ) c;

  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.get_deliveries_for_provider_unified() TO authenticated;

COMMENT ON FUNCTION public.get_deliveries_for_provider_unified() IS
  'Single source for Delivery Dashboard: scheduled + in_transit + delivered. Uses material_items scan counts (aligned with Supplier QR/Orders).';
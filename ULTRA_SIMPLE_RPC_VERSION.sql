-- ============================================================
-- ULTRA SIMPLE: Fastest possible RPC function
-- Removes DISTINCT ON and complex joins to prevent timeout
-- ============================================================

-- Step 1: Drop and recreate with ultra-simple logic
DROP FUNCTION IF EXISTS public.get_deliveries_for_provider_unified();

CREATE FUNCTION public.get_deliveries_for_provider_unified()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_provider_id UUID;
  v_result JSONB := '[]'::JSONB;
BEGIN
  -- Fast provider resolution (use index)
  SELECT id INTO v_provider_id 
  FROM delivery_providers 
  WHERE user_id = auth.uid() 
  LIMIT 1;

  IF v_provider_id IS NULL AND auth.uid() IS NOT NULL THEN
    v_provider_id := auth.uid();
  END IF;

  IF v_provider_id IS NULL THEN
    RETURN v_result;
  END IF;

  -- ULTRA SIMPLE: Just get delivery_requests, no complex joins
  -- Material items stats will be calculated in a separate, fast query
  WITH simple_orders AS (
    SELECT 
      dr.id,
      COALESCE(dr.purchase_order_id, dr.id) AS purchase_order_id,
      COALESCE(dr.order_number, 'DR-' || SUBSTRING(dr.id::text, 1, 8)) AS order_number,
      dr.status,
      dr.created_at,
      dr.updated_at,
      dr.delivery_address,
      dr.pickup_location,
      dr.dropoff_location,
      dr.provider_id,
      dr.delivery_address AS delivery_address_full
    FROM delivery_requests dr
    WHERE dr.provider_id = v_provider_id
      AND dr.status != 'cancelled'
    ORDER BY dr.updated_at DESC
    LIMIT 250
  ),
  -- Fast material_items stats (only for orders that exist)
  mi_stats AS (
    SELECT
      mi.purchase_order_id,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE mi.dispatch_scanned = true) AS dispatched,
      COUNT(*) FILTER (WHERE mi.receive_scanned = true) AS received
    FROM material_items mi
    WHERE mi.purchase_order_id IN (
      SELECT purchase_order_id FROM simple_orders WHERE purchase_order_id IS NOT NULL
    )
    GROUP BY mi.purchase_order_id
  ),
  -- Get PO status for orders that have purchase_orders
  po_data AS (
    SELECT 
      po.id as purchase_order_id,
      po.status as po_status,
      po.po_number,
      po.delivery_provider_id,
      po.delivery_provider_name,
      po.delivered_at,
      po.delivery_address as po_delivery_address
    FROM purchase_orders po
    WHERE po.id IN (
      SELECT purchase_order_id FROM simple_orders WHERE purchase_order_id IS NOT NULL
    )
    AND po.status != 'cancelled'
  ),
  -- Combine everything
  enriched AS (
    SELECT
      so.id,
      so.purchase_order_id,
      COALESCE(pd.po_number, so.order_number) AS order_number,
      so.status,
      COALESCE(pd.po_status, so.status) AS po_status,
      so.created_at,
      so.updated_at,
      COALESCE(pd.po_delivery_address, so.delivery_address) AS delivery_address,
      so.pickup_location,
      so.dropoff_location,
      COALESCE(pd.delivery_provider_id, so.provider_id) AS delivery_provider_id,
      pd.delivery_provider_name,
      so.provider_id,
      pd.delivered_at,
      COALESCE(ms.total, 0)::int AS _items_count,
      COALESCE(ms.dispatched, 0)::int AS _dispatched_count,
      COALESCE(ms.received, 0)::int AS _received_count,
      CASE
        WHEN COALESCE(ms.received, 0) > 0 AND ms.received = ms.total AND ms.total > 0 THEN 'delivered'
        WHEN COALESCE(ms.dispatched, 0) > 0 AND ms.dispatched = ms.total AND ms.received < ms.total THEN 'scheduled'
        WHEN COALESCE(ms.dispatched, 0) > 0 THEN 'scheduled'
        WHEN so.status IN ('dispatched', 'shipped', 'in_transit', 'out_for_delivery', 'delivery_arrived', 'picked_up')
          OR COALESCE(pd.po_status, so.status) IN ('dispatched', 'shipped', 'in_transit', 'out_for_delivery', 'delivery_arrived')
        THEN 'in_transit'
        WHEN so.status IN ('delivered', 'completed') OR COALESCE(pd.po_status, so.status) IN ('delivered', 'completed')
        THEN 'delivered'
        ELSE 'scheduled'
      END AS _categorized_status
    FROM simple_orders so
    LEFT JOIN po_data pd ON pd.purchase_order_id = so.purchase_order_id
    LEFT JOIN mi_stats ms ON ms.purchase_order_id = so.purchase_order_id
  )
  SELECT jsonb_agg(row_to_json(e)::jsonb) INTO v_result
  FROM (
    SELECT
      id,
      purchase_order_id,
      order_number,
      status,
      po_status AS purchase_order_status,
      created_at,
      updated_at,
      delivery_address,
      pickup_location,
      dropoff_location,
      delivery_provider_id,
      delivery_provider_name,
      provider_id,
      _items_count,
      _dispatched_count,
      _received_count,
      _categorized_status,
      delivered_at,
      'unified' AS source
    FROM enriched
    ORDER BY updated_at DESC NULLS LAST, created_at DESC
  ) e;

  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$fn$;

-- Step 2: Verify function was created
SELECT 
  'Function Created' as status,
  EXISTS(
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_deliveries_for_provider_unified'
  ) as function_exists;

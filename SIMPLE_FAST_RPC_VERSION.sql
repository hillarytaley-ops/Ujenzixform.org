-- ============================================================
-- SIMPLE & FAST: Simplified RPC function to prevent timeout
-- This version is optimized for speed and should complete in < 2 seconds
-- ============================================================

-- Step 1: Ensure indexes exist (run this first if not already done)
CREATE INDEX IF NOT EXISTS idx_delivery_requests_provider_id 
ON delivery_requests(provider_id) 
WHERE provider_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_requests_status 
ON delivery_requests(status) 
WHERE status != 'cancelled';

CREATE INDEX IF NOT EXISTS idx_purchase_orders_delivery_provider_id 
ON purchase_orders(delivery_provider_id) 
WHERE delivery_provider_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_material_items_purchase_order_id 
ON material_items(purchase_order_id) 
WHERE purchase_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_providers_user_id 
ON delivery_providers(user_id) 
WHERE user_id IS NOT NULL;

-- Step 2: Create simplified, fast RPC function
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

  -- Simplified: Get orders from delivery_requests only (faster than complex joins)
  WITH delivery_orders AS (
    SELECT DISTINCT ON (COALESCE(dr.purchase_order_id, dr.id))
      dr.id,
      COALESCE(dr.purchase_order_id, dr.id) AS purchase_order_id,
      COALESCE(dr.order_number, po.po_number, 'PO-' || UPPER(SUBSTRING(COALESCE(dr.purchase_order_id, dr.id)::text, 1, 8))) AS order_number,
      dr.status,
      COALESCE(po.status, dr.status) AS po_status,
      dr.created_at,
      dr.updated_at,
      COALESCE(dr.delivery_address, po.delivery_address) AS delivery_address,
      dr.pickup_location,
      dr.dropoff_location,
      COALESCE(po.delivery_provider_id, dr.provider_id) AS delivery_provider_id,
      po.delivery_provider_name,
      dr.provider_id,
      po.delivered_at
    FROM delivery_requests dr
    LEFT JOIN purchase_orders po ON po.id = dr.purchase_order_id
    WHERE (dr.provider_id = v_provider_id OR dr.provider_id = auth.uid())
      AND dr.status != 'cancelled'
      AND (po.id IS NULL OR po.status != 'cancelled')
    ORDER BY COALESCE(dr.purchase_order_id, dr.id), dr.updated_at DESC
    LIMIT 250
  ),
  -- Fast material_items stats (use index)
  mi_stats AS (
    SELECT
      mi.purchase_order_id,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE mi.dispatch_scanned = true) AS dispatched,
      COUNT(*) FILTER (WHERE mi.receive_scanned = true) AS received
    FROM material_items mi
    WHERE mi.purchase_order_id IN (SELECT purchase_order_id FROM delivery_orders WHERE purchase_order_id IS NOT NULL)
    GROUP BY mi.purchase_order_id
  ),
  -- Simple categorization
  categorized AS (
    SELECT
      delivery_orders.id,
      delivery_orders.purchase_order_id,
      delivery_orders.order_number,
      delivery_orders.status,
      delivery_orders.po_status,
      delivery_orders.created_at,
      delivery_orders.updated_at,
      delivery_orders.delivery_address,
      delivery_orders.pickup_location,
      delivery_orders.dropoff_location,
      delivery_orders.delivery_provider_id,
      delivery_orders.delivery_provider_name,
      delivery_orders.provider_id,
      delivery_orders.delivered_at,
      COALESCE(ms.total, 0)::int AS _items_count,
      COALESCE(ms.dispatched, 0)::int AS _dispatched_count,
      COALESCE(ms.received, 0)::int AS _received_count,
      CASE
        WHEN COALESCE(ms.received, 0) > 0 AND ms.received = ms.total AND ms.total > 0 THEN 'delivered'
        WHEN COALESCE(ms.dispatched, 0) > 0 AND ms.dispatched = ms.total AND ms.received < ms.total THEN 'scheduled'
        WHEN COALESCE(ms.dispatched, 0) > 0 THEN 'scheduled'
        WHEN delivery_orders.status IN ('dispatched', 'shipped', 'in_transit', 'out_for_delivery', 'delivery_arrived', 'picked_up')
          OR delivery_orders.po_status IN ('dispatched', 'shipped', 'in_transit', 'out_for_delivery', 'delivery_arrived')
        THEN 'in_transit'
        WHEN delivery_orders.status IN ('delivered', 'completed') OR delivery_orders.po_status IN ('delivered', 'completed')
        THEN 'delivered'
        ELSE 'scheduled'
      END AS _categorized_status
    FROM delivery_orders
    LEFT JOIN mi_stats ms ON ms.purchase_order_id = delivery_orders.purchase_order_id
  )
  SELECT jsonb_agg(row_to_json(c)::jsonb) INTO v_result
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
    FROM categorized
    ORDER BY updated_at DESC NULLS LAST, created_at DESC
  ) c;

  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.get_deliveries_for_provider_unified() TO authenticated;

-- Step 3: Verify
SELECT 
  '✅ Simplified RPC Function Created' as status,
  'This version should complete in < 2 seconds' as note;

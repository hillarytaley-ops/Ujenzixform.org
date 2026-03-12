-- ============================================================
-- OPTIMIZE: RPC function to prevent timeout
-- The function is timing out after 30 seconds, likely due to
-- missing indexes or inefficient queries
-- ============================================================

-- Step 1: Check existing indexes
SELECT 
  'Step 1: Check Indexes' as step,
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('delivery_requests', 'purchase_orders', 'material_items', 'delivery_providers')
  AND schemaname = 'public'
ORDER BY tablename, indexname;

-- Step 2: Create missing indexes for performance
-- These indexes will speed up the RPC function queries

-- Index for delivery_requests.provider_id (used in WHERE clause)
CREATE INDEX IF NOT EXISTS idx_delivery_requests_provider_id 
ON delivery_requests(provider_id) 
WHERE provider_id IS NOT NULL;

-- Index for delivery_requests.status (used in WHERE clause)
CREATE INDEX IF NOT EXISTS idx_delivery_requests_status 
ON delivery_requests(status) 
WHERE status NOT IN ('cancelled');

-- Composite index for delivery_requests (provider_id + status)
CREATE INDEX IF NOT EXISTS idx_delivery_requests_provider_status 
ON delivery_requests(provider_id, status) 
WHERE provider_id IS NOT NULL AND status NOT IN ('cancelled');

-- Index for purchase_orders.delivery_provider_id
CREATE INDEX IF NOT EXISTS idx_purchase_orders_delivery_provider_id 
ON purchase_orders(delivery_provider_id) 
WHERE delivery_provider_id IS NOT NULL;

-- Index for purchase_orders.status
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status 
ON purchase_orders(status) 
WHERE status != 'cancelled';

-- Index for material_items.purchase_order_id (used in GROUP BY)
CREATE INDEX IF NOT EXISTS idx_material_items_purchase_order_id 
ON material_items(purchase_order_id) 
WHERE purchase_order_id IS NOT NULL;

-- Index for material_items scan flags (used in COUNT FILTER)
CREATE INDEX IF NOT EXISTS idx_material_items_scans 
ON material_items(purchase_order_id, dispatch_scanned, receive_scanned) 
WHERE purchase_order_id IS NOT NULL;

-- Index for delivery_providers.user_id (critical for RPC provider resolution)
CREATE INDEX IF NOT EXISTS idx_delivery_providers_user_id 
ON delivery_providers(user_id) 
WHERE user_id IS NOT NULL;

-- Step 3: Optimize the RPC function with better query structure
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
  -- Provider resolution (use index)
  SELECT id INTO v_provider_id 
  FROM delivery_providers 
  WHERE user_id = auth.uid() 
  LIMIT 1;

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

  IF v_provider_id IS NULL AND auth.uid() IS NOT NULL THEN
    v_provider_id := auth.uid();
  END IF;

  IF v_provider_id IS NULL THEN
    RETURN v_result;
  END IF;

  -- Optimized: Use materialized CTEs and limit early
  WITH provider_deliveries AS (
    -- From delivery_requests (use indexes)
    SELECT DISTINCT ON (COALESCE(dr.purchase_order_id, dr.id))
      dr.id, 
      COALESCE(dr.purchase_order_id, po.id) AS purchase_order_id,
      COALESCE(dr.order_number, po.po_number) AS order_number,
      COALESCE(dr.status, po.status) AS status, 
      COALESCE(po.status, dr.status) AS po_status,
      COALESCE(dr.created_at, po.created_at) AS created_at, 
      COALESCE(dr.updated_at, po.updated_at) AS updated_at,
      COALESCE(dr.delivery_address, po.delivery_address) AS delivery_address,
      dr.pickup_location, 
      dr.dropoff_location, 
      po.delivery_provider_id, 
      po.delivery_provider_name, 
      dr.provider_id,
      dr.order_number AS dr_order_number, 
      po.po_number AS po_number,
      po.delivered_at, 
      po.delivery_address AS po_delivery_address
    FROM delivery_requests dr
    LEFT JOIN purchase_orders po ON po.id = dr.purchase_order_id
    WHERE (dr.provider_id = v_provider_id OR dr.provider_id = auth.uid())
      AND dr.status != 'cancelled'
      AND (po.id IS NULL OR po.status != 'cancelled')
    
    UNION
    
    -- From purchase_orders (use indexes)
    SELECT DISTINCT ON (po.id)
      po.id, 
      po.id AS purchase_order_id, 
      po.po_number AS order_number, 
      po.status, 
      po.status AS po_status,
      po.created_at, 
      po.updated_at, 
      po.delivery_address, 
      NULL::text AS pickup_location, 
      NULL::text AS dropoff_location,
      po.delivery_provider_id, 
      po.delivery_provider_name, 
      COALESCE(po.delivery_provider_id, 
        (SELECT provider_id FROM delivery_requests WHERE purchase_order_id = po.id AND provider_id IS NOT NULL LIMIT 1), 
        v_provider_id) AS provider_id,
      po.po_number AS dr_order_number, 
      po.po_number,
      po.delivered_at, 
      po.delivery_address AS po_delivery_address
    FROM purchase_orders po
    WHERE (
      (po.delivery_provider_id = v_provider_id OR po.delivery_provider_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM delivery_requests dr 
        WHERE dr.purchase_order_id = po.id 
          AND (dr.provider_id = v_provider_id OR dr.provider_id = auth.uid())
          AND dr.status != 'cancelled'
        LIMIT 1
      )
    )
      AND po.status != 'cancelled'
      AND NOT EXISTS (
        SELECT 1 FROM delivery_requests dr2 
        WHERE dr2.purchase_order_id = po.id 
        LIMIT 1
      )
  ),
  -- Optimized: Pre-aggregate material_items stats
  mi_stats AS (
    SELECT
      mi.purchase_order_id,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE mi.dispatch_scanned = true) AS dispatched,
      COUNT(*) FILTER (WHERE mi.receive_scanned = true) AS received
    FROM material_items mi
    WHERE mi.purchase_order_id IN (SELECT purchase_order_id FROM provider_deliveries WHERE purchase_order_id IS NOT NULL)
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
        WHEN ms.dispatched > 0 AND ms.dispatched < ms.total THEN 'scheduled'
        WHEN ms.dispatched = ms.total AND ms.received < ms.total THEN 'scheduled'
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

-- Step 4: Verify indexes were created
SELECT 
  'Step 4: Indexes Created' as step,
  COUNT(*) as total_indexes,
  'Indexes should improve RPC performance' as note
FROM pg_indexes
WHERE tablename IN ('delivery_requests', 'purchase_orders', 'material_items', 'delivery_providers')
  AND indexname LIKE 'idx_%'
  AND schemaname = 'public';

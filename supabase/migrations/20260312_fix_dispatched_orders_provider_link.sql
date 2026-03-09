-- ============================================================
-- Fix: Dispatched orders (supplier) should appear in In Transit (provider)
-- 
-- Supplier "Dispatched" = material_items.dispatch_scanned = true
-- Provider "In Transit" = same orders, but only if linked to the provider via:
--   - delivery_requests.provider_id = delivery_provider.id, OR
--   - purchase_orders.delivery_provider_id = delivery_provider.id
--
-- If these columns point to wrong/no provider, the provider won't see them.
-- This migration links the 2 dispatched POs to the correct provider.
-- Run in Supabase SQL Editor. Adjust provider email if needed.
-- ============================================================

DO $$
DECLARE
  v_provider_id UUID;
  v_po_ids UUID[];
  v_updated_po INT := 0;
  v_updated_dr INT := 0;
BEGIN
  -- 1. Get delivery_provider.id (broader match - adjust if needed)
  SELECT id INTO v_provider_id
  FROM delivery_providers
  WHERE LOWER(TRIM(COALESCE(email, ''))) LIKE '%taleyk%'
  LIMIT 1;
  
  IF v_provider_id IS NULL THEN
    SELECT dp.id INTO v_provider_id
    FROM delivery_providers dp
    JOIN auth.users u ON u.id = dp.user_id
    WHERE LOWER(TRIM(COALESCE(u.email, ''))) LIKE '%taleyk%'
    LIMIT 1;
  END IF;
  
  IF v_provider_id IS NULL THEN
    RAISE NOTICE 'Provider taleyk@gmail.com not found. Skip fix.';
    RETURN;
  END IF;
  
  -- 2. Find the 2 dispatched POs by po_number
  SELECT ARRAY_AGG(id) INTO v_po_ids
  FROM purchase_orders
  WHERE po_number IN (
    'PO-1772598054688-GR03X',
    'PO-1772597930676-IATLA'
  );
  
  IF v_po_ids IS NULL OR array_length(v_po_ids, 1) = 0 THEN
    RAISE NOTICE 'Target POs not found. Skip fix.';
    RETURN;
  END IF;
  
  -- 3. Update purchase_orders.delivery_provider_id
  UPDATE purchase_orders
  SET delivery_provider_id = v_provider_id,
      updated_at = NOW()
  WHERE id = ANY(v_po_ids)
    AND (delivery_provider_id IS NULL OR delivery_provider_id != v_provider_id);
  GET DIAGNOSTICS v_updated_po = ROW_COUNT;
  
  -- 4. Update delivery_requests.provider_id for those POs
  UPDATE delivery_requests
  SET provider_id = v_provider_id,
      updated_at = NOW()
  WHERE purchase_order_id = ANY(v_po_ids)
    AND (provider_id IS NULL OR provider_id != v_provider_id);
  GET DIAGNOSTICS v_updated_dr = ROW_COUNT;
  
  RAISE NOTICE 'Fixed provider link: % purchase_orders, % delivery_requests updated for provider %', 
    v_updated_po, v_updated_dr, v_provider_id;
END $$;

-- ============================================================
-- BYPASS RLS: Use auth_user_id when delivery_providers is empty
-- (Avoids INSERT which triggers buggy audit trigger)
-- Also updates RPC to accept auth.uid() as provider_id fallback
-- ============================================================

-- Step A: Update RPC to use auth.uid() when delivery_providers is empty
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
  -- Get delivery_provider.id for current user
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
  
  -- Fallback: use auth.uid() when delivery_providers is empty (provider has approved registration)
  IF v_provider_id IS NULL AND EXISTS (
    SELECT 1 FROM delivery_provider_registrations
    WHERE auth_user_id = auth.uid() AND LOWER(TRIM(status)) = 'approved'
  ) THEN
    v_provider_id := auth.uid();
  END IF;
  
  IF v_provider_id IS NULL THEN
    RETURN v_result;
  END IF;
  
  -- Build deliveries (same logic as before - from_dr and from_po)
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
    WHERE dr.provider_id = v_provider_id
      AND dr.status NOT IN ('delivered', 'completed', 'cancelled')
      AND (po.id IS NULL OR po.status NOT IN ('cancelled', 'rejected', 'quote_rejected'))
  ),
  from_po AS (
    SELECT po.id, po.id AS purchase_order_id, po.po_number AS order_number, po.status, po.status AS po_status,
      po.created_at, po.updated_at, po.delivery_address, NULL::text AS pickup_location, NULL::text AS dropoff_location,
      po.delivery_provider_id, po.delivery_provider_name, v_provider_id AS provider_id,
      po.po_number AS dr_order_number, po.po_number
    FROM purchase_orders po
    WHERE po.delivery_provider_id = v_provider_id
      AND po.status NOT IN ('cancelled', 'rejected', 'quote_rejected')
      AND po.id NOT IN (SELECT purchase_order_id FROM from_dr WHERE purchase_order_id IS NOT NULL)
  ),
  provider_deliveries AS (
    SELECT * FROM from_dr
    UNION ALL
    SELECT * FROM from_po
  ),
  mi_stats AS (
    SELECT mi.purchase_order_id, COUNT(*) AS total,
      COUNT(*) FILTER (WHERE mi.dispatch_scanned = true) AS dispatched,
      COUNT(*) FILTER (WHERE mi.receive_scanned = true) AS received
    FROM material_items mi
    WHERE mi.purchase_order_id IN (SELECT purchase_order_id FROM provider_deliveries)
    GROUP BY mi.purchase_order_id
  ),
  categorized AS (
    SELECT pd.*,
      COALESCE(ms.total, 0)::int AS _items_count,
      COALESCE(ms.dispatched, 0)::int AS _dispatched_count,
      COALESCE(ms.received, 0)::int AS _received_count,
      CASE
        WHEN COALESCE(ms.total, 0) = 0 THEN
          CASE WHEN pd.status IN ('dispatched','shipped','in_transit','out_for_delivery','delivery_arrived','picked_up')
            OR pd.po_status IN ('dispatched','shipped','in_transit','out_for_delivery','delivery_arrived')
          THEN 'in_transit'
          WHEN pd.status IN ('accepted','assigned','pending_pickup','delivery_assigned','ready_for_dispatch','provider_assigned')
          THEN 'scheduled'
          ELSE COALESCE(pd.status, 'scheduled') END
        WHEN ms.received = ms.total AND ms.total > 0 THEN 'delivered'
        WHEN ms.dispatched > 0 THEN 'in_transit'
        ELSE 'scheduled'
      END AS _categorized_status
    FROM provider_deliveries pd
    LEFT JOIN mi_stats ms ON ms.purchase_order_id = pd.purchase_order_id
  )
  SELECT jsonb_agg(row_to_json(c)::jsonb) INTO v_result
  FROM (
    SELECT id, purchase_order_id,
      COALESCE(NULLIF(TRIM(order_number), ''), dr_order_number, po_number, 'PO-' || UPPER(SUBSTRING(purchase_order_id::text, 1, 8))) AS order_number,
      status, po_status, po_status AS purchase_order_status, created_at, updated_at, delivery_address, pickup_location, dropoff_location,
      delivery_provider_id, delivery_provider_name, provider_id, _items_count, _dispatched_count, _received_count, _categorized_status,
      'rpc' AS source
    FROM categorized
    WHERE _categorized_status IN ('scheduled', 'in_transit')
    ORDER BY updated_at DESC NULLS LAST, created_at DESC
    LIMIT 150
  ) c;
  
  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$fn$;

-- Step B: Fix function - use auth_user_id from registration (no INSERT)
CREATE OR REPLACE FUNCTION public.fix_in_transit_provider_link()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider_id UUID;
  v_updated_po INT := 0;
  v_updated_dr INT := 0;
BEGIN
  -- 1. Try delivery_providers first
  SELECT id INTO v_provider_id FROM delivery_providers LIMIT 1;
  
  -- 2. If empty, use auth_user_id from first approved registration
  IF v_provider_id IS NULL THEN
    SELECT auth_user_id INTO v_provider_id
    FROM delivery_provider_registrations
    WHERE auth_user_id IS NOT NULL AND LOWER(TRIM(status)) = 'approved'
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;
  
  IF v_provider_id IS NULL THEN
    RETURN 'No delivery_providers and no approved delivery_provider_registrations found.';
  END IF;
  
  -- 3. Update delivery_requests and purchase_orders
  UPDATE delivery_requests 
  SET provider_id = v_provider_id, updated_at = NOW()
  WHERE purchase_order_id IN ('481438f0-bf93-49d0-a738-6dfd03b784ca', 'd85bc751-ee78-4885-be19-8c9ee1659632')
    AND (provider_id IS NULL OR provider_id != v_provider_id);
  GET DIAGNOSTICS v_updated_dr = ROW_COUNT;
  
  UPDATE purchase_orders 
  SET delivery_provider_id = v_provider_id, updated_at = NOW()
  WHERE id IN ('481438f0-bf93-49d0-a738-6dfd03b784ca', 'd85bc751-ee78-4885-be19-8c9ee1659632')
    AND (delivery_provider_id IS NULL OR delivery_provider_id != v_provider_id);
  GET DIAGNOSTICS v_updated_po = ROW_COUNT;
  
  RETURN format('Updated %s delivery_requests, %s purchase_orders for provider %s', v_updated_dr, v_updated_po, v_provider_id);
END;
$$;

-- ============================================================
-- MANUAL: If delivery_providers is empty, use auth user id
-- Some setups use user_id directly. Run this, replace USER_UUID with the provider's auth user id:
--
-- UPDATE delivery_requests SET provider_id = 'USER_UUID', updated_at = NOW()
-- WHERE purchase_order_id IN ('481438f0-bf93-49d0-a738-6dfd03b784ca', 'd85bc751-ee78-4885-be19-8c9ee1659632');
-- UPDATE purchase_orders SET delivery_provider_id = 'USER_UUID', updated_at = NOW()
-- WHERE id IN ('481438f0-bf93-49d0-a738-6dfd03b784ca', 'd85bc751-ee78-4885-be19-8c9ee1659632');

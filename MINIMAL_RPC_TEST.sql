-- ============================================================
-- MINIMAL TEST: Create the simplest possible RPC to test
-- This version just returns basic delivery_requests data
-- ============================================================

-- Drop and create minimal version
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
  -- Fast provider resolution
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

  -- MINIMAL: Just return delivery_requests, no joins, no material_items
  SELECT jsonb_agg(row_to_json(dr_data)::jsonb) INTO v_result
  FROM (
    SELECT
      dr.id,
      dr.purchase_order_id,
      COALESCE(dr.order_number, 'DR-' || SUBSTRING(dr.id::text, 1, 8)) AS order_number,
      dr.status,
      dr.status AS po_status,
      dr.status AS purchase_order_status,
      dr.created_at,
      dr.updated_at,
      dr.delivery_address,
      dr.pickup_location,
      dr.dropoff_location,
      dr.provider_id AS delivery_provider_id,
      dr.provider_id,
      0 AS _items_count,
      0 AS _dispatched_count,
      0 AS _received_count,
      CASE 
        WHEN dr.status IN ('delivered', 'completed') THEN 'delivered'
        WHEN dr.status IN ('dispatched', 'shipped', 'in_transit') THEN 'in_transit'
        ELSE 'scheduled'
      END AS _categorized_status,
      'unified' AS source
    FROM delivery_requests dr
    WHERE dr.provider_id = v_provider_id
      AND dr.status != 'cancelled'
    ORDER BY dr.updated_at DESC NULLS LAST
    LIMIT 250
  ) dr_data;

  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$fn$;

-- Verify
SELECT 
  'Minimal RPC Created' as status,
  EXISTS(
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_deliveries_for_provider_unified'
  ) as function_exists;

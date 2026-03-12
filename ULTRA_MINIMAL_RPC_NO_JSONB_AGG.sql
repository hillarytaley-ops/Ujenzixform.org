-- ============================================================
-- ULTRA MINIMAL: Even simpler - avoid jsonb_agg which might be slow
-- ============================================================

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
  v_row JSONB;
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

  -- ULTRA MINIMAL: Build JSONB array manually (faster than jsonb_agg)
  FOR v_row IN 
    SELECT jsonb_build_object(
      'id', dr.id,
      'purchase_order_id', dr.purchase_order_id,
      'order_number', COALESCE(dr.order_number, 'DR-' || SUBSTRING(dr.id::text, 1, 8)),
      'status', dr.status,
      'po_status', dr.status,
      'purchase_order_status', dr.status,
      'created_at', dr.created_at,
      'updated_at', dr.updated_at,
      'delivery_address', dr.delivery_address,
      'pickup_location', dr.pickup_location,
      'dropoff_location', dr.dropoff_location,
      'delivery_provider_id', dr.provider_id,
      'provider_id', dr.provider_id,
      '_items_count', 0,
      '_dispatched_count', 0,
      '_received_count', 0,
      '_categorized_status', CASE 
        WHEN dr.status IN ('delivered', 'completed') THEN 'delivered'
        WHEN dr.status IN ('dispatched', 'shipped', 'in_transit') THEN 'in_transit'
        ELSE 'scheduled'
      END,
      'source', 'unified'
    ) AS row_data
    FROM delivery_requests dr
    WHERE dr.provider_id = v_provider_id
      AND dr.status != 'cancelled'
    ORDER BY dr.updated_at DESC NULLS LAST
    LIMIT 250
  LOOP
    v_result := v_result || v_row;
  END LOOP;

  RETURN v_result;
END;
$fn$;

-- Verify
SELECT 
  'Ultra Minimal RPC Created' as status,
  EXISTS(
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_deliveries_for_provider_unified'
  ) as function_exists;

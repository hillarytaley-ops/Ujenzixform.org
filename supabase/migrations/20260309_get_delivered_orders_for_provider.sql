-- ============================================================
-- RPC: get_delivered_orders_for_provider
-- Returns delivered purchase_orders for the current delivery provider
-- Uses material_items.receive_scanned as source of truth (matches supplier dashboard)
-- Avoids provider lookup timeout by doing join server-side
-- Created: March 9, 2026
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_delivered_orders_for_provider()
RETURNS SETOF purchase_orders
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Provider's delivered orders = POs where:
  -- 1. Provider is assigned (via delivery_provider_id or delivery_requests)
  -- 2. ALL material_items have receive_scanned = true (matches supplier "Delivered" tab)
  SELECT DISTINCT po.* 
  FROM purchase_orders po
  LEFT JOIN delivery_providers dp ON dp.id = po.delivery_provider_id 
  LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id
  LEFT JOIN delivery_providers dr_dp ON dr_dp.id = dr.provider_id
  WHERE 
    (dp.user_id = auth.uid() OR dr_dp.user_id = auth.uid())
    AND po.id IN (
      SELECT mi.purchase_order_id 
      FROM material_items mi 
      GROUP BY mi.purchase_order_id 
      HAVING COUNT(*) > 0 
        AND COUNT(*) = COUNT(*) FILTER (WHERE mi.receive_scanned = true)
    )
  ORDER BY po.updated_at DESC
  LIMIT 200;
$$;

GRANT EXECUTE ON FUNCTION public.get_delivered_orders_for_provider() TO authenticated;

COMMENT ON FUNCTION public.get_delivered_orders_for_provider() IS 
  'Returns delivered purchase_orders for current delivery provider. Uses material_items.receive_scanned as source of truth - aligns with supplier QR Code Manager Delivered tab.';

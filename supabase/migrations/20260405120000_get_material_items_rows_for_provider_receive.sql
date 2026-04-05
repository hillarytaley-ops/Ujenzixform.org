-- ============================================================
-- RPC: get_material_items_rows_for_provider_receive
-- Returns material_items rows for receiving scanner when REST SELECT
-- returns 0 rows under RLS (same assignment rules as UPDATE policy 20260425).
-- SECURITY DEFINER — assignment enforced in WHERE EXISTS.
-- Created: April 5, 2026
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_material_items_rows_for_provider_receive(p_po_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF p_po_ids IS NULL OR array_length(p_po_ids, 1) IS NULL OR array_length(p_po_ids, 1) = 0 THEN
    RETURN '[]'::JSONB;
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN '[]'::JSONB;
  END IF;

  RETURN COALESCE(
    (
      SELECT jsonb_agg(sub.j)
      FROM (
        SELECT jsonb_build_object(
          'id', mi.id,
          'purchase_order_id', mi.purchase_order_id,
          'qr_code', mi.qr_code,
          'material_type', mi.material_type,
          'category', mi.category,
          'quantity', mi.quantity,
          'unit', mi.unit,
          'item_sequence', mi.item_sequence,
          'receive_scanned', mi.receive_scanned,
          'receive_scan_count', COALESCE(mi.receive_scan_count, 0),
          'dispatch_scanned', mi.dispatch_scanned,
          'status', mi.status,
          'created_at', mi.created_at
        ) AS j
        FROM material_items mi
        WHERE mi.purchase_order_id = ANY (p_po_ids)
          AND EXISTS (
            SELECT 1
            FROM purchase_orders po
            LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id AND dr.purchase_order_id IS NOT NULL
            WHERE po.id = mi.purchase_order_id
              AND (
                po.delivery_provider_id = auth.uid()
                OR dr.provider_id = auth.uid()
                OR EXISTS (
                  SELECT 1 FROM delivery_providers dp
                  WHERE dp.id = dr.provider_id AND dp.user_id = auth.uid()
                )
                OR EXISTS (
                  SELECT 1 FROM delivery_providers dp
                  WHERE dp.id = po.delivery_provider_id AND dp.user_id = auth.uid()
                )
              )
          )
        ORDER BY mi.item_sequence ASC NULLS LAST, mi.id
      ) sub
    ),
    '[]'::JSONB
  );
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.get_material_items_rows_for_provider_receive(UUID[]) TO authenticated;

COMMENT ON FUNCTION public.get_material_items_rows_for_provider_receive(UUID[]) IS
  'Returns material_items JSON rows for assigned POs; bypasses RLS for receiving scanner read path.';

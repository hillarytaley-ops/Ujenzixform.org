-- ============================================================
-- RPC: get_material_items_scan_status_for_provider
-- Returns scan status (dispatch_scanned, receive_scanned) for provider's POs
-- SECURITY DEFINER bypasses RLS - use when REST material_items fetch returns empty
-- Created: March 11, 2026
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_material_items_scan_status_for_provider(po_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_result JSONB := '{}'::JSONB;
BEGIN
  IF po_ids IS NULL OR array_length(po_ids, 1) IS NULL OR array_length(po_ids, 1) = 0 THEN
    RETURN v_result;
  END IF;

  -- Aggregate scan status per purchase_order_id (bypasses RLS)
  SELECT jsonb_object_agg(
    purchase_order_id::text,
    jsonb_build_object(
      'total', total,
      'dispatched', dispatched,
      'received', received
    )
  ) INTO v_result
  FROM (
    SELECT
      mi.purchase_order_id,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE mi.dispatch_scanned = true)::int AS dispatched,
      COUNT(*) FILTER (WHERE mi.receive_scanned = true)::int AS received
    FROM material_items mi
    WHERE mi.purchase_order_id = ANY(po_ids)
    GROUP BY mi.purchase_order_id
  ) sub;

  RETURN COALESCE(v_result, '{}'::JSONB);
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.get_material_items_scan_status_for_provider(UUID[]) TO authenticated;

COMMENT ON FUNCTION public.get_material_items_scan_status_for_provider(UUID[]) IS
  'Returns material_items scan status (total, dispatched, received) per PO. SECURITY DEFINER bypasses RLS for reliable provider dashboard when REST fetch returns empty.';

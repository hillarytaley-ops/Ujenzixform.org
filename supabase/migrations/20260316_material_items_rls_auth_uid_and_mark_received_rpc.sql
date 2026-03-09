-- ============================================================
-- 1. RLS: Allow delivery provider to UPDATE material_items when
--    po.delivery_provider_id = auth.uid() OR dr.provider_id = auth.uid()
--    (no delivery_providers row needed - fixes "received: 0" when scans don't persist)
-- 2. RPC: mark_material_items_received_for_po - set receive_scanned = true
--    for all material_items of a PO (SECURITY DEFINER so it always persists).
--    Use when driver has scanned all items but DB shows received=0.
-- Created: March 16, 2026
-- ============================================================

-- 1a. SELECT: allow when provider is auth.uid() (so scanner can find items; no delivery_providers row needed)
DROP POLICY IF EXISTS "Delivery providers can view assigned material items" ON material_items;

CREATE POLICY "Delivery providers can view assigned material items"
ON material_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM purchase_orders po
    LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id AND dr.purchase_order_id IS NOT NULL
    WHERE po.id = material_items.purchase_order_id
    AND (
      po.delivery_provider_id = auth.uid()
      OR dr.provider_id = auth.uid()
      OR EXISTS (SELECT 1 FROM delivery_providers dp WHERE dp.id = dr.provider_id AND dp.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM delivery_providers dp WHERE dp.id = po.delivery_provider_id AND dp.user_id = auth.uid())
    )
  )
);

-- 1b. UPDATE: allow when provider is auth.uid()
DROP POLICY IF EXISTS "Delivery providers can update assigned material items" ON material_items;

CREATE POLICY "Delivery providers can update assigned material items"
ON material_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM purchase_orders po
    LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id AND dr.purchase_order_id IS NOT NULL
    WHERE po.id = material_items.purchase_order_id
    AND (
      po.delivery_provider_id = auth.uid()
      OR dr.provider_id = auth.uid()
      OR EXISTS (SELECT 1 FROM delivery_providers dp WHERE dp.id = dr.provider_id AND dp.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM delivery_providers dp WHERE dp.id = po.delivery_provider_id AND dp.user_id = auth.uid())
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM purchase_orders po
    LEFT JOIN delivery_requests dr ON dr.purchase_order_id = po.id AND dr.purchase_order_id IS NOT NULL
    WHERE po.id = material_items.purchase_order_id
    AND (
      po.delivery_provider_id = auth.uid()
      OR dr.provider_id = auth.uid()
      OR EXISTS (SELECT 1 FROM delivery_providers dp WHERE dp.id = dr.provider_id AND dp.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM delivery_providers dp WHERE dp.id = po.delivery_provider_id AND dp.user_id = auth.uid())
    )
  )
);

-- 2. RPC: Mark all material_items for a PO as receive_scanned (SECURITY DEFINER - bypasses RLS)
--    Call with po_number (e.g. 'PO-1772598054688-GR03X') when driver has scanned but DB shows received=0.
CREATE OR REPLACE FUNCTION public.mark_material_items_received_for_po(po_identifier TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_po_id UUID;
  v_updated INT := 0;
BEGIN
  IF po_identifier IS NULL OR po_identifier = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'po_identifier required', 'updated', 0);
  END IF;

  IF po_identifier ~ '^[0-9a-fA-F-]{36}$' THEN
    SELECT id INTO v_po_id FROM purchase_orders WHERE id = po_identifier::UUID LIMIT 1;
  ELSE
    SELECT id INTO v_po_id FROM purchase_orders WHERE po_number = po_identifier OR po_number LIKE po_identifier || '%' LIMIT 1;
  END IF;

  IF v_po_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Purchase order not found: ' || po_identifier, 'updated', 0);
  END IF;

  UPDATE material_items
  SET receive_scanned = TRUE,
      receive_scanned_at = COALESCE(receive_scanned_at, NOW()),
      status = CASE WHEN status IS NOT NULL AND status != '' THEN status ELSE 'received' END,
      updated_at = NOW()
  WHERE purchase_order_id = v_po_id
    AND (receive_scanned IS NOT TRUE);
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- If all items for this PO are now received, mark PO and delivery_requests as delivered
  IF NOT EXISTS (
    SELECT 1 FROM material_items WHERE purchase_order_id = v_po_id AND (receive_scanned IS NOT TRUE OR receive_scanned = FALSE)
  ) AND EXISTS (SELECT 1 FROM material_items WHERE purchase_order_id = v_po_id LIMIT 1) THEN
    UPDATE purchase_orders SET order_status = 'delivered', status = 'delivered', delivered_at = COALESCE(delivered_at, NOW()), updated_at = NOW() WHERE id = v_po_id;
    UPDATE delivery_requests SET status = 'delivered', delivered_at = COALESCE(delivered_at, NOW()), updated_at = NOW()
    WHERE purchase_order_id = v_po_id AND status NOT IN ('delivered', 'completed', 'cancelled');
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Marked ' || v_updated || ' item(s) as received', 'po_id', v_po_id, 'updated', v_updated);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_material_items_received_for_po(TEXT) TO authenticated;

COMMENT ON FUNCTION public.mark_material_items_received_for_po(TEXT) IS
  'Marks all material_items for the given PO as receive_scanned=true. SECURITY DEFINER so driver scan persists when RLS blocks direct UPDATE. Then updates PO and delivery_requests to delivered if all items received.';

-- ============================================================
-- RPC: sync_po_to_delivered_if_all_received
-- Fixes orders stuck in In Transit: when all material_items have
-- receive_scanned = true, updates purchase_orders and delivery_requests
-- to delivered (same logic as trigger, callable for stuck orders).
-- Usage: SELECT * FROM sync_po_to_delivered_if_all_received('PO-1772598054688-GR03X');
-- Created: March 15, 2026
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_po_to_delivered_if_all_received(po_identifier TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_po_id UUID;
  v_total INT;
  v_received INT;
  v_updated_po INT := 0;
  v_updated_dr INT := 0;
BEGIN
  -- Resolve PO by id (UUID) or po_number (e.g. PO-1772598054688-GR03X)
  IF po_identifier ~ '^[0-9a-fA-F-]{36}$' THEN
    SELECT id INTO v_po_id FROM purchase_orders WHERE id = po_identifier::UUID LIMIT 1;
  ELSE
    SELECT id INTO v_po_id FROM purchase_orders WHERE po_number = po_identifier OR po_number LIKE po_identifier || '%' LIMIT 1;
  END IF;

  IF v_po_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Purchase order not found: ' || COALESCE(po_identifier, 'null'),
      'updated_po', 0,
      'updated_dr', 0
    );
  END IF;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE receive_scanned = TRUE)
  INTO v_total, v_received
  FROM material_items
  WHERE purchase_order_id = v_po_id;

  IF v_total = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No material_items found for this order',
      'po_id', v_po_id,
      'updated_po', 0,
      'updated_dr', 0
    );
  END IF;

  IF v_received < v_total THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', format('Not all items received: %s of %s', v_received, v_total),
      'po_id', v_po_id,
      'total_items', v_total,
      'received_items', v_received,
      'updated_po', 0,
      'updated_dr', 0
    );
  END IF;

  -- All items received: update purchase_orders and delivery_requests
  UPDATE purchase_orders
  SET order_status = 'delivered',
      status = 'delivered',
      delivered_at = COALESCE(delivered_at, NOW()),
      updated_at = NOW()
  WHERE id = v_po_id;
  GET DIAGNOSTICS v_updated_po = ROW_COUNT;

  UPDATE delivery_requests
  SET status = 'delivered',
      delivered_at = COALESCE(delivered_at, NOW()),
      updated_at = NOW()
  WHERE purchase_order_id = v_po_id
    AND status NOT IN ('delivered', 'completed', 'cancelled');
  GET DIAGNOSTICS v_updated_dr = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Order marked as delivered',
    'po_id', v_po_id,
    'total_items', v_total,
    'received_items', v_received,
    'updated_po', v_updated_po,
    'updated_dr', v_updated_dr
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_po_to_delivered_if_all_received(TEXT) TO authenticated;

COMMENT ON FUNCTION public.sync_po_to_delivered_if_all_received(TEXT) IS
  'When all material_items for the given PO have receive_scanned=true, sets purchase_orders and delivery_requests to delivered. Use for stuck orders that were scanned but did not move to Delivered tab.';

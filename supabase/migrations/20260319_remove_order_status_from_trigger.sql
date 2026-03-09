-- ============================================================
-- Fix: purchase_orders may not have order_status column
-- update_order_status_from_items() must only set status.
-- Created: March 19, 2026
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_order_status_from_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    po_id UUID;
    total_items INTEGER;
    dispatched_items INTEGER;
    received_items INTEGER;
    new_order_status TEXT;
BEGIN
    po_id := NEW.purchase_order_id;

    IF po_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE dispatch_scanned = TRUE),
        COUNT(*) FILTER (WHERE receive_scanned = TRUE)
    INTO total_items, dispatched_items, received_items
    FROM material_items
    WHERE purchase_order_id = po_id;

    IF received_items = total_items AND total_items > 0 THEN
        new_order_status := 'delivered';

        UPDATE purchase_orders
        SET status = 'delivered',
            delivered_at = COALESCE(delivered_at, NOW()),
            updated_at = NOW()
        WHERE id = po_id;

        UPDATE delivery_requests
        SET status = 'delivered',
            delivered_at = COALESCE(delivered_at, NOW()),
            updated_at = NOW()
        WHERE purchase_order_id = po_id
          AND status NOT IN ('delivered', 'completed', 'cancelled');

    ELSIF received_items > 0 THEN
        new_order_status := 'partially_delivered';
        UPDATE purchase_orders
        SET status = 'partially_delivered',
            updated_at = NOW()
        WHERE id = po_id;

    ELSIF dispatched_items = total_items AND total_items > 0 THEN
        new_order_status := 'dispatched';
        UPDATE purchase_orders
        SET status = 'dispatched',
            dispatched_at = COALESCE(dispatched_at, NOW()),
            updated_at = NOW()
        WHERE id = po_id;

    ELSIF dispatched_items > 0 THEN
        new_order_status := 'partially_dispatched';
        UPDATE purchase_orders
        SET status = 'partially_dispatched',
            updated_at = NOW()
        WHERE id = po_id;
    END IF;

    IF new_order_status IS NOT NULL THEN
        BEGIN
            INSERT INTO order_status_history (order_id, status, notes, created_at)
            VALUES (po_id, new_order_status, 'Auto-updated from QR scan', NOW());
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_order_status_from_items() IS
  'When material_items receive_scanned/dispatch_scanned change: updates purchase_orders and delivery_requests (status only; no order_status column).';

-- Also fix RPCs that UPDATE purchase_orders with order_status (column may not exist)
-- mark_material_items_received_for_po: only set status
CREATE OR REPLACE FUNCTION public.mark_material_items_received_for_po(po_identifier TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_po_id UUID;
  v_updated INTEGER := 0;
BEGIN
  SELECT id INTO v_po_id FROM purchase_orders
  WHERE po_number = po_identifier OR po_number LIKE po_identifier || '%' OR id::TEXT = po_identifier
  LIMIT 1;

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

  IF NOT EXISTS (
    SELECT 1 FROM material_items WHERE purchase_order_id = v_po_id AND (receive_scanned IS NOT TRUE OR receive_scanned = FALSE)
  ) AND EXISTS (SELECT 1 FROM material_items WHERE purchase_order_id = v_po_id LIMIT 1) THEN
    UPDATE purchase_orders SET status = 'delivered', delivered_at = COALESCE(delivered_at, NOW()), updated_at = NOW() WHERE id = v_po_id;
    UPDATE delivery_requests SET status = 'delivered', delivered_at = COALESCE(delivered_at, NOW()), updated_at = NOW()
    WHERE purchase_order_id = v_po_id AND status NOT IN ('delivered', 'completed', 'cancelled');
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Marked ' || v_updated || ' item(s) as received', 'po_id', v_po_id, 'updated', v_updated);
END;
$$;

-- sync_po_to_delivered_if_all_received: only set status
CREATE OR REPLACE FUNCTION public.sync_po_to_delivered_if_all_received(po_identifier TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_po_id UUID;
  v_total INTEGER;
  v_received INTEGER;
  v_updated_po INTEGER := 0;
  v_updated_dr INTEGER := 0;
BEGIN
  SELECT id INTO v_po_id FROM purchase_orders
  WHERE po_number = po_identifier OR po_number LIKE po_identifier || '%' OR id::TEXT = po_identifier
  LIMIT 1;

  IF v_po_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Purchase order not found: ' || po_identifier);
  END IF;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE receive_scanned = TRUE)
  INTO v_total, v_received
  FROM material_items WHERE purchase_order_id = v_po_id;

  IF v_total = 0 OR v_received < v_total THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Not all items received (received ' || COALESCE(v_received, 0) || '/' || COALESCE(v_total, 0) || ')',
      'po_id', v_po_id,
      'total_items', v_total,
      'received_items', v_received,
      'updated_po', 0,
      'updated_dr', 0
    );
  END IF;

  UPDATE purchase_orders
  SET status = 'delivered',
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

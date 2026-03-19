-- ============================================================
-- record_qr_scan: support receive_scan_count for receiving (mirror dispatch)
-- When quantity > 1, allow multiple scans until receive_scan_count >= quantity
-- Created: April 27, 2026
-- ============================================================

CREATE OR REPLACE FUNCTION public.record_qr_scan(
  _qr_code TEXT,
  _scan_type TEXT,
  _scanner_device_id TEXT DEFAULT NULL,
  _scanner_type TEXT DEFAULT 'web_scanner',
  _scan_location JSONB DEFAULT NULL,
  _material_condition TEXT DEFAULT 'good',
  _quantity_scanned INTEGER DEFAULT NULL,
  _notes TEXT DEFAULT NULL,
  _photo_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  scan_event_id UUID;
  item_record RECORD;
  current_user_id UUID;
  order_id UUID;
  v_delivery_request_provider_id UUID;
  v_delivery_request_status TEXT;
  v_quantity INTEGER;
  v_new_count INTEGER;
  v_now_received BOOLEAN;
BEGIN
  current_user_id := auth.uid();

  SELECT * INTO item_record FROM material_items WHERE qr_code = _qr_code;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'QR code not found.', 'error_code', 'QR_NOT_FOUND', 'qr_code', _qr_code);
  END IF;

  order_id := item_record.purchase_order_id;
  v_quantity := GREATEST(COALESCE(item_record.quantity, 1), 1);

  IF item_record.is_invalidated = TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', 'This QR code has been invalidated.', 'error_code', 'QR_INVALIDATED', 'qr_code', _qr_code);
  END IF;

  IF _scan_type = 'dispatch' THEN
    IF item_record.dispatch_scanned = TRUE THEN
      RETURN jsonb_build_object('success', false, 'error', 'Already scanned for DISPATCH.', 'error_code', 'ALREADY_DISPATCHED', 'qr_code', _qr_code);
    END IF;
  END IF;

  IF _scan_type = 'receiving' THEN
    IF item_record.receive_scanned = TRUE OR (COALESCE(item_record.receive_scan_count, 0) >= v_quantity) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Already scanned for RECEIVING.', 'error_code', 'ALREADY_RECEIVED', 'qr_code', _qr_code);
    END IF;
    IF item_record.dispatch_scanned = FALSE OR item_record.dispatch_scanned IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Item has not been dispatched yet.', 'error_code', 'NOT_DISPATCHED', 'qr_code', _qr_code);
    END IF;
  END IF;

  INSERT INTO qr_scan_events (qr_code, scan_type, scanned_by, scanner_device_id, scanner_type, scan_location, material_condition, quantity_scanned, notes, photo_url)
  VALUES (_qr_code, _scan_type, current_user_id, _scanner_device_id, _scanner_type, _scan_location, _material_condition, _quantity_scanned, _notes, _photo_url)
  RETURNING id INTO scan_event_id;

  IF _scan_type = 'dispatch' THEN
    UPDATE material_items
    SET dispatch_scan_count = COALESCE(dispatch_scan_count, 0) + 1, dispatch_scan_id = scan_event_id, status = 'dispatched', updated_at = NOW()
    WHERE qr_code = _qr_code
    RETURNING dispatch_scan_count INTO v_new_count;
    v_new_count := COALESCE(v_new_count, 1);
    v_now_received := FALSE;
    IF (v_new_count >= v_quantity) THEN
      UPDATE material_items SET dispatch_scanned = TRUE, dispatch_scanned_at = NOW(), dispatch_scanned_by = current_user_id, updated_at = NOW() WHERE qr_code = _qr_code;
    END IF;
    IF order_id IS NOT NULL THEN
      SELECT provider_id, status INTO v_delivery_request_provider_id, v_delivery_request_status FROM delivery_requests WHERE purchase_order_id = order_id AND provider_id IS NOT NULL ORDER BY created_at DESC LIMIT 1;
      UPDATE purchase_orders SET status = 'shipped', delivery_provider_id = COALESCE(delivery_provider_id, v_delivery_request_provider_id), delivery_status = CASE WHEN v_delivery_request_status = 'accepted' THEN 'in_transit' ELSE delivery_status END, updated_at = NOW()
      WHERE id = order_id AND status IN ('confirmed', 'processing', 'pending');
    END IF;
    SELECT * INTO item_record FROM material_items WHERE qr_code = _qr_code;
    RETURN jsonb_build_object('success', true, 'scan_event_id', scan_event_id, 'qr_code', item_record.qr_code, 'material_type', item_record.material_type, 'category', item_record.category, 'quantity', item_record.quantity, 'unit', item_record.unit, 'status', item_record.status, 'dispatch_scanned', item_record.dispatch_scanned, 'receive_scanned', item_record.receive_scanned, 'purchase_order_id', item_record.purchase_order_id, 'dispatch_scan_count', COALESCE(item_record.dispatch_scan_count, v_new_count), 'new_status', CASE WHEN (v_new_count >= v_quantity) THEN 'dispatched' ELSE 'partial_dispatch' END);
  END IF;

  IF _scan_type = 'receiving' THEN
    UPDATE material_items
    SET receive_scan_count = COALESCE(receive_scan_count, 0) + 1, receiving_scan_id = scan_event_id, status = 'received', updated_at = NOW()
    WHERE qr_code = _qr_code
    RETURNING receive_scan_count INTO v_new_count;
    v_new_count := COALESCE(v_new_count, 1);
    v_now_received := (v_new_count >= v_quantity);
    IF v_now_received THEN
      UPDATE material_items SET receive_scanned = TRUE, receive_scanned_at = NOW(), receive_scanned_by = current_user_id, updated_at = NOW() WHERE qr_code = _qr_code;
      UPDATE material_items SET is_invalidated = TRUE, invalidated_at = NOW(), status = 'verified' WHERE qr_code = _qr_code;
    END IF;
    IF order_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM material_items WHERE purchase_order_id = order_id AND (receive_scanned = FALSE OR receive_scanned IS NULL)) THEN
      UPDATE purchase_orders SET status = 'delivered', delivery_status = 'delivered', delivered_at = COALESCE(delivered_at, NOW()), updated_at = NOW() WHERE id = order_id;
      UPDATE delivery_requests SET status = 'delivered', delivered_at = COALESCE(delivered_at, NOW()), updated_at = NOW() WHERE purchase_order_id = order_id AND status NOT IN ('delivered', 'completed', 'cancelled');
    END IF;
    SELECT * INTO item_record FROM material_items WHERE qr_code = _qr_code;
    RETURN jsonb_build_object('success', true, 'scan_event_id', scan_event_id, 'qr_code', item_record.qr_code, 'material_type', item_record.material_type, 'category', item_record.category, 'quantity', item_record.quantity, 'unit', item_record.unit, 'status', item_record.status, 'dispatch_scanned', item_record.dispatch_scanned, 'receive_scanned', item_record.receive_scanned, 'purchase_order_id', item_record.purchase_order_id, 'receive_scan_count', COALESCE(item_record.receive_scan_count, v_new_count), 'new_status', CASE WHEN v_now_received THEN 'received' ELSE 'partial_receive' END);
  END IF;

  IF _scan_type = 'verification' THEN
    UPDATE material_items SET status = 'verified', verification_scan_id = scan_event_id, updated_at = NOW() WHERE qr_code = _qr_code;
  END IF;

  SELECT * INTO item_record FROM material_items WHERE qr_code = _qr_code;
  RETURN jsonb_build_object('success', true, 'scan_event_id', scan_event_id, 'qr_code', item_record.qr_code, 'material_type', item_record.material_type, 'category', item_record.category, 'quantity', item_record.quantity, 'unit', item_record.unit, 'status', item_record.status, 'dispatch_scanned', item_record.dispatch_scanned, 'receive_scanned', item_record.receive_scanned, 'purchase_order_id', item_record.purchase_order_id);
END;
$$;

COMMENT ON FUNCTION public.record_qr_scan(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, INTEGER, TEXT, TEXT) IS
  'Dispatch: multiple scans when quantity>1 until dispatch_scan_count>=quantity. Receiving: same with receive_scan_count.';

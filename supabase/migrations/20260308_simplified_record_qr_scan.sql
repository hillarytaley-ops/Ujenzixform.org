-- ============================================================
-- SIMPLIFIED record_qr_scan - Direct PO + Item lookup
-- This is a simpler, faster approach that queries by PO number + item sequence
-- ============================================================

-- Create a simplified version that's faster and more reliable
CREATE OR REPLACE FUNCTION public.record_qr_scan_simple(
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
  po_number_match TEXT;
  item_number_match TEXT;
  delivery_request_id UUID;
  v_all_items_received BOOLEAN;
  v_all_items_dispatched BOOLEAN;
  v_delivery_request_provider_id UUID;
  v_delivery_request_status TEXT;
BEGIN
  current_user_id := auth.uid();
  
  -- STEP 1: Try exact match first (fastest)
  SELECT * INTO item_record
  FROM material_items
  WHERE qr_code = _qr_code
  LIMIT 1;
  
  -- STEP 2: If not found, extract PO number and item number, then query directly
  IF NOT FOUND THEN
    po_number_match := (regexp_match(_qr_code, 'PO-(\d{13,})'))[1];
    item_number_match := (regexp_match(_qr_code, 'ITEM(\d+)'))[1];
    
    IF po_number_match IS NOT NULL AND item_number_match IS NOT NULL THEN
      -- Direct lookup by PO number + item sequence (much faster than pattern matching)
      SELECT mi.* INTO item_record
      FROM material_items mi
      JOIN purchase_orders po ON po.id = mi.purchase_order_id
      WHERE po.po_number LIKE '%' || po_number_match || '%'
        AND mi.item_sequence = (item_number_match::INTEGER)
      LIMIT 1;
    END IF;
  END IF;
  
  -- If still not found, return error
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'QR code not found. Please verify the QR code is correct.',
      'error_code', 'QR_NOT_FOUND',
      'qr_code', _qr_code,
      'extracted_po', po_number_match,
      'extracted_item', item_number_match
    );
  END IF;
  
  order_id := item_record.purchase_order_id;
  
  -- Insert scan event
  INSERT INTO qr_scan_events (
    qr_code,
    scan_type,
    scanned_by,
    scanner_device_id,
    scanner_type,
    scan_location,
    material_condition,
    quantity_scanned,
    notes,
    photo_url
  ) VALUES (
    item_record.qr_code,
    _scan_type,
    current_user_id,
    _scanner_device_id,
    _scanner_type,
    _scan_location,
    _material_condition,
    _quantity_scanned,
    _notes,
    _photo_url
  ) RETURNING id INTO scan_event_id;
  
  -- Handle dispatch scan
  IF _scan_type = 'dispatch' THEN
    -- Check if already dispatched
    IF item_record.dispatch_scanned = TRUE THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'This QR code has already been scanned for DISPATCH.',
        'error_code', 'ALREADY_DISPATCHED',
        'qr_code', item_record.qr_code
      );
    END IF;
    
    -- Update material item
    UPDATE material_items
    SET status = 'dispatched',
        dispatch_scan_id = scan_event_id,
        dispatch_scanned = TRUE,
        dispatch_scanned_at = NOW(),
        dispatch_scanned_by = current_user_id,
        updated_at = NOW()
    WHERE id = item_record.id;
    
    -- Check if all items dispatched and ensure delivery_provider_id is set
    IF order_id IS NOT NULL THEN
      -- Check if all items are dispatched
      SELECT 
        COUNT(*) = COUNT(*) FILTER (WHERE dispatch_scanned = TRUE)
      INTO v_all_items_dispatched
      FROM material_items
      WHERE purchase_order_id = order_id;
      
      -- Get delivery_request provider_id if exists
      SELECT provider_id, status INTO v_delivery_request_provider_id, v_delivery_request_status
      FROM delivery_requests
      WHERE purchase_order_id = order_id
        AND provider_id IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1;
      
      -- Update purchase_order status and ensure delivery_provider_id is set
      UPDATE purchase_orders
      SET status = CASE 
          WHEN v_all_items_dispatched = TRUE THEN 'shipped'
          ELSE status
        END,
        delivery_provider_id = COALESCE(delivery_provider_id, v_delivery_request_provider_id),
        delivery_status = CASE 
          WHEN v_all_items_dispatched = TRUE AND v_delivery_request_status = 'accepted' THEN 'in_transit'
          ELSE delivery_status
        END,
        updated_at = NOW()
      WHERE id = order_id
        AND status IN ('confirmed', 'processing', 'pending', 'quote_accepted', 'order_created');
      
      RAISE NOTICE 'Dispatch scan: order_id=%, all_dispatched=%, provider_id=%', order_id, v_all_items_dispatched, v_delivery_request_provider_id;
    END IF;
    
    -- Return success for dispatch
    RETURN jsonb_build_object(
      'success', true,
      'scan_event_id', scan_event_id,
      'qr_code', item_record.qr_code,
      'material_type', item_record.material_type,
      'status', 'dispatched',
      'all_items_dispatched', COALESCE(v_all_items_dispatched, FALSE)
    );
  END IF;
  
  -- Handle receiving scan
  IF _scan_type = 'receiving' THEN
    -- Check if already received
    IF item_record.receive_scanned = TRUE THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'This QR code has already been scanned for RECEIVING.',
        'error_code', 'ALREADY_RECEIVED',
        'qr_code', item_record.qr_code
      );
    END IF;
    
    -- Update material item
    UPDATE material_items
    SET status = 'received',
        receiving_scan_id = scan_event_id,
        receive_scanned = TRUE,
        receive_scanned_at = NOW(),
        receive_scanned_by = current_user_id,
        updated_at = NOW()
    WHERE id = item_record.id;
    
    -- Check if all items received - update purchase_order and delivery_request
    IF order_id IS NOT NULL THEN
      SELECT 
        COUNT(*) = COUNT(*) FILTER (WHERE receive_scanned = TRUE)
      INTO v_all_items_received
      FROM material_items
      WHERE purchase_order_id = order_id;
      
      IF v_all_items_received = TRUE THEN
        -- Update purchase_orders status AND delivery_status to 'delivered'
        -- CRITICAL: Always update when all items are received, regardless of current status
        -- This ensures orders move from 'in_transit' or 'shipped' to 'delivered'
        -- We check v_all_items_received above, so we know delivery is complete
        UPDATE purchase_orders
        SET status = 'delivered',
            delivery_status = 'delivered',
            delivered_at = COALESCE(delivered_at, NOW()),
            updated_at = NOW()
        WHERE id = order_id;
        
        -- Also update delivery_requests that are in transit (exclude cancelled/completed)
        UPDATE delivery_requests
        SET status = 'delivered',
            delivered_at = COALESCE(delivered_at, NOW()),
            updated_at = NOW()
        WHERE purchase_order_id = order_id
          AND status NOT IN ('delivered', 'completed', 'cancelled');
        
        RAISE NOTICE 'All items received - Updated purchase_order % and delivery_request status to delivered', order_id;
      END IF;
    END IF;
  END IF;
  
  -- Return success (order_completed helps UI show correct feedback for multi-item orders)
  RETURN jsonb_build_object(
    'success', true,
    'scan_event_id', scan_event_id,
    'qr_code', item_record.qr_code,
    'material_type', item_record.material_type,
    'status', 'received',
    'order_completed', COALESCE(v_all_items_received, FALSE)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_qr_scan_simple TO authenticated;

COMMENT ON FUNCTION public.record_qr_scan_simple IS 'Simplified version of record_qr_scan that uses direct PO + item lookup for better performance and reliability.';

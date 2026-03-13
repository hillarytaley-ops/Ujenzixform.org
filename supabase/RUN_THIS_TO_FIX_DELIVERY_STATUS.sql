-- ============================================================
-- QUICK FIX: Update order status when all items are received
-- Run this in Supabase SQL Editor to fix the delivery status issue
-- ============================================================

-- First, let's check the current function to see what it does
-- Then we'll fix it

-- Fix record_qr_scan_simple - the function used by receiving scanner
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
  v_all_items_received BOOLEAN;
  v_all_items_dispatched BOOLEAN;
  v_delivery_request_provider_id UUID;
  v_delivery_request_status TEXT;
BEGIN
  current_user_id := auth.uid();
  
  -- Find the material item
  SELECT * INTO item_record
  FROM material_items
  WHERE qr_code = _qr_code
  LIMIT 1;
  
  -- If not found, try extracting PO number and item number
  IF NOT FOUND THEN
    po_number_match := (regexp_match(_qr_code, 'PO-(\d{13,})'))[1];
    item_number_match := (regexp_match(_qr_code, 'ITEM(\d+)'))[1];
    
    IF po_number_match IS NOT NULL AND item_number_match IS NOT NULL THEN
      SELECT mi.* INTO item_record
      FROM material_items mi
      JOIN purchase_orders po ON po.id = mi.purchase_order_id
      WHERE po.po_number LIKE '%' || po_number_match || '%'
        AND mi.item_sequence = (item_number_match::INTEGER)
      LIMIT 1;
    END IF;
  END IF;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'QR code not found',
      'error_code', 'QR_NOT_FOUND'
    );
  END IF;
  
  order_id := item_record.purchase_order_id;
  
  -- Insert scan event
  INSERT INTO qr_scan_events (
    qr_code, scan_type, scanned_by, scanner_device_id, scanner_type,
    scan_location, material_condition, quantity_scanned, notes, photo_url
  ) VALUES (
    item_record.qr_code, _scan_type, current_user_id, _scanner_device_id, _scanner_type,
    _scan_location, _material_condition, _quantity_scanned, _notes, _photo_url
  ) RETURNING id INTO scan_event_id;
  
  -- Handle receiving scan
  IF _scan_type = 'receiving' THEN
    IF item_record.receive_scanned = TRUE THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Already scanned',
        'error_code', 'ALREADY_RECEIVED'
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
    
    -- CRITICAL FIX: Check if all items received and update order
    IF order_id IS NOT NULL THEN
      SELECT COUNT(*) = COUNT(*) FILTER (WHERE receive_scanned = TRUE)
      INTO v_all_items_received
      FROM material_items
      WHERE purchase_order_id = order_id;
      
      IF v_all_items_received = TRUE THEN
        -- FIX: Always update to delivered when all items are received
        UPDATE purchase_orders
        SET status = 'delivered',
            delivery_status = 'delivered',
            delivered_at = COALESCE(delivered_at, NOW()),
            updated_at = NOW()
        WHERE id = order_id;
        
        -- Also update delivery_request
        UPDATE delivery_requests
        SET status = 'delivered',
            delivered_at = COALESCE(delivered_at, NOW()),
            updated_at = NOW()
        WHERE purchase_order_id = order_id
          AND status NOT IN ('delivered', 'completed', 'cancelled');
        
        RAISE NOTICE '✅ FIXED: All items received - Order % updated to delivered', order_id;
      END IF;
    END IF;
  END IF;
  
  -- Handle dispatch scan (simplified)
  IF _scan_type = 'dispatch' THEN
    IF item_record.dispatch_scanned = TRUE THEN
      RETURN jsonb_build_object('success', false, 'error', 'Already dispatched', 'error_code', 'ALREADY_DISPATCHED');
    END IF;
    
    UPDATE material_items
    SET status = 'dispatched',
        dispatch_scan_id = scan_event_id,
        dispatch_scanned = TRUE,
        dispatch_scanned_at = NOW(),
        dispatch_scanned_by = current_user_id,
        updated_at = NOW()
    WHERE id = item_record.id;
    
    -- Update order status if all items dispatched
    IF order_id IS NOT NULL THEN
      SELECT COUNT(*) = COUNT(*) FILTER (WHERE dispatch_scanned = TRUE)
      INTO v_all_items_dispatched
      FROM material_items
      WHERE purchase_order_id = order_id;
      
      IF v_all_items_dispatched = TRUE THEN
        SELECT provider_id, status INTO v_delivery_request_provider_id, v_delivery_request_status
        FROM delivery_requests
        WHERE purchase_order_id = order_id AND provider_id IS NOT NULL
        ORDER BY created_at DESC LIMIT 1;
        
        UPDATE purchase_orders
        SET status = 'shipped',
            delivery_provider_id = COALESCE(delivery_provider_id, v_delivery_request_provider_id),
            delivery_status = CASE WHEN v_delivery_request_status = 'accepted' THEN 'in_transit' ELSE delivery_status END,
            updated_at = NOW()
        WHERE id = order_id;
      END IF;
    END IF;
  END IF;
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'scan_event_id', scan_event_id,
    'qr_code', item_record.qr_code,
    'material_type', item_record.material_type,
    'status', CASE WHEN _scan_type = 'receiving' THEN 'received' ELSE 'dispatched' END,
    'order_completed', COALESCE(v_all_items_received, FALSE)
  );
END;
$$;

-- Verify the function was created
SELECT '✅ Function record_qr_scan_simple has been fixed!' AS result;

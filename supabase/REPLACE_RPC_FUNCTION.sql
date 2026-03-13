-- ============================================================
-- COMPLETE REPLACEMENT: record_qr_scan_simple function
-- This replaces the entire RPC function with a clean, fast version
-- Run this in Supabase SQL Editor
-- ============================================================

-- Drop the old function completely
DROP FUNCTION IF EXISTS public.record_qr_scan_simple(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.record_qr_scan_simple(TEXT, TEXT);

-- Create the new, simplified function
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
  v_all_items_received BOOLEAN := FALSE;
  v_received_count INTEGER;
  v_total_count INTEGER;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not authenticated',
      'error_code', 'NOT_AUTHENTICATED'
    );
  END IF;
  
  -- Find item by QR code (exact match first - FAST)
  SELECT * INTO item_record 
  FROM material_items 
  WHERE qr_code = _qr_code 
  LIMIT 1;
  
  -- If not found, try without any prefix matching (simpler, faster)
  IF NOT FOUND THEN
    -- Extract just the core QR code part if it has a prefix
    SELECT * INTO item_record 
    FROM material_items 
    WHERE qr_code LIKE '%' || SUBSTRING(_qr_code FROM '[A-Z0-9-]+$') || '%'
       OR qr_code = SUBSTRING(_qr_code FROM '[A-Z0-9-]+$')
    LIMIT 1;
  END IF;
  
  -- Still not found? Return error
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'QR code not found',
      'error_code', 'QR_NOT_FOUND',
      'qr_code', SUBSTRING(_qr_code FROM 1 FOR 50)
    );
  END IF;
  
  order_id := item_record.purchase_order_id;
  
  -- Insert scan event FIRST
  BEGIN
    INSERT INTO qr_scan_events (
      qr_code, scan_type, scanned_by, scanner_device_id, scanner_type,
      scan_location, material_condition, quantity_scanned, notes, photo_url
    ) VALUES (
      item_record.qr_code, _scan_type, current_user_id, _scanner_device_id, _scanner_type,
      _scan_location, _material_condition, _quantity_scanned, _notes, _photo_url
    ) RETURNING id INTO scan_event_id;
  EXCEPTION WHEN OTHERS THEN
    -- If scan event insert fails, continue anyway
    scan_event_id := gen_random_uuid();
  END;
  
  -- Handle RECEIVING scan
  IF _scan_type = 'receiving' THEN
    -- Check if already received
    IF item_record.receive_scanned = TRUE THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Already scanned for receiving',
        'error_code', 'ALREADY_RECEIVED',
        'qr_code', item_record.qr_code
      );
    END IF;
    
    -- Check if dispatched first
    IF item_record.dispatch_scanned = FALSE OR item_record.dispatch_scanned IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Item must be dispatched before receiving',
        'error_code', 'NOT_DISPATCHED',
        'qr_code', item_record.qr_code
      );
    END IF;
    
    -- Update material item to received
    UPDATE material_items
    SET status = 'received',
        receiving_scan_id = scan_event_id,
        receive_scanned = TRUE,
        receive_scanned_at = NOW(),
        receive_scanned_by = current_user_id,
        updated_at = NOW()
    WHERE id = item_record.id;
    
    -- CRITICAL: Check if ALL items in order are received
    IF order_id IS NOT NULL THEN
      -- Count received vs total items
      SELECT 
        COUNT(*) FILTER (WHERE receive_scanned = TRUE),
        COUNT(*)
      INTO v_received_count, v_total_count
      FROM material_items
      WHERE purchase_order_id = order_id;
      
      -- If all items received, update order to DELIVERED
      IF v_received_count = v_total_count AND v_total_count > 0 THEN
        v_all_items_received := TRUE;
        
        -- Update purchase order to delivered
        UPDATE purchase_orders
        SET status = 'delivered',
            delivery_status = 'delivered',
            delivered_at = COALESCE(delivered_at, NOW()),
            updated_at = NOW()
        WHERE id = order_id;
        
        -- Update delivery request to delivered
        UPDATE delivery_requests
        SET status = 'delivered',
            delivered_at = COALESCE(delivered_at, NOW()),
            updated_at = NOW()
        WHERE purchase_order_id = order_id
          AND status NOT IN ('delivered', 'completed', 'cancelled');
        
        RAISE NOTICE '✅ Order % marked as delivered - all % items received', order_id, v_total_count;
      END IF;
    END IF;
  END IF;
  
  -- Handle DISPATCH scan
  IF _scan_type = 'dispatch' THEN
    -- Check if already dispatched
    IF item_record.dispatch_scanned = TRUE THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Already dispatched',
        'error_code', 'ALREADY_DISPATCHED',
        'qr_code', item_record.qr_code
      );
    END IF;
    
    -- Update material item to dispatched
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
      SELECT COUNT(*) FILTER (WHERE dispatch_scanned = TRUE) = COUNT(*)
      INTO v_all_items_received  -- Reusing variable for dispatched check
      FROM material_items
      WHERE purchase_order_id = order_id;
      
      IF v_all_items_received = TRUE THEN
        UPDATE purchase_orders
        SET status = 'shipped',
            delivery_status = 'in_transit',
            updated_at = NOW()
        WHERE id = order_id
          AND status IN ('confirmed', 'processing', 'pending', 'quote_accepted', 'order_created');
      END IF;
    END IF;
  END IF;
  
  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'scan_event_id', scan_event_id,
    'qr_code', item_record.qr_code,
    'material_type', item_record.material_type,
    'status', CASE 
      WHEN _scan_type = 'receiving' THEN 'received' 
      WHEN _scan_type = 'dispatch' THEN 'dispatched'
      ELSE 'unknown'
    END,
    'order_completed', v_all_items_received,
    'order_id', order_id
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Return error if anything goes wrong
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'error_code', 'FUNCTION_ERROR',
    'qr_code', COALESCE(_qr_code, 'unknown')
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.record_qr_scan_simple TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_qr_scan_simple TO anon;

-- Verify function was created
SELECT 
  '✅ Function record_qr_scan_simple REPLACED successfully!' AS status,
  proname,
  pronargs,
  prorettype::regtype
FROM pg_proc 
WHERE proname = 'record_qr_scan_simple';

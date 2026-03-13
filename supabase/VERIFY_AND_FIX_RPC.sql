-- ============================================================
-- VERIFY AND FIX: Check if RPC function exists and fix it
-- Run this in Supabase SQL Editor
-- ============================================================

-- First, check if the function exists
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'record_qr_scan_simple';

-- If the above returns nothing, the function doesn't exist
-- If it returns something, we'll see the current definition

-- Now let's create/fix the function with a SIMPLER version that definitely works
DROP FUNCTION IF EXISTS public.record_qr_scan_simple(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, INTEGER, TEXT, TEXT);

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
BEGIN
  current_user_id := auth.uid();
  
  -- Find item by exact QR code match (FAST - uses index)
  SELECT * INTO item_record 
  FROM material_items 
  WHERE qr_code = _qr_code 
  LIMIT 1;
  
  -- If not found, try partial match (for QR codes with prefixes)
  IF NOT FOUND THEN
    SELECT * INTO item_record 
    FROM material_items 
    WHERE qr_code LIKE '%' || _qr_code || '%'
      OR qr_code LIKE '%' || SUBSTRING(_qr_code FROM 'QR-([^-]+)') || '%'
    LIMIT 1;
  END IF;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'QR code not found: ' || SUBSTRING(_qr_code FROM 1 FOR 50),
      'error_code', 'QR_NOT_FOUND'
    );
  END IF;
  
  order_id := item_record.purchase_order_id;
  
  -- Insert scan event FIRST (before any updates)
  INSERT INTO qr_scan_events (
    qr_code, scan_type, scanned_by, scanner_device_id, scanner_type,
    scan_location, material_condition, quantity_scanned, notes, photo_url
  ) VALUES (
    item_record.qr_code, _scan_type, current_user_id, _scanner_device_id, _scanner_type,
    _scan_location, _material_condition, _quantity_scanned, _notes, _photo_url
  ) RETURNING id INTO scan_event_id;
  
  -- Handle receiving scan
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
        'error', 'Item not dispatched yet',
        'error_code', 'NOT_DISPATCHED',
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
    
    -- CRITICAL: Check if all items received and update order
    IF order_id IS NOT NULL THEN
      -- Count total items vs received items
      SELECT 
        COUNT(*) FILTER (WHERE receive_scanned = TRUE) = COUNT(*)
      INTO v_all_items_received
      FROM material_items
      WHERE purchase_order_id = order_id;
      
      -- If all items received, update order to delivered
      IF v_all_items_received = TRUE THEN
        UPDATE purchase_orders
        SET status = 'delivered',
            delivery_status = 'delivered',
            delivered_at = COALESCE(delivered_at, NOW()),
            updated_at = NOW()
        WHERE id = order_id;
        
        UPDATE delivery_requests
        SET status = 'delivered',
            delivered_at = COALESCE(delivered_at, NOW()),
            updated_at = NOW()
        WHERE purchase_order_id = order_id
          AND status NOT IN ('delivered', 'completed', 'cancelled');
      END IF;
    END IF;
  END IF;
  
  -- Handle dispatch scan
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
  END IF;
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'scan_event_id', scan_event_id,
    'qr_code', item_record.qr_code,
    'material_type', item_record.material_type,
    'status', CASE WHEN _scan_type = 'receiving' THEN 'received' ELSE 'dispatched' END,
    'order_completed', v_all_items_received
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.record_qr_scan_simple TO authenticated;

-- Verify it was created
SELECT '✅ Function record_qr_scan_simple created successfully!' AS result;

-- Test the function exists
SELECT proname, pronargs 
FROM pg_proc 
WHERE proname = 'record_qr_scan_simple';

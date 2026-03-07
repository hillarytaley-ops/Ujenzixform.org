-- ============================================================
-- Fix: Change purchase_orders status from 'shipped' to 'dispatched'
-- The 'shipped' status is not valid according to purchase_orders_status_check constraint
-- Created: March 7, 2026
-- ============================================================

-- Drop all existing versions of record_qr_scan to avoid ambiguity
DROP FUNCTION IF EXISTS public.record_qr_scan(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.record_qr_scan(TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.record_qr_scan(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.record_qr_scan(TEXT);

-- Update the record_qr_scan function to use 'dispatched' instead of 'shipped'
-- This matches the exact signature from 20260305_auto_update_delivery_requests_on_scan.sql
-- but fixes the status value from 'shipped' to 'dispatched'
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
  result JSONB;
  current_user_id UUID;
  order_id UUID;
  order_record RECORD;
  v_delivery_required BOOLEAN;
  v_delivery_provider_id UUID;
  is_invalidated_value BOOLEAN;
  delivery_request_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  -- Verify QR code exists
  SELECT * INTO item_record
  FROM material_items
  WHERE qr_code = _qr_code;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'QR code not found. This code may be invalid or expired.',
      'error_code', 'QR_NOT_FOUND',
      'qr_code', _qr_code
    );
  END IF;
  
  -- Store the purchase_order_id for later use
  order_id := item_record.purchase_order_id;
  
  -- Check if is_invalidated column exists and get its value safely
  BEGIN
    EXECUTE format('SELECT is_invalidated FROM material_items WHERE qr_code = %L', _qr_code) INTO is_invalidated_value;
  EXCEPTION WHEN undefined_column THEN
    is_invalidated_value := FALSE;
  WHEN OTHERS THEN
    is_invalidated_value := FALSE;
  END;
  
  -- Check if QR code is already invalidated
  IF is_invalidated_value = TRUE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This QR code has been invalidated. Both dispatch and receiving have been completed.',
      'error_code', 'QR_INVALIDATED',
      'qr_code', _qr_code,
      'material_type', item_record.material_type,
      'invalidated_at', item_record.invalidated_at
    );
  END IF;
  
  -- Enforce single-scan rule for dispatch
  IF _scan_type = 'dispatch' THEN
    IF item_record.dispatch_scanned = TRUE THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'This QR code has already been scanned for DISPATCH. Each QR can only be dispatched once.',
        'error_code', 'ALREADY_DISPATCHED',
        'qr_code', _qr_code,
        'material_type', item_record.material_type,
        'dispatch_scanned_at', item_record.dispatch_scanned_at,
        'dispatch_scanned_by', item_record.dispatch_scanned_by
      );
    END IF;
    
    -- Validate: Delivery provider required before dispatch
    IF order_id IS NOT NULL THEN
      SELECT 
        po.delivery_required,
        po.delivery_provider_id
      INTO order_record
      FROM purchase_orders po
      WHERE po.id = order_id;
      
      IF FOUND THEN
        v_delivery_required := COALESCE(order_record.delivery_required, TRUE);
        v_delivery_provider_id := order_record.delivery_provider_id;
        
        IF v_delivery_required = TRUE AND v_delivery_provider_id IS NULL THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', 'Cannot dispatch materials: No delivery provider has been assigned to this order. Please wait for a delivery provider to accept the delivery request before dispatching.',
            'error_code', 'NO_DELIVERY_PROVIDER',
            'qr_code', _qr_code,
            'material_type', item_record.material_type,
            'order_id', order_id,
            'delivery_required', v_delivery_required
          );
        END IF;
      END IF;
    END IF;
  END IF;
  
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
    _qr_code,
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
  
  -- Update material item status and scan flags
  IF _scan_type = 'dispatch' THEN
    UPDATE material_items
    SET status = 'dispatched',
        dispatch_scan_id = scan_event_id,
        dispatch_scanned = TRUE,
        dispatch_scanned_at = NOW(),
        dispatch_scanned_by = current_user_id,
        updated_at = NOW()
    WHERE qr_code = _qr_code;
    
    -- Update purchase_order status to 'dispatched' (not 'shipped' - that's not a valid status)
    IF order_id IS NOT NULL THEN
      UPDATE purchase_orders
      SET status = 'dispatched',
          updated_at = NOW()
      WHERE id = order_id
        AND status IN ('confirmed', 'processing', 'pending', 'accepted', 'order_created', 'awaiting_delivery_request', 'delivery_requested', 'delivery_assigned', 'ready_for_dispatch');
      
      -- ============================================================
      -- AUTO-UPDATE delivery_requests.status to 'in_transit'
      -- This moves the delivery from Scheduled to In Transit tab
      -- ============================================================
      -- Find the delivery_request linked to this purchase_order
      SELECT id INTO delivery_request_id
      FROM delivery_requests
      WHERE purchase_order_id = order_id
        AND status IN ('accepted', 'assigned', 'pending', 'pending_pickup', 'delivery_assigned', 'ready_for_dispatch', 'provider_assigned')
      LIMIT 1;
      
      -- AUTO-UPDATE delivery_requests.status to 'in_transit'
      IF delivery_request_id IS NOT NULL THEN
        UPDATE delivery_requests
        SET status = 'in_transit',
            updated_at = NOW()
        WHERE id = delivery_request_id
          AND status IN ('accepted', 'assigned', 'pending', 'pending_pickup', 'delivery_assigned', 'ready_for_dispatch', 'provider_assigned');
        
        RAISE NOTICE 'Updated delivery_request % status to in_transit (supplier dispatched)', delivery_request_id;
      END IF;
    END IF;
    
    result := jsonb_build_object(
      'success', true,
      'message', 'Item dispatched successfully. Order status updated to DISPATCHED. Awaiting receiving scan.',
      'qr_code', _qr_code,
      'material_item_id', item_record.id,
      'order_id', order_id,
      'scan_event_id', scan_event_id
    );
    
  ELSIF _scan_type = 'receiving' THEN
    -- Check if already received
    IF item_record.receive_scanned = TRUE THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'This QR code has already been scanned for RECEIVING. Each QR can only be received once.',
        'error_code', 'ALREADY_RECEIVED',
        'qr_code', _qr_code,
        'material_type', item_record.material_type,
        'receive_scanned_at', item_record.receive_scanned_at,
        'receive_scanned_by', item_record.receive_scanned_by
      );
    END IF;
    
    -- Update material item
    UPDATE material_items
    SET status = 'received',
        receive_scan_id = scan_event_id,
        receive_scanned = TRUE,
        receive_scanned_at = NOW(),
        receive_scanned_by = current_user_id,
        updated_at = NOW()
    WHERE qr_code = _qr_code;
    
    -- Check if all items are received
    IF order_id IS NOT NULL THEN
      -- Check if all items for this order are received
      SELECT 
        COUNT(*) = COUNT(*) FILTER (WHERE receive_scanned = TRUE)
      INTO result
      FROM material_items
      WHERE purchase_order_id = order_id;
      
      -- If all items received, update purchase_order and delivery_request
      IF result = TRUE THEN
        -- Update purchase_order
        UPDATE purchase_orders
        SET 
          status = 'delivered',
          delivered_at = COALESCE(delivered_at, NOW()),
          updated_at = NOW()
        WHERE id = order_id
          AND status NOT IN ('delivered', 'completed', 'cancelled');
        
        -- Find and update delivery_request
        SELECT id INTO delivery_request_id
        FROM delivery_requests
        WHERE purchase_order_id = order_id
          AND status NOT IN ('delivered', 'completed', 'cancelled')
        LIMIT 1;
        
        IF delivery_request_id IS NOT NULL THEN
          UPDATE delivery_requests
          SET 
            status = 'delivered',
            delivered_at = COALESCE(delivered_at, NOW()),
            updated_at = NOW()
          WHERE id = delivery_request_id
            AND status NOT IN ('delivered', 'completed', 'cancelled');
          
          RAISE NOTICE 'Updated delivery_request % status to delivered (all items received)', delivery_request_id;
        END IF;
      END IF;
    END IF;
    
    result := jsonb_build_object(
      'success', true,
      'message', 'Item received successfully.',
      'qr_code', _qr_code,
      'material_item_id', item_record.id,
      'order_id', order_id,
      'scan_event_id', scan_event_id,
      'all_items_received', result
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid scan_type. Must be "dispatch" or "receiving".',
      'error_code', 'INVALID_SCAN_TYPE'
    );
  END IF;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', 'DATABASE_ERROR'
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.record_qr_scan TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.record_qr_scan IS 'Records QR scan events and automatically updates delivery_requests status: in_transit on dispatch, delivered on receiving. Uses "dispatched" status for purchase_orders (not "shipped").';

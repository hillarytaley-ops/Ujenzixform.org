-- ============================================================
-- Restore Original record_qr_scan Function
-- Created: March 7, 2026
-- 
-- This restores the EXACT original function from 20260305_auto_update_delivery_requests_on_scan.sql
-- Only fixes the misleading RAISE NOTICE message (it says 'shipped' but status is 'dispatched')
-- ============================================================

-- Drop all existing versions to avoid ambiguity
DROP FUNCTION IF EXISTS public.record_qr_scan(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.record_qr_scan(TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.record_qr_scan(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.record_qr_scan(TEXT);

-- Restore the EXACT original function from 20260305
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
    
    -- Update purchase_order status to 'dispatched'
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
        AND status IN ('accepted', 'assigned', 'pending')
      LIMIT 1;
      
      IF delivery_request_id IS NOT NULL THEN
        UPDATE delivery_requests
        SET status = 'in_transit',
            updated_at = NOW()
        WHERE id = delivery_request_id;
        
        RAISE NOTICE 'Updated delivery_request % status to in_transit (supplier dispatched)', delivery_request_id;
      END IF;
      
      -- FIX: Changed from 'shipped' to 'dispatched' in the message
      RAISE NOTICE 'Updated purchase_order % status to dispatched', order_id;
    END IF;
    
  ELSIF _scan_type = 'receiving' THEN
    UPDATE material_items
    SET status = 'received',
        receiving_scan_id = scan_event_id,
        receive_scanned = TRUE,
        receive_scanned_at = NOW(),
        receive_scanned_by = current_user_id,
        updated_at = NOW()
    WHERE qr_code = _qr_code;
    
    -- Auto-invalidate if both dispatch and receive are done
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'material_items' 
        AND column_name = 'is_invalidated'
    ) THEN
      UPDATE material_items
      SET is_invalidated = TRUE,
          invalidated_at = NOW(),
          status = 'verified'
      WHERE qr_code = _qr_code
        AND dispatch_scanned = TRUE
        AND receive_scanned = TRUE;
    ELSE
      UPDATE material_items
      SET status = 'verified'
      WHERE qr_code = _qr_code
        AND dispatch_scanned = TRUE
        AND receive_scanned = TRUE;
    END IF;
    
    -- Check if all items in order are received - update to 'delivered'
    IF order_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM material_items 
        WHERE purchase_order_id = order_id 
          AND (receive_scanned = FALSE OR receive_scanned IS NULL)
      ) THEN
        UPDATE purchase_orders
        SET status = 'delivered',
            updated_at = NOW()
        WHERE id = order_id;
        
        -- ============================================================
        -- AUTO-UPDATE delivery_requests.status to 'delivered'
        -- This moves the delivery from In Transit to Delivered tab
        -- ============================================================
        -- Find the delivery_request linked to this purchase_order
        -- Update if status is NOT already 'delivered' or 'completed'
        SELECT id INTO delivery_request_id
        FROM delivery_requests
        WHERE purchase_order_id = order_id
          AND status NOT IN ('delivered', 'completed', 'cancelled')
        LIMIT 1;
        
        IF delivery_request_id IS NOT NULL THEN
          UPDATE delivery_requests
          SET status = 'delivered',
              delivered_at = NOW(),
              updated_at = NOW()
          WHERE id = delivery_request_id;
          
          RAISE NOTICE 'Updated delivery_request % status to delivered (provider received)', delivery_request_id;
        END IF;
        
        RAISE NOTICE 'All items received - Updated purchase_order % status to delivered', order_id;
      END IF;
    END IF;
      
  ELSIF _scan_type = 'verification' THEN
    UPDATE material_items
    SET status = 'verified',
        verification_scan_id = scan_event_id,
        updated_at = NOW()
    WHERE qr_code = _qr_code;
  END IF;
  
  -- Refresh item record to get updated values
  SELECT * INTO item_record
  FROM material_items
  WHERE qr_code = _qr_code;
  
  -- Return success with item details
  RETURN jsonb_build_object(
    'success', true,
    'scan_event_id', scan_event_id,
    'qr_code', _qr_code,
    'material_type', item_record.material_type,
    'status', item_record.status,
    'dispatch_scanned', item_record.dispatch_scanned,
    'receive_scanned', item_record.receive_scanned,
    'is_invalidated', COALESCE(item_record.is_invalidated, FALSE),
    'invalidated_at', item_record.invalidated_at
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.record_qr_scan TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.record_qr_scan IS 'Records QR scan events and automatically updates delivery_requests status: in_transit on dispatch, delivered on receiving';

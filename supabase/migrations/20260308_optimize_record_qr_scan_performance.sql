-- ============================================================
-- Optimize record_qr_scan function for better performance
-- Removes slow information_schema queries and optimizes checks
-- Created: March 8, 2026
-- ============================================================

-- Drop all existing versions of record_qr_scan to avoid ambiguity
DROP FUNCTION IF EXISTS public.record_qr_scan(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.record_qr_scan(TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.record_qr_scan(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.record_qr_scan(TEXT);

-- Optimized version of record_qr_scan function
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
  func_result JSONB;
  current_user_id UUID;
  order_id UUID;
  order_record RECORD;
  v_delivery_required BOOLEAN;
  v_delivery_provider_id UUID;
  is_invalidated_value BOOLEAN;
  delivery_request_id UUID;
  v_all_items_received BOOLEAN;
  qr_variations TEXT[];
  qr_variant TEXT;
  po_number_match TEXT;
  item_number_match TEXT;
  found_via_variant BOOLEAN := FALSE;
BEGIN
  current_user_id := auth.uid();
  
  -- CRITICAL: Try exact match first (fastest, most reliable)
  -- Based on diagnostic: exact match exists, so this should work immediately
  SELECT * INTO item_record
  FROM material_items
  WHERE qr_code = _qr_code
  LIMIT 1;
  
  -- If exact match found, skip all variation logic (saves time)
  IF FOUND THEN
    -- Exact match found, proceed with scan logic
    NULL; -- Continue to scan processing
  -- If not found, try format variations (fallback only)
  ELSIF NOT FOUND THEN
    -- Extract potential PO number and item number from QR code
    -- Format: UJP-FILM-PO-1772597930676-IATLA-ITEM001-UNIT001-20260307-5021
    -- Try to extract: PO number (1772597930676) and ITEM number (ITEM001)
    po_number_match := (regexp_match(_qr_code, 'PO-(\d{13,})'))[1];
    item_number_match := (regexp_match(_qr_code, 'ITEM(\d+)'))[1];
    
    -- Build QR code variations to try
    qr_variations := ARRAY[
      _qr_code, -- Original
      regexp_replace(_qr_code, '^UJP-FILM-', ''), -- Remove UJP-FILM- prefix
      regexp_replace(_qr_code, '^UJP-', ''), -- Remove UJP- prefix
      (regexp_match(_qr_code, 'PO-\d{13,}-[A-Z0-9-]+'))[0], -- Extract PO- format
      CASE WHEN po_number_match IS NOT NULL THEN 'PO-' || po_number_match END,
      CASE WHEN po_number_match IS NOT NULL THEN po_number_match END
    ];
    
    -- Try each variation
    FOREACH qr_variant IN ARRAY qr_variations
    LOOP
      IF qr_variant IS NOT NULL AND qr_variant != '' THEN
        SELECT * INTO item_record
        FROM material_items
        WHERE qr_code = qr_variant
        LIMIT 1;
        
        IF FOUND THEN
          found_via_variant := TRUE;
          EXIT; -- Found it!
        END IF;
      END IF;
    END LOOP;
    
    -- If still not found, try matching by PO number + item number
    IF NOT found_via_variant AND po_number_match IS NOT NULL AND item_number_match IS NOT NULL THEN
      SELECT mi.* INTO item_record
      FROM material_items mi
      JOIN purchase_orders po ON po.id = mi.purchase_order_id
      WHERE po.po_number LIKE '%' || po_number_match || '%'
        AND mi.item_sequence = (item_number_match::INTEGER)
      LIMIT 1;
      
      IF FOUND THEN
        found_via_variant := TRUE;
      END IF;
    END IF;
    
    -- If still not found, try pattern matching on QR code
    IF NOT found_via_variant AND po_number_match IS NOT NULL THEN
      SELECT * INTO item_record
      FROM material_items
      WHERE qr_code LIKE '%' || po_number_match || '%'
         OR (item_number_match IS NOT NULL AND qr_code LIKE '%ITEM' || item_number_match || '%')
      LIMIT 1;
      
      IF FOUND THEN
        found_via_variant := TRUE;
      END IF;
    END IF;
    
    -- Final check: if still not found, return error
    IF NOT found_via_variant THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'QR code not found. This code may be invalid or expired. Tried multiple format variations.',
        'error_code', 'QR_NOT_FOUND',
        'qr_code', _qr_code,
        'tried_variations', array_length(qr_variations, 1),
        'po_number_extracted', po_number_match,
        'item_number_extracted', item_number_match
      );
    END IF;
  END IF;
  
  -- Store the purchase_order_id for later use
  order_id := item_record.purchase_order_id;
  
  -- Check if is_invalidated column exists and get its value safely
  -- OPTIMIZED: Use direct column access with exception handling instead of dynamic SQL
  BEGIN
    is_invalidated_value := COALESCE(item_record.is_invalidated, FALSE);
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
      WHERE po.id = order_id
      LIMIT 1;
      
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
  
  -- Insert scan event (use database QR code, not scanned one, for consistency)
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
  
  -- Update material item status and scan flags
  IF _scan_type = 'dispatch' THEN
    UPDATE material_items
    SET status = 'dispatched',
        dispatch_scan_id = scan_event_id,
        dispatch_scanned = TRUE,
        dispatch_scanned_at = NOW(),
        dispatch_scanned_by = current_user_id,
        updated_at = NOW()
    WHERE id = item_record.id;
    
    -- Update purchase_order status to 'dispatched'
    IF order_id IS NOT NULL THEN
      UPDATE purchase_orders
      SET status = 'dispatched',
          updated_at = NOW()
      WHERE id = order_id
        AND status IN ('confirmed', 'processing', 'pending', 'accepted', 'order_created', 'awaiting_delivery_request', 'delivery_requested', 'delivery_assigned', 'ready_for_dispatch');
      
      -- AUTO-UPDATE delivery_requests.status to 'in_transit'
      SELECT id INTO delivery_request_id
      FROM delivery_requests
      WHERE purchase_order_id = order_id
        AND status IN ('accepted', 'assigned', 'pending', 'pending_pickup', 'delivery_assigned', 'ready_for_dispatch', 'provider_assigned', 'scheduled')
      LIMIT 1;
      
      IF delivery_request_id IS NOT NULL THEN
        UPDATE delivery_requests
        SET status = 'in_transit',
            updated_at = NOW()
        WHERE id = delivery_request_id;
        
        RAISE NOTICE 'Updated delivery_request % status to in_transit (supplier dispatched)', delivery_request_id;
      END IF;
      
      RAISE NOTICE 'Updated purchase_order % status to dispatched', order_id;
    END IF;
    
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
    
    UPDATE material_items
    SET status = 'received',
        receiving_scan_id = scan_event_id,
        receive_scanned = TRUE,
        receive_scanned_at = NOW(),
        receive_scanned_by = current_user_id,
        updated_at = NOW()
    WHERE id = item_record.id;
    
    -- Auto-invalidate if both dispatch and receive are done
    -- OPTIMIZED: Use direct UPDATE with conditional column instead of checking information_schema
    BEGIN
      UPDATE material_items
      SET is_invalidated = TRUE,
          invalidated_at = NOW(),
          status = 'verified'
      WHERE id = item_record.id
        AND dispatch_scanned = TRUE
        AND receive_scanned = TRUE;
    EXCEPTION WHEN undefined_column THEN
      -- Column doesn't exist, just update status
      UPDATE material_items
      SET status = 'verified'
      WHERE id = item_record.id
        AND dispatch_scanned = TRUE
        AND receive_scanned = TRUE;
    END;
    
    -- Check if all items in order are received - update to 'delivered'
    IF order_id IS NOT NULL THEN
      -- OPTIMIZED: Use COUNT comparison instead of NOT EXISTS for better performance
      SELECT 
        COUNT(*) = COUNT(*) FILTER (WHERE receive_scanned = TRUE)
      INTO v_all_items_received
      FROM material_items
      WHERE purchase_order_id = order_id;
      
      IF v_all_items_received = TRUE THEN
        UPDATE purchase_orders
        SET status = 'delivered',
            updated_at = NOW()
        WHERE id = order_id;
        
        -- AUTO-UPDATE delivery_requests.status to 'delivered'
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
  
  -- Refresh item record to get updated values (use item ID for performance)
  SELECT * INTO item_record
  FROM material_items
  WHERE id = item_record.id
  LIMIT 1;
  
  -- Return success with item details
  func_result := jsonb_build_object(
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
  
  RETURN func_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.record_qr_scan TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.record_qr_scan IS 'Optimized version: Records QR scan events and automatically updates delivery_requests status. Uses direct column access and COUNT comparison for better performance.';

-- Ensure indexes exist for optimal performance
CREATE INDEX IF NOT EXISTS idx_material_items_purchase_order_id ON material_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_purchase_order_id ON delivery_requests(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_status ON delivery_requests(status);

-- ============================================================
-- Fix order status update when all items are delivered
-- Issue: Orders were not updating to 'delivered' status when delivery provider scanned QR codes
-- Cause: WHERE clause condition was preventing update if status was already something other than 'delivered'
-- Fix: Remove restrictive WHERE condition so orders always update to 'delivered' when all items are received
-- Created: March 31, 2026
-- ============================================================

-- Fix record_qr_scan_simple function
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

-- Also fix record_qr_scan function (for consistency)
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
  v_delivery_request_provider_id UUID;
  v_delivery_request_status TEXT;
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
  
  -- ============================================================
  -- CHECK IF QR CODE IS ALREADY INVALIDATED
  -- ============================================================
  IF item_record.is_invalidated = TRUE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This QR code has been invalidated. Both dispatch and receiving have been completed.',
      'error_code', 'QR_INVALIDATED',
      'qr_code', _qr_code,
      'material_type', item_record.material_type,
      'invalidated_at', item_record.invalidated_at
    );
  END IF;
  
  -- ============================================================
  -- ENFORCE SINGLE-SCAN RULE FOR DISPATCH
  -- ============================================================
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
  END IF;
  
  -- ============================================================
  -- ENFORCE SINGLE-SCAN RULE FOR RECEIVING
  -- ============================================================
  IF _scan_type = 'receiving' THEN
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
    
    -- Must be dispatched first before receiving
    IF item_record.dispatch_scanned = FALSE OR item_record.dispatch_scanned IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'This item has not been dispatched yet. Dispatch scan is required before receiving.',
        'error_code', 'NOT_DISPATCHED',
        'qr_code', _qr_code,
        'material_type', item_record.material_type
      );
    END IF;
  END IF;
  
  -- ============================================================
  -- CREATE SCAN EVENT
  -- ============================================================
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
  
  -- ============================================================
  -- UPDATE MATERIAL ITEM STATUS AND SCAN FLAGS
  -- ============================================================
  IF _scan_type = 'dispatch' THEN
    UPDATE material_items
    SET status = 'dispatched',
        dispatch_scan_id = scan_event_id,
        dispatch_scanned = TRUE,
        dispatch_scanned_at = NOW(),
        dispatch_scanned_by = current_user_id,
        updated_at = NOW()
    WHERE qr_code = _qr_code;
    
    -- ============================================================
    -- UPDATE PURCHASE ORDER STATUS TO 'shipped'
    -- This updates the order status when ANY item is dispatched
    -- CRITICAL: Also ensure delivery_provider_id is set from delivery_request
    -- so orders appear in delivery provider's schedule
    -- ============================================================
    IF order_id IS NOT NULL THEN
      -- First, check if there's a delivery_request with a provider_id
      -- and ensure purchase_order has delivery_provider_id set
      SELECT provider_id, status INTO v_delivery_request_provider_id, v_delivery_request_status
      FROM delivery_requests
      WHERE purchase_order_id = order_id
        AND provider_id IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1;
      
      -- Update purchase_order with status and provider info
      UPDATE purchase_orders
      SET status = 'shipped',
          delivery_provider_id = COALESCE(delivery_provider_id, v_delivery_request_provider_id),
          delivery_status = CASE 
            WHEN v_delivery_request_status = 'accepted' THEN 'in_transit'
            ELSE delivery_status
          END,
          updated_at = NOW()
      WHERE id = order_id
        AND status IN ('confirmed', 'processing', 'pending'); -- Only update if not already shipped/delivered
      
      -- Log the status change
      RAISE NOTICE 'Updated purchase_order % status to shipped, delivery_provider_id: %', order_id, v_delivery_request_provider_id;
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
    
    -- ============================================================
    -- AUTO-INVALIDATE IF BOTH DISPATCH AND RECEIVE ARE DONE
    -- ============================================================
    UPDATE material_items
    SET is_invalidated = TRUE,
        invalidated_at = NOW(),
        status = 'verified'
    WHERE qr_code = _qr_code
      AND dispatch_scanned = TRUE
      AND receive_scanned = TRUE;
    
    -- ============================================================
    -- CHECK IF ALL ITEMS IN ORDER ARE RECEIVED - UPDATE TO 'delivered'
    -- ============================================================
    IF order_id IS NOT NULL THEN
      -- Check if all items in this order have been received
      IF NOT EXISTS (
        SELECT 1 FROM material_items 
        WHERE purchase_order_id = order_id 
          AND (receive_scanned = FALSE OR receive_scanned IS NULL)
      ) THEN
        -- Update purchase_order status AND delivery_status to delivered
        -- CRITICAL: Always update when all items are received, regardless of current status
        -- This ensures orders move from 'in_transit' or 'shipped' to 'delivered'
        UPDATE purchase_orders
        SET status = 'delivered',
            delivery_status = 'delivered',
            delivered_at = COALESCE(delivered_at, NOW()),
            updated_at = NOW()
        WHERE id = order_id;
        
        -- Also update delivery_request status to delivered
        UPDATE delivery_requests
        SET status = 'delivered',
            delivered_at = COALESCE(delivered_at, NOW()),
            updated_at = NOW()
        WHERE purchase_order_id = order_id
          AND status NOT IN ('delivered', 'completed', 'cancelled');
        
        RAISE NOTICE 'All items received - Updated purchase_order % and delivery_request status to delivered', order_id;
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
    'qr_code', item_record.qr_code,
    'material_type', item_record.material_type,
    'category', item_record.category,
    'quantity', item_record.quantity,
    'unit', item_record.unit,
    'status', item_record.status,
    'dispatch_scanned', item_record.dispatch_scanned,
    'receive_scanned', item_record.receive_scanned,
    'purchase_order_id', item_record.purchase_order_id
  );
END;
$$;

COMMENT ON FUNCTION public.record_qr_scan_simple IS 
  'Simplified version of record_qr_scan that uses direct PO + item lookup. FIXED: Always updates order to delivered when all items are received, regardless of current status.';

COMMENT ON FUNCTION public.record_qr_scan IS 
  'Main QR scan function. FIXED: Always updates order to delivered when all items are received, regardless of current status.';

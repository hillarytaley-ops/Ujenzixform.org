-- ============================================================
-- Require Delivery Provider Before Dispatch
-- Created: March 3, 2026
-- 
-- Business Rule: Materials cannot be dispatched without a delivery provider
-- UNLESS the builder has explicitly indicated they don't need delivery service
-- ============================================================

-- ============================================================
-- Ensure is_invalidated column exists in material_items
-- ============================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'material_items' AND column_name = 'is_invalidated') THEN
        ALTER TABLE material_items ADD COLUMN is_invalidated BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_invalidated column to material_items';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'material_items' AND column_name = 'invalidated_at') THEN
        ALTER TABLE material_items ADD COLUMN invalidated_at TIMESTAMPTZ;
        RAISE NOTICE 'Added invalidated_at column to material_items';
    END IF;
END $$;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_material_items_is_invalidated ON material_items(is_invalidated);

-- ============================================================
-- Update record_qr_scan function to validate delivery provider
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
  result JSONB;
  current_user_id UUID;
  order_id UUID;
  order_record RECORD;
  v_delivery_required BOOLEAN;  -- Renamed to avoid ambiguity with column name
  v_delivery_provider_id UUID;   -- Renamed to avoid ambiguity with column name
  is_invalidated_value BOOLEAN;
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
  -- Use dynamic SQL to avoid errors if column doesn't exist
  BEGIN
    EXECUTE format('SELECT is_invalidated FROM material_items WHERE qr_code = %L', _qr_code) INTO is_invalidated_value;
  EXCEPTION WHEN undefined_column THEN
    -- Column doesn't exist, default to FALSE
    is_invalidated_value := FALSE;
  WHEN OTHERS THEN
    -- Any other error, default to FALSE
    is_invalidated_value := FALSE;
  END;
  
  -- ============================================================
  -- CHECK IF QR CODE IS ALREADY INVALIDATED
  -- ============================================================
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
    
    -- ============================================================
    -- VALIDATE: Delivery provider required before dispatch
    -- ============================================================
    IF order_id IS NOT NULL THEN
      -- Fetch purchase order to check delivery requirements
      -- Use table qualification to avoid ambiguity with variable names
      SELECT 
        po.delivery_required,
        po.delivery_provider_id
      INTO order_record
      FROM purchase_orders po
      WHERE po.id = order_id;
      
      IF FOUND THEN
        -- Assign to variables with different names to avoid ambiguity
        v_delivery_required := COALESCE(order_record.delivery_required, TRUE); -- Default to TRUE if NULL
        v_delivery_provider_id := order_record.delivery_provider_id;
        
        -- If delivery is required but no provider is assigned, block dispatch
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
  
  -- ============================================================
  -- ENFORCE SINGLE-SCAN RULE FOR RECEIVING
  -- ============================================================
  IF _scan_type = 'receiving' THEN
    -- Must be dispatched first before receiving
    IF item_record.dispatch_scanned = FALSE OR item_record.dispatch_scanned IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'This item has not been dispatched yet. Please dispatch first before receiving.',
        'error_code', 'NOT_DISPATCHED',
        'qr_code', _qr_code,
        'material_type', item_record.material_type
      );
    END IF;
    
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
  END IF;
  
  -- ============================================================
  -- INSERT SCAN EVENT
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
    -- ============================================================
    IF order_id IS NOT NULL THEN
      UPDATE purchase_orders
      SET status = 'shipped',
          updated_at = NOW()
      WHERE id = order_id
        AND status IN ('confirmed', 'processing', 'pending'); -- Only update if not already shipped/delivered
      
      -- Log the status change
      RAISE NOTICE 'Updated purchase_order % status to shipped', order_id;
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
    -- Only if is_invalidated column exists
    -- ============================================================
    -- Check if is_invalidated column exists before updating
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
      -- Column doesn't exist, just update status
      UPDATE material_items
      SET status = 'verified'
      WHERE qr_code = _qr_code
        AND dispatch_scanned = TRUE
        AND receive_scanned = TRUE;
    END IF;
    
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
        UPDATE purchase_orders
        SET status = 'delivered',
            updated_at = NOW()
        WHERE id = order_id;
        
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
  
  -- Get is_invalidated value safely using dynamic SQL
  BEGIN
    EXECUTE format('SELECT is_invalidated FROM material_items WHERE qr_code = %L', _qr_code) INTO is_invalidated_value;
  EXCEPTION WHEN undefined_column THEN
    is_invalidated_value := FALSE;
  WHEN OTHERS THEN
    is_invalidated_value := FALSE;
  END;
  
  -- Return success with item details
  RETURN jsonb_build_object(
    'success', true,
    'scan_event_id', scan_event_id,
    'qr_code', _qr_code,
    'material_type', item_record.material_type,
    'category', item_record.category,
    'quantity', item_record.quantity,
    'unit', item_record.unit,
    'previous_status', CASE 
      WHEN _scan_type = 'dispatch' THEN 'pending'
      WHEN _scan_type = 'receiving' THEN 'dispatched'
      ELSE item_record.status
    END,
    'new_status', item_record.status,
    'dispatch_scanned', item_record.dispatch_scanned,
    'receive_scanned', item_record.receive_scanned,
    'is_invalidated', is_invalidated_value,
    'order_id', order_id,
    'message', CASE
      WHEN is_invalidated_value = TRUE THEN 'QR code completed and invalidated. Both dispatch and receive are done.'
      WHEN _scan_type = 'dispatch' THEN 'Item dispatched successfully. Order status updated to SHIPPED. Awaiting receiving scan.'
      WHEN _scan_type = 'receiving' THEN 'Item received successfully.'
      ELSE 'Scan recorded successfully.'
    END
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.record_qr_scan TO authenticated;

-- ============================================================
-- Migration Complete
-- ============================================================

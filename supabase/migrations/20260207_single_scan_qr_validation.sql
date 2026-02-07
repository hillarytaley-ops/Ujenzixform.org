-- ============================================================
-- QR Code Single-Scan Validation & Auto-Invalidation
-- Created: February 7, 2026
-- 
-- Features:
-- 1. Each QR code can only be scanned ONCE for dispatch
-- 2. Each QR code can only be scanned ONCE for receiving
-- 3. Once both dispatch AND receive are completed, QR is invalidated
-- 4. Prevents duplicate scans with clear error messages
-- ============================================================

-- Add columns to track individual scan status if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'material_items' AND column_name = 'dispatch_scanned') THEN
        ALTER TABLE material_items ADD COLUMN dispatch_scanned BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'material_items' AND column_name = 'dispatch_scanned_at') THEN
        ALTER TABLE material_items ADD COLUMN dispatch_scanned_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'material_items' AND column_name = 'dispatch_scanned_by') THEN
        ALTER TABLE material_items ADD COLUMN dispatch_scanned_by UUID REFERENCES auth.users(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'material_items' AND column_name = 'receive_scanned') THEN
        ALTER TABLE material_items ADD COLUMN receive_scanned BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'material_items' AND column_name = 'receive_scanned_at') THEN
        ALTER TABLE material_items ADD COLUMN receive_scanned_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'material_items' AND column_name = 'receive_scanned_by') THEN
        ALTER TABLE material_items ADD COLUMN receive_scanned_by UUID REFERENCES auth.users(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'material_items' AND column_name = 'is_invalidated') THEN
        ALTER TABLE material_items ADD COLUMN is_invalidated BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'material_items' AND column_name = 'invalidated_at') THEN
        ALTER TABLE material_items ADD COLUMN invalidated_at TIMESTAMPTZ;
    END IF;
END $$;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_material_items_dispatch_scanned ON material_items(dispatch_scanned);
CREATE INDEX IF NOT EXISTS idx_material_items_receive_scanned ON material_items(receive_scanned);
CREATE INDEX IF NOT EXISTS idx_material_items_is_invalidated ON material_items(is_invalidated);

-- ============================================================
-- Updated record_qr_scan function with single-scan enforcement
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
    'is_invalidated', item_record.is_invalidated,
    'message', CASE
      WHEN item_record.is_invalidated = TRUE THEN 'QR code completed and invalidated. Both dispatch and receive are done.'
      WHEN _scan_type = 'dispatch' THEN 'Item dispatched successfully. Awaiting receiving scan.'
      WHEN _scan_type = 'receiving' THEN 'Item received successfully.'
      ELSE 'Scan recorded successfully.'
    END
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.record_qr_scan TO authenticated;

-- ============================================================
-- Function to check if QR code is valid for scanning
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_qr_scan_status(_qr_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item_record RECORD;
BEGIN
  SELECT * INTO item_record
  FROM material_items
  WHERE qr_code = _qr_code;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'QR code not found'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'valid', true,
    'qr_code', _qr_code,
    'material_type', item_record.material_type,
    'category', item_record.category,
    'quantity', item_record.quantity,
    'unit', item_record.unit,
    'status', item_record.status,
    'dispatch_scanned', COALESCE(item_record.dispatch_scanned, false),
    'dispatch_scanned_at', item_record.dispatch_scanned_at,
    'receive_scanned', COALESCE(item_record.receive_scanned, false),
    'receive_scanned_at', item_record.receive_scanned_at,
    'is_invalidated', COALESCE(item_record.is_invalidated, false),
    'invalidated_at', item_record.invalidated_at,
    'can_dispatch', COALESCE(item_record.dispatch_scanned, false) = FALSE AND COALESCE(item_record.is_invalidated, false) = FALSE,
    'can_receive', COALESCE(item_record.dispatch_scanned, false) = TRUE AND COALESCE(item_record.receive_scanned, false) = FALSE AND COALESCE(item_record.is_invalidated, false) = FALSE
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_qr_scan_status TO authenticated;

-- ============================================================
-- Migration Complete
-- ============================================================

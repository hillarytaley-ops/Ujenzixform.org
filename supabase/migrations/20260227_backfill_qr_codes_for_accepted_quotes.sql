-- ============================================================
-- Backfill QR Codes for Existing Accepted Quotes
-- Created: February 27, 2026
-- ============================================================
-- This script generates QR codes for purchase orders that were
-- accepted before the fix but don't have QR codes yet
-- ============================================================

-- Function to generate QR codes for a specific purchase order
CREATE OR REPLACE FUNCTION backfill_qr_codes_for_order(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_item JSONB;
  v_item_index INTEGER := 0;
  v_qr_code_value TEXT;
  v_supplier_uuid UUID;
  v_material_category TEXT;
  v_items_created INTEGER := 0;
BEGIN
  -- Get the purchase order
  SELECT * INTO v_order
  FROM purchase_orders
  WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;
  
  -- Check if QR codes already exist
  IF EXISTS (SELECT 1 FROM material_items WHERE purchase_order_id = p_order_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'QR codes already exist for this order');
  END IF;
  
  -- Get supplier ID
  v_supplier_uuid := v_order.supplier_id;
  
  -- Check if items exist
  IF v_order.items IS NULL OR jsonb_array_length(v_order.items) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No items in order');
  END IF;
  
  -- Loop through each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_order.items)
  LOOP
    v_item_index := v_item_index + 1;
    
    -- Extract material category
    v_material_category := UPPER(SPLIT_PART(
      COALESCE(v_item->>'name', v_item->>'material_name', 'GENERAL'), 
      ' ', 
      1
    ));
    
    -- Generate unique QR code
    v_qr_code_value := 'UJP-' || 
                     v_material_category || '-' ||
                     COALESCE(v_order.po_number, SUBSTRING(v_order.id::TEXT, 1, 8)) || '-' ||
                     'ITEM' || LPAD(v_item_index::TEXT, 3, '0') || '-' ||
                     TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                     LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
    -- Insert material item with QR code
    INSERT INTO material_items (
      purchase_order_id,
      qr_code,
      item_sequence,
      material_type,
      category,
      quantity,
      unit,
      supplier_id,
      status,
      created_at
    ) VALUES (
      p_order_id,
      v_qr_code_value,
      v_item_index,
      COALESCE(v_item->>'name', v_item->>'material_name', 'Unknown Material'),
      v_material_category,
      COALESCE((v_item->>'quantity')::NUMERIC, 1),
      COALESCE(v_item->>'unit', 'units'),
      v_supplier_uuid,
      'pending',
      NOW()
    )
    ON CONFLICT (purchase_order_id, item_sequence) DO NOTHING;
    
    v_items_created := v_items_created + 1;
    
    RAISE NOTICE 'Generated QR code % for item % in PO %', 
      v_qr_code_value, 
      COALESCE(v_item->>'name', v_item->>'material_name', 'Unknown'), 
      v_order.po_number;
  END LOOP;
  
  -- Mark QR codes as generated
  UPDATE purchase_orders
  SET qr_code_generated = true
  WHERE id = p_order_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'items_created', v_items_created
  );
END;
$$;

-- Find all purchase orders that need QR codes
-- These are orders that:
-- 1. Have status indicating they were accepted (quote_accepted, order_created, awaiting_delivery_request, etc.)
-- 2. Don't have QR codes generated yet
-- 3. Have items in them

DO $$
DECLARE
  v_order RECORD;
  v_result JSONB;
  v_total_processed INTEGER := 0;
  v_total_success INTEGER := 0;
  v_total_failed INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting QR code backfill for accepted quotes...';
  
  -- Find orders that need QR codes
  FOR v_order IN 
    SELECT po.id, po.po_number, po.status, po.supplier_id
    FROM purchase_orders po
    WHERE po.status IN (
      'quote_accepted',
      'order_created', 
      'awaiting_delivery_request',
      'delivery_requested',
      'awaiting_delivery_provider',
      'delivery_assigned',
      'ready_for_dispatch',
      'confirmed'
    )
    AND (po.qr_code_generated IS NULL OR po.qr_code_generated = false)
    AND po.items IS NOT NULL
    AND jsonb_array_length(po.items) > 0
    AND NOT EXISTS (
      SELECT 1 FROM material_items mi 
      WHERE mi.purchase_order_id = po.id
    )
    ORDER BY po.created_at DESC
  LOOP
    v_total_processed := v_total_processed + 1;
    
    BEGIN
      v_result := backfill_qr_codes_for_order(v_order.id);
      
      IF (v_result->>'success')::boolean THEN
        v_total_success := v_total_success + 1;
        RAISE NOTICE '✅ Generated QR codes for order % (PO: %)', v_order.id, v_order.po_number;
      ELSE
        v_total_failed := v_total_failed + 1;
        RAISE WARNING '❌ Failed to generate QR codes for order % (PO: %): %', 
          v_order.id, 
          v_order.po_number,
          v_result->>'error';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_total_failed := v_total_failed + 1;
      RAISE WARNING '❌ Error generating QR codes for order % (PO: %): %', 
        v_order.id, 
        v_order.po_number,
        SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'QR Code Backfill Complete!';
  RAISE NOTICE 'Total processed: %', v_total_processed;
  RAISE NOTICE 'Success: %', v_total_success;
  RAISE NOTICE 'Failed: %', v_total_failed;
  RAISE NOTICE '========================================';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION backfill_qr_codes_for_order TO authenticated;

-- ============================================================
-- Migration Complete
-- ============================================================
-- This script will:
-- 1. Create a function to generate QR codes for a single order
-- 2. Automatically find and process all orders that need QR codes
-- 3. Generate QR codes for each item in those orders
-- 4. Mark orders as having QR codes generated
-- ============================================================

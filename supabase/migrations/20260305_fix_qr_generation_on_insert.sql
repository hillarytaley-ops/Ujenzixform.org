-- ============================================================
-- Fix QR Code Generation for Purchase Orders Created Directly (INSERT)
-- Private builders may create purchase orders directly with delivery_requested status
-- This ensures QR codes are generated on INSERT, not just UPDATE
-- Created: March 5, 2026
-- ============================================================

-- Add INSERT trigger to generate QR codes when purchase orders are created directly
-- This handles cases where private builders create orders with delivery_requested status immediately
DROP TRIGGER IF EXISTS trigger_auto_generate_item_qr_codes_on_insert ON purchase_orders;

CREATE TRIGGER trigger_auto_generate_item_qr_codes_on_insert
  AFTER INSERT ON purchase_orders
  FOR EACH ROW
  WHEN (
    NEW.status IN ('confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request', 'delivery_requested')
    AND (NEW.qr_code_generated IS NULL OR NEW.qr_code_generated = FALSE)
  )
  EXECUTE FUNCTION public.auto_generate_item_qr_codes();

-- ============================================================
-- Backfill: Generate QR codes for existing orders without them
-- ============================================================

-- Generate QR codes for purchase orders that:
-- 1. Have delivery_requested or order_created status
-- 2. Don't have QR codes generated yet
-- 3. Have items
-- 4. Don't have material_items yet
DO $$
DECLARE
  v_order RECORD;
  v_item JSONB;
  v_item_index INTEGER;
  v_unit_index INTEGER;
  v_qr_code_value TEXT;
  v_supplier_uuid UUID;
  v_material_category TEXT;
  v_buyer_id UUID;
  v_buyer_name TEXT;
  v_buyer_email TEXT;
  v_buyer_phone TEXT;
  v_item_quantity INTEGER;
BEGIN
  FOR v_order IN 
    SELECT po.id, po.po_number, po.status, po.items, po.supplier_id, po.buyer_id, po.qr_code_generated
    FROM purchase_orders po
    WHERE po.status IN ('confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request', 'delivery_requested')
      AND (po.qr_code_generated IS NULL OR po.qr_code_generated = FALSE)
      AND po.items IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM material_items WHERE purchase_order_id = po.id)
    ORDER BY po.created_at DESC
    LIMIT 100 -- Process most recent 100 orders
  LOOP
    -- Check if QR codes already exist (double-check)
    IF EXISTS (SELECT 1 FROM material_items WHERE purchase_order_id = v_order.id) THEN
      -- Update flag and skip
      UPDATE purchase_orders SET qr_code_generated = true WHERE id = v_order.id;
      CONTINUE;
    END IF;
    
    -- Get supplier ID
    v_supplier_uuid := v_order.supplier_id;
    v_buyer_id := v_order.buyer_id;
    
    -- Fetch buyer details
    BEGIN
      SELECT 
        COALESCE(full_name, company_name, email, 'Unknown Client'),
        COALESCE(email, ''),
        COALESCE(phone, '')
      INTO v_buyer_name, v_buyer_email, v_buyer_phone
      FROM profiles
      WHERE id = v_buyer_id OR user_id = v_buyer_id
      LIMIT 1;
      
      IF v_buyer_name IS NULL OR v_buyer_name = 'Unknown Client' THEN
        BEGIN
          SELECT 
            COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', email, 'Unknown Client'),
            COALESCE(email, ''),
            COALESCE(raw_user_meta_data->>'phone', '')
          INTO v_buyer_name, v_buyer_email, v_buyer_phone
          FROM auth.users
          WHERE id = v_buyer_id
          LIMIT 1;
        EXCEPTION WHEN OTHERS THEN
          v_buyer_name := 'Unknown Client';
          v_buyer_email := '';
          v_buyer_phone := '';
        END;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_buyer_name := 'Unknown Client';
      v_buyer_email := '';
      v_buyer_phone := '';
    END;
    
    IF v_buyer_name IS NULL OR v_buyer_name = '' THEN
      v_buyer_name := 'Unknown Client';
    END IF;
    
    -- Generate QR codes for each item
    v_item_index := 0;
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_order.items)
    LOOP
      v_item_index := v_item_index + 1;
      v_item_quantity := COALESCE((v_item->>'quantity')::INTEGER, 1);
      v_material_category := UPPER(SPLIT_PART(COALESCE(v_item->>'name', v_item->>'material_name', 'GENERAL'), ' ', 1));
      
      -- Generate ONE QR code for EACH UNIT
      FOR v_unit_index IN 1..v_item_quantity
      LOOP
        v_qr_code_value := 'UJP-' || 
                          v_material_category || '-' ||
                          COALESCE(v_order.po_number, SUBSTRING(v_order.id::TEXT, 1, 8)) || '-' ||
                          'ITEM' || LPAD(v_item_index::TEXT, 3, '0') || '-' ||
                          'UNIT' || LPAD(v_unit_index::TEXT, 3, '0') || '-' ||
                          TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                          LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        
        INSERT INTO public.material_items (
          purchase_order_id, qr_code, item_sequence, material_type, category,
          quantity, unit, supplier_id, status,
          buyer_id, buyer_name, buyer_email, buyer_phone,
          item_unit_price, item_total_price, item_description
        ) VALUES (
          v_order.id,
          v_qr_code_value,
          (v_item_index - 1) * 1000 + v_unit_index,
          COALESCE(v_item->>'name', v_item->>'material_name', 'Unknown Material'),
          v_material_category,
          1,
          COALESCE(v_item->>'unit', 'units'),
          v_supplier_uuid,
          'pending',
          v_buyer_id,
          v_buyer_name,
          v_buyer_email,
          v_buyer_phone,
          COALESCE((v_item->>'unit_price')::NUMERIC, 0),
          COALESCE((v_item->>'unit_price')::NUMERIC, 0),
          COALESCE(v_item->>'description', 'Item ' || v_item_index || ', Unit ' || v_unit_index || ' of ' || v_item_quantity)
        )
        ON CONFLICT (purchase_order_id, item_sequence) DO NOTHING;
      END LOOP;
    END LOOP;
    
    -- Mark as generated
    UPDATE purchase_orders SET qr_code_generated = true WHERE id = v_order.id;
    
    RAISE NOTICE 'Generated QR codes for purchase order % (status: %)', v_order.po_number, v_order.status;
  END LOOP;
END;
$$;

-- ============================================================
-- Migration Complete
-- ============================================================

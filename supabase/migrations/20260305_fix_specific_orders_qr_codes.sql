-- ============================================================
-- Fix QR Codes for Specific Private Builder Orders
-- Target: PO-1772598054688-GR03X and similar recent orders
-- Created: March 5, 2026
-- ============================================================

-- ============================================================
-- STEP 1: Check specific orders
-- ============================================================
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
  v_order_qr_count INTEGER;
  v_fixed_count INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Fixing QR codes for specific orders...';
  RAISE NOTICE '========================================';
  
  -- Target orders that:
  -- 1. Are confirmed status (private builder direct purchases)
  -- 2. Don't have QR codes yet
  -- 3. Have items
  -- 4. Were created recently (last 7 days)
  FOR v_order IN 
    SELECT po.id, po.po_number, po.status, po.items, po.supplier_id, po.buyer_id, 
           po.qr_code_generated, po.created_at
    FROM purchase_orders po
    WHERE po.status = 'confirmed'  -- Private builder direct purchases use 'confirmed'
      AND (po.qr_code_generated IS NULL OR po.qr_code_generated = FALSE)
      AND po.items IS NOT NULL
      AND jsonb_array_length(po.items) > 0
      AND NOT EXISTS (SELECT 1 FROM material_items WHERE purchase_order_id = po.id)
      AND po.created_at >= NOW() - INTERVAL '7 days'  -- Recent orders only
    ORDER BY po.created_at DESC
  LOOP
    BEGIN
      v_order_qr_count := 0;
      
      RAISE NOTICE 'Processing: % (ID: %)', 
        COALESCE(v_order.po_number, v_order.id::TEXT), 
        v_order.id;
      
      -- Get supplier ID
      v_supplier_uuid := v_order.supplier_id;
      v_buyer_id := v_order.buyer_id;
      
      IF v_supplier_uuid IS NULL THEN
        RAISE WARNING '  ⚠️ NULL supplier_id, skipping';
        CONTINUE;
      END IF;
      
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
          
          v_order_qr_count := v_order_qr_count + 1;
        END LOOP;
      END LOOP;
      
      -- Mark as generated
      UPDATE purchase_orders 
      SET qr_code_generated = true 
      WHERE id = v_order.id;
      
      v_fixed_count := v_fixed_count + 1;
      
      RAISE NOTICE '✅ Fixed: % - Generated % QR codes', 
        COALESCE(v_order.po_number, v_order.id::TEXT), 
        v_order_qr_count;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '❌ Error fixing order %: %', 
        COALESCE(v_order.po_number, v_order.id::TEXT), 
        SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Fixed % orders', v_fixed_count;
  RAISE NOTICE '========================================';
END $$;

-- ============================================================
-- STEP 2: Verify the fix
-- ============================================================
DO $$
DECLARE
  v_remaining_count INTEGER;
  v_order RECORD;
BEGIN
  SELECT COUNT(*) INTO v_remaining_count
  FROM purchase_orders po
  WHERE po.status = 'confirmed'
    AND (po.qr_code_generated IS NULL OR po.qr_code_generated = FALSE)
    AND po.items IS NOT NULL
    AND jsonb_array_length(po.items) > 0
    AND NOT EXISTS (SELECT 1 FROM material_items WHERE purchase_order_id = po.id)
    AND po.created_at >= NOW() - INTERVAL '7 days';
  
  IF v_remaining_count = 0 THEN
    RAISE NOTICE '✅ SUCCESS: All recent confirmed orders now have QR codes!';
  ELSE
    RAISE WARNING '⚠️ WARNING: % orders still missing QR codes:', v_remaining_count;
    FOR v_order IN 
      SELECT po.po_number, po.id, po.created_at
      FROM purchase_orders po
      WHERE po.status = 'confirmed'
        AND (po.qr_code_generated IS NULL OR po.qr_code_generated = FALSE)
        AND po.items IS NOT NULL
        AND jsonb_array_length(po.items) > 0
        AND NOT EXISTS (SELECT 1 FROM material_items WHERE purchase_order_id = po.id)
        AND po.created_at >= NOW() - INTERVAL '7 days'
      LIMIT 10
    LOOP
      RAISE WARNING '  - % (ID: %, Created: %)', 
        COALESCE(v_order.po_number, v_order.id::TEXT), 
        v_order.id, 
        v_order.created_at;
    END LOOP;
  END IF;
END $$;

-- ============================================================
-- Migration Complete
-- ============================================================

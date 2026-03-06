-- ============================================================
-- Diagnose and Fix Missing QR Codes for Private Builder Purchases
-- Created: March 5, 2026
-- ============================================================

-- ============================================================
-- STEP 1: DIAGNOSTIC - Find orders missing QR codes
-- ============================================================
DO $$
DECLARE
  v_missing_count INTEGER;
  v_order RECORD;
BEGIN
  -- Count orders without QR codes
  SELECT COUNT(*) INTO v_missing_count
  FROM purchase_orders po
  WHERE po.status IN ('confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request', 'delivery_requested')
    AND (po.qr_code_generated IS NULL OR po.qr_code_generated = FALSE)
    AND po.items IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM material_items WHERE purchase_order_id = po.id);
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNOSTIC: Found % orders missing QR codes', v_missing_count;
  RAISE NOTICE '========================================';
  
  -- Show details of missing orders
  FOR v_order IN 
    SELECT po.id, po.po_number, po.status, po.created_at, 
           jsonb_array_length(po.items) as item_count,
           po.qr_code_generated,
           (SELECT COUNT(*) FROM material_items WHERE purchase_order_id = po.id) as existing_qr_count
    FROM purchase_orders po
    WHERE po.status IN ('confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request', 'delivery_requested')
      AND (po.qr_code_generated IS NULL OR po.qr_code_generated = FALSE)
      AND po.items IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM material_items WHERE purchase_order_id = po.id)
    ORDER BY po.created_at DESC
    LIMIT 20
  LOOP
    RAISE NOTICE 'Order: % | Status: % | Items: % | QR Generated Flag: % | Existing QR Codes: % | Created: %', 
      COALESCE(v_order.po_number, v_order.id::TEXT), 
      v_order.status, 
      v_order.item_count,
      v_order.qr_code_generated,
      v_order.existing_qr_count,
      v_order.created_at;
  END LOOP;
END $$;

-- ============================================================
-- STEP 2: Check if trigger exists
-- ============================================================
DO $$
DECLARE
  v_trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE c.relname = 'purchase_orders'
    AND t.tgname = 'trigger_auto_generate_item_qr_codes_on_insert';
  
  IF v_trigger_count = 0 THEN
    RAISE WARNING 'INSERT trigger does not exist! Creating it now...';
    CREATE TRIGGER trigger_auto_generate_item_qr_codes_on_insert
      AFTER INSERT ON purchase_orders
      FOR EACH ROW
      WHEN (
        NEW.status IN ('confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request', 'delivery_requested')
        AND (NEW.qr_code_generated IS NULL OR NEW.qr_code_generated = FALSE)
      )
      EXECUTE FUNCTION public.auto_generate_item_qr_codes();
    RAISE NOTICE 'INSERT trigger created successfully';
  ELSE
    RAISE NOTICE 'INSERT trigger exists';
  END IF;
END $$;

-- ============================================================
-- STEP 3: MANUAL FIX - Generate QR codes for missing orders
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
  v_processed_count INTEGER := 0;
  v_qr_codes_generated INTEGER := 0;
  v_error_count INTEGER := 0;
  v_order_qr_count INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Starting manual QR code generation...';
  RAISE NOTICE '========================================';
  
  FOR v_order IN 
    SELECT po.id, po.po_number, po.status, po.items, po.supplier_id, po.buyer_id, po.qr_code_generated, po.created_at
    FROM purchase_orders po
    WHERE po.status IN ('confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request', 'delivery_requested')
      AND (po.qr_code_generated IS NULL OR po.qr_code_generated = FALSE)
      AND po.items IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM material_items WHERE purchase_order_id = po.id)
    ORDER BY po.created_at DESC
    LIMIT 200 -- Process up to 200 orders
  LOOP
    BEGIN
      v_processed_count := v_processed_count + 1;
      v_order_qr_count := 0;
      
      RAISE NOTICE 'Processing order % (%): status=%, items=%', 
        v_processed_count, 
        COALESCE(v_order.po_number, v_order.id::TEXT), 
        v_order.status, 
        jsonb_array_length(v_order.items);
      
      -- Get supplier ID
      v_supplier_uuid := v_order.supplier_id;
      v_buyer_id := v_order.buyer_id;
      
      IF v_supplier_uuid IS NULL THEN
        RAISE WARNING '  Order % has NULL supplier_id, skipping', COALESCE(v_order.po_number, v_order.id::TEXT);
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
        
        RAISE NOTICE '  Processing item %: % (quantity: %)', 
          v_item_index, 
          COALESCE(v_item->>'name', v_item->>'material_name', 'Unknown'), 
          v_item_quantity;
        
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
          v_qr_codes_generated := v_qr_codes_generated + 1;
        END LOOP;
      END LOOP;
      
      -- Mark as generated
      UPDATE purchase_orders SET qr_code_generated = true WHERE id = v_order.id;
      
      RAISE NOTICE '✅ Generated % QR codes for purchase order % (status: %)', 
        v_order_qr_count, 
        COALESCE(v_order.po_number, v_order.id::TEXT), 
        v_order.status;
    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
      RAISE WARNING '❌ Error processing order %: %', 
        COALESCE(v_order.po_number, v_order.id::TEXT), 
        SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Manual fix complete!';
  RAISE NOTICE 'Processed: % orders', v_processed_count;
  RAISE NOTICE 'Generated: % QR codes', v_qr_codes_generated;
  RAISE NOTICE 'Errors: %', v_error_count;
  RAISE NOTICE '========================================';
END $$;

-- ============================================================
-- STEP 4: Verify the fix
-- ============================================================
DO $$
DECLARE
  v_remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_remaining_count
  FROM purchase_orders po
  WHERE po.status IN ('confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request', 'delivery_requested')
    AND (po.qr_code_generated IS NULL OR po.qr_code_generated = FALSE)
    AND po.items IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM material_items WHERE purchase_order_id = po.id);
  
  IF v_remaining_count = 0 THEN
    RAISE NOTICE '✅ SUCCESS: All orders now have QR codes!';
  ELSE
    RAISE WARNING '⚠️ WARNING: % orders still missing QR codes. Run this migration again or check for errors above.', v_remaining_count;
  END IF;
END $$;

-- ============================================================
-- Migration Complete
-- ============================================================

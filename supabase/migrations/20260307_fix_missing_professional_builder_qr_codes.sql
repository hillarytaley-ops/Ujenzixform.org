-- ============================================================
-- Fix Missing QR Codes for Recent Professional Builder Orders
-- Created: March 7, 2026
-- ============================================================

-- ============================================================
-- STEP 1: DIAGNOSTIC - Find orders missing QR codes (last 14 days)
-- ============================================================
DO $$
DECLARE
  v_missing_count INTEGER;
  v_order RECORD;
  v_total_orders INTEGER;
  v_with_qr INTEGER;
BEGIN
  -- Count total orders in the last 14 days
  SELECT COUNT(*) INTO v_total_orders
  FROM purchase_orders po
  WHERE po.created_at >= NOW() - INTERVAL '14 days';
  
  -- Count orders WITH QR codes
  SELECT COUNT(DISTINCT po.id) INTO v_with_qr
  FROM purchase_orders po
  WHERE po.created_at >= NOW() - INTERVAL '14 days'
    AND EXISTS (SELECT 1 FROM material_items WHERE purchase_order_id = po.id);
  
  -- Count orders that SHOULD have QR codes but don't
  SELECT COUNT(*) INTO v_missing_count
  FROM purchase_orders po
  WHERE po.status IN ('confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request', 'delivery_requested', 'dispatched', 'in_transit')
    AND po.items IS NOT NULL
    AND jsonb_array_length(COALESCE(po.items, '[]'::jsonb)) > 0
    AND NOT EXISTS (SELECT 1 FROM material_items WHERE purchase_order_id = po.id)
    AND po.created_at >= NOW() - INTERVAL '14 days';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'QR CODE DIAGNOSTIC (Last 14 Days)';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total orders: %', v_total_orders;
  RAISE NOTICE 'Orders with QR codes: %', v_with_qr;
  RAISE NOTICE 'Orders MISSING QR codes: %', v_missing_count;
  RAISE NOTICE '========================================';
  
  -- Show details of missing orders
  IF v_missing_count > 0 THEN
    RAISE NOTICE 'Orders missing QR codes:';
    FOR v_order IN 
      SELECT 
        po.id, 
        po.po_number, 
        po.status, 
        po.created_at, 
        jsonb_array_length(COALESCE(po.items, '[]'::jsonb)) as item_count,
        po.qr_code_generated,
        po.buyer_id,
        (SELECT full_name FROM profiles WHERE id = po.buyer_id OR user_id = po.buyer_id LIMIT 1) as buyer_name
      FROM purchase_orders po
      WHERE po.status IN ('confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request', 'delivery_requested', 'dispatched', 'in_transit')
        AND po.items IS NOT NULL
        AND jsonb_array_length(COALESCE(po.items, '[]'::jsonb)) > 0
        AND NOT EXISTS (SELECT 1 FROM material_items WHERE purchase_order_id = po.id)
        AND po.created_at >= NOW() - INTERVAL '14 days'
      ORDER BY po.created_at DESC
      LIMIT 30
    LOOP
      RAISE NOTICE '  % | Status: % | Items: % | QR Flag: % | Buyer: % | Created: %', 
        COALESCE(v_order.po_number, v_order.id::TEXT), 
        v_order.status, 
        v_order.item_count,
        v_order.qr_code_generated,
        COALESCE(v_order.buyer_name, 'Unknown'),
        v_order.created_at;
    END LOOP;
  END IF;
END $$;

-- ============================================================
-- STEP 2: Verify and update trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_generate_item_qr_codes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item JSONB;
  item_index INTEGER := 0;
  qr_code_value TEXT;
  supplier_uuid UUID;
  material_category TEXT;
  should_generate BOOLEAN := FALSE;
  v_buyer_id UUID;
  v_buyer_name TEXT;
  v_buyer_email TEXT;
  v_buyer_phone TEXT;
  v_item_quantity INTEGER;
  v_unit_index INTEGER;
  v_total_created INTEGER := 0;
BEGIN
  -- CRITICAL: Use advisory lock to prevent concurrent execution for same order
  PERFORM pg_advisory_xact_lock(hashtext(NEW.id::TEXT));
  
  -- Check if QR codes already exist - must check AFTER acquiring lock
  IF EXISTS (SELECT 1 FROM material_items WHERE purchase_order_id = NEW.id) THEN
    -- QR codes already exist - just ensure flag is set and exit immediately
    IF (NEW.qr_code_generated IS NULL OR NEW.qr_code_generated = FALSE) THEN
      UPDATE purchase_orders SET qr_code_generated = true WHERE id = NEW.id;
    END IF;
    RETURN NEW;
  END IF;

  -- Double-check: If qr_code_generated is already true, verify QR codes exist
  IF NEW.qr_code_generated = TRUE THEN
    -- Check if QR codes actually exist
    IF NOT EXISTS (SELECT 1 FROM material_items WHERE purchase_order_id = NEW.id) THEN
      -- Flag is true but no QR codes exist - reset and continue
      NEW.qr_code_generated := FALSE;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Get supplier ID
  supplier_uuid := NEW.supplier_id;

  -- Determine if we should generate QR codes based on status
  -- Include more statuses to catch all cases
  IF NEW.status IN ('confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request', 'delivery_requested', 'dispatched', 'in_transit', 'pickup_ready') THEN
    should_generate := (NEW.qr_code_generated IS NULL OR NEW.qr_code_generated = FALSE);
  END IF;
  
  -- For UPDATE operations, also trigger on status change
  IF TG_OP = 'UPDATE' AND NOT should_generate AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status IN ('confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request', 'delivery_requested', 'dispatched', 'in_transit', 'pickup_ready') THEN
      should_generate := NOT EXISTS (SELECT 1 FROM material_items WHERE purchase_order_id = NEW.id);
    END IF;
  END IF;
  
  -- Generate QR codes if needed
  IF should_generate AND NEW.items IS NOT NULL AND jsonb_array_length(COALESCE(NEW.items, '[]'::jsonb)) > 0 THEN
    -- Get buyer_id from purchase order
    v_buyer_id := NEW.buyer_id;
    
    -- Fetch buyer details from profiles table
    IF v_buyer_id IS NOT NULL THEN
      BEGIN
        SELECT 
          COALESCE(full_name, company_name, email, 'Unknown Client'),
          COALESCE(email, ''),
          COALESCE(phone, '')
        INTO v_buyer_name, v_buyer_email, v_buyer_phone
        FROM profiles
        WHERE id = v_buyer_id OR user_id = v_buyer_id
        LIMIT 1;
        
        -- If not found in profiles, try to get from auth.users
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
    END IF;
    
    -- Default values if buyer info not found
    IF v_buyer_name IS NULL OR v_buyer_name = '' THEN
      v_buyer_name := 'Unknown Client';
    END IF;
    
    -- Generate QR codes for EACH item in the order
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      item_index := item_index + 1;
      v_item_quantity := COALESCE((item->>'quantity')::INTEGER, 1);
      material_category := UPPER(SPLIT_PART(COALESCE(item->>'name', item->>'material_name', 'GENERAL'), ' ', 1));
      
      -- CRITICAL: Generate ONE QR code for EACH UNIT of the item
      FOR v_unit_index IN 1..v_item_quantity
      LOOP
        qr_code_value := 'UJP-' || 
                         material_category || '-' ||
                         COALESCE(NEW.po_number, SUBSTRING(NEW.id::TEXT, 1, 8)) || '-' ||
                         'ITEM' || LPAD(item_index::TEXT, 3, '0') || '-' ||
                         'UNIT' || LPAD(v_unit_index::TEXT, 3, '0') || '-' ||
                         TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                         LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        
        -- Insert ONE QR code per unit with buyer information
        INSERT INTO public.material_items (
          purchase_order_id, qr_code, item_sequence, material_type, category,
          quantity, unit, supplier_id, status,
          buyer_id, buyer_name, buyer_email, buyer_phone,
          item_unit_price, item_total_price, item_description
        ) VALUES (
          NEW.id, 
          qr_code_value, 
          (item_index - 1) * 1000 + v_unit_index,
          COALESCE(item->>'name', item->>'material_name', 'Unknown Material'),
          material_category,
          1,
          COALESCE(item->>'unit', 'units'),
          supplier_uuid,
          'pending',
          v_buyer_id,
          v_buyer_name,
          v_buyer_email,
          v_buyer_phone,
          COALESCE((item->>'unit_price')::NUMERIC, 0),
          COALESCE((item->>'unit_price')::NUMERIC, 0),
          COALESCE(item->>'description', 'Item ' || item_index || ', Unit ' || v_unit_index || ' of ' || v_item_quantity)
        )
        ON CONFLICT (purchase_order_id, item_sequence) DO NOTHING;
        
        v_total_created := v_total_created + 1;
      END LOOP;
    END LOOP;
    
    -- Mark QR codes as generated
    IF v_total_created > 0 THEN
      UPDATE purchase_orders SET qr_code_generated = true WHERE id = NEW.id;
      RAISE NOTICE '✅ Generated % QR codes for order %', v_total_created, COALESCE(NEW.po_number, NEW.id::TEXT);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================
-- STEP 3: Ensure triggers exist for both INSERT and UPDATE
-- ============================================================
-- Drop existing triggers to recreate with correct conditions
DROP TRIGGER IF EXISTS trigger_auto_generate_item_qr_codes_on_insert ON purchase_orders;
DROP TRIGGER IF EXISTS trigger_auto_generate_item_qr_codes_on_update ON purchase_orders;
DROP TRIGGER IF EXISTS trigger_auto_generate_item_qr_codes ON purchase_orders;

-- Create INSERT trigger
CREATE TRIGGER trigger_auto_generate_item_qr_codes_on_insert
  AFTER INSERT ON purchase_orders
  FOR EACH ROW
  WHEN (
    NEW.status IN ('confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request', 'delivery_requested', 'dispatched', 'in_transit', 'pickup_ready')
    AND (NEW.qr_code_generated IS NULL OR NEW.qr_code_generated = FALSE)
    AND NEW.items IS NOT NULL
  )
  EXECUTE FUNCTION public.auto_generate_item_qr_codes();

-- Create UPDATE trigger
CREATE TRIGGER trigger_auto_generate_item_qr_codes_on_update
  AFTER UPDATE ON purchase_orders
  FOR EACH ROW
  WHEN (
    NEW.status IN ('confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request', 'delivery_requested', 'dispatched', 'in_transit', 'pickup_ready')
    AND (NEW.qr_code_generated IS NULL OR NEW.qr_code_generated = FALSE)
    AND NEW.items IS NOT NULL
  )
  EXECUTE FUNCTION public.auto_generate_item_qr_codes();

-- ============================================================
-- STEP 4: BACKFILL - Generate QR codes for all missing orders
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
  RAISE NOTICE 'Starting QR code backfill for all missing orders...';
  RAISE NOTICE '========================================';
  
  FOR v_order IN 
    SELECT po.id, po.po_number, po.status, po.items, po.supplier_id, po.buyer_id, po.qr_code_generated, po.created_at
    FROM purchase_orders po
    WHERE po.status IN ('confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request', 'delivery_requested', 'dispatched', 'in_transit', 'pickup_ready')
      AND po.items IS NOT NULL
      AND jsonb_array_length(COALESCE(po.items, '[]'::jsonb)) > 0
      AND NOT EXISTS (SELECT 1 FROM material_items WHERE purchase_order_id = po.id)
    ORDER BY po.created_at DESC
    LIMIT 500 -- Process up to 500 orders
  LOOP
    BEGIN
      v_processed_count := v_processed_count + 1;
      v_order_qr_count := 0;
      
      -- Get supplier ID
      v_supplier_uuid := v_order.supplier_id;
      v_buyer_id := v_order.buyer_id;
      
      IF v_supplier_uuid IS NULL THEN
        RAISE NOTICE '  ⚠️ Order % has NULL supplier_id, trying to find from related data...', COALESCE(v_order.po_number, v_order.id::TEXT);
        
        -- Try to find supplier_id from items
        SELECT (v_order.items->0->>'supplier_id')::UUID INTO v_supplier_uuid;
        
        IF v_supplier_uuid IS NULL THEN
          RAISE WARNING '  ❌ Order % has NULL supplier_id, skipping', COALESCE(v_order.po_number, v_order.id::TEXT);
          v_error_count := v_error_count + 1;
          CONTINUE;
        END IF;
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
          v_qr_codes_generated := v_qr_codes_generated + 1;
        END LOOP;
      END LOOP;
      
      -- Mark as generated
      UPDATE purchase_orders SET qr_code_generated = true WHERE id = v_order.id;
      
      RAISE NOTICE '✅ [%/%] Generated % QR codes for order % (status: %)', 
        v_processed_count, 
        (SELECT COUNT(*) FROM purchase_orders po WHERE po.status IN ('confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request', 'delivery_requested', 'dispatched', 'in_transit', 'pickup_ready') AND po.items IS NOT NULL AND jsonb_array_length(COALESCE(po.items, '[]'::jsonb)) > 0 AND NOT EXISTS (SELECT 1 FROM material_items WHERE purchase_order_id = po.id)),
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
  RAISE NOTICE 'Backfill complete!';
  RAISE NOTICE 'Processed: % orders', v_processed_count;
  RAISE NOTICE 'Generated: % QR codes', v_qr_codes_generated;
  RAISE NOTICE 'Errors: %', v_error_count;
  RAISE NOTICE '========================================';
END;
$$;

-- ============================================================
-- STEP 5: Final verification
-- ============================================================
DO $$
DECLARE
  v_remaining_count INTEGER;
  v_total_qr_codes INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_remaining_count
  FROM purchase_orders po
  WHERE po.status IN ('confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request', 'delivery_requested', 'dispatched', 'in_transit', 'pickup_ready')
    AND po.items IS NOT NULL
    AND jsonb_array_length(COALESCE(po.items, '[]'::jsonb)) > 0
    AND NOT EXISTS (SELECT 1 FROM material_items WHERE purchase_order_id = po.id);
  
  SELECT COUNT(*) INTO v_total_qr_codes
  FROM material_items;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICATION RESULTS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total QR codes in system: %', v_total_qr_codes;
  
  IF v_remaining_count = 0 THEN
    RAISE NOTICE '✅ SUCCESS: All eligible orders now have QR codes!';
  ELSE
    RAISE WARNING '⚠️ WARNING: % orders still missing QR codes. They may have NULL supplier_id or other issues.', v_remaining_count;
    RAISE NOTICE 'Run this migration again to process more orders.';
  END IF;
  RAISE NOTICE '========================================';
END $$;

-- ============================================================
-- Migration Complete
-- ============================================================

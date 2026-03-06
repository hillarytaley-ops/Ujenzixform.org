-- ============================================================
-- Fix QR Code Generation for Purchase Orders Created Directly (INSERT)
-- Private builders may create purchase orders directly with delivery_requested status
-- This ensures QR codes are generated on INSERT, not just UPDATE
-- Created: March 5, 2026
-- ============================================================

-- First, update the function to handle INSERT (where OLD is NULL)
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

  -- Double-check: If qr_code_generated is already true, don't generate
  IF NEW.qr_code_generated = TRUE THEN
    RETURN NEW;
  END IF;

  -- Get supplier ID
  supplier_uuid := NEW.supplier_id;

  -- Check if we should generate QR codes
  -- For INSERT: OLD is NULL, so just check NEW.status
  -- For UPDATE: Check if status changed to order status
  IF TG_OP = 'INSERT' THEN
    -- On INSERT, generate if status is an order status
    should_generate := (
      NEW.status IN ('confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request', 'delivery_requested') AND
      (NEW.qr_code_generated IS NULL OR NEW.qr_code_generated = FALSE)
    );
  ELSE
    -- On UPDATE, check if status changed to order status
    should_generate := (
      NEW.status IN ('confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request', 'delivery_requested') AND
      (NEW.qr_code_generated IS NULL OR NEW.qr_code_generated = FALSE)
    );
    
    -- Also check if status changed from non-order to order status
    IF NOT should_generate AND OLD.status IS NOT NULL THEN
      should_generate := (
        NEW.status IN ('confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request', 'delivery_requested') AND
        OLD.status NOT IN ('confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request', 'delivery_requested') AND
        (NEW.qr_code_generated IS NULL OR NEW.qr_code_generated = FALSE)
      );
    END IF;
  END IF;
  
  -- Final check: Make sure QR codes don't exist before generating
  IF should_generate AND NEW.items IS NOT NULL AND NOT EXISTS (SELECT 1 FROM material_items WHERE purchase_order_id = NEW.id) THEN
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
            -- If query fails, use defaults
            v_buyer_name := 'Unknown Client';
            v_buyer_email := '';
            v_buyer_phone := '';
          END;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- If query fails, use defaults
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
      -- If quantity = 2, generate 2 separate QR codes (one for each piece)
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
          (item_index - 1) * 1000 + v_unit_index, -- Unique sequence: item_index * 1000 + unit_index
          COALESCE(item->>'name', item->>'material_name', 'Unknown Material'),
          material_category,
          1, -- Each QR represents 1 unit
          COALESCE(item->>'unit', 'units'),
          supplier_uuid,
          'pending',
          v_buyer_id,
          v_buyer_name,
          v_buyer_email,
          v_buyer_phone,
          COALESCE((item->>'unit_price')::NUMERIC, 0),
          COALESCE((item->>'unit_price')::NUMERIC, 0), -- Per unit price
          COALESCE(item->>'description', 'Item ' || item_index || ', Unit ' || v_unit_index || ' of ' || v_item_quantity)
        )
        ON CONFLICT (purchase_order_id, item_sequence) DO NOTHING;
      END LOOP;
    END LOOP;
    
    UPDATE purchase_orders SET qr_code_generated = true WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add INSERT trigger to generate QR codes when purchase orders are created directly
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
  v_processed_count INTEGER := 0;
  v_qr_codes_generated INTEGER := 0;
  v_error_count INTEGER := 0;
  v_order_qr_count INTEGER;
BEGIN
  RAISE NOTICE 'Starting backfill: Looking for purchase orders without QR codes...';
  
  FOR v_order IN 
    SELECT po.id, po.po_number, po.status, po.items, po.supplier_id, po.buyer_id, po.qr_code_generated, po.created_at
    FROM purchase_orders po
    WHERE po.status IN ('confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request', 'delivery_requested')
      AND (po.qr_code_generated IS NULL OR po.qr_code_generated = FALSE)
      AND po.items IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM material_items WHERE purchase_order_id = po.id)
    ORDER BY po.created_at DESC
    LIMIT 100 -- Process most recent 100 orders
  LOOP
    BEGIN
      v_processed_count := v_processed_count + 1;
      RAISE NOTICE 'Processing order % (%): status=%, items=%', v_processed_count, COALESCE(v_order.po_number, v_order.id::TEXT), v_order.status, jsonb_array_length(v_order.items);
      
      -- Check if QR codes already exist (double-check)
      IF EXISTS (SELECT 1 FROM material_items WHERE purchase_order_id = v_order.id) THEN
        -- Update flag and skip
        UPDATE purchase_orders SET qr_code_generated = true WHERE id = v_order.id;
        RAISE NOTICE '  Order % already has QR codes, skipping', COALESCE(v_order.po_number, v_order.id::TEXT);
        CONTINUE;
      END IF;
      
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
            -- If query fails, use defaults
            v_buyer_name := 'Unknown Client';
            v_buyer_email := '';
            v_buyer_phone := '';
          END;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- If query fails, use defaults
        v_buyer_name := 'Unknown Client';
        v_buyer_email := '';
        v_buyer_phone := '';
      END;
      
      IF v_buyer_name IS NULL OR v_buyer_name = '' THEN
        v_buyer_name := 'Unknown Client';
      END IF;
      
      -- Generate QR codes for each item
      v_item_index := 0;
      v_order_qr_count := 0;
      
      FOR v_item IN SELECT * FROM jsonb_array_elements(v_order.items)
        LOOP
          v_item_index := v_item_index + 1;
          v_item_quantity := COALESCE((v_item->>'quantity')::INTEGER, 1);
          v_material_category := UPPER(SPLIT_PART(COALESCE(v_item->>'name', v_item->>'material_name', 'GENERAL'), ' ', 1));
          
          RAISE NOTICE '  Processing item %: % (quantity: %)', v_item_index, COALESCE(v_item->>'name', v_item->>'material_name', 'Unknown'), v_item_quantity;
          
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
      
      RAISE NOTICE '✅ Generated % QR codes for purchase order % (status: %)', v_order_qr_count, COALESCE(v_order.po_number, v_order.id::TEXT), v_order.status;
    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
      RAISE WARNING '❌ Error processing order %: %', COALESCE(v_order.po_number, v_order.id::TEXT), SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Backfill complete: Processed % orders, generated % QR codes, % errors', v_processed_count, v_qr_codes_generated, v_error_count;
END;
$$;

-- ============================================================
-- Migration Complete
-- ============================================================

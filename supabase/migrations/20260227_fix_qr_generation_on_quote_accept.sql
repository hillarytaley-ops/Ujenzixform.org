-- ============================================================
-- Fix QR Code Generation for Accepted Quotes
-- Created: February 27, 2026
-- ============================================================
-- Issue: QR codes are not generated when professional builders accept quotes
-- Root Cause: QR generation triggers only fire on status = 'confirmed',
--             but accepted quotes have status 'quote_accepted' → 'order_created' → 'awaiting_delivery_request'
-- Solution: Update triggers to also fire on quote acceptance statuses
-- ============================================================

-- Update the auto_generate_item_qr_codes function to also trigger on quote acceptance
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
BEGIN
  -- Get supplier ID from purchase order
  SELECT po.supplier_id INTO supplier_uuid
  FROM purchase_orders po
  WHERE po.id = NEW.id;

  -- Check if QR codes already exist (prevent duplicates)
  IF EXISTS (SELECT 1 FROM material_items WHERE purchase_order_id = NEW.id LIMIT 1) THEN
    -- QR codes already exist, just mark as generated if not already marked
    IF NEW.qr_code_generated IS NULL OR NEW.qr_code_generated = FALSE THEN
      UPDATE purchase_orders
      SET qr_code_generated = true
      WHERE id = NEW.id;
    END IF;
    RETURN NEW;
  END IF;

  -- Check if QR codes should be generated
  -- Generate for: 'confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request'
  -- Only if QR codes haven't been generated yet
  should_generate := (
    (NEW.status IN ('confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request')) AND
    (OLD.qr_code_generated IS FALSE OR OLD.qr_code_generated IS NULL) AND
    (NEW.qr_code_generated IS NULL OR NEW.qr_code_generated = FALSE)
  );

  -- Also generate if status changed to one of these statuses
  IF NOT should_generate THEN
    should_generate := (
      NEW.status IN ('confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request') AND
      OLD.status IS NOT NULL AND
      OLD.status NOT IN ('confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request') AND
      (NEW.qr_code_generated IS NULL OR NEW.qr_code_generated = FALSE)
    );
  END IF;

  IF should_generate THEN
    -- Loop through each item in the purchase order
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      item_index := item_index + 1;
      
      -- Extract material category (first word of material name)
      material_category := UPPER(SPLIT_PART(COALESCE(item->>'name', item->>'material_name', 'GENERAL'), ' ', 1));
      
      -- Generate unique QR code: UJP-CATEGORY-PONUM-ITEM-DATE-RANDOM
      qr_code_value := 'UJP-' || 
                       material_category || '-' ||
                       COALESCE(NEW.po_number, SUBSTRING(NEW.id::TEXT, 1, 8)) || '-' ||
                       'ITEM' || LPAD(item_index::TEXT, 3, '0') || '-' ||
                       TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                       LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
      
      -- Insert individual material item with QR code
      INSERT INTO public.material_items (
        purchase_order_id,
        qr_code,
        item_sequence,
        material_type,
        category,
        quantity,
        unit,
        supplier_id,
        status
      ) VALUES (
        NEW.id,
        qr_code_value,
        item_index,
        COALESCE(item->>'name', item->>'material_name', 'Unknown Material'),
        material_category,
        COALESCE((item->>'quantity')::NUMERIC, 1),
        COALESCE(item->>'unit', 'units'),
        supplier_uuid,
        'pending'
      )
      ON CONFLICT (purchase_order_id, item_sequence) DO NOTHING; -- Prevent duplicates
      
      RAISE NOTICE 'Generated QR code % for item % in PO % (status: %)', 
        qr_code_value, 
        COALESCE(item->>'name', item->>'material_name', 'Unknown'), 
        NEW.po_number,
        NEW.status;
    END LOOP;
    
    -- Mark QR codes as generated in the database
    UPDATE purchase_orders
    SET qr_code_generated = true
    WHERE id = NEW.id;
    
    RAISE NOTICE 'QR codes generated for purchase order % (status: %)', NEW.id, NEW.status;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update the auto_generate_qr_codes_on_confirm function to also trigger on quote acceptance
CREATE OR REPLACE FUNCTION public.auto_generate_qr_codes_on_confirm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Generate QR codes when status changes to any of these statuses
    -- and QR codes haven't been generated yet
    IF NEW.status IN ('confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request') AND 
       (OLD.status IS NULL OR OLD.status NOT IN ('confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request')) AND
       (NEW.qr_code_generated IS NULL OR NEW.qr_code_generated = false) THEN
        
        -- Check if generate_qr_codes_for_purchase_order function exists
        IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_qr_codes_for_purchase_order') THEN
            PERFORM public.generate_qr_codes_for_purchase_order(NEW.id);
        ELSE
            -- Fallback: QR codes should be generated by auto_generate_item_qr_codes trigger
            RAISE NOTICE 'QR codes will be generated by auto_generate_item_qr_codes trigger for PO %', NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Ensure triggers are in place
-- Use AFTER trigger so it fires after convert_quote_to_order has finished
DROP TRIGGER IF EXISTS trigger_auto_generate_item_qr_codes ON purchase_orders;
CREATE TRIGGER trigger_auto_generate_item_qr_codes
  AFTER INSERT OR UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_item_qr_codes();

DROP TRIGGER IF EXISTS trigger_auto_generate_qr_on_confirm ON purchase_orders;
CREATE TRIGGER trigger_auto_generate_qr_on_confirm
    AFTER UPDATE ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_generate_qr_codes_on_confirm();

-- ============================================================
-- Migration Complete
-- ============================================================
-- QR codes will now be generated when:
-- 1. Status = 'confirmed' (existing behavior)
-- 2. Status = 'quote_accepted' (NEW - when builder accepts quote)
-- 3. Status = 'order_created' (NEW - after quote conversion)
-- 4. Status = 'awaiting_delivery_request' (NEW - after order creation)
-- ============================================================

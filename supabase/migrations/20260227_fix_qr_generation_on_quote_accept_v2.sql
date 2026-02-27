-- ============================================================
-- Fix QR Code Generation for Accepted Quotes (V2 - Simplified)
-- Created: February 27, 2026
-- ============================================================

-- Drop and recreate the function with proper syntax
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
  -- CRITICAL: Use advisory lock to prevent concurrent execution for same order
  -- This ensures only one trigger execution can generate QR codes at a time
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
  should_generate := (
    NEW.status IN ('confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request') AND
    (NEW.qr_code_generated IS NULL OR NEW.qr_code_generated = FALSE)
  );

  -- Also check if status changed to one of these
  IF NOT should_generate AND OLD.status IS NOT NULL THEN
    should_generate := (
      NEW.status IN ('confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request') AND
      OLD.status NOT IN ('confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request') AND
      (NEW.qr_code_generated IS NULL OR NEW.qr_code_generated = FALSE)
    );
  END IF;

  -- Final check: Make sure QR codes don't exist before generating
  IF should_generate AND NEW.items IS NOT NULL AND NOT EXISTS (SELECT 1 FROM material_items WHERE purchase_order_id = NEW.id) THEN
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      item_index := item_index + 1;
      
      material_category := UPPER(SPLIT_PART(COALESCE(item->>'name', item->>'material_name', 'GENERAL'), ' ', 1));
      
      qr_code_value := 'UJP-' || 
                       material_category || '-' ||
                       COALESCE(NEW.po_number, SUBSTRING(NEW.id::TEXT, 1, 8)) || '-' ||
                       'ITEM' || LPAD(item_index::TEXT, 3, '0') || '-' ||
                       TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                       LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
      
      -- Check if this specific item already exists before inserting
      IF NOT EXISTS (SELECT 1 FROM material_items WHERE purchase_order_id = NEW.id AND item_sequence = item_index) THEN
        INSERT INTO public.material_items (
          purchase_order_id, qr_code, item_sequence, material_type, category,
          quantity, unit, supplier_id, status
        ) VALUES (
          NEW.id, qr_code_value, item_index,
          COALESCE(item->>'name', item->>'material_name', 'Unknown Material'),
          material_category,
          COALESCE((item->>'quantity')::NUMERIC, 1),
          COALESCE(item->>'unit', 'units'),
          supplier_uuid,
          'pending'
        );
      END IF;
    END LOOP;
    
    UPDATE purchase_orders SET qr_code_generated = true WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update the confirm function
CREATE OR REPLACE FUNCTION public.auto_generate_qr_codes_on_confirm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status IN ('confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request') AND 
       (OLD.status IS NULL OR OLD.status NOT IN ('confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request')) AND
       (NEW.qr_code_generated IS NULL OR NEW.qr_code_generated = false) THEN
        
        IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_qr_codes_for_purchase_order') THEN
            PERFORM public.generate_qr_codes_for_purchase_order(NEW.id);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Recreate triggers
-- Only fire on UPDATE to prevent duplicate generation on INSERT
DROP TRIGGER IF EXISTS trigger_auto_generate_item_qr_codes ON purchase_orders;
CREATE TRIGGER trigger_auto_generate_item_qr_codes
  AFTER UPDATE ON purchase_orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.qr_code_generated IS DISTINCT FROM NEW.qr_code_generated)
  EXECUTE FUNCTION public.auto_generate_item_qr_codes();

DROP TRIGGER IF EXISTS trigger_auto_generate_qr_on_confirm ON purchase_orders;
CREATE TRIGGER trigger_auto_generate_qr_on_confirm
    AFTER UPDATE ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_generate_qr_codes_on_confirm();

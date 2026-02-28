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
  -- Generate QR codes when order is created OR when delivery is requested
  should_generate := (
    NEW.status IN ('confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request', 'delivery_requested') AND
    (NEW.qr_code_generated IS NULL OR NEW.qr_code_generated = FALSE)
  );

  -- Also check if status changed to one of these (from a non-order status)
  IF NOT should_generate AND OLD.status IS NOT NULL THEN
    should_generate := (
      NEW.status IN ('confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request', 'delivery_requested') AND
      OLD.status NOT IN ('confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request', 'delivery_requested') AND
      (NEW.qr_code_generated IS NULL OR NEW.qr_code_generated = FALSE)
    );
  END IF;

  -- CRITICAL: Generate QR codes when order is created (quote_accepted → order_created → awaiting_delivery_request)
  -- OR when delivery is requested (status becomes delivery_requested)
  -- This ensures QR codes are generated IMMEDIATELY when the order is converted from quote to order
  -- AND when delivery is requested by the builder
  
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
      -- Use ON CONFLICT as a safety net even though we check first
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
      )
      ON CONFLICT (purchase_order_id, item_sequence) DO NOTHING;
    END LOOP;
    
    UPDATE purchase_orders SET qr_code_generated = true WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update the confirm function - DISABLE IT to prevent duplicate generation
-- The auto_generate_item_qr_codes trigger handles all QR generation now
CREATE OR REPLACE FUNCTION public.auto_generate_qr_codes_on_confirm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- DISABLED: Let auto_generate_item_qr_codes handle all QR generation
    -- This prevents duplicate inserts from two triggers
    RETURN NEW;
END;
$$;

-- Drop ALL possible triggers that might generate QR codes
DROP TRIGGER IF EXISTS trigger_auto_generate_item_qr_codes ON purchase_orders;
DROP TRIGGER IF EXISTS trigger_auto_generate_qr_on_confirm ON purchase_orders;
DROP TRIGGER IF EXISTS trigger_auto_generate_qr_codes ON purchase_orders;
DROP TRIGGER IF EXISTS trigger_auto_generate_individual_qr_on_confirm ON purchase_orders;

-- Recreate ONLY the main trigger
-- Fire on UPDATE when status changes to order statuses OR when qr_code_generated flag changes
-- This ensures QR codes are generated:
-- 1. When quote is accepted (status → quote_accepted → order_created → awaiting_delivery_request)
-- 2. When delivery is requested (status → delivery_requested)
CREATE TRIGGER trigger_auto_generate_item_qr_codes
  AFTER UPDATE ON purchase_orders
  FOR EACH ROW
  WHEN (
    (OLD.status IS DISTINCT FROM NEW.status AND 
     NEW.status IN ('confirmed', 'quote_accepted', 'order_created', 'awaiting_delivery_request', 'delivery_requested'))
    OR 
    (OLD.qr_code_generated IS DISTINCT FROM NEW.qr_code_generated)
  )
  EXECUTE FUNCTION public.auto_generate_item_qr_codes();

-- Keep the disabled trigger (it's now a no-op) to prevent old migrations from recreating it
DROP TRIGGER IF EXISTS trigger_auto_generate_qr_on_confirm ON purchase_orders;
CREATE TRIGGER trigger_auto_generate_qr_on_confirm
    AFTER UPDATE ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_generate_qr_codes_on_confirm();

-- ============================================================
-- Helper function to clean up duplicate QR codes
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_duplicate_qr_codes(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER := 0;
BEGIN
  -- Delete duplicate material_items, keeping the first one (by created_at)
  WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY purchase_order_id, item_sequence ORDER BY created_at) as rn
    FROM material_items
    WHERE purchase_order_id = p_order_id
  )
  DELETE FROM material_items
  WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
  );
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Reset the qr_code_generated flag so it can regenerate
  UPDATE purchase_orders 
  SET qr_code_generated = false 
  WHERE id = p_order_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', v_deleted_count,
    'order_id', p_order_id
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.cleanup_duplicate_qr_codes TO authenticated;

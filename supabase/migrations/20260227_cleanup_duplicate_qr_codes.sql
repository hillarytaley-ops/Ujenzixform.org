-- ============================================================
-- Cleanup Duplicate QR Codes and Fix Trigger
-- Created: February 27, 2026
-- ============================================================
-- This script:
-- 1. Removes duplicate material_items for orders
-- 2. Ensures only one QR code per item_sequence per order
-- 3. Updates the trigger to be more defensive
-- ============================================================

-- Step 1: Remove duplicate material_items, keeping only the first one
DELETE FROM material_items
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY purchase_order_id, item_sequence ORDER BY created_at) as rn
    FROM material_items
  ) t
  WHERE rn > 1
);

-- Step 2: Reset qr_code_generated flag for orders that have QR codes
UPDATE purchase_orders
SET qr_code_generated = true
WHERE id IN (
  SELECT DISTINCT purchase_order_id 
  FROM material_items
)
AND (qr_code_generated IS NULL OR qr_code_generated = false);

-- Step 3: Update the trigger function to be more defensive
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
  v_qr_exists BOOLEAN := FALSE;
BEGIN
  -- Use advisory lock to prevent concurrent execution
  PERFORM pg_advisory_xact_lock(hashtext(NEW.id::TEXT));
  
  -- Check if ANY QR codes exist for this order
  SELECT EXISTS(SELECT 1 FROM material_items WHERE purchase_order_id = NEW.id LIMIT 1) INTO v_qr_exists;
  
  IF v_qr_exists THEN
    -- QR codes already exist - just ensure flag is set
    IF (NEW.qr_code_generated IS NULL OR NEW.qr_code_generated = FALSE) THEN
      UPDATE purchase_orders SET qr_code_generated = true WHERE id = NEW.id;
    END IF;
    RETURN NEW;
  END IF;

  -- If qr_code_generated is already true, don't generate
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

  -- Generate QR codes if needed
  IF should_generate AND NEW.items IS NOT NULL THEN
    -- Double-check QR codes don't exist (after lock)
    SELECT EXISTS(SELECT 1 FROM material_items WHERE purchase_order_id = NEW.id LIMIT 1) INTO v_qr_exists;
    
    IF NOT v_qr_exists THEN
      FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
      LOOP
        item_index := item_index + 1;
        
        -- Check if this specific item already exists
        IF EXISTS (SELECT 1 FROM material_items WHERE purchase_order_id = NEW.id AND item_sequence = item_index) THEN
          CONTINUE; -- Skip this item
        END IF;
        
        material_category := UPPER(SPLIT_PART(COALESCE(item->>'name', item->>'material_name', 'GENERAL'), ' ', 1));
        
        qr_code_value := 'UJP-' || 
                         material_category || '-' ||
                         COALESCE(NEW.po_number, SUBSTRING(NEW.id::TEXT, 1, 8)) || '-' ||
                         'ITEM' || LPAD(item_index::TEXT, 3, '0') || '-' ||
                         TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                         LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        
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
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_item_qr_codes ON purchase_orders;
CREATE TRIGGER trigger_auto_generate_item_qr_codes
  AFTER UPDATE ON purchase_orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.qr_code_generated IS DISTINCT FROM NEW.qr_code_generated)
  EXECUTE FUNCTION public.auto_generate_item_qr_codes();

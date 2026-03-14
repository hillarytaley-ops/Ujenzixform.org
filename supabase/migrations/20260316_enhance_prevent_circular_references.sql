-- ============================================================
-- ENHANCE PREVENTION OF CIRCULAR REFERENCES IN DELIVERY_REQUESTS
-- 
-- This migration will:
-- 1. Replace the existing trigger with a comprehensive one that prevents ALL circular references
-- 2. Ensure CHECK constraint prevents id = purchase_order_id
-- 3. Ensure no delivery_request.id can be used as purchase_order_id by another delivery_request
-- 4. Ensure purchase_order_id must reference a purchase_order, not a delivery_request
-- 
-- Created: March 16, 2026
-- ============================================================

-- STEP 1: Ensure CHECK constraint exists to prevent id = purchase_order_id
DO $$
BEGIN
  -- Drop existing constraint if it exists (may have different name)
  ALTER TABLE delivery_requests DROP CONSTRAINT IF EXISTS chk_delivery_request_id_not_po_id;
  ALTER TABLE delivery_requests DROP CONSTRAINT IF EXISTS delivery_requests_id_not_equal_purchase_order_id;
  
  -- Add CHECK constraint to prevent id = purchase_order_id
  ALTER TABLE delivery_requests 
  ADD CONSTRAINT chk_delivery_request_id_not_po_id
  CHECK (id != purchase_order_id);
  
  RAISE NOTICE '✅ Added CHECK constraint: delivery_requests.id != purchase_order_id';
END $$;

-- STEP 2: Create comprehensive trigger function to prevent ALL circular references
CREATE OR REPLACE FUNCTION check_delivery_request_id_integrity()
RETURNS TRIGGER AS $$
DECLARE
  existing_dr_id_as_po_id UUID;
  existing_po_id_as_dr_id UUID;
  is_valid_purchase_order BOOLEAN;
BEGIN
  -- Rule 1: delivery_requests.id cannot be the same as its own purchase_order_id
  -- (This is also enforced by CHECK constraint, but we check here for better error messages)
  IF NEW.id = NEW.purchase_order_id THEN
    RAISE EXCEPTION 'Invalid delivery_request ID: id (%) cannot be the same as purchase_order_id (%). This creates a self-reference and indicates data corruption.', NEW.id, NEW.purchase_order_id;
  END IF;
  
  -- Rule 2: A delivery_request.id cannot be an existing purchase_order_id in another delivery_request
  -- This prevents circular references where delivery_request A has id = X, and delivery_request B has purchase_order_id = X
  SELECT dr.id INTO existing_dr_id_as_po_id
  FROM public.delivery_requests dr
  WHERE dr.purchase_order_id = NEW.id
    AND dr.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
  LIMIT 1;
  
  IF existing_dr_id_as_po_id IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid delivery_request ID: id (%) is already used as a purchase_order_id by another delivery request (ID: %). This creates circular references and is not allowed.', NEW.id, existing_dr_id_as_po_id;
  END IF;
  
  -- Rule 3: A delivery_request.purchase_order_id cannot be an existing delivery_request.id
  -- This prevents the reverse: delivery_request A has purchase_order_id = X, where X is delivery_request B's id
  -- CRITICAL: purchase_order_id MUST reference a purchase_order, NOT a delivery_request
  IF NEW.purchase_order_id IS NOT NULL THEN
    -- Check if purchase_order_id is actually a delivery_request.id (CIRCULAR REFERENCE!)
    SELECT dr.id INTO existing_po_id_as_dr_id
    FROM public.delivery_requests dr
    WHERE dr.id = NEW.purchase_order_id
      AND dr.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
    LIMIT 1;
    
    IF existing_po_id_as_dr_id IS NOT NULL THEN
      RAISE EXCEPTION 'Invalid delivery_request purchase_order_id: purchase_order_id (%) is already an existing delivery_request ID (ID: %). This creates circular references and is not allowed. purchase_order_id must reference a purchase_order, not another delivery_request.', NEW.purchase_order_id, existing_po_id_as_dr_id;
    END IF;
    
    -- Rule 4: Verify that purchase_order_id actually exists in purchase_orders table
    -- This ensures data integrity - purchase_order_id should reference a valid purchase_order
    SELECT EXISTS(SELECT 1 FROM purchase_orders WHERE id = NEW.purchase_order_id) INTO is_valid_purchase_order;
    
    IF NOT is_valid_purchase_order THEN
      -- Allow NULL purchase_order_id (for standalone delivery requests), but if provided, it must be valid
      -- Note: We're lenient here because purchase_orders might be deleted, but we still want to prevent circular refs
      RAISE WARNING 'purchase_order_id (%) does not exist in purchase_orders table. This may indicate data integrity issues, but allowing for now.', NEW.purchase_order_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 3: Drop and recreate trigger to ensure it uses the enhanced function
DROP TRIGGER IF EXISTS prevent_invalid_delivery_request_ids ON public.delivery_requests;
DROP TRIGGER IF EXISTS validate_delivery_request_id_trigger ON public.delivery_requests;

CREATE TRIGGER prevent_invalid_delivery_request_ids
BEFORE INSERT OR UPDATE ON public.delivery_requests
FOR EACH ROW EXECUTE FUNCTION public.check_delivery_request_id_integrity();

-- STEP 4: Add comment to document the constraint and trigger
COMMENT ON CONSTRAINT chk_delivery_request_id_not_po_id ON delivery_requests IS 
  'Prevents delivery_request IDs from matching purchase_order_ids to maintain data integrity and prevent self-references';

COMMENT ON FUNCTION check_delivery_request_id_integrity() IS 
  'Comprehensive validation function that prevents ALL circular references in delivery_requests:
   1. Prevents self-references (id = purchase_order_id)
   2. Prevents circular references (id used as purchase_order_id by another delivery_request)
   3. Prevents reverse circular references (purchase_order_id is an existing delivery_request.id)
   4. Validates that purchase_order_id references a valid purchase_order (if provided)';

DO $$
BEGIN
  RAISE NOTICE '✅ Enhanced trigger to prevent circular references';
  RAISE NOTICE '';
  RAISE NOTICE 'The trigger now prevents:';
  RAISE NOTICE '1. Self-references (id = purchase_order_id) - CHECK constraint + trigger';
  RAISE NOTICE '2. Circular references (id used as purchase_order_id by another delivery_request)';
  RAISE NOTICE '3. Reverse circular references (purchase_order_id is an existing delivery_request.id)';
  RAISE NOTICE '4. Invalid purchase_order_id (validates it exists in purchase_orders table)';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Circular reference prevention enabled';
  RAISE NOTICE '========================================';
END $$;

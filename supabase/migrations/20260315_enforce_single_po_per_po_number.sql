-- ============================================================================
-- ENFORCE SINGLE PURCHASE ORDER PER PO_NUMBER AND SINGLE DELIVERY REQUEST PER PURCHASE_ORDER_ID
-- This migration ensures:
-- 1. Each po_number has ONLY ONE purchase_order
-- 2. Each purchase_order_id has ONLY ONE active delivery_request
-- 3. Each po_number shows ONLY ONE notification card
-- ============================================================================

-- ============================================================================
-- STEP 1: Clean up duplicate purchase_orders with same po_number
-- Keep the most recent one, cancel/archive the rest
-- ============================================================================
DO $$
DECLARE
    duplicate_po RECORD;
    kept_po_id UUID;
    cancelled_count INTEGER;
BEGIN
    -- Find all po_numbers with multiple purchase_orders
    FOR duplicate_po IN
        SELECT po_number, COUNT(*) as count, array_agg(id ORDER BY created_at DESC) as po_ids
        FROM purchase_orders
        WHERE po_number IS NOT NULL 
          AND po_number != ''
          AND status NOT IN ('cancelled', 'rejected', 'completed')
        GROUP BY po_number
        HAVING COUNT(*) > 1
    LOOP
        -- Keep the most recent purchase_order (first in the array since we ordered DESC)
        kept_po_id := duplicate_po.po_ids[1];
        
        -- Cancel all other purchase_orders with the same po_number
        UPDATE purchase_orders
        SET 
            status = 'cancelled',
            updated_at = NOW()
        WHERE po_number = duplicate_po.po_number
          AND id != kept_po_id
          AND status NOT IN ('cancelled', 'rejected', 'completed');
        
        GET DIAGNOSTICS cancelled_count = ROW_COUNT;
        
        RAISE NOTICE 'Cleaned up % duplicate purchase_order(s) for po_number "%", kept: %', 
            cancelled_count, 
            duplicate_po.po_number, 
            kept_po_id;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 2: Add unique constraint on po_number (case-insensitive, normalized)
-- ============================================================================
-- First, create a function to normalize po_number
CREATE OR REPLACE FUNCTION normalize_po_number(po_num TEXT)
RETURNS TEXT AS $$
BEGIN
    IF po_num IS NULL OR po_num = '' THEN
        RETURN NULL;
    END IF;
    RETURN LOWER(TRIM(po_num));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a unique index on normalized po_number for active orders
-- This prevents duplicate po_numbers for non-cancelled orders
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_orders_unique_po_number_active
ON purchase_orders (normalize_po_number(po_number))
WHERE po_number IS NOT NULL 
  AND po_number != ''
  AND status NOT IN ('cancelled', 'rejected', 'completed');

-- ============================================================================
-- STEP 3: Clean up duplicate delivery_requests for same purchase_order_id
-- (This should already be done by previous migration, but ensure it's clean)
-- ============================================================================
DO $$
DECLARE
    duplicate_dr RECORD;
    kept_dr_id UUID;
    cancelled_count INTEGER;
BEGIN
    -- Find all purchase_order_ids with multiple active delivery_requests
    FOR duplicate_dr IN
        SELECT purchase_order_id, COUNT(*) as count
        FROM delivery_requests
        WHERE purchase_order_id IS NOT NULL
          AND status IN ('pending', 'assigned', 'accepted', 'in_transit', 'picked_up', 'out_for_delivery', 'scheduled')
        GROUP BY purchase_order_id
        HAVING COUNT(*) > 1
    LOOP
        -- Get the most recent/active delivery_request for this purchase_order_id
        SELECT id INTO kept_dr_id
        FROM delivery_requests
        WHERE purchase_order_id = duplicate_dr.purchase_order_id
          AND status IN ('pending', 'assigned', 'accepted', 'in_transit', 'picked_up', 'out_for_delivery', 'scheduled')
        ORDER BY 
            CASE status
                WHEN 'accepted' THEN 5
                WHEN 'assigned' THEN 4
                WHEN 'in_transit' THEN 3
                WHEN 'picked_up' THEN 2
                WHEN 'pending' THEN 1
                ELSE 0
            END DESC,
            created_at DESC
        LIMIT 1;
        
        -- Cancel all other active delivery_requests for this purchase_order_id
        UPDATE delivery_requests
        SET 
            status = 'cancelled',
            rejection_reason = 'Duplicate delivery request - only one active request allowed per purchase order',
            updated_at = NOW()
        WHERE purchase_order_id = duplicate_dr.purchase_order_id
          AND id != kept_dr_id
          AND status IN ('pending', 'assigned', 'accepted', 'in_transit', 'picked_up', 'out_for_delivery', 'scheduled');
        
        GET DIAGNOSTICS cancelled_count = ROW_COUNT;
        
        RAISE NOTICE 'Cleaned up % duplicate delivery_request(s) for purchase_order_id %, kept: %', 
            cancelled_count, 
            duplicate_dr.purchase_order_id, 
            kept_dr_id;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 4: Ensure unique constraint on purchase_order_id for active delivery_requests
-- (This should already exist, but ensure it's in place)
-- ============================================================================
DROP INDEX IF EXISTS idx_delivery_requests_unique_active_po;
CREATE UNIQUE INDEX IF NOT EXISTS idx_delivery_requests_unique_active_po
ON delivery_requests(purchase_order_id)
WHERE purchase_order_id IS NOT NULL
  AND status IN ('pending', 'assigned', 'accepted', 'in_transit', 'picked_up', 'out_for_delivery', 'scheduled');

-- ============================================================================
-- STEP 5: Add trigger to prevent duplicate purchase_orders with same po_number
-- ============================================================================
CREATE OR REPLACE FUNCTION prevent_duplicate_po_number()
RETURNS TRIGGER AS $$
DECLARE
    v_existing_count INTEGER;
    v_normalized_po TEXT;
BEGIN
    -- Only check if po_number is provided
    IF NEW.po_number IS NOT NULL AND NEW.po_number != '' THEN
        v_normalized_po := normalize_po_number(NEW.po_number);
        
        -- Check if there's already an active purchase_order with this po_number
        SELECT COUNT(*) INTO v_existing_count
        FROM purchase_orders
        WHERE normalize_po_number(po_number) = v_normalized_po
          AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
          AND status NOT IN ('cancelled', 'rejected', 'completed');
        
        IF v_existing_count > 0 THEN
            RAISE EXCEPTION 'Duplicate purchase order: An active purchase order already exists with po_number "%". Each po_number must have only one purchase order.', NEW.po_number;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_prevent_duplicate_po_number ON purchase_orders;
CREATE TRIGGER trigger_prevent_duplicate_po_number
    BEFORE INSERT OR UPDATE ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION prevent_duplicate_po_number();

-- ============================================================================
-- STEP 6: Add trigger to prevent duplicate delivery_requests for same purchase_order_id
-- (This should already exist, but ensure it's in place)
-- ============================================================================
CREATE OR REPLACE FUNCTION prevent_duplicate_delivery_request()
RETURNS TRIGGER AS $$
DECLARE
    v_existing_count INTEGER;
BEGIN
    -- Only check if purchase_order_id is provided
    IF NEW.purchase_order_id IS NOT NULL THEN
        -- Check if there's already an active delivery_request for this purchase_order_id
        SELECT COUNT(*) INTO v_existing_count
        FROM delivery_requests
        WHERE purchase_order_id = NEW.purchase_order_id
          AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
          AND status IN ('pending', 'assigned', 'accepted', 'in_transit', 'picked_up', 'out_for_delivery', 'scheduled');
        
        IF v_existing_count > 0 THEN
            RAISE EXCEPTION 'Duplicate delivery request: An active delivery request already exists for purchase_order_id %. Each purchase order must have only one active delivery request.', NEW.purchase_order_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_prevent_duplicate_delivery_request ON delivery_requests;
CREATE TRIGGER trigger_prevent_duplicate_delivery_request
    BEFORE INSERT OR UPDATE ON delivery_requests
    FOR EACH ROW
    EXECUTE FUNCTION prevent_duplicate_delivery_request();

-- ============================================================================
-- STEP 7: Grant permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION normalize_po_number TO authenticated;
GRANT EXECUTE ON FUNCTION prevent_duplicate_po_number TO authenticated;
GRANT EXECUTE ON FUNCTION prevent_duplicate_delivery_request TO authenticated;

-- ============================================================================
-- Migration Complete
-- ============================================================================
SELECT 'Single purchase order per po_number and single delivery request per purchase_order_id enforcement completed!' AS result;

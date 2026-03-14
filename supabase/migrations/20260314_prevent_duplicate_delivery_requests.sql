-- ============================================================================
-- PREVENT DUPLICATE DELIVERY REQUESTS FOR SAME PURCHASE ORDER
-- This migration ensures only ONE active delivery request per purchase_order_id
-- ============================================================================

-- Step 1: Clean up any existing duplicate delivery_requests
-- Keep only the most recent one for each purchase_order_id with active status
DO $$
DECLARE
    duplicate_record RECORD;
    kept_id UUID;
BEGIN
    -- Find all purchase_order_ids with multiple active delivery_requests
    FOR duplicate_record IN
        SELECT purchase_order_id, COUNT(*) as count
        FROM delivery_requests
        WHERE purchase_order_id IS NOT NULL
          AND status IN ('pending', 'assigned', 'accepted', 'in_transit', 'picked_up', 'out_for_delivery')
        GROUP BY purchase_order_id
        HAVING COUNT(*) > 1
    LOOP
        -- Get the most recent delivery_request for this purchase_order_id
        SELECT id INTO kept_id
        FROM delivery_requests
        WHERE purchase_order_id = duplicate_record.purchase_order_id
          AND status IN ('pending', 'assigned', 'accepted', 'in_transit', 'picked_up', 'out_for_delivery')
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
            rejection_reason = 'Duplicate delivery request - replaced by newer request',
            updated_at = NOW()
        WHERE purchase_order_id = duplicate_record.purchase_order_id
          AND id != kept_id
          AND status IN ('pending', 'assigned', 'accepted', 'in_transit', 'picked_up', 'out_for_delivery');
        
        RAISE NOTICE 'Cleaned up % duplicate(s) for purchase_order_id %, kept: %', 
            duplicate_record.count - 1, 
            duplicate_record.purchase_order_id, 
            kept_id;
    END LOOP;
END $$;

-- Step 2: Create a partial unique index to prevent future duplicates
-- This ensures only ONE active delivery_request per purchase_order_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_delivery_requests_unique_active_po
ON delivery_requests(purchase_order_id)
WHERE purchase_order_id IS NOT NULL
  AND status IN ('pending', 'assigned', 'accepted', 'in_transit', 'picked_up', 'out_for_delivery', 'scheduled');

-- Step 3: Add a function to safely insert/update delivery requests
CREATE OR REPLACE FUNCTION upsert_delivery_request(
    p_builder_id UUID,
    p_purchase_order_id UUID,
    p_pickup_address TEXT,
    p_delivery_address TEXT,
    p_material_type TEXT,
    p_quantity INTEGER DEFAULT 1,
    p_pickup_date DATE DEFAULT CURRENT_DATE,
    p_preferred_time TEXT DEFAULT NULL,
    p_special_instructions TEXT DEFAULT NULL,
    p_budget_range TEXT DEFAULT NULL,
    p_weight_kg DECIMAL DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_existing_id UUID;
    v_result_id UUID;
BEGIN
    -- Check if an active delivery_request already exists for this purchase_order_id
    SELECT id INTO v_existing_id
    FROM delivery_requests
    WHERE purchase_order_id = p_purchase_order_id
      AND status IN ('pending', 'assigned', 'accepted', 'in_transit', 'picked_up', 'out_for_delivery', 'scheduled')
    LIMIT 1;
    
    IF v_existing_id IS NOT NULL THEN
        -- Update existing delivery_request instead of creating duplicate
        UPDATE delivery_requests
        SET 
            pickup_address = p_pickup_address,
            delivery_address = p_delivery_address,
            material_type = p_material_type,
            quantity = p_quantity,
            pickup_date = p_pickup_date,
            preferred_time = p_preferred_time,
            special_instructions = p_special_instructions,
            budget_range = p_budget_range,
            weight_kg = p_weight_kg,
            updated_at = NOW()
        WHERE id = v_existing_id;
        
        RETURN v_existing_id;
    ELSE
        -- Create new delivery_request
        INSERT INTO delivery_requests (
            builder_id,
            purchase_order_id,
            pickup_address,
            delivery_address,
            material_type,
            quantity,
            pickup_date,
            preferred_time,
            special_instructions,
            budget_range,
            weight_kg,
            status
        ) VALUES (
            p_builder_id,
            p_purchase_order_id,
            p_pickup_address,
            p_delivery_address,
            p_material_type,
            p_quantity,
            p_pickup_date,
            p_preferred_time,
            p_special_instructions,
            p_budget_range,
            p_weight_kg,
            'pending'
        )
        RETURNING id INTO v_result_id;
        
        RETURN v_result_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION upsert_delivery_request TO authenticated;

-- Step 4: Add a trigger to prevent duplicates at insert time
CREATE OR REPLACE FUNCTION prevent_duplicate_delivery_requests()
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
          AND id != NEW.id
          AND status IN ('pending', 'assigned', 'accepted', 'in_transit', 'picked_up', 'out_for_delivery', 'scheduled');
        
        IF v_existing_count > 0 THEN
            RAISE EXCEPTION 'Duplicate delivery request: An active delivery request already exists for purchase_order_id %', NEW.purchase_order_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_prevent_duplicate_delivery_requests ON delivery_requests;
CREATE TRIGGER trigger_prevent_duplicate_delivery_requests
    BEFORE INSERT ON delivery_requests
    FOR EACH ROW
    EXECUTE FUNCTION prevent_duplicate_delivery_requests();

SELECT 'Duplicate delivery request prevention migration completed successfully!' AS result;

-- ============================================================
-- CRITICAL FIX: Delivery Provider Communication
-- Run this in Supabase SQL Editor to fix supplier dashboard updates
-- ============================================================

-- Step 0: Ensure delivery provider columns exist in purchase_orders table
DO $$ 
BEGIN
    -- Delivery provider ID
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'delivery_provider_id') THEN
        ALTER TABLE purchase_orders ADD COLUMN delivery_provider_id UUID;
    END IF;
    
    -- Delivery provider name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'delivery_provider_name') THEN
        ALTER TABLE purchase_orders ADD COLUMN delivery_provider_name TEXT;
    END IF;
    
    -- Delivery provider phone
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'delivery_provider_phone') THEN
        ALTER TABLE purchase_orders ADD COLUMN delivery_provider_phone TEXT;
    END IF;
    
    -- Delivery status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'delivery_status') THEN
        ALTER TABLE purchase_orders ADD COLUMN delivery_status TEXT DEFAULT 'pending';
    END IF;
    
    -- Delivery assigned at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'delivery_assigned_at') THEN
        ALTER TABLE purchase_orders ADD COLUMN delivery_assigned_at TIMESTAMPTZ;
    END IF;
    
    -- Delivery accepted at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'delivery_accepted_at') THEN
        ALTER TABLE purchase_orders ADD COLUMN delivery_accepted_at TIMESTAMPTZ;
    END IF;
END $$;

-- Step 1: Update the trigger function to handle delivery provider acceptance
CREATE OR REPLACE FUNCTION public.update_order_in_transit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    po_id UUID;
    v_provider_name TEXT;
    v_provider_phone TEXT;
BEGIN
    -- When delivery request is accepted/assigned AND provider_id is set, update the linked purchase order
    IF NEW.provider_id IS NOT NULL 
       AND (NEW.status IN ('accepted', 'assigned') OR OLD.status IN ('accepted', 'assigned'))
       AND (OLD.provider_id IS NULL OR OLD.provider_id != NEW.provider_id OR OLD.status != NEW.status) THEN
        
        po_id := NEW.purchase_order_id;
        
        -- If purchase_order_id is null, try to find matching purchase_order
        IF po_id IS NULL THEN
            SELECT id INTO po_id
            FROM purchase_orders
            WHERE buyer_id = NEW.builder_id
              AND delivery_address IS NOT NULL
              AND (
                (NEW.delivery_address IS NOT NULL AND LOWER(TRIM(delivery_address)) = LOWER(TRIM(NEW.delivery_address)))
                OR ABS(EXTRACT(EPOCH FROM (created_at - NEW.created_at))) < 86400
              )
              AND (delivery_required = true OR delivery_required IS NULL)
              AND delivery_provider_id IS NULL
            ORDER BY created_at DESC
            LIMIT 1;
            
            -- If found, update the delivery_request with the purchase_order_id
            IF po_id IS NOT NULL THEN
                UPDATE delivery_requests
                SET purchase_order_id = po_id
                WHERE id = NEW.id;
            END IF;
        END IF;
        
        IF po_id IS NOT NULL THEN
            -- Get provider name and phone from profiles or delivery_providers
            BEGIN
                SELECT 
                    COALESCE(p.full_name, dp.provider_name, 'Delivery Provider'),
                    COALESCE(p.phone, dp.phone, NULL)
                INTO v_provider_name, v_provider_phone
                FROM profiles p
                FULL OUTER JOIN delivery_providers dp ON dp.id = NEW.provider_id
                WHERE (p.user_id = NEW.provider_id OR p.id = NEW.provider_id OR dp.id = NEW.provider_id)
                LIMIT 1;
            EXCEPTION WHEN OTHERS THEN
                v_provider_name := 'Delivery Provider';
                v_provider_phone := NULL;
            END;
            
            -- Update purchase order with delivery provider info
            UPDATE purchase_orders
            SET 
                delivery_provider_id = NEW.provider_id,
                delivery_provider_name = v_provider_name,
                delivery_provider_phone = COALESCE(v_provider_phone, delivery_provider_phone),
                delivery_status = CASE 
                    WHEN status = 'dispatched' THEN 'in_transit' 
                    WHEN NEW.status = 'accepted' OR NEW.status = 'assigned' THEN 'accepted'
                    ELSE delivery_status
                END,
                delivery_assigned_at = COALESCE(delivery_assigned_at, NOW()),
                delivery_accepted_at = CASE 
                    WHEN NEW.status = 'accepted' THEN COALESCE(delivery_accepted_at, NOW())
                    ELSE delivery_accepted_at
                END,
                updated_at = NOW()
            WHERE id = po_id;
            
            -- Log the status change (only if order_status_history table exists)
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.tables 
                          WHERE table_schema = 'public' AND table_name = 'order_status_history') THEN
                    INSERT INTO order_status_history (order_id, status, notes, created_at)
                    VALUES (po_id, 'accepted', 'Delivery provider accepted - ' || v_provider_name, NOW())
                    ON CONFLICT DO NOTHING;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                -- Table doesn't exist or other error, skip logging
                NULL;
            END;
            
            RAISE NOTICE 'Updated purchase_order % with delivery provider % (%)', po_id, v_provider_name, NEW.provider_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Step 2: Recreate the trigger
DROP TRIGGER IF EXISTS trigger_update_order_in_transit ON delivery_requests;
CREATE TRIGGER trigger_update_order_in_transit
    AFTER UPDATE OF status, provider_id ON delivery_requests
    FOR EACH ROW
    WHEN (
        (NEW.status IN ('accepted', 'assigned') AND NEW.provider_id IS NOT NULL)
        OR (NEW.provider_id IS NOT NULL AND (OLD.provider_id IS NULL OR OLD.provider_id != NEW.provider_id))
    )
    EXECUTE FUNCTION update_order_in_transit();

-- Step 3: Grant permissions
GRANT EXECUTE ON FUNCTION update_order_in_transit() TO authenticated;

-- Step 4: First, try to link delivery_requests to purchase_orders if purchase_order_id is null
UPDATE delivery_requests dr
SET purchase_order_id = po.id
FROM purchase_orders po
WHERE dr.purchase_order_id IS NULL
  AND dr.provider_id IS NOT NULL
  AND dr.status IN ('accepted', 'assigned')
  -- Match by builder_id and delivery address
  AND dr.builder_id = po.buyer_id
  AND (
    (dr.delivery_address IS NOT NULL AND po.delivery_address IS NOT NULL 
     AND LOWER(TRIM(dr.delivery_address)) = LOWER(TRIM(po.delivery_address)))
    OR ABS(EXTRACT(EPOCH FROM (dr.created_at - po.created_at))) < 86400
  )
  AND (po.delivery_provider_id IS NULL OR po.delivery_provider_id = dr.provider_id)
  AND (po.delivery_required = true OR po.delivery_required IS NULL);

-- Step 5: Fix existing delivery requests that were accepted but didn't update purchase_orders
UPDATE purchase_orders po
SET 
    delivery_provider_id = dr.provider_id,
    delivery_provider_name = COALESCE(
        (SELECT full_name FROM profiles WHERE user_id = dr.provider_id LIMIT 1),
        (SELECT provider_name FROM delivery_providers WHERE id = dr.provider_id LIMIT 1),
        'Delivery Provider'
    ),
    delivery_provider_phone = COALESCE(
        (SELECT phone FROM profiles WHERE user_id = dr.provider_id LIMIT 1),
        (SELECT phone FROM delivery_providers WHERE id = dr.provider_id LIMIT 1),
        po.delivery_provider_phone
    ),
    delivery_status = CASE 
        WHEN dr.status = 'accepted' THEN 'accepted'
        WHEN dr.status = 'assigned' THEN 'accepted'
        ELSE 'accepted'
    END,
    delivery_assigned_at = COALESCE(po.delivery_assigned_at, dr.accepted_at, dr.updated_at, NOW()),
    delivery_accepted_at = CASE 
        WHEN dr.status = 'accepted' THEN COALESCE(po.delivery_accepted_at, dr.accepted_at, NOW())
        ELSE po.delivery_accepted_at
    END,
    updated_at = NOW()
FROM delivery_requests dr
WHERE dr.purchase_order_id = po.id
  AND dr.provider_id IS NOT NULL
  AND dr.status IN ('accepted', 'assigned')
  AND (po.delivery_provider_id IS NULL OR po.delivery_provider_id != dr.provider_id);

-- Step 6: Show delivery_requests that still couldn't be linked (for manual review)
SELECT 
    dr.id as delivery_request_id,
    dr.builder_id,
    dr.purchase_order_id,
    dr.provider_id,
    dr.status as delivery_request_status,
    dr.delivery_address,
    dr.created_at as dr_created_at,
    '⚠️ Could not find matching purchase_order - may need manual linking' as issue
FROM delivery_requests dr
WHERE dr.provider_id IS NOT NULL 
  AND dr.status IN ('accepted', 'assigned')
  AND dr.purchase_order_id IS NULL
LIMIT 20;

-- Step 7: Verify the trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_order_in_transit';

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
    
    -- Tracking number (for client dashboard access)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'tracking_number') THEN
        ALTER TABLE purchase_orders ADD COLUMN tracking_number TEXT;
    END IF;
END $$;

-- Step 0.5: Clean up duplicate delivery_requests per purchase_order BEFORE creating unique index
-- Keep only the most recent or accepted delivery_request per purchase_order
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    -- Find and count duplicates
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT purchase_order_id, COUNT(*) as cnt
        FROM delivery_requests
        WHERE purchase_order_id IS NOT NULL
        GROUP BY purchase_order_id
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF duplicate_count > 0 THEN
        RAISE NOTICE 'Found % purchase_orders with duplicate delivery_requests. Cleaning up...', duplicate_count;
        
        -- Delete duplicates, keeping only the most recent or accepted one
        -- Use a CTE to identify which ones to keep, then delete the rest
        WITH duplicates_to_keep AS (
            SELECT DISTINCT ON (purchase_order_id) id
            FROM delivery_requests
            WHERE purchase_order_id IS NOT NULL
            ORDER BY purchase_order_id,
                     -- Prefer accepted/assigned over pending
                     CASE 
                         WHEN status IN ('accepted', 'assigned', 'in_transit') THEN 1
                         WHEN status = 'pending' THEN 2
                         ELSE 3
                     END,
                     -- Prefer ones with provider_id
                     CASE WHEN provider_id IS NOT NULL THEN 1 ELSE 2 END,
                     -- Prefer most recent
                     created_at DESC
        )
        DELETE FROM delivery_requests dr
        WHERE dr.purchase_order_id IS NOT NULL
          AND dr.id NOT IN (SELECT id FROM duplicates_to_keep);
        
        -- Also delete duplicates where purchase_order_id is NULL but they have same builder_id, delivery_address, and created within 1 hour
        -- This handles cases where purchase_order_id wasn't set but they're clearly duplicates
        WITH null_po_duplicates AS (
            SELECT DISTINCT ON (builder_id, delivery_address, DATE_TRUNC('hour', created_at)) id
            FROM delivery_requests
            WHERE purchase_order_id IS NULL
              AND builder_id IS NOT NULL
              AND delivery_address IS NOT NULL
              AND status = 'pending'
            ORDER BY builder_id, 
                     delivery_address, 
                     DATE_TRUNC('hour', created_at),
                     created_at DESC
        )
        DELETE FROM delivery_requests dr
        WHERE dr.purchase_order_id IS NULL
          AND dr.builder_id IS NOT NULL
          AND dr.delivery_address IS NOT NULL
          AND dr.status = 'pending'
          AND dr.id NOT IN (SELECT id FROM null_po_duplicates);
        
        RAISE NOTICE 'Cleaned up duplicate delivery_requests';
    ELSE
        RAISE NOTICE 'No duplicate delivery_requests found';
    END IF;
END $$;

-- Step 0.6: AGGRESSIVE cleanup - Delete ALL duplicates, keep only ONE per purchase_order
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete duplicates for purchase_orders with purchase_order_id set
    WITH ranked_requests AS (
        SELECT 
            id,
            purchase_order_id,
            ROW_NUMBER() OVER (
                PARTITION BY purchase_order_id 
                ORDER BY 
                    CASE WHEN status IN ('accepted', 'assigned', 'in_transit') THEN 1 ELSE 2 END,
                    CASE WHEN provider_id IS NOT NULL THEN 1 ELSE 2 END,
                    created_at DESC
            ) as rn
        FROM delivery_requests
        WHERE purchase_order_id IS NOT NULL
    )
    DELETE FROM delivery_requests
    WHERE id IN (
        SELECT id FROM ranked_requests WHERE rn > 1
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % duplicate delivery_requests with purchase_order_id', deleted_count;
    
    -- Also delete duplicates where purchase_order_id is NULL but they match on builder_id + delivery_address + same hour
    WITH null_po_ranked AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY builder_id, delivery_address, DATE_TRUNC('hour', created_at)
                ORDER BY created_at DESC
            ) as rn
        FROM delivery_requests
        WHERE purchase_order_id IS NULL
          AND builder_id IS NOT NULL
          AND delivery_address IS NOT NULL
          AND status = 'pending'
    )
    DELETE FROM delivery_requests
    WHERE id IN (
        SELECT id FROM null_po_ranked WHERE rn > 1
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % duplicate delivery_requests with NULL purchase_order_id', deleted_count;
END $$;

-- Step 0.7: Create trigger to PREVENT duplicates at database level
CREATE OR REPLACE FUNCTION prevent_duplicate_delivery_requests()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    existing_count INTEGER;
BEGIN
    -- If purchase_order_id is set, check for existing delivery_request
    IF NEW.purchase_order_id IS NOT NULL THEN
        SELECT COUNT(*) INTO existing_count
        FROM delivery_requests
        WHERE purchase_order_id = NEW.purchase_order_id
          AND id != NEW.id  -- Exclude current row if updating
          AND status IN ('pending', 'accepted', 'assigned', 'in_transit');
        
        IF existing_count > 0 THEN
            RAISE EXCEPTION 'Duplicate delivery request: A delivery request already exists for purchase_order_id %', NEW.purchase_order_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_prevent_duplicate_delivery_requests ON delivery_requests;

-- Create trigger BEFORE INSERT or UPDATE
CREATE TRIGGER trigger_prevent_duplicate_delivery_requests
    BEFORE INSERT OR UPDATE ON delivery_requests
    FOR EACH ROW
    EXECUTE FUNCTION prevent_duplicate_delivery_requests();

-- Step 0.8: Create unique index (after cleanup)
DO $$
BEGIN
    DROP INDEX IF EXISTS unique_delivery_request_per_purchase_order;
    CREATE UNIQUE INDEX unique_delivery_request_per_purchase_order 
    ON delivery_requests(purchase_order_id) 
    WHERE purchase_order_id IS NOT NULL AND status IN ('pending', 'accepted', 'assigned', 'in_transit');
    
    RAISE NOTICE 'Created unique index and trigger to prevent duplicate delivery_requests';
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
        -- Match by: builder_id, delivery_address, and creation date proximity
        IF po_id IS NULL AND NEW.builder_id IS NOT NULL THEN
            SELECT id INTO po_id
            FROM purchase_orders
            WHERE buyer_id = NEW.builder_id
              AND delivery_address IS NOT NULL
              AND (
                -- Match by exact delivery address
                (NEW.delivery_address IS NOT NULL AND LOWER(TRIM(delivery_address)) = LOWER(TRIM(NEW.delivery_address)))
                -- OR match by creation date within 24 hours (same order flow)
                OR (ABS(EXTRACT(EPOCH FROM (created_at - NEW.created_at))) < 86400)
              )
              AND (delivery_required = true OR delivery_required IS NULL)
              AND (delivery_provider_id IS NULL OR delivery_provider_id = NEW.provider_id)
              AND status NOT IN ('cancelled', 'rejected')
            ORDER BY 
              -- Prefer exact address matches
              CASE WHEN NEW.delivery_address IS NOT NULL AND LOWER(TRIM(delivery_address)) = LOWER(TRIM(NEW.delivery_address)) THEN 1 ELSE 2 END,
              created_at DESC
            LIMIT 1;
            
            -- If found, update the delivery_request with the purchase_order_id for future reference
            IF po_id IS NOT NULL THEN
                BEGIN
                    UPDATE delivery_requests
                    SET purchase_order_id = po_id
                    WHERE id = NEW.id;
                EXCEPTION WHEN OTHERS THEN
                    -- If update fails, continue anyway - we still have po_id
                    NULL;
                END;
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
            
            -- Update purchase order with delivery provider info AND tracking number
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
                tracking_number = COALESCE(NEW.tracking_number, tracking_number), -- Store tracking number in purchase_orders for client access
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

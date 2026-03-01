-- ============================================================
-- FINAL FIX: Stop Duplicate Notifications
-- This script aggressively removes duplicates and prevents future ones
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Find and report all duplicates
DO $$
DECLARE
    duplicate_count INTEGER;
    duplicate_details RECORD;
BEGIN
    RAISE NOTICE '=== CHECKING FOR DUPLICATES ===';
    
    -- Check for duplicates by purchase_order_id
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT purchase_order_id, COUNT(*) as cnt
        FROM delivery_requests
        WHERE purchase_order_id IS NOT NULL
          AND status IN ('pending', 'accepted', 'assigned', 'in_transit')
        GROUP BY purchase_order_id
        HAVING COUNT(*) > 1
    ) duplicates;
    
    RAISE NOTICE 'Found % purchase_orders with duplicate delivery_requests', duplicate_count;
    
    -- Show details of duplicates
    FOR duplicate_details IN
        SELECT purchase_order_id, COUNT(*) as cnt, 
               array_agg(id ORDER BY created_at DESC) as dr_ids,
               array_agg(status ORDER BY created_at DESC) as statuses
        FROM delivery_requests
        WHERE purchase_order_id IS NOT NULL
          AND status IN ('pending', 'accepted', 'assigned', 'in_transit')
        GROUP BY purchase_order_id
        HAVING COUNT(*) > 1
        LIMIT 10
    LOOP
        RAISE NOTICE 'PO % has % delivery_requests: IDs=%, Statuses=%', 
            duplicate_details.purchase_order_id, 
            duplicate_details.cnt,
            duplicate_details.dr_ids,
            duplicate_details.statuses;
    END LOOP;
END $$;

-- Step 2: AGGRESSIVE CLEANUP - Delete ALL duplicates, keeping only the BEST one per purchase_order_id
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    RAISE NOTICE '=== CLEANING UP DUPLICATES ===';
    
    -- Delete duplicates by purchase_order_id, keeping the best one
    WITH duplicates_to_keep AS (
        SELECT DISTINCT ON (purchase_order_id) id
        FROM delivery_requests
        WHERE purchase_order_id IS NOT NULL
          AND status IN ('pending', 'accepted', 'assigned', 'in_transit')
        ORDER BY purchase_order_id,
                 -- Prefer accepted/assigned/in_transit over pending
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
      AND dr.status IN ('pending', 'accepted', 'assigned', 'in_transit')
      AND dr.id NOT IN (SELECT id FROM duplicates_to_keep);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % duplicate delivery_requests by purchase_order_id', deleted_count;
    
    -- Also delete duplicates where purchase_order_id is NULL but they match by address + material + same hour
    WITH null_po_duplicates AS (
        SELECT DISTINCT ON (
            COALESCE(builder_id::text, 'no-builder'),
            LOWER(TRIM(COALESCE(delivery_address, ''))),
            LOWER(TRIM(COALESCE(material_type, ''))),
            DATE_TRUNC('hour', created_at)
        ) id
        FROM delivery_requests
        WHERE purchase_order_id IS NULL
          AND status IN ('pending', 'accepted', 'assigned', 'in_transit')
          AND builder_id IS NOT NULL
          AND delivery_address IS NOT NULL
          AND material_type IS NOT NULL
        ORDER BY 
            COALESCE(builder_id::text, 'no-builder'),
            LOWER(TRIM(COALESCE(delivery_address, ''))),
            LOWER(TRIM(COALESCE(material_type, ''))),
            DATE_TRUNC('hour', created_at),
            -- Prefer accepted/assigned
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
    WHERE dr.purchase_order_id IS NULL
      AND dr.status IN ('pending', 'accepted', 'assigned', 'in_transit')
      AND dr.builder_id IS NOT NULL
      AND dr.delivery_address IS NOT NULL
      AND dr.material_type IS NOT NULL
      AND dr.id NOT IN (SELECT id FROM null_po_duplicates);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % duplicate delivery_requests with NULL purchase_order_id', deleted_count;
END $$;

-- Step 3: Ensure unique index exists (prevents future duplicates)
DO $$
BEGIN
    -- Drop existing index if it exists
    DROP INDEX IF EXISTS unique_delivery_request_per_purchase_order;
    
    -- Create unique partial index to prevent duplicates
    CREATE UNIQUE INDEX unique_delivery_request_per_purchase_order 
    ON delivery_requests(purchase_order_id) 
    WHERE purchase_order_id IS NOT NULL 
      AND status IN ('pending', 'accepted', 'assigned', 'in_transit');
    
    RAISE NOTICE 'Created unique index to prevent future duplicates';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not create unique index: %', SQLERRM;
END $$;

-- Step 4: Verify cleanup
DO $$
DECLARE
    remaining_duplicates INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_duplicates
    FROM (
        SELECT purchase_order_id, COUNT(*) as cnt
        FROM delivery_requests
        WHERE purchase_order_id IS NOT NULL
          AND status IN ('pending', 'accepted', 'assigned', 'in_transit')
        GROUP BY purchase_order_id
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF remaining_duplicates = 0 THEN
        RAISE NOTICE '✅ SUCCESS: No duplicates remaining!';
    ELSE
        RAISE NOTICE '⚠️ WARNING: Still found % purchase_orders with duplicates', remaining_duplicates;
    END IF;
END $$;

-- ============================================================
-- COMPLETE
-- ============================================================

-- ============================================================
-- AGGRESSIVE DUPLICATE CLEANUP - Run this FIRST
-- This will remove ALL duplicates, keeping only ONE per purchase_order_id
-- ============================================================

-- Step 1: Show what will be deleted
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    RAISE NOTICE '=== CHECKING FOR DUPLICATES ===';
    
    -- Count duplicates by purchase_order_id
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT purchase_order_id
        FROM delivery_requests
        WHERE purchase_order_id IS NOT NULL
          AND status IN ('pending', 'accepted', 'assigned', 'in_transit')
        GROUP BY purchase_order_id
        HAVING COUNT(*) > 1
    ) duplicates;
    
    RAISE NOTICE 'Found % purchase_orders with duplicate delivery_requests', duplicate_count;
END $$;

-- Step 2: DELETE ALL duplicates, keeping only the BEST one per purchase_order_id
-- This is the most aggressive cleanup - it will remove ALL duplicates
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

-- Step 3: Also clean up NULL purchase_order_id duplicates
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

-- Step 4: Verify cleanup
DO $$
DECLARE
    remaining_duplicates INTEGER;
    total_delivery_requests INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_duplicates
    FROM (
        SELECT purchase_order_id
        FROM delivery_requests
        WHERE purchase_order_id IS NOT NULL
          AND status IN ('pending', 'accepted', 'assigned', 'in_transit')
        GROUP BY purchase_order_id
        HAVING COUNT(*) > 1
    ) duplicates;
    
    SELECT COUNT(*) INTO total_delivery_requests
    FROM delivery_requests
    WHERE status IN ('pending', 'accepted', 'assigned', 'in_transit');
    
    IF remaining_duplicates = 0 THEN
        RAISE NOTICE '✅ SUCCESS: No duplicates remaining!';
        RAISE NOTICE '📊 Total delivery_requests: %', total_delivery_requests;
    ELSE
        RAISE NOTICE '⚠️ WARNING: Still found % purchase_orders with duplicates', remaining_duplicates;
    END IF;
END $$;

-- Step 5: Ensure unique index exists
DO $$
BEGIN
    -- Drop existing index if it exists
    DROP INDEX IF EXISTS unique_delivery_request_per_purchase_order;
    
    -- Create unique partial index to prevent future duplicates
    CREATE UNIQUE INDEX unique_delivery_request_per_purchase_order 
    ON delivery_requests(purchase_order_id) 
    WHERE purchase_order_id IS NOT NULL 
      AND status IN ('pending', 'accepted', 'assigned', 'in_transit');
    
    RAISE NOTICE '✅ Created unique index to prevent future duplicates';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE '⚠️ Could not create unique index: %', SQLERRM;
END $$;

-- ============================================================
-- COMPLETE - Refresh your dashboard now!
-- ============================================================

-- ============================================================
-- DELETE ALL DUPLICATE DELIVERY REQUESTS
-- 
-- This migration will:
-- 1. Delete duplicates based on purchase_order_id (keep the oldest)
-- 2. Delete duplicates based on composite key (delivery_address + material_type) when purchase_order_id is NULL
-- 3. Delete duplicates where delivery_request.id = purchase_order_id (data corruption)
-- 
-- Created: March 16, 2026
-- ============================================================

DO $$
DECLARE
  duplicate_rec RECORD;
  deleted_count INTEGER := 0;
  total_deleted INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DELETING ALL DUPLICATE DELIVERY REQUESTS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- STEP 1: Delete duplicates by purchase_order_id (keep the oldest one)
  RAISE NOTICE 'STEP 1: Deleting duplicates by purchase_order_id...';
  
  FOR duplicate_rec IN
    WITH duplicates AS (
      SELECT 
        purchase_order_id,
        id,
        created_at,
        ROW_NUMBER() OVER (PARTITION BY purchase_order_id ORDER BY created_at ASC) as rn
      FROM delivery_requests
      WHERE purchase_order_id IS NOT NULL
        AND status IN ('pending', 'assigned', 'requested')
    )
    SELECT id, purchase_order_id, created_at
    FROM duplicates
    WHERE rn > 1
  LOOP
    DELETE FROM delivery_requests WHERE id = duplicate_rec.id;
    deleted_count := deleted_count + 1;
    RAISE NOTICE '  ✅ Deleted duplicate: ID=%, purchase_order_id=%, created=%', 
      duplicate_rec.id, duplicate_rec.purchase_order_id, duplicate_rec.created_at;
  END LOOP;
  
  total_deleted := total_deleted + deleted_count;
  RAISE NOTICE '  Total deleted in STEP 1: %', deleted_count;
  RAISE NOTICE '';
  
  -- STEP 2: Delete duplicates by composite key (delivery_address + material_type) when purchase_order_id is NULL
  RAISE NOTICE 'STEP 2: Deleting duplicates by composite key (address + material_type) where purchase_order_id is NULL...';
  deleted_count := 0;
  
  FOR duplicate_rec IN
    WITH duplicates AS (
      SELECT 
        LOWER(TRIM(delivery_address)) as normalized_address,
        CASE 
          WHEN LOWER(TRIM(material_type)) LIKE '%steel%' OR 
               LOWER(TRIM(material_type)) LIKE '%construction%' OR 
               LOWER(TRIM(material_type)) LIKE '%material%' 
          THEN 'construction_materials'
          ELSE LOWER(TRIM(material_type))
        END as normalized_material,
        id,
        created_at,
        ROW_NUMBER() OVER (
          PARTITION BY 
            LOWER(TRIM(delivery_address)),
            CASE 
              WHEN LOWER(TRIM(material_type)) LIKE '%steel%' OR 
                   LOWER(TRIM(material_type)) LIKE '%construction%' OR 
                   LOWER(TRIM(material_type)) LIKE '%material%' 
              THEN 'construction_materials'
              ELSE LOWER(TRIM(material_type))
            END
          ORDER BY created_at ASC
        ) as rn
      FROM delivery_requests
      WHERE purchase_order_id IS NULL
        AND status IN ('pending', 'assigned', 'requested')
        AND delivery_address IS NOT NULL
        AND material_type IS NOT NULL
    )
    SELECT id, normalized_address, normalized_material, created_at
    FROM duplicates
    WHERE rn > 1
  LOOP
    DELETE FROM delivery_requests WHERE id = duplicate_rec.id;
    deleted_count := deleted_count + 1;
    RAISE NOTICE '  ✅ Deleted duplicate: ID=%, address=%, material=%, created=%', 
      duplicate_rec.id, duplicate_rec.normalized_address, duplicate_rec.normalized_material, duplicate_rec.created_at;
  END LOOP;
  
  total_deleted := total_deleted + deleted_count;
  RAISE NOTICE '  Total deleted in STEP 2: %', deleted_count;
  RAISE NOTICE '';
  
  -- STEP 3: Delete delivery_requests where id = purchase_order_id (data corruption)
  RAISE NOTICE 'STEP 3: Deleting delivery_requests where id = purchase_order_id (data corruption)...';
  deleted_count := 0;
  
  FOR duplicate_rec IN
    SELECT id, purchase_order_id, status, created_at
    FROM delivery_requests
    WHERE id = purchase_order_id
  LOOP
    DELETE FROM delivery_requests WHERE id = duplicate_rec.id;
    deleted_count := deleted_count + 1;
    RAISE NOTICE '  ✅ Deleted corrupted record: ID=%, purchase_order_id=%, status=%, created=%', 
      duplicate_rec.id, duplicate_rec.purchase_order_id, duplicate_rec.status, duplicate_rec.created_at;
  END LOOP;
  
  total_deleted := total_deleted + deleted_count;
  RAISE NOTICE '  Total deleted in STEP 3: %', deleted_count;
  RAISE NOTICE '';
  
  -- STEP 4: Delete delivery_requests where id is used as purchase_order_id by another delivery_request (circular references)
  RAISE NOTICE 'STEP 4: Deleting delivery_requests where id is used as purchase_order_id by another delivery_request (circular references)...';
  deleted_count := 0;
  
  -- First, delete the delivery_requests that reference other delivery_request IDs as purchase_order_id
  FOR duplicate_rec IN
    SELECT dr2.id, dr2.purchase_order_id, dr2.status, dr2.created_at, dr1.id as referenced_dr_id
    FROM delivery_requests dr1
    INNER JOIN delivery_requests dr2 ON dr2.purchase_order_id = dr1.id
    WHERE dr2.id != dr1.id
      AND dr1.id != dr1.purchase_order_id
  LOOP
    -- Delete the referencing delivery_request (the one that uses another delivery_request.id as purchase_order_id)
    DELETE FROM delivery_requests WHERE id = duplicate_rec.id;
    deleted_count := deleted_count + 1;
    RAISE NOTICE '  ✅ Deleted circular reference: ID=% uses delivery_request.id % as purchase_order_id, status=%, created=%', 
      duplicate_rec.id, duplicate_rec.referenced_dr_id, duplicate_rec.status, duplicate_rec.created_at;
    
    -- Also delete associated tracking_numbers
    DELETE FROM tracking_numbers WHERE delivery_request_id = duplicate_rec.id;
  END LOOP;
  
  -- Then, delete the delivery_requests whose IDs are being used as purchase_order_id (if they're corrupted)
  FOR duplicate_rec IN
    SELECT dr1.id, dr1.purchase_order_id, dr1.status, dr1.created_at
    FROM delivery_requests dr1
    WHERE EXISTS (
      SELECT 1 
      FROM delivery_requests dr2 
      WHERE dr2.purchase_order_id = dr1.id
        AND dr2.id != dr1.id
    )
    AND dr1.id != dr1.purchase_order_id
    AND dr1.status IN ('pending', 'assigned', 'requested') -- Only delete if still active
  LOOP
    DELETE FROM delivery_requests WHERE id = duplicate_rec.id;
    deleted_count := deleted_count + 1;
    RAISE NOTICE '  ✅ Deleted corrupted record (ID used as purchase_order_id): ID=%, purchase_order_id=%, status=%, created=%', 
      duplicate_rec.id, duplicate_rec.purchase_order_id, duplicate_rec.status, duplicate_rec.created_at;
    
    -- Also delete associated tracking_numbers
    DELETE FROM tracking_numbers WHERE delivery_request_id = duplicate_rec.id;
  END LOOP;
  
  total_deleted := total_deleted + deleted_count;
  RAISE NOTICE '  Total deleted in STEP 4: %', deleted_count;
  RAISE NOTICE '';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TOTAL DELETED: % duplicate delivery_requests', total_deleted;
  RAISE NOTICE '========================================';
END $$;

-- Verify no duplicates remain
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICATION: Checking for remaining duplicates...';
  RAISE NOTICE '========================================';
  
  -- Check for duplicates by purchase_order_id
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT purchase_order_id, COUNT(*) as cnt
    FROM delivery_requests
    WHERE purchase_order_id IS NOT NULL
      AND status IN ('pending', 'assigned', 'requested')
    GROUP BY purchase_order_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE WARNING '⚠️ WARNING: % duplicate groups still exist by purchase_order_id!', duplicate_count;
  ELSE
    RAISE NOTICE '✅ No duplicates by purchase_order_id found';
  END IF;
  
  -- Check for duplicates by composite key
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT 
      LOWER(TRIM(delivery_address)) as normalized_address,
      CASE 
        WHEN LOWER(TRIM(material_type)) LIKE '%steel%' OR 
             LOWER(TRIM(material_type)) LIKE '%construction%' OR 
             LOWER(TRIM(material_type)) LIKE '%material%' 
        THEN 'construction_materials'
        ELSE LOWER(TRIM(material_type))
      END as normalized_material,
      COUNT(*) as cnt
    FROM delivery_requests
    WHERE purchase_order_id IS NULL
      AND status IN ('pending', 'assigned', 'requested')
      AND delivery_address IS NOT NULL
      AND material_type IS NOT NULL
    GROUP BY 
      LOWER(TRIM(delivery_address)),
      CASE 
        WHEN LOWER(TRIM(material_type)) LIKE '%steel%' OR 
             LOWER(TRIM(material_type)) LIKE '%construction%' OR 
             LOWER(TRIM(material_type)) LIKE '%material%' 
        THEN 'construction_materials'
        ELSE LOWER(TRIM(material_type))
      END
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE WARNING '⚠️ WARNING: % duplicate groups still exist by composite key!', duplicate_count;
  ELSE
    RAISE NOTICE '✅ No duplicates by composite key found';
  END IF;
  
  -- Check for data corruption (id = purchase_order_id)
  SELECT COUNT(*) INTO duplicate_count
  FROM delivery_requests
  WHERE id = purchase_order_id;
  
  IF duplicate_count > 0 THEN
    RAISE WARNING '⚠️ WARNING: % corrupted records still exist (id = purchase_order_id)!', duplicate_count;
  ELSE
    RAISE NOTICE '✅ No corrupted records found (id = purchase_order_id)';
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Verification complete';
  RAISE NOTICE '========================================';
END $$;

-- ============================================================
-- PREVENT DUPLICATE DELIVERY REQUESTS AT DATABASE LEVEL
-- 
-- This migration will:
-- 1. Create a unique partial index on purchase_order_id for pending/assigned/requested statuses
-- 2. Create a unique partial index on composite key (delivery_address + material_type) when purchase_order_id is NULL
-- 3. Create a trigger function to prevent duplicates before INSERT/UPDATE
-- 
-- Created: March 16, 2026
-- ============================================================

DO $$
BEGIN
  -- Drop existing indexes if they exist
  DROP INDEX IF EXISTS idx_unique_delivery_request_by_po_id;
  DROP INDEX IF EXISTS idx_unique_delivery_request_by_composite_key;
  
  RAISE NOTICE '✅ Dropped existing indexes if they existed';
END $$;

-- STEP 1: Create unique partial index on purchase_order_id for active statuses
-- This prevents multiple pending/assigned/requested delivery_requests for the same purchase_order_id
CREATE UNIQUE INDEX idx_unique_delivery_request_by_po_id
ON delivery_requests (purchase_order_id)
WHERE purchase_order_id IS NOT NULL
  AND status IN ('pending', 'assigned', 'requested');

DO $$
BEGIN
  RAISE NOTICE '✅ Created unique index on purchase_order_id for active statuses';
END $$;

-- STEP 2: Create a function to normalize material types (required for index)
CREATE OR REPLACE FUNCTION normalize_material_type_for_index(material_type TEXT)
RETURNS TEXT AS $$
BEGIN
  IF material_type IS NULL THEN
    RETURN '';
  END IF;
  
  IF LOWER(TRIM(material_type)) LIKE '%steel%' OR 
     LOWER(TRIM(material_type)) LIKE '%construction%' OR 
     LOWER(TRIM(material_type)) LIKE '%material%' THEN
    RETURN 'construction_materials';
  END IF;
  
  RETURN LOWER(TRIM(material_type));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- STEP 3: Create unique partial index on composite key (delivery_address + material_type) when purchase_order_id is NULL
-- This prevents multiple pending/assigned/requested delivery_requests with the same address + material when purchase_order_id is missing
CREATE UNIQUE INDEX idx_unique_delivery_request_by_composite_key
ON delivery_requests (
  LOWER(TRIM(delivery_address)),
  normalize_material_type_for_index(material_type)
)
WHERE purchase_order_id IS NULL
  AND status IN ('pending', 'assigned', 'requested')
  AND delivery_address IS NOT NULL
  AND material_type IS NOT NULL;

DO $$
BEGIN
  RAISE NOTICE '✅ Created unique index on composite key (address + material_type) for active statuses when purchase_order_id is NULL';
END $$;

-- STEP 4: Create trigger function to prevent duplicates with better error messages
CREATE OR REPLACE FUNCTION prevent_duplicate_delivery_requests()
RETURNS TRIGGER AS $$
DECLARE
  existing_count INTEGER;
  normalized_address TEXT;
  normalized_material TEXT;
BEGIN
  -- Normalize address and material type (same logic as frontend)
  normalized_address := LOWER(TRIM(NEW.delivery_address));
  normalized_material := normalize_material_type_for_index(NEW.material_type);
  
  -- Only check for duplicates if status is active
  IF NEW.status IN ('pending', 'assigned', 'requested') THEN
    -- Check 1: If purchase_order_id exists, check for duplicates by purchase_order_id
    IF NEW.purchase_order_id IS NOT NULL THEN
      SELECT COUNT(*) INTO existing_count
      FROM delivery_requests
      WHERE purchase_order_id = NEW.purchase_order_id
        AND status IN ('pending', 'assigned', 'requested')
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);
      
      IF existing_count > 0 THEN
        RAISE EXCEPTION 'Duplicate delivery request: A pending/assigned/requested delivery request already exists for purchase_order_id %. Only one active delivery request is allowed per order.', NEW.purchase_order_id;
      END IF;
    END IF;
    
    -- Check 2: If purchase_order_id is NULL, check for duplicates by composite key
    IF NEW.purchase_order_id IS NULL AND NEW.delivery_address IS NOT NULL AND NEW.material_type IS NOT NULL THEN
      SELECT COUNT(*) INTO existing_count
      FROM delivery_requests
      WHERE purchase_order_id IS NULL
        AND status IN ('pending', 'assigned', 'requested')
        AND LOWER(TRIM(delivery_address)) = normalized_address
        AND normalize_material_type_for_index(material_type) = normalized_material
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);
      
      IF existing_count > 0 THEN
        RAISE EXCEPTION 'Duplicate delivery request: A pending/assigned/requested delivery request already exists with the same delivery address (%) and material type (%). Only one active delivery request is allowed for the same address and material when purchase_order_id is missing.', NEW.delivery_address, NEW.material_type;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_prevent_duplicate_delivery_requests ON delivery_requests;

-- Create the trigger
CREATE TRIGGER trigger_prevent_duplicate_delivery_requests
BEFORE INSERT OR UPDATE ON delivery_requests
FOR EACH ROW
EXECUTE FUNCTION prevent_duplicate_delivery_requests();

DO $$
BEGIN
  RAISE NOTICE '✅ Created trigger to prevent duplicate delivery requests';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Database-level duplicate prevention enabled';
  RAISE NOTICE '========================================';
  RAISE NOTICE '1. Unique index on purchase_order_id for active statuses';
  RAISE NOTICE '2. Unique index on composite key (address + material_type) when purchase_order_id is NULL';
  RAISE NOTICE '3. Trigger function to prevent duplicates with clear error messages';
  RAISE NOTICE '========================================';
END $$;

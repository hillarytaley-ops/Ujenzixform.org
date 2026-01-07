-- ╔══════════════════════════════════════════════════════════════════════════════════════╗
-- ║                                                                                      ║
-- ║   🔒 PROTECTED MIGRATION - REMOVE DUPLICATE MATERIALS                                ║
-- ║                                                                                      ║
-- ║   DATE: December 25, 2025                                                            ║
-- ║   PURPOSE: Remove duplicate materials from the database                              ║
-- ║            Keep only the most recent entry for each unique material name per supplier║
-- ║                                                                                      ║
-- ╚══════════════════════════════════════════════════════════════════════════════════════╝

-- First, let's identify and remove duplicates
-- Keep the most recently created material for each (name, supplier_id) combination

-- Delete duplicate materials, keeping only the most recent one
DELETE FROM materials
WHERE id NOT IN (
  SELECT DISTINCT ON (LOWER(name), supplier_id) id
  FROM materials
  ORDER BY LOWER(name), supplier_id, created_at DESC
);

-- Log the cleanup result
DO $$
DECLARE
  material_count INTEGER;
  unique_names INTEGER;
BEGIN
  SELECT COUNT(*) INTO material_count FROM materials;
  SELECT COUNT(DISTINCT LOWER(name)) INTO unique_names FROM materials;
  RAISE NOTICE 'Total materials after cleanup: %, Unique names: %', material_count, unique_names;
END $$;









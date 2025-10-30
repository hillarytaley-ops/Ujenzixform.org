-- ================================================================
-- DIAGNOSTIC SCRIPT FOR MATERIALS TABLE
-- ================================================================
-- Run this to check if the materials table is properly set up
-- Copy the output and share it to help diagnose the issue
-- ================================================================

-- Check 1: Does the materials table exist?
-- ================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'materials'
  ) THEN
    RAISE NOTICE '✓ Materials table EXISTS';
  ELSE
    RAISE WARNING '✗ Materials table DOES NOT EXIST - this is the problem!';
  END IF;
END $$;

-- Check 2: What columns does the materials table have?
-- ================================================================
SELECT 
  '✓ Materials table columns:' as status,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'materials'
ORDER BY ordinal_position;

-- Check 3: Is RLS enabled?
-- ================================================================
SELECT 
  CASE 
    WHEN relrowsecurity THEN '✓ RLS is ENABLED on materials table'
    ELSE '✗ RLS is NOT ENABLED on materials table'
  END as rls_status
FROM pg_class 
WHERE relname = 'materials' 
  AND relnamespace = 'public'::regnamespace;

-- Check 4: What policies exist?
-- ================================================================
SELECT 
  '✓ RLS Policies on materials table:' as info,
  policyname as policy_name,
  cmd as command,
  CASE 
    WHEN roles = '{public}' THEN 'public'
    WHEN roles = '{authenticated}' THEN 'authenticated'
    ELSE array_to_string(roles, ', ')
  END as applies_to
FROM pg_policies
WHERE tablename = 'materials';

-- Check 5: How many materials are in the table?
-- ================================================================
DO $$
DECLARE
  material_count INTEGER;
BEGIN
  -- Check if table exists first
  IF EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'materials'
  ) THEN
    SELECT COUNT(*) INTO material_count FROM public.materials;
    RAISE NOTICE '✓ Materials count: %', material_count;
    
    IF material_count = 0 THEN
      RAISE WARNING '⚠ Materials table is EMPTY - no demo data!';
    END IF;
  ELSE
    RAISE WARNING '✗ Cannot count materials - table does not exist!';
  END IF;
END $$;

-- Check 6: Show first 5 materials (if any)
-- ================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'materials'
  ) THEN
    RAISE NOTICE '✓ Showing first 5 materials:';
  END IF;
END $$;

SELECT 
  id,
  name,
  category,
  unit_price,
  in_stock,
  supplier_id
FROM public.materials
LIMIT 5;

-- Check 7: Test if you can read materials as anonymous user
-- ================================================================
DO $$
BEGIN
  -- This simulates what happens when the app tries to fetch materials
  IF EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'materials' 
    AND policyname = 'materials_public_read'
  ) THEN
    RAISE NOTICE '✓ Public read policy EXISTS for materials';
  ELSE
    RAISE WARNING '✗ Public read policy MISSING - this could block access!';
  END IF;
END $$;

-- Check 8: Summary and Recommendations
-- ================================================================
DO $$
DECLARE
  table_exists BOOLEAN;
  rls_enabled BOOLEAN;
  material_count INTEGER := 0;
  policy_count INTEGER := 0;
BEGIN
  -- Check table exists
  SELECT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'materials'
  ) INTO table_exists;
  
  -- Check RLS
  IF table_exists THEN
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class 
    WHERE relname = 'materials' 
    AND relnamespace = 'public'::regnamespace;
    
    -- Count materials
    SELECT COUNT(*) INTO material_count FROM public.materials;
    
    -- Count policies
    SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE tablename = 'materials';
  END IF;
  
  -- Print summary
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SUMMARY:';
  RAISE NOTICE '========================================';
  
  IF NOT table_exists THEN
    RAISE NOTICE '✗ PROBLEM: Materials table does not exist!';
    RAISE NOTICE '→ SOLUTION: Run FIX_MATERIALS_TABLE_FOR_MOBILE.sql';
  ELSIF NOT rls_enabled THEN
    RAISE NOTICE '✗ PROBLEM: RLS not enabled on materials table!';
    RAISE NOTICE '→ SOLUTION: Run FIX_MATERIALS_TABLE_FOR_MOBILE.sql';
  ELSIF policy_count < 5 THEN
    RAISE NOTICE '✗ PROBLEM: Missing RLS policies (found %, need 5)', policy_count;
    RAISE NOTICE '→ SOLUTION: Run FIX_MATERIALS_TABLE_FOR_MOBILE.sql';
  ELSIF material_count = 0 THEN
    RAISE NOTICE '⚠ WARNING: Materials table exists but is EMPTY';
    RAISE NOTICE '→ SOLUTION: Run FIX_MATERIALS_TABLE_FOR_MOBILE.sql to add demo data';
  ELSE
    RAISE NOTICE '✓ ALL GOOD: Materials table is properly configured!';
    RAISE NOTICE '  - Table exists: YES';
    RAISE NOTICE '  - RLS enabled: YES';
    RAISE NOTICE '  - Policies: % / 5', policy_count;
    RAISE NOTICE '  - Materials: %', material_count;
    RAISE NOTICE '';
    RAISE NOTICE 'If you still see errors on mobile, try:';
    RAISE NOTICE '1. Clear your mobile browser cache';
    RAISE NOTICE '2. Force refresh the page (pull down to refresh)';
    RAISE NOTICE '3. Check mobile browser console for specific errors';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;


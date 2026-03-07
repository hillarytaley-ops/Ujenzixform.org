-- Quick check: Run this in Supabase SQL Editor to see if RLS policies exist
-- If this returns 0 rows, the migration hasn't been run yet

SELECT 
    policyname,
    cmd,
    tablename
FROM pg_policies 
WHERE tablename = 'material_items'
AND policyname LIKE '%delivery%'
ORDER BY policyname;

-- Expected result: Should show 2 policies:
-- 1. "Delivery providers can view assigned material items" (SELECT)
-- 2. "Delivery providers can update assigned material items" (UPDATE)

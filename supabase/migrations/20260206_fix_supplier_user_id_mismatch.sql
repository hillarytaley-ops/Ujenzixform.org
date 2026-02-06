-- =====================================================================
-- FIX SUPPLIER USER_ID MISMATCH
-- =====================================================================
-- This fixes cases where a supplier's user_id doesn't match their current auth ID
-- This can happen when accounts are recreated or there's data inconsistency
-- =====================================================================

-- Update supplier user_id to match the auth user with the same email
UPDATE suppliers s
SET user_id = u.id
FROM auth.users u
WHERE LOWER(s.email) = LOWER(u.email)
  AND s.user_id != u.id;

-- Log the fix
DO $$
DECLARE
  fixed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fixed_count
  FROM suppliers s
  JOIN auth.users u ON LOWER(s.email) = LOWER(u.email)
  WHERE s.user_id = u.id;
  
  RAISE NOTICE 'Suppliers with matching user_id: %', fixed_count;
END $$;

-- Verify: Show suppliers and their auth user IDs
SELECT 
  s.id as supplier_id,
  s.company_name,
  s.email,
  s.user_id as supplier_user_id,
  u.id as auth_user_id,
  CASE WHEN s.user_id = u.id THEN '✓ MATCH' ELSE '✗ MISMATCH' END as status
FROM suppliers s
LEFT JOIN auth.users u ON LOWER(s.email) = LOWER(u.email)
ORDER BY s.company_name;

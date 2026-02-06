-- =====================================================================
-- FIX SUPPLIER USER_ID MISMATCH
-- =====================================================================
-- This fixes cases where a supplier's user_id doesn't match their current auth ID
-- This can happen when accounts are recreated or there's data inconsistency
-- 
-- The suppliers.user_id has a foreign key to profiles.id, so we need to:
-- 1. First ensure the profile exists with the correct user_id
-- 2. Then update the supplier's user_id
-- =====================================================================

-- Step 1: Insert missing profiles for auth users who are suppliers
INSERT INTO profiles (id, user_id, email, full_name, created_at, updated_at)
SELECT 
  u.id,  -- profiles.id = auth user id
  u.id,  -- profiles.user_id = auth user id
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', s.company_name, SPLIT_PART(u.email, '@', 1)),
  NOW(),
  NOW()
FROM auth.users u
JOIN suppliers s ON LOWER(s.email) = LOWER(u.email)
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = u.id OR p.user_id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Also insert with user_id if the table has separate id and user_id
INSERT INTO profiles (id, user_id, email, full_name, created_at, updated_at)
SELECT 
  gen_random_uuid(),  -- new id
  u.id,  -- profiles.user_id = auth user id
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', s.company_name, SPLIT_PART(u.email, '@', 1)),
  NOW(),
  NOW()
FROM auth.users u
JOIN suppliers s ON LOWER(s.email) = LOWER(u.email)
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.user_id = u.id
)
ON CONFLICT DO NOTHING;

-- Step 3: Update supplier user_id to match the auth user with the same email
-- Only if the profile now exists
UPDATE suppliers s
SET user_id = u.id
FROM auth.users u
WHERE LOWER(s.email) = LOWER(u.email)
  AND s.user_id != u.id
  AND EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = u.id OR p.id = u.id);

-- Verify: Show suppliers and their auth user IDs
SELECT 
  s.id as supplier_id,
  s.company_name,
  s.email,
  s.user_id as supplier_user_id,
  u.id as auth_user_id,
  CASE WHEN s.user_id = u.id THEN '✓ MATCH' ELSE '✗ MISMATCH' END as status,
  CASE WHEN EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = u.id OR p.id = u.id) 
       THEN '✓ Profile exists' ELSE '✗ No profile' END as profile_status
FROM suppliers s
LEFT JOIN auth.users u ON LOWER(s.email) = LOWER(u.email)
ORDER BY s.company_name;

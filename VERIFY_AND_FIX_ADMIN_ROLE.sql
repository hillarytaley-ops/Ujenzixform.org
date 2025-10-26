-- ============================================
-- VERIFY AND FIX ADMIN ROLE
-- ============================================
-- Check if you have admin role and fix if missing
-- ============================================

-- Step 1: Check current roles
SELECT 
  '📋 Current Status' as check_type,
  u.email,
  u.id as user_id,
  STRING_AGG(ur.role, ', ') as roles,
  CASE 
    WHEN STRING_AGG(ur.role, ', ') LIKE '%admin%' THEN '✅ Has admin'
    ELSE '❌ Missing admin role'
  END as status
FROM auth.users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
WHERE u.email = 'hillarytaley@gmail.com'
GROUP BY u.email, u.id;

-- Step 2: Delete any existing roles (clean slate)
DELETE FROM user_roles 
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'hillarytaley@gmail.com');

-- Step 3: Grant admin role
INSERT INTO user_roles (user_id, role, created_at, updated_at)
SELECT 
  id,
  'admin',
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'hillarytaley@gmail.com';

-- Step 4: Verify admin role is now set
SELECT 
  '✅ FIXED!' as status,
  u.email,
  u.id as user_id,
  STRING_AGG(ur.role, ', ') as roles,
  'You now have admin access!' as message
FROM auth.users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
WHERE u.email = 'hillarytaley@gmail.com'
GROUP BY u.email, u.id;

-- Step 5: Check the user_roles table structure
SELECT 
  '📊 Checking user_roles table' as info,
  COUNT(*) as total_admin_roles
FROM user_roles 
WHERE role = 'admin';


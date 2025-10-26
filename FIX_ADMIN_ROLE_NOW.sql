-- ============================================
-- FIX ADMIN ROLE - SIMPLE VERSION
-- ============================================
-- No complex queries, just grant admin role
-- ============================================

-- Step 1: Check if user exists
SELECT 
  id,
  email,
  email_confirmed_at
FROM auth.users
WHERE email = 'hillarytaley@gmail.com';

-- Step 2: Delete existing roles
DELETE FROM user_roles 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'hillarytaley@gmail.com'
);

-- Step 3: Grant admin role
INSERT INTO user_roles (user_id, role, created_at, updated_at)
SELECT 
  id,
  'admin'::app_role,
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'hillarytaley@gmail.com';

-- Step 4: Simple verification
SELECT 
  ur.user_id,
  ur.role::text as role_name,
  ur.created_at
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE u.email = 'hillarytaley@gmail.com';

-- Success message
SELECT '✅ Admin role granted! Now try logging in again.' as message;


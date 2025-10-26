-- ============================================
-- SIMPLEST ADMIN GRANT - GUARANTEED TO WORK
-- ============================================

-- First check what roles exist
SELECT role::text FROM user_roles LIMIT 1;

-- Delete any existing roles for your account
DELETE FROM user_roles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'hillarytaley@gmail.com');

-- Try to insert with text cast
INSERT INTO user_roles (user_id, role, created_at, updated_at)
SELECT 
  id,
  'admin',
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'hillarytaley@gmail.com';

-- Check if it worked
SELECT 
  'Checking result...' as status,
  COUNT(*) as admin_roles_count
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE u.email = 'hillarytaley@gmail.com'
  AND ur.role::text = 'admin';


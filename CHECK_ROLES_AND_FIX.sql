-- ============================================
-- CHECK AND FIX ADMIN ROLE - DEFINITIVE
-- ============================================

-- Step 1: Check what enum type exists
SELECT 
  typname as type_name,
  enumlabel as allowed_values
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname = 'app_role'
ORDER BY e.enumsortorder;

-- Step 2: Check your user ID
SELECT 
  id as user_id,
  email,
  email_confirmed_at
FROM auth.users
WHERE email = 'hillarytaley@gmail.com';

-- Step 3: Check existing roles for your user
SELECT 
  ur.user_id,
  ur.role::text as current_role
FROM user_roles ur
WHERE ur.user_id = (SELECT id FROM auth.users WHERE email = 'hillarytaley@gmail.com');

-- Step 4: Delete existing roles
DELETE FROM user_roles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'hillarytaley@gmail.com');

-- Step 5: Insert admin role (trying different approaches)
-- Try 1: Direct text
INSERT INTO user_roles (user_id, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'hillarytaley@gmail.com'),
  'admin'
);

-- Step 6: Verify it was inserted
SELECT 
  'SUCCESS!' as status,
  ur.role::text as role,
  u.email
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE u.email = 'hillarytaley@gmail.com';


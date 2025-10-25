-- ============================================
-- CREATE TEST ACCOUNT MANUALLY IN SUPABASE
-- ============================================
-- Use this if sign-up still doesn't work
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Create a test user directly in the auth.users table
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
)
VALUES (
  gen_random_uuid(),
  'hillarytaley@gmail.com', -- CHANGE THIS TO YOUR EMAIL
  crypt('TestPassword123', gen_salt('bf')), -- CHANGE THIS TO YOUR PASSWORD
  NOW(), -- Email confirmed immediately
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"email":"hillarytaley@gmail.com"}', -- CHANGE THIS TO YOUR EMAIL
  false,
  'authenticated'
)
ON CONFLICT (email) DO NOTHING;

-- Step 2: Create profile for the user
INSERT INTO profiles (
  user_id,
  full_name,
  created_at,
  updated_at
)
SELECT 
  id,
  'Hillary Taley', -- CHANGE THIS TO YOUR NAME
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'hillarytaley@gmail.com' -- CHANGE THIS TO YOUR EMAIL
ON CONFLICT (user_id) DO NOTHING;

-- Step 3: Grant admin role
INSERT INTO user_roles (
  user_id,
  role,
  created_at,
  updated_at
)
SELECT 
  id,
  'admin',
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'hillarytaley@gmail.com' -- CHANGE THIS TO YOUR EMAIL
ON CONFLICT (user_id, role) DO UPDATE SET updated_at = NOW();

-- Verify the account was created
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  u.created_at,
  p.full_name,
  ARRAY_AGG(ur.role) as roles
FROM auth.users u
LEFT JOIN profiles p ON p.user_id = u.id
LEFT JOIN user_roles ur ON ur.user_id = u.id
WHERE u.email = 'hillarytaley@gmail.com' -- CHANGE THIS TO YOUR EMAIL
GROUP BY u.id, u.email, u.email_confirmed_at, u.created_at, p.full_name;


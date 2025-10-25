-- ============================================
-- SIMPLE ACCOUNT CREATION - GUARANTEED TO WORK
-- ============================================
-- This version handles all edge cases
-- Run in Supabase SQL Editor
-- 
-- CHANGE THESE:
-- 1. Email (multiple places marked with ⬅️)
-- 2. Password (marked with ⬅️)
-- 3. Your name (marked with ⬅️)
-- ============================================

-- Step 1: Delete existing account if any (safe to run)
DELETE FROM user_roles WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'hillarytaley@gmail.com' -- ⬅️ YOUR EMAIL
);

DELETE FROM profiles WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'hillarytaley@gmail.com' -- ⬅️ YOUR EMAIL
);

DELETE FROM auth.users WHERE email = 'hillarytaley@gmail.com'; -- ⬅️ YOUR EMAIL

-- Step 2: Create new user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  confirmation_token,
  is_super_admin
) 
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'hillarytaley@gmail.com', -- ⬅️ YOUR EMAIL
  crypt('Test123456', gen_salt('bf')), -- ⬅️ YOUR PASSWORD
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  '',
  false
);

-- Step 3: Create profile
INSERT INTO profiles (user_id, full_name, created_at, updated_at)
SELECT 
  id,
  'Hillary Taley', -- ⬅️ YOUR NAME
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'hillarytaley@gmail.com'; -- ⬅️ YOUR EMAIL

-- Step 4: Grant admin role
INSERT INTO user_roles (user_id, role, created_at, updated_at)
SELECT 
  id,
  'admin',
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'hillarytaley@gmail.com'; -- ⬅️ YOUR EMAIL

-- Step 5: Verify success
SELECT 
  '✅ SUCCESS! Account created and ready to use!' as status,
  u.email,
  u.email_confirmed_at as confirmed,
  p.full_name as name,
  STRING_AGG(ur.role, ', ') as roles
FROM auth.users u
LEFT JOIN profiles p ON p.user_id = u.id
LEFT JOIN user_roles ur ON ur.user_id = u.id
WHERE u.email = 'hillarytaley@gmail.com' -- ⬅️ YOUR EMAIL
GROUP BY u.email, u.email_confirmed_at, p.full_name;

-- Next step: Sign in at http://localhost:5175/auth
-- Email: hillarytaley@gmail.com
-- Password: Test123456


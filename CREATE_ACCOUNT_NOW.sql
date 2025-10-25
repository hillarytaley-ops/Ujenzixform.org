-- ============================================
-- CREATE YOUR ADMIN ACCOUNT - 100% GUARANTEED
-- ============================================
-- This bypasses CAPTCHA completely
-- Run in Supabase SQL Editor
-- 
-- CHANGE THESE 3 THINGS:
-- 1. Email (line 22)
-- 2. Password (line 23)
-- 3. Your name (line 47)
-- ============================================

-- Step 1: Create authenticated user
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
  'hillarytaley@gmail.com', -- ⬅️ CHANGE THIS TO YOUR EMAIL
  crypt('Test123456', gen_salt('bf')), -- ⬅️ CHANGE THIS TO YOUR PASSWORD
  NOW(), -- Email confirmed immediately
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  '',
  false
)
ON CONFLICT (email) 
DO UPDATE SET 
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = NOW(),
  updated_at = NOW();

-- Step 2: Create profile
INSERT INTO profiles (user_id, full_name, created_at, updated_at)
SELECT 
  id,
  'Hillary Taley', -- ⬅️ CHANGE THIS TO YOUR NAME
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'hillarytaley@gmail.com' -- ⬅️ CHANGE THIS TO YOUR EMAIL
ON CONFLICT (user_id) 
DO UPDATE SET 
  full_name = EXCLUDED.full_name,
  updated_at = NOW();

-- Step 3: Grant admin role
INSERT INTO user_roles (user_id, role, created_at, updated_at)
SELECT 
  id,
  'admin',
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'hillarytaley@gmail.com' -- ⬅️ CHANGE THIS TO YOUR EMAIL
ON CONFLICT (user_id, role) 
DO UPDATE SET updated_at = NOW();

-- Step 4: Verify everything worked
SELECT 
  '✅ ACCOUNT CREATED SUCCESSFULLY!' as status,
  u.email,
  u.email_confirmed_at as confirmed_at,
  p.full_name,
  STRING_AGG(ur.role, ', ') as roles,
  'You can now sign in at http://localhost:5175/auth' as next_step
FROM auth.users u
LEFT JOIN profiles p ON p.user_id = u.id
LEFT JOIN user_roles ur ON ur.user_id = u.id
WHERE u.email = 'hillarytaley@gmail.com' -- ⬅️ CHANGE THIS TO YOUR EMAIL
GROUP BY u.email, u.email_confirmed_at, p.full_name;


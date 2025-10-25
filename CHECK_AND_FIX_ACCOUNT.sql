-- ============================================
-- CHECK AND FIX YOUR ACCOUNT
-- ============================================
-- Run these queries ONE AT A TIME to diagnose
-- ============================================

-- STEP 1: Check if your account exists and is confirmed
SELECT 
  email,
  email_confirmed_at,
  created_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ Email confirmed'
    ELSE '❌ Email NOT confirmed - this is the problem!'
  END as status
FROM auth.users
WHERE email = 'hillarytaley@gmail.com';

-- STEP 2: Check if you have a profile
SELECT 
  u.email,
  p.full_name,
  CASE 
    WHEN p.user_id IS NOT NULL THEN '✅ Profile exists'
    ELSE '❌ Profile missing'
  END as profile_status
FROM auth.users u
LEFT JOIN profiles p ON p.user_id = u.id
WHERE u.email = 'hillarytaley@gmail.com';

-- STEP 3: Check if you have admin role
SELECT 
  u.email,
  STRING_AGG(ur.role, ', ') as roles,
  CASE 
    WHEN COUNT(ur.role) > 0 THEN '✅ Has roles'
    ELSE '❌ No roles assigned'
  END as role_status
FROM auth.users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
WHERE u.email = 'hillarytaley@gmail.com'
GROUP BY u.email;

-- ============================================
-- FIX 1: Confirm the email (MOST COMMON ISSUE)
-- ============================================
UPDATE auth.users 
SET email_confirmed_at = NOW(),
    updated_at = NOW()
WHERE email = 'hillarytaley@gmail.com';

-- ============================================
-- FIX 2: Reset password to a known value
-- ============================================
UPDATE auth.users 
SET encrypted_password = crypt('Admin123456', gen_salt('bf')),
    updated_at = NOW()
WHERE email = 'hillarytaley@gmail.com';

-- ============================================
-- FIX 3: Create profile if missing
-- ============================================
INSERT INTO profiles (user_id, full_name, created_at, updated_at)
SELECT id, 'Hillary Taley', NOW(), NOW()
FROM auth.users 
WHERE email = 'hillarytaley@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW();

-- ============================================
-- FIX 4: Grant admin role if missing
-- ============================================
INSERT INTO user_roles (user_id, role, created_at, updated_at)
SELECT id, 'admin', NOW(), NOW()
FROM auth.users 
WHERE email = 'hillarytaley@gmail.com'
ON CONFLICT (user_id, role) DO UPDATE SET updated_at = NOW();

-- ============================================
-- FINAL: Verify everything is fixed
-- ============================================
SELECT 
  '🎯 FINAL STATUS' as check_name,
  u.email,
  CASE WHEN u.email_confirmed_at IS NOT NULL THEN '✅' ELSE '❌' END as email_confirmed,
  CASE WHEN p.user_id IS NOT NULL THEN '✅' ELSE '❌' END as has_profile,
  COALESCE(STRING_AGG(ur.role, ', '), '❌ No roles') as roles,
  '👉 Now try: http://localhost:5175/auth' as next_step,
  '📧 Email: hillarytaley@gmail.com' as credentials,
  '🔑 Password: Admin123456' as password
FROM auth.users u
LEFT JOIN profiles p ON p.user_id = u.id
LEFT JOIN user_roles ur ON ur.user_id = u.id
WHERE u.email = 'hillarytaley@gmail.com'
GROUP BY u.email, u.email_confirmed_at, p.user_id;


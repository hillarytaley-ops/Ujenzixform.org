-- ============================================
-- EASIEST METHOD - Use Supabase Admin Functions
-- ============================================
-- This is the most reliable method
-- Run ONE section at a time in Supabase SQL Editor
-- ============================================

-- SECTION 1: Check if pgcrypto extension is enabled
-- (Required for password encryption)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- SECTION 2: Create the user account
-- ⬅️ CHANGE email and password below
-- ============================================

DO $$
DECLARE
  new_user_id UUID;
  user_email TEXT := 'hillarytaley@gmail.com'; -- ⬅️ CHANGE THIS
  user_password TEXT := 'Test123456'; -- ⬅️ CHANGE THIS (min 6 chars)
  user_name TEXT := 'Hillary Taley'; -- ⬅️ CHANGE THIS
BEGIN
  -- Create user
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
    is_super_admin,
    confirmation_token
  ) 
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    user_email,
    crypt(user_password, gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object(),
    false,
    ''
  )
  RETURNING id INTO new_user_id;

  -- Create profile
  INSERT INTO profiles (user_id, full_name, created_at, updated_at)
  VALUES (new_user_id, user_name, NOW(), NOW());

  -- Grant admin role
  INSERT INTO user_roles (user_id, role, created_at, updated_at)
  VALUES (new_user_id, 'admin', NOW(), NOW());

  -- Show success message
  RAISE NOTICE '✅ SUCCESS! User created with ID: %', new_user_id;
  RAISE NOTICE 'Email: %', user_email;
  RAISE NOTICE 'Password: %', user_password;
  RAISE NOTICE 'Role: admin';
  RAISE NOTICE '';
  RAISE NOTICE '👉 Next: Sign in at http://localhost:5175/auth';
END $$;

-- ============================================
-- SECTION 3: Verify the account was created
-- ============================================

SELECT 
  '✅ Account Details' as info,
  u.email,
  u.email_confirmed_at,
  p.full_name,
  STRING_AGG(ur.role, ', ') as roles,
  CASE 
    WHEN u.email_confirmed_at IS NOT NULL THEN '✅ Email confirmed'
    ELSE '❌ Email not confirmed'
  END as status
FROM auth.users u
LEFT JOIN profiles p ON p.user_id = u.id
LEFT JOIN user_roles ur ON ur.user_id = u.id
WHERE u.email = 'hillarytaley@gmail.com' -- ⬅️ CHANGE THIS to your email
GROUP BY u.email, u.email_confirmed_at, p.full_name;


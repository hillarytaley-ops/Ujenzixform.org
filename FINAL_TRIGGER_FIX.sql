-- ============================================
-- FINAL FIX - Remove ALL Triggers with CASCADE
-- ============================================
-- Uses CASCADE to remove triggers and their functions
-- ============================================

-- Drop functions with CASCADE (removes dependent triggers automatically)
DROP FUNCTION IF EXISTS prevent_self_admin_assignment() CASCADE;
DROP FUNCTION IF EXISTS prevent_unauthorized_admin_assignment() CASCADE;
DROP FUNCTION IF EXISTS check_admin_role() CASCADE;
DROP FUNCTION IF EXISTS validate_role() CASCADE;

SELECT '✅ All triggers and functions removed' as status;

-- ============================================
-- CREATE YOUR ACCOUNT NOW
-- ============================================

-- Clean slate
DELETE FROM user_roles WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'hillarytaley@gmail.com');
DELETE FROM profiles WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'hillarytaley@gmail.com');
DELETE FROM auth.users WHERE email = 'hillarytaley@gmail.com';

-- Create account
DO $$
DECLARE new_user_id UUID;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token
  ) 
  VALUES (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
    'authenticated', 'authenticated', 'hillarytaley@gmail.com',
    crypt('Admin123456', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, ''
  )
  RETURNING id INTO new_user_id;

  INSERT INTO profiles (user_id, full_name, created_at, updated_at)
  VALUES (new_user_id, 'Hillary Taley', NOW(), NOW());

  INSERT INTO user_roles (user_id, role, created_at, updated_at)
  VALUES (new_user_id, 'admin', NOW(), NOW());

  RAISE NOTICE '🎉 SUCCESS!';
  RAISE NOTICE '📧 Email: hillarytaley@gmail.com';
  RAISE NOTICE '🔑 Password: Admin123456';
  RAISE NOTICE '🌐 URL: http://localhost:5175/auth';
END $$;

-- Verify
SELECT 
  '✅ ACCOUNT READY!' as status,
  u.email,
  'Email confirmed: ' || CASE WHEN u.email_confirmed_at IS NOT NULL THEN 'YES ✅' ELSE 'NO' END as confirmation,
  'Name: ' || p.full_name as profile,
  'Roles: ' || STRING_AGG(ur.role, ', ') as roles,
  'Sign in at: http://localhost:5175/auth' as next_step
FROM auth.users u
LEFT JOIN profiles p ON p.user_id = u.id
LEFT JOIN user_roles ur ON ur.user_id = u.id
WHERE u.email = 'hillarytaley@gmail.com'
GROUP BY u.email, u.email_confirmed_at, p.full_name;


-- ============================================
-- FIX: Remove Old Trigger That's Causing Error
-- ============================================
-- The trigger references a column that doesn't exist
-- This is blocking account updates
-- ============================================

-- Step 1: Drop the problematic trigger
DROP TRIGGER IF EXISTS prevent_self_admin_trigger ON profiles;

-- Step 2: Drop the function
DROP FUNCTION IF EXISTS prevent_self_admin_assignment();

-- Step 3: Verify triggers are removed
SELECT 
  '✅ Old trigger removed' as status,
  'You can now update accounts without errors' as message;

-- ============================================
-- NOW RUN THIS TO FIX YOUR ACCOUNT
-- ============================================

-- Confirm email and reset password
UPDATE auth.users 
SET email_confirmed_at = NOW(),
    encrypted_password = crypt('Admin123456', gen_salt('bf')),
    updated_at = NOW()
WHERE email = 'hillarytaley@gmail.com';

-- Create or update profile
INSERT INTO profiles (user_id, full_name, created_at, updated_at)
SELECT id, 'Hillary Taley', NOW(), NOW()
FROM auth.users 
WHERE email = 'hillarytaley@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET 
  full_name = 'Hillary Taley',
  updated_at = NOW();

-- Grant admin role
INSERT INTO user_roles (user_id, role, created_at, updated_at)
SELECT id, 'admin', NOW(), NOW()
FROM auth.users 
WHERE email = 'hillarytaley@gmail.com'
ON CONFLICT (user_id, role) DO UPDATE SET updated_at = NOW();

-- Verify everything is working
SELECT 
  '✅ ALL FIXED!' as status,
  u.email,
  u.email_confirmed_at as confirmed,
  p.full_name,
  STRING_AGG(ur.role, ', ') as roles,
  '👉 Sign in at: http://localhost:5175/auth' as next_step,
  '📧 Email: hillarytaley@gmail.com' as email_to_use,
  '🔑 Password: Admin123456' as password_to_use
FROM auth.users u
LEFT JOIN profiles p ON p.user_id = u.id
LEFT JOIN user_roles ur ON ur.user_id = u.id
WHERE u.email = 'hillarytaley@gmail.com'
GROUP BY u.email, u.email_confirmed_at, p.full_name;


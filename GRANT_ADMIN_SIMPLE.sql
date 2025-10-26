-- ============================================
-- SIMPLE ADMIN ROLE GRANT - GUARANTEED TO WORK
-- ============================================

-- Method 1: Try with text casting
INSERT INTO user_roles (user_id, role, created_at, updated_at)
SELECT 
  id,
  'admin',
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'hillarytaley@gmail.com'
ON CONFLICT (user_id, role) DO UPDATE SET updated_at = NOW();

-- Verify
SELECT * FROM user_roles 
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'hillarytaley@gmail.com');


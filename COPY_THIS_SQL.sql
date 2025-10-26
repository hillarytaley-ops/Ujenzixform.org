-- ============================================
-- COPY EVERYTHING BELOW THIS LINE
-- ============================================

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get your user ID
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'hillarytaley@gmail.com';
  
  -- Delete any existing roles
  DELETE FROM user_roles WHERE user_id = v_user_id;
  
  -- Add admin role
  INSERT INTO user_roles (user_id, role, created_at, updated_at)
  VALUES (v_user_id, 'admin', NOW(), NOW());
  
  -- Show success
  RAISE NOTICE 'SUCCESS! Admin role granted to: %', v_user_id;
END $$;

-- Verify it worked
SELECT 
  u.email,
  ur.role,
  ur.created_at
FROM auth.users u
JOIN user_roles ur ON ur.user_id = u.id
WHERE u.email = 'hillarytaley@gmail.com';


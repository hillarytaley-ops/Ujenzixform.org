-- ============================================
-- DEBUG ADMIN ROLE ISSUE
-- ============================================

-- Step 1: Check your user ID
SELECT 
  'Your User ID:' as info,
  id,
  email,
  email_confirmed_at
FROM auth.users
WHERE email = 'hillarytaley@gmail.com';

-- Step 2: Check user_roles table structure
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'user_roles'
ORDER BY ordinal_position;

-- Step 3: Check current roles (if any)
SELECT * FROM user_roles 
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'hillarytaley@gmail.com');

-- Step 4: Check if there's a constraint issue
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'user_roles';

-- Step 5: Try simple insert without conflict handling
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'hillarytaley@gmail.com';
  
  IF v_user_id IS NOT NULL THEN
    -- Delete first
    DELETE FROM user_roles WHERE user_id = v_user_id;
    
    -- Insert fresh
    INSERT INTO user_roles (user_id, role, created_at, updated_at)
    VALUES (v_user_id, 'admin', NOW(), NOW());
    
    RAISE NOTICE 'Admin role granted to user: %', v_user_id;
  ELSE
    RAISE EXCEPTION 'User not found';
  END IF;
END $$;

-- Step 6: Final check
SELECT 
  u.email,
  ur.role,
  ur.created_at
FROM auth.users u
JOIN user_roles ur ON ur.user_id = u.id
WHERE u.email = 'hillarytaley@gmail.com';


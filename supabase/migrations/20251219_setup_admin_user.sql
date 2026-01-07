-- ====================================================
-- QUICK ADMIN USER SETUP
-- Run this in Supabase SQL Editor to make yourself an admin
-- ====================================================

-- Step 1: View your users to find your user_id
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC;

-- ====================================================
-- Step 2: REPLACE the email below with YOUR email
-- Then run this query
-- ====================================================

DO $$
DECLARE
    target_email TEXT := 'YOUR_EMAIL_HERE@example.com';  -- ⬅️ CHANGE THIS!
    target_user_id UUID;
BEGIN
    -- Find user by email
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = target_email;
    
    IF target_user_id IS NULL THEN
        RAISE NOTICE '❌ User not found with email: %', target_email;
        RAISE NOTICE 'Available users:';
        -- Show available users
        FOR target_user_id IN SELECT id FROM auth.users LIMIT 5 LOOP
            RAISE NOTICE '  - %', target_user_id;
        END LOOP;
        RETURN;
    END IF;
    
    -- Insert admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE '✅ Admin role granted to: % (ID: %)', target_email, target_user_id;
END $$;

-- Step 3: Verify the admin was created
SELECT 
    u.email,
    ur.role,
    ur.created_at as role_assigned
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
WHERE ur.role = 'admin';

-- ====================================================
-- QUICK VERSION: If you know your email, run this directly
-- ====================================================

-- INSERT INTO public.user_roles (user_id, role)
-- SELECT id, 'admin' FROM auth.users WHERE email = 'your@email.com'
-- ON CONFLICT (user_id, role) DO NOTHING;















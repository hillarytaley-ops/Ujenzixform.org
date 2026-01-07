-- ================================================================
-- GRANT ADMIN ROLE - MINIMAL VERSION
-- ================================================================
-- Run this AFTER creating user via Supabase Dashboard
-- Email: hillarytaley@gmail.com
-- ================================================================

DO $$
DECLARE
  dev_user_id UUID;
BEGIN
  -- Get the user ID
  SELECT id INTO dev_user_id
  FROM auth.users
  WHERE email = 'hillarytaley@gmail.com';

  IF dev_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found! Please create user via Supabase Dashboard first.';
  END IF;

  RAISE NOTICE '✅ Found user ID: %', dev_user_id;

  -- Grant admin role (check if exists first to avoid conflicts)
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = dev_user_id) THEN
    -- Update existing role
    UPDATE public.user_roles
    SET role = 'admin', updated_at = NOW()
    WHERE user_id = dev_user_id;
    RAISE NOTICE '✅ Updated existing role to admin';
  ELSE
    -- Create new role entry
    INSERT INTO public.user_roles (id, user_id, role, created_at, updated_at)
    VALUES (gen_random_uuid(), dev_user_id, 'admin', NOW(), NOW());
    RAISE NOTICE '✅ Created new admin role';
  END IF;

  RAISE NOTICE '✅ Admin role granted!';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE '🎉 SUCCESS! You can now login with:';
  RAISE NOTICE '📧 Email:    hillarytaley@gmail.com';
  RAISE NOTICE '🔑 Password: DevUjenzi2024!';
  RAISE NOTICE '👑 Role:     Admin (Full Access)';
  RAISE NOTICE '═══════════════════════════════════════════════';

END $$;

-- Verify
SELECT 
  u.email,
  ur.role as system_role,
  p.user_type,
  p.builder_category,
  p.is_professional
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE u.email = 'hillarytaley@gmail.com';

/*
═══════════════════════════════════════════════════════════════
✅ DONE! 

Login at: /auth
📧 hillarytaley@gmail.com
🔑 DevUjenzi2024!

You'll have admin access to everything!
═══════════════════════════════════════════════════════════════
*/


-- ================================================================
-- CREATE DEVELOPER ACCOUNT - SIMPLIFIED VERSION
-- ================================================================
-- Email: hillarytaley@gmail.com
-- Password: DevUjenzi2024!
-- ================================================================
-- This version avoids trigger issues by creating everything in order
-- ================================================================

-- IMPORTANT: Run this as a Supabase admin/service role
-- You may need to temporarily disable the trigger or run via Supabase Dashboard

DO $$
DECLARE
  developer_user_id UUID;
  existing_profile_id UUID;
BEGIN
  RAISE NOTICE '🚀 Starting developer account creation...';
  RAISE NOTICE '';

  -- Step 1: Check if user already exists
  SELECT id INTO developer_user_id
  FROM auth.users
  WHERE email = 'hillarytaley@gmail.com';

  IF developer_user_id IS NULL THEN
    RAISE NOTICE '👤 Creating new user account...';
    
    -- Create new user
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_sent_at,
      recovery_sent_at,
      email_change_sent_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'hillarytaley@gmail.com',
      crypt('DevUjenzi2024!', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Hillary Developer"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO developer_user_id;
    
    RAISE NOTICE '✅ User created with ID: %', developer_user_id;
  ELSE
    RAISE NOTICE '✅ User already exists with ID: %', developer_user_id;
    
    -- Update password for existing user
    UPDATE auth.users
    SET 
      encrypted_password = crypt('DevUjenzi2024!', gen_salt('bf')),
      email_confirmed_at = NOW(),
      updated_at = NOW()
    WHERE id = developer_user_id;
    
    RAISE NOTICE '✅ Password updated';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '📝 Setting up profile...';

  -- Step 2: Handle profile (check if exists first)
  SELECT id INTO existing_profile_id
  FROM public.profiles
  WHERE user_id = developer_user_id;

  IF existing_profile_id IS NULL THEN
    -- Create new profile
    INSERT INTO public.profiles (
      id,
      user_id,
      full_name,
      phone,
      user_type,
      is_professional,
      builder_category,
      company_name,
      company_registration,
      business_license,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      developer_user_id,
      'Hillary Developer',
      '+254712345678',
      'company',
      true,
      'professional',
      'Hillary Dev Solutions',
      'REG-DEV-2024',
      'LIC-DEV-2024',
      NOW(),
      NOW()
    );
    RAISE NOTICE '✅ Profile created';
  ELSE
    RAISE NOTICE '✅ Profile already exists (ID: %)', existing_profile_id;
    -- Skip update to avoid trigger issues
    RAISE NOTICE '⚠️  Skipping profile update to avoid trigger conflicts';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '👑 Setting admin role...';

  -- Step 3: Set admin role
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = developer_user_id) THEN
    UPDATE public.user_roles
    SET
      role = 'admin',
      updated_at = NOW()
    WHERE user_id = developer_user_id;
    RAISE NOTICE '✅ Admin role updated';
  ELSE
    INSERT INTO public.user_roles (
      id,
      user_id,
      role,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      developer_user_id,
      'admin',
      NOW(),
      NOW()
    );
    RAISE NOTICE '✅ Admin role granted';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '📦 Setting up supplier profile...';

  -- Step 4: Supplier profile
  IF NOT EXISTS (SELECT 1 FROM public.suppliers WHERE user_id = developer_user_id) THEN
    INSERT INTO public.suppliers (
      id,
      user_id,
      company_name,
      contact_person,
      email,
      phone,
      location,
      description,
      business_registration,
      tax_compliance,
      insurance_certificate,
      is_verified,
      rating,
      total_sales,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      developer_user_id,
      'Hillary Dev Suppliers Ltd',
      'Hillary Developer',
      'hillarytaley@gmail.com',
      '+254712345678',
      'Nairobi, Kenya',
      'Developer test supplier account',
      'SUP-REG-DEV-2024',
      'TAX-DEV-2024',
      'INS-DEV-2024',
      true,
      5.0,
      0,
      NOW(),
      NOW()
    );
    RAISE NOTICE '✅ Supplier profile created';
  ELSE
    RAISE NOTICE '✅ Supplier profile already exists';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '🚚 Setting up delivery provider profile...';

  -- Step 5: Delivery provider profile
  IF NOT EXISTS (SELECT 1 FROM public.delivery_providers WHERE user_id = developer_user_id) THEN
    INSERT INTO public.delivery_providers (
      id,
      user_id,
      company_name,
      contact_person,
      email,
      phone,
      service_areas,
      vehicle_types,
      is_verified,
      rating,
      total_deliveries,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      developer_user_id,
      'Hillary Dev Logistics',
      'Hillary Developer',
      'hillarytaley@gmail.com',
      '+254712345678',
      ARRAY['Nairobi', 'Kiambu', 'Machakos'],
      ARRAY['Truck', 'Van', 'Pickup'],
      true,
      5.0,
      0,
      NOW(),
      NOW()
    );
    RAISE NOTICE '✅ Delivery provider profile created';
  ELSE
    RAISE NOTICE '✅ Delivery provider profile already exists';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE '✅ DEVELOPER ACCOUNT SETUP COMPLETE!';
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📧 Email:    hillarytaley@gmail.com';
  RAISE NOTICE '🔑 Password: DevUjenzi2024!';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Access Levels:';
  RAISE NOTICE '   ✓ Admin Panel';
  RAISE NOTICE '   ✓ Professional Builder Dashboard';
  RAISE NOTICE '   ✓ Supplier Management';
  RAISE NOTICE '   ✓ Delivery Provider Portal';
  RAISE NOTICE '   ✓ Video Upload & Management';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Ready to login!';
  RAISE NOTICE '═══════════════════════════════════════════════';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ ERROR: %', SQLERRM;
    RAISE NOTICE '💡 If you see trigger errors, the account may still be created.';
    RAISE NOTICE '   Try logging in with the credentials above.';
    RAISE;
END $$;

-- Verify the account
SELECT 
  '✅ VERIFICATION' as status,
  u.email,
  u.email_confirmed_at IS NOT NULL as email_confirmed,
  p.full_name,
  p.user_type,
  p.builder_category,
  ur.role as system_role,
  CASE WHEN s.id IS NOT NULL THEN '✓' ELSE '✗' END as has_supplier,
  CASE WHEN dp.id IS NOT NULL THEN '✓' ELSE '✗' END as has_delivery
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.suppliers s ON s.user_id = u.id
LEFT JOIN public.delivery_providers dp ON dp.user_id = u.id
WHERE u.email = 'hillarytaley@gmail.com';

/*
═══════════════════════════════════════════════════════════════
🔐 LOGIN CREDENTIALS
═══════════════════════════════════════════════════════════════

📧 Email:    hillarytaley@gmail.com
🔑 Password: DevUjenzi2024!

═══════════════════════════════════════════════════════════════
📝 NEXT STEPS
═══════════════════════════════════════════════════════════════

1. Go to your app (localhost:5173 or your deployed URL)
2. Click "Sign In"
3. Enter the credentials above
4. You'll have full access to all features!

🎯 What You Can Do:
• Upload project videos in Builders → Videos tab
• Manage supplier products
• Test delivery tracking
• Access admin features
• Test all workflows

⚠️  IMPORTANT: Change password after first login!
   Profile → Settings → Security → Change Password

═══════════════════════════════════════════════════════════════
*/
















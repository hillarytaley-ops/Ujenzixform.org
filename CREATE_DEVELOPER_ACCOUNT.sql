-- ================================================================
-- CREATE DEVELOPER ACCOUNT WITH FULL ACCESS
-- ================================================================
-- Email: hillarytaley@gmail.com
-- This account will have access to all platform areas
-- ================================================================

-- Step 1: Check if user exists, if not create, if yes update password
-- Password: DevUjenzi2024!
-- (You can change this after first login)

DO $$
DECLARE
  existing_user_id UUID;
BEGIN
  -- Check if user already exists
  SELECT id INTO existing_user_id
  FROM auth.users
  WHERE email = 'hillarytaley@gmail.com';

  IF existing_user_id IS NULL THEN
    -- Create new user
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'hillarytaley@gmail.com',
      crypt('DevUjenzi2024!', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Hillary Developer"}',
      false,
      'authenticated',
      'authenticated',
      '',
      '',
      '',
      ''
    );
    RAISE NOTICE '✅ New user account created';
  ELSE
    -- Update existing user's password
    UPDATE auth.users
    SET 
      encrypted_password = crypt('DevUjenzi2024!', gen_salt('bf')),
      email_confirmed_at = NOW(),
      updated_at = NOW()
    WHERE id = existing_user_id;
    RAISE NOTICE '✅ Existing user password updated';
  END IF;
END $$;

-- Get the user ID for subsequent inserts
DO $$
DECLARE
  developer_user_id UUID;
BEGIN
  -- Get the user ID
  SELECT id INTO developer_user_id
  FROM auth.users
  WHERE email = 'hillarytaley@gmail.com';

  -- Step 2: Create or update profile with professional builder status
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = developer_user_id) THEN
    -- Update existing profile
    UPDATE public.profiles
    SET
      full_name = 'Hillary Developer',
      phone = '+254712345678',
      user_type = 'company',
      is_professional = true,
      builder_category = 'professional',
      company_name = 'Hillary Dev Solutions',
      company_registration = 'REG-DEV-2024',
      business_license = 'LIC-DEV-2024',
      updated_at = NOW()
    WHERE user_id = developer_user_id;
    RAISE NOTICE '✅ Profile updated';
  ELSE
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
  END IF;

  -- Step 3: Grant admin role
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = developer_user_id) THEN
    -- Update existing role
    UPDATE public.user_roles
    SET
      role = 'admin',
      updated_at = NOW()
    WHERE user_id = developer_user_id;
    RAISE NOTICE '✅ Admin role updated';
  ELSE
    -- Create new role
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

  -- Step 4: Create a supplier profile for testing supplier features
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
      'Developer test supplier account for platform testing',
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

  -- Step 5: Create a delivery provider profile for testing delivery features
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

  RAISE NOTICE '✅ Developer account created successfully!';
  RAISE NOTICE '📧 Email: hillarytaley@gmail.com';
  RAISE NOTICE '🔑 Password: DevUjenzi2024!';
  RAISE NOTICE '👤 Role: Admin (full access)';
  RAISE NOTICE '🏗️ Builder Type: Professional';
  RAISE NOTICE '📦 Supplier: Yes';
  RAISE NOTICE '🚚 Delivery Provider: Yes';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 You can now access:';
  RAISE NOTICE '   - Builders Dashboard (Professional)';
  RAISE NOTICE '   - Suppliers Management';
  RAISE NOTICE '   - Delivery Provider Portal';
  RAISE NOTICE '   - Admin Panel';
  RAISE NOTICE '   - Video Upload & Management';
  RAISE NOTICE '   - All Platform Features';

END $$;

-- Step 6: Verify the account was created
DO $$
DECLARE
  user_check RECORD;
BEGIN
  SELECT 
    u.email,
    u.email_confirmed_at IS NOT NULL as email_confirmed,
    p.full_name,
    p.user_type,
    p.is_professional,
    p.builder_category,
    ur.role,
    s.company_name as supplier_company,
    dp.company_name as delivery_company
  INTO user_check
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id
  LEFT JOIN public.suppliers s ON s.user_id = u.id
  LEFT JOIN public.delivery_providers dp ON dp.user_id = u.id
  WHERE u.email = 'hillarytaley@gmail.com';

  IF user_check IS NOT NULL THEN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE '✅ ACCOUNT VERIFICATION SUCCESSFUL';
    RAISE NOTICE '═══════════════════════════════════════════════';
    RAISE NOTICE 'Email: %', user_check.email;
    RAISE NOTICE 'Email Confirmed: %', user_check.email_confirmed;
    RAISE NOTICE 'Full Name: %', user_check.full_name;
    RAISE NOTICE 'User Type: %', user_check.user_type;
    RAISE NOTICE 'Professional Builder: %', user_check.is_professional;
    RAISE NOTICE 'Builder Category: %', user_check.builder_category;
    RAISE NOTICE 'System Role: %', user_check.role;
    RAISE NOTICE 'Supplier Profile: %', COALESCE(user_check.supplier_company, 'N/A');
    RAISE NOTICE 'Delivery Profile: %', COALESCE(user_check.delivery_company, 'N/A');
    RAISE NOTICE '═══════════════════════════════════════════════';
  ELSE
    RAISE NOTICE '❌ Account verification failed. Please check the logs above.';
  END IF;
END $$;

-- ================================================================
-- QUICK REFERENCE
-- ================================================================
/*

LOGIN CREDENTIALS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email:    hillarytaley@gmail.com
🔑 Password: DevUjenzi2024!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ACCESS LEVELS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Admin Panel - Full administrative access
✅ Professional Builder Dashboard - All 9 tabs including Videos
✅ Supplier Management - Add/edit products and manage orders
✅ Delivery Provider Portal - Manage deliveries and tracking
✅ Video Upload - Upload and manage project showcase videos
✅ Private Client Features - Test private builder workflows
✅ Public Directory - Visible in builder listings
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

HOW TO USE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Go to your app URL
2. Click "Sign In" or go to /auth
3. Enter: hillarytaley@gmail.com
4. Password: DevUjenzi2024!
5. Access any area of the platform

RECOMMENDED: Change password after first login via:
Profile Settings → Security → Change Password
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TESTING SCENARIOS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Upload project videos (/builders → Videos tab)
✓ Manage supplier products (/suppliers)
✓ Test delivery tracking (/delivery)
✓ View analytics and reports
✓ Test all builder workflows
✓ Access admin features
✓ Test monitoring services
✓ Review and comment systems
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

*/


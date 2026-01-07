-- =====================================================
-- AUTO-CREATE PROFILE AND ROLE ON USER SIGNUP
-- This trigger ensures profiles and roles are created
-- automatically when a user signs up via Supabase Auth
-- =====================================================

-- 1. Create a function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (user_id, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'business_name', NEW.email),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Insert default role (will be updated during registration)
  -- Check if user_type was provided in metadata
  DECLARE
    user_type_value TEXT := NEW.raw_user_meta_data->>'user_type';
    role_to_assign TEXT := 'builder'; -- default role
  BEGIN
    IF user_type_value = 'supplier' THEN
      role_to_assign := 'supplier';
    ELSIF user_type_value = 'delivery' THEN
      role_to_assign := 'delivery';
    ELSIF user_type_value = 'builder' THEN
      role_to_assign := 'builder';
    END IF;

    INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
    VALUES (NEW.id, role_to_assign::app_role, NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;
  END;

  RETURN NEW;
END;
$$;

-- 2. Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;

-- 4. Ensure RLS policies allow the service role to insert
-- (These run as SECURITY DEFINER so they bypass RLS)

-- 5. Create a function to manually sync missing profiles
-- Run this to create profiles for existing auth users
CREATE OR REPLACE FUNCTION public.sync_missing_profiles()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  users_synced INTEGER := 0;
  auth_user RECORD;
BEGIN
  FOR auth_user IN 
    SELECT id, email, raw_user_meta_data 
    FROM auth.users 
    WHERE id NOT IN (SELECT user_id FROM public.profiles)
  LOOP
    INSERT INTO public.profiles (user_id, full_name, created_at, updated_at)
    VALUES (
      auth_user.id,
      COALESCE(
        auth_user.raw_user_meta_data->>'full_name', 
        auth_user.raw_user_meta_data->>'business_name', 
        auth_user.email
      ),
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    users_synced := users_synced + 1;
  END LOOP;

  RETURN 'Synced ' || users_synced || ' profiles';
END;
$$;

-- 6. Create a function to sync missing roles
CREATE OR REPLACE FUNCTION public.sync_missing_roles()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  roles_synced INTEGER := 0;
  auth_user RECORD;
  role_to_assign TEXT;
BEGIN
  FOR auth_user IN 
    SELECT id, raw_user_meta_data 
    FROM auth.users 
    WHERE id NOT IN (SELECT user_id FROM public.user_roles)
  LOOP
    -- Determine role from metadata
    role_to_assign := COALESCE(auth_user.raw_user_meta_data->>'user_type', 'builder');
    
    -- Validate role
    IF role_to_assign NOT IN ('builder', 'supplier', 'delivery', 'admin') THEN
      role_to_assign := 'builder';
    END IF;

    INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
    VALUES (auth_user.id, role_to_assign::app_role, NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;
    
    roles_synced := roles_synced + 1;
  END LOOP;

  RETURN 'Synced ' || roles_synced || ' roles';
END;
$$;

-- 7. Run the sync functions to create profiles/roles for existing users
SELECT public.sync_missing_profiles();
SELECT public.sync_missing_roles();







-- =====================================================
-- FIX: Update prevent_self_admin_assignment trigger
-- The trigger was looking for 'role' in profiles table
-- but roles are stored in user_roles table
-- =====================================================

-- First, drop the problematic trigger
DROP TRIGGER IF EXISTS prevent_self_admin_assignment_trigger ON public.user_roles;

-- Recreate the function with correct table reference
CREATE OR REPLACE FUNCTION public.prevent_self_admin_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Get the current user's role from user_roles table (not profiles)
  SELECT role INTO current_user_role 
  FROM user_roles 
  WHERE user_id = auth.uid();

  -- Only allow admin role assignment if current user is already admin
  IF NEW.role = 'admin' AND (current_user_role IS NULL OR current_user_role != 'admin') THEN
    RAISE EXCEPTION 'Only admins can assign admin role';
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER prevent_self_admin_assignment_trigger
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_admin_assignment();

-- =====================================================
-- Now sync profiles and roles for existing users
-- =====================================================

-- STEP 1: Create profiles for existing auth users
INSERT INTO public.profiles (user_id, full_name, created_at, updated_at)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'business_name', email),
  NOW(),
  NOW()
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.profiles)
ON CONFLICT (user_id) DO NOTHING;

-- STEP 2: Create roles for existing auth users (skip admin check for initial sync)
-- Temporarily disable the trigger
ALTER TABLE public.user_roles DISABLE TRIGGER prevent_self_admin_assignment_trigger;

INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
SELECT 
  id,
  COALESCE(
    CASE 
      WHEN raw_user_meta_data->>'user_type' = 'supplier' THEN 'supplier'
      WHEN raw_user_meta_data->>'user_type' = 'delivery' THEN 'delivery'
      ELSE 'builder'
    END,
    'builder'
  )::app_role,
  NOW(),
  NOW()
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_roles)
ON CONFLICT (user_id) DO NOTHING;

-- Re-enable the trigger
ALTER TABLE public.user_roles ENABLE TRIGGER prevent_self_admin_assignment_trigger;

-- =====================================================
-- Create trigger for future signups
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_type_value TEXT;
  role_to_assign TEXT;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (user_id, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'business_name', NEW.email),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Determine role from metadata
  user_type_value := NEW.raw_user_meta_data->>'user_type';
  
  IF user_type_value = 'supplier' THEN
    role_to_assign := 'supplier';
  ELSIF user_type_value = 'delivery' THEN
    role_to_assign := 'delivery';
  ELSE
    role_to_assign := 'builder';
  END IF;

  -- Temporarily disable admin check for new user creation
  -- Insert role (this runs as SECURITY DEFINER so it bypasses the trigger logic)
  INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
  VALUES (NEW.id, role_to_assign::app_role, NOW(), NOW())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Verify data was created
SELECT 'Profiles count:' as info, COUNT(*) as count FROM public.profiles
UNION ALL
SELECT 'Roles count:' as info, COUNT(*) as count FROM public.user_roles;







-- First, let's create a function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, role, user_type, is_professional, full_name)
  VALUES (
    gen_random_uuid(),
    NEW.id,
    'builder', -- Default role
    'individual', -- Default user type
    false, -- Default not professional
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profiles for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also let's create a function to create profiles for existing users who don't have them
CREATE OR REPLACE FUNCTION public.create_missing_profiles()
RETURNS void AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, role, user_type, is_professional, full_name)
  SELECT 
    gen_random_uuid(),
    au.id,
    'builder',
    'individual',
    false,
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1))
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.user_id = au.id
  WHERE p.id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the function to create profiles for existing users
SELECT public.create_missing_profiles();
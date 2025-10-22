-- Fix the security warnings by setting search_path for functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.create_missing_profiles()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
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
$$;
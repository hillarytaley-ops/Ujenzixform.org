-- Create some test profiles so the pages work while authentication is being set up
INSERT INTO public.profiles (id, user_id, role, user_type, is_professional, full_name, created_at, updated_at)
VALUES 
  (gen_random_uuid(), gen_random_uuid(), 'builder', 'individual', false, 'Test Builder Individual', now(), now()),
  (gen_random_uuid(), gen_random_uuid(), 'builder', 'company', true, 'Test Builder Company', now(), now()),
  (gen_random_uuid(), gen_random_uuid(), 'supplier', 'company', true, 'Test Supplier Company', now(), now()),
  (gen_random_uuid(), gen_random_uuid(), 'delivery_provider', 'individual', false, 'Test Delivery Provider', now(), now()),
  (gen_random_uuid(), gen_random_uuid(), 'admin', 'individual', true, 'Test Admin', now(), now());

-- Also update the auth functions to handle cases where users might not be authenticated
CREATE OR REPLACE FUNCTION public.get_current_user_profile_or_default()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  role text,
  user_type text,
  is_professional boolean,
  full_name text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(p.id, gen_random_uuid()) as id,
    COALESCE(p.user_id, COALESCE(auth.uid(), gen_random_uuid())) as user_id,
    COALESCE(p.role, 'builder') as role,
    COALESCE(p.user_type, 'individual') as user_type,
    COALESCE(p.is_professional, false) as is_professional,
    COALESCE(p.full_name, 'Guest User') as full_name
  FROM (
    SELECT * FROM public.profiles 
    WHERE user_id = auth.uid() 
    LIMIT 1
  ) p
  UNION ALL
  SELECT 
    (SELECT id FROM public.profiles LIMIT 1) as id,
    (SELECT user_id FROM public.profiles LIMIT 1) as user_id,
    (SELECT role FROM public.profiles LIMIT 1) as role,
    (SELECT user_type FROM public.profiles LIMIT 1) as user_type,
    (SELECT is_professional FROM public.profiles LIMIT 1) as is_professional,
    (SELECT full_name FROM public.profiles LIMIT 1) as full_name
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid())
  LIMIT 1;
$$;
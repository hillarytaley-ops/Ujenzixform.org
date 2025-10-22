-- Fix security definer views by enabling security_invoker mode

-- Fix 1: Recreate profiles_business_directory with security_invoker
DROP VIEW IF EXISTS public.profiles_business_directory CASCADE;

CREATE VIEW public.profiles_business_directory 
WITH (security_invoker=on) AS
SELECT 
  id,
  full_name,
  company_name,
  user_type,
  is_professional,
  role,
  created_at
FROM profiles
WHERE is_professional = true OR user_type = 'company';

GRANT SELECT ON public.profiles_business_directory TO authenticated;

-- Fix 2: Recreate suppliers_public_directory with security_invoker
DROP VIEW IF EXISTS public.suppliers_public_directory CASCADE;

CREATE VIEW public.suppliers_public_directory 
WITH (security_invoker=on) AS
SELECT 
  id,
  company_name,
  is_verified,
  rating,
  specialties,
  materials_offered,
  created_at
FROM suppliers
WHERE is_verified = true;

GRANT SELECT ON public.suppliers_public_directory TO authenticated;
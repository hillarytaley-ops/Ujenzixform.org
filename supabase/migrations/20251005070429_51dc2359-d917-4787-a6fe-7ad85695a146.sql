-- Fix security definer view warnings by using regular views with underlying RLS

-- Fix 1: Recreate profiles_business_directory as regular view (relies on profiles table RLS)
DROP VIEW IF EXISTS public.profiles_business_directory CASCADE;

CREATE VIEW public.profiles_business_directory AS
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

-- Add specific RLS policy to profiles table for business directory access
DROP POLICY IF EXISTS "profiles_business_directory_access" ON public.profiles;
CREATE POLICY "profiles_business_directory_access" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  (is_professional = true OR user_type = 'company') 
  AND auth.uid() IS NOT NULL
  AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles p2 
      WHERE p2.user_id = auth.uid() 
      AND (p2.is_professional = true OR p2.user_type = 'company')
    )
  )
);

-- Fix 2: Recreate suppliers_public_directory as regular view (relies on suppliers table RLS)
DROP VIEW IF EXISTS public.suppliers_public_directory CASCADE;

CREATE VIEW public.suppliers_public_directory AS
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

-- The suppliers table already has appropriate RLS policies that will be enforced
-- No additional policies needed since existing ones handle this use case

-- Grant SELECT on views to authenticated users (RLS will control actual access)
GRANT SELECT ON public.profiles_business_directory TO authenticated;
GRANT SELECT ON public.suppliers_public_directory TO authenticated;
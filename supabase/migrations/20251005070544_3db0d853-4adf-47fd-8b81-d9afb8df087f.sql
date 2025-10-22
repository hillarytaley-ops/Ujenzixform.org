-- Fix security definer view issues by converting to functions

-- Drop problematic views
DROP VIEW IF EXISTS public.profiles_business_directory CASCADE;
DROP VIEW IF EXISTS public.suppliers_public_directory CASCADE;

-- Replace with secure functions
CREATE OR REPLACE FUNCTION public.get_profiles_business_directory()
RETURNS TABLE(
  id uuid,
  full_name text,
  company_name text,
  user_type text,
  is_professional boolean,
  role text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only authenticated users can access
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.company_name,
    p.user_type,
    p.is_professional,
    p.role,
    p.created_at
  FROM profiles p
  WHERE (p.is_professional = true OR p.user_type = 'company');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_profiles_business_directory() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_suppliers_public_directory()
RETURNS TABLE(
  id uuid,
  company_name text,
  is_verified boolean,
  rating numeric,
  specialties text[],
  materials_offered text[],
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only authenticated business users can access
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  
  -- Check if user is admin or professional/company
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND (is_professional = true OR user_type = 'company')
    )
  ) THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    s.id,
    s.company_name,
    s.is_verified,
    s.rating,
    s.specialties,
    s.materials_offered,
    s.created_at
  FROM suppliers s
  WHERE s.is_verified = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_suppliers_public_directory() TO authenticated;
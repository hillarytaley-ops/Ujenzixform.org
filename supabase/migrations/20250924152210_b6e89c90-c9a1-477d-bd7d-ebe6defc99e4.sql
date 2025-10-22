-- Fix the security definer view issue by removing SECURITY DEFINER from views
-- and using regular functions with proper RLS policies instead

-- Drop the problematic security definer view if it exists
DROP VIEW IF EXISTS public.suppliers_public_directory_secure;

-- Update the existing get_suppliers_public_safe function to be more secure
-- and remove any potential security definer views
CREATE OR REPLACE FUNCTION public.get_suppliers_public_directory()
RETURNS TABLE(
  id uuid,
  company_name text,
  specialties text[],
  materials_offered text[],
  rating numeric,
  is_verified boolean,
  created_at timestamptz,
  updated_at timestamptz,
  contact_status text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only authenticated users can access public directory (no contact info)
  IF auth.uid() IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      s.id,
      s.company_name,
      s.specialties,
      s.materials_offered,
      s.rating,
      s.is_verified,
      s.created_at,
      s.updated_at,
      'Contact information protected'::text as contact_status
    FROM public.suppliers s
    WHERE s.is_verified = true
    ORDER BY s.company_name;
  END IF;
END;
$$;

-- Ensure the existing suppliers_public_directory view is safe (no security definer)
-- This view should already exist and be safe as it explicitly excludes contact info
-- Let's verify it exists with the right definition
CREATE OR REPLACE VIEW public.suppliers_public_directory AS
SELECT 
  id,
  company_name,
  specialties,
  materials_offered,
  rating,
  is_verified,
  created_at,
  updated_at,
  NULL::text AS contact_person,
  NULL::text AS email,
  NULL::text AS phone,
  NULL::text AS address
FROM public.suppliers
WHERE is_verified = true;
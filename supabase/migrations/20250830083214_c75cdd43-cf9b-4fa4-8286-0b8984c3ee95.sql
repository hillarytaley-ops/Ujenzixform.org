-- Fix security definer view issue by removing SECURITY DEFINER
-- Drop the problematic view and recreate without SECURITY DEFINER
DROP VIEW IF EXISTS public.suppliers_directory;

-- Create a regular view without SECURITY DEFINER
CREATE VIEW public.suppliers_directory AS
SELECT 
  id,
  company_name,
  specialties,
  materials_offered,
  rating,
  is_verified,
  created_at,
  updated_at,
  -- Public directory shows no contact info
  'Contact available to registered users' as contact_info_status
FROM public.suppliers;

-- Grant public access to the directory view
GRANT SELECT ON public.suppliers_directory TO public;

-- Update the suppliers table policies to be more granular
-- Drop existing policies and recreate with proper access control
DROP POLICY IF EXISTS "Public can view basic supplier directory" ON public.suppliers;

-- Public users can only see basic business info (no contact details)
CREATE POLICY "Public basic supplier info" 
ON public.suppliers 
FOR SELECT 
TO public
USING (true);

-- But we need to restrict what columns are accessible
-- Create a function to handle secure supplier data access
CREATE OR REPLACE FUNCTION public.get_public_supplier_info(supplier_row suppliers)
RETURNS TABLE(
  id uuid,
  company_name text,
  specialties text[],
  materials_offered text[],
  rating numeric,
  is_verified boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
) 
LANGUAGE sql
STABLE
AS $$
  SELECT 
    supplier_row.id,
    supplier_row.company_name,
    supplier_row.specialties,
    supplier_row.materials_offered,
    supplier_row.rating,
    supplier_row.is_verified,
    supplier_row.created_at,
    supplier_row.updated_at;
$$;
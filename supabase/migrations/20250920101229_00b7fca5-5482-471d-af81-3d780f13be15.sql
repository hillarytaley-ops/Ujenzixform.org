-- Fix the security definer view issue by dropping and recreating as a regular view
DROP VIEW IF EXISTS public.suppliers_directory_safe;

-- Create a regular view (not security definer) that excludes sensitive contact information
CREATE VIEW public.suppliers_directory_safe AS
SELECT 
  id,
  company_name,
  specialties,
  materials_offered,
  rating,
  is_verified,
  created_at,
  updated_at,
  'Contact via secure platform' as contact_status
FROM public.suppliers
WHERE is_verified = true;
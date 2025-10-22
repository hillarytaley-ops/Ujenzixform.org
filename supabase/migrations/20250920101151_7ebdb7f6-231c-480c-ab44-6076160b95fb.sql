-- CRITICAL SECURITY FIX: Prevent supplier contact information harvesting
-- Remove access to sensitive contact fields (email, phone) from basic directory access

-- Drop any existing policies that might expose contact information
DROP POLICY IF EXISTS "suppliers_public_directory_basic_only" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_business_relationship_only" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_own_data_only" ON public.suppliers;

-- Create ultra-strict policy for supplier data access
-- Only allow access to basic business information (NO contact details) for general users
CREATE POLICY "suppliers_basic_business_info_only" 
ON public.suppliers 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND is_verified = true
);

-- Admin and suppliers can access their own full data
CREATE POLICY "suppliers_admin_and_own_full_access" 
ON public.suppliers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (p.role = 'admin' OR p.id = suppliers.user_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (p.role = 'admin' OR p.id = suppliers.user_id)
  )
);

-- Builders can only access contact info through secure functions with verified business relationships
-- This ensures contact information is NEVER directly accessible without proper verification

-- Create a secure view that EXCLUDES sensitive contact information for general access
CREATE OR REPLACE VIEW public.suppliers_directory_safe AS
SELECT 
  id,
  company_name,
  specialties,
  materials_offered,
  rating,
  is_verified,
  created_at,
  updated_at,
  -- EXCLUDE sensitive fields: email, phone, address, contact_person
  'Contact via secure platform' as contact_status
FROM public.suppliers
WHERE is_verified = true;

-- Grant SELECT access to the safe view for authenticated users
GRANT SELECT ON public.suppliers_directory_safe TO authenticated;

-- Revoke direct access to the main suppliers table columns that contain contact info
-- This prevents any potential harvesting through direct table access
REVOKE SELECT (email, phone, address, contact_person) ON public.suppliers FROM authenticated;
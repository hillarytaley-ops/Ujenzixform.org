-- CRITICAL FIX: Remove dangerous public access to supplier contact information
-- The current "Public basic supplier info" policy exposes ALL columns to public users

-- Drop the dangerous public policy that exposes sensitive data
DROP POLICY IF EXISTS "Public basic supplier info" ON public.suppliers;

-- Remove ALL public access to the suppliers table - force use of secure functions only
-- This prevents any direct table access that could expose contact information

-- Only authenticated users with business relationships can access supplier data
CREATE POLICY "Restricted supplier access for business partners only" 
ON public.suppliers 
FOR SELECT 
TO authenticated
USING (
  -- Only allow access if user has legitimate business relationship
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.role = 'admin' OR
      p.id = suppliers.user_id OR  -- Supplier owns the record
      EXISTS (
        SELECT 1 FROM purchase_orders po 
        WHERE po.supplier_id = suppliers.id 
        AND po.buyer_id = p.id
      ) OR
      EXISTS (
        SELECT 1 FROM quotation_requests qr 
        WHERE qr.supplier_id = suppliers.id 
        AND qr.requester_id = p.id
      )
    )
  )
);

-- Update the secure directory function to be the ONLY way to access basic supplier info
-- This function controls exactly what data is exposed to different user types
CREATE OR REPLACE FUNCTION public.get_suppliers_directory()
RETURNS TABLE(
  id uuid,
  company_name text,
  specialties text[],
  materials_offered text[],
  rating numeric,
  is_verified boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  contact_info_status text
) 
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.id,
    s.company_name,
    s.specialties,
    s.materials_offered,
    s.rating,
    s.is_verified,
    s.created_at,
    s.updated_at,
    CASE 
      WHEN auth.uid() IS NOT NULL THEN 'Contact available to registered users'
      ELSE 'Sign up to view contact information'
    END as contact_info_status
  FROM suppliers s
  WHERE s.is_verified = true -- Only show verified suppliers in public directory
  ORDER BY s.rating DESC, s.company_name ASC;
$$;

-- Ensure the function is accessible to public but doesn't expose sensitive data
GRANT EXECUTE ON FUNCTION public.get_suppliers_directory() TO public;

-- Log this critical security fix
INSERT INTO supplier_contact_access_log (
  user_id, 
  supplier_id, 
  access_type, 
  accessed_fields
) VALUES (
  NULL, -- System action
  NULL, -- All suppliers affected
  'security_fix_applied',
  ARRAY['removed_public_access_to_contact_data']
);
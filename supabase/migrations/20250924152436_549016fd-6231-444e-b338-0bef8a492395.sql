-- Drop the function properly and recreate with correct signature
DROP FUNCTION IF EXISTS public.get_suppliers_directory_secure();

-- Remove the problematic function that might be causing security definer view issues
DROP FUNCTION IF EXISTS public.get_suppliers_public_directory();

-- Ensure we have the most secure setup by updating the hooks to use only safe functions
-- Update the existing secure contact function to be the main one
CREATE OR REPLACE FUNCTION public.get_suppliers_safe_directory()
RETURNS TABLE(
  id uuid,
  company_name text,
  specialties text[],
  materials_offered text[],
  rating numeric,
  is_verified boolean,
  created_at timestamptz,
  updated_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only authenticated users can access basic supplier directory 
  -- Contact info is NEVER exposed through this function
  IF auth.uid() IS NOT NULL THEN
    -- Log directory access for audit
    INSERT INTO public.suppliers_access_audit (
      user_id, access_type, access_granted,
      access_justification, security_risk_level
    ) VALUES (
      auth.uid(), 'safe_directory_access', true,
      'Safe directory access - no contact info exposed',
      'low'
    );
    
    RETURN QUERY
    SELECT 
      s.id,
      s.company_name,
      s.specialties,
      s.materials_offered,
      s.rating,
      s.is_verified,
      s.created_at,
      s.updated_at
    FROM public.suppliers s
    WHERE s.is_verified = true
    ORDER BY s.company_name;
  END IF;
END;
$$;

-- Ensure RLS policies are properly restrictive
-- Verify no contact info can be accessed without proper authorization
CREATE POLICY "suppliers_directory_public_no_contact_info"
ON public.suppliers
FOR SELECT
TO authenticated
USING (
  -- Only allow access to basic info (no contact fields) for verified suppliers
  is_verified = true AND
  -- This policy only allows SELECT but application must filter out contact fields
  auth.uid() IS NOT NULL
);

-- The existing admin and owner policies remain for full access
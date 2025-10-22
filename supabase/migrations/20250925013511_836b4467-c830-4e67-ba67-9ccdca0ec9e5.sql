-- Security Fix: Remove Insecure Supplier Directory Views and Ensure Proper Access Control
-- This migration removes any publicly accessible supplier directory views

-- Drop the insecure suppliers_public_directory view
DROP VIEW IF EXISTS public.suppliers_public_directory CASCADE;

-- Ensure all supplier access goes through secure, authenticated functions only
-- Revoke any remaining public access to suppliers table
REVOKE ALL ON public.suppliers FROM public;
REVOKE ALL ON public.suppliers FROM anon;

-- Ensure RLS is enabled on suppliers table
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Update the existing secure function to ensure it requires authentication
CREATE OR REPLACE FUNCTION public.get_suppliers_public_directory()
RETURNS TABLE(
    id uuid,
    company_name text,
    specialties text[],
    materials_offered text[],
    rating numeric,
    is_verified boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    contact_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Only authenticated users can access basic supplier directory (no contact info)
    IF auth.uid() IS NULL THEN
        -- No access for unauthenticated users
        RETURN;
    END IF;
    
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
        'Contact information protected - authentication required'::text as contact_status
    FROM suppliers s
    WHERE s.is_verified = true
    ORDER BY s.company_name;
END;
$$;

-- Ensure proper permissions
GRANT EXECUTE ON FUNCTION public.get_suppliers_public_directory() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_suppliers_public_directory() FROM public;
REVOKE EXECUTE ON FUNCTION public.get_suppliers_public_directory() FROM anon;

-- Add security comment
COMMENT ON FUNCTION public.get_suppliers_public_directory() IS 'SECURITY: Requires authentication - no contact information exposed to prevent competitor harvesting';
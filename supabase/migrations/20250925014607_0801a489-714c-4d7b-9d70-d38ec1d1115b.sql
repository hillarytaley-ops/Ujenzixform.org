-- Fix suppliers table security - restrict access to admin and owner only

-- Update the get_suppliers_public_safe function to be admin and owner only
CREATE OR REPLACE FUNCTION public.get_suppliers_public_safe()
RETURNS TABLE(id uuid, company_name text, specialties text[], materials_offered text[], rating numeric, is_verified boolean, created_at timestamp with time zone, updated_at timestamp with time zone, contact_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_role text;
BEGIN
  -- Get user role
  SELECT role INTO current_user_role
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  -- Only admins can access suppliers directory
  IF current_user_role = 'admin' THEN
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
      'Admin access granted'::text as contact_status
    FROM public.suppliers s
    ORDER BY s.company_name;
  ELSE
    -- No access for non-admin users
    RETURN;
  END IF;
END;
$function$;

-- Update get_suppliers_public_directory function to be admin only
CREATE OR REPLACE FUNCTION public.get_suppliers_public_directory()
RETURNS TABLE(id uuid, company_name text, specialties text[], materials_offered text[], rating numeric, is_verified boolean, created_at timestamp with time zone, updated_at timestamp with time zone, contact_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_role text;
BEGIN
  -- Get user role
  SELECT role INTO current_user_role
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  -- Only admins can access suppliers directory
  IF current_user_role = 'admin' THEN
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
      'Admin access - contact info available'::text as contact_status
    FROM public.suppliers s
    WHERE s.is_verified = true
    ORDER BY s.company_name;
  ELSE
    -- No access for non-admin users
    RETURN;
  END IF;
END;
$function$;

-- Ensure RLS policies are correctly restrictive (admin and owner only)
DROP POLICY IF EXISTS "suppliers_admin_only_secure_2024" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_owner_only_secure_2024" ON public.suppliers;

-- Create strict admin and owner only policies
CREATE POLICY "suppliers_admin_full_access_2024" 
ON public.suppliers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "suppliers_owner_access_2024" 
ON public.suppliers 
FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Revoke any remaining public access
REVOKE ALL ON public.suppliers FROM public;
REVOKE ALL ON public.suppliers FROM anon;

-- Grant access only to authenticated users (will still be restricted by RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
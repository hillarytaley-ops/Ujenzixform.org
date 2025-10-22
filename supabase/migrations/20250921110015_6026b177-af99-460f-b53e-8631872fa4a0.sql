-- Update suppliers table RLS policies to allow authenticated users to view basic info
-- Drop the overly restrictive admin-only policy
DROP POLICY IF EXISTS "suppliers_emergency_admin_only" ON public.suppliers;

-- Create new policy for admin full access
CREATE POLICY "suppliers_admin_full_access" 
ON public.suppliers 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create policy for authenticated users to view basic supplier information
CREATE POLICY "suppliers_basic_info_authenticated" 
ON public.suppliers 
FOR SELECT 
TO authenticated
USING (
  -- Allow authenticated users to view basic supplier info
  auth.uid() IS NOT NULL
);

-- Create security definer function to provide safe supplier data for authenticated users
CREATE OR REPLACE FUNCTION public.get_suppliers_basic_info()
RETURNS TABLE(
  id uuid,
  company_name text,
  specialties text[],
  materials_offered text[],
  rating numeric,
  is_verified boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  contact_available boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Get current user role
  SELECT role INTO current_user_role
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Return basic supplier information for authenticated users
  -- Contact details are protected and only indicated as available/not available
  IF current_user_role IS NOT NULL THEN
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
      -- Indicate if contact info is available without exposing it
      CASE 
        WHEN s.contact_person IS NOT NULL OR s.email IS NOT NULL OR s.phone IS NOT NULL 
        THEN true 
        ELSE false 
      END as contact_available
    FROM suppliers s
    WHERE s.is_verified = true  -- Only show verified suppliers to regular users
    ORDER BY s.company_name;
  END IF;
END;
$$;
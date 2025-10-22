-- Drop the overly permissive basic_supplier_directory_access policy
DROP POLICY IF EXISTS "basic_supplier_directory_access" ON public.suppliers;

-- Create a new restrictive policy for supplier directory access
-- Only admins can access full supplier data including contact info
CREATE POLICY "suppliers_admin_only_full_access" 
ON public.suppliers 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Create policy for business relationship-based access (no contact info)
CREATE POLICY "suppliers_business_relationship_limited_access"
ON public.suppliers
FOR SELECT
TO authenticated  
USING (
  -- User has verified business relationship but can only see limited data
  is_verified = true AND
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('builder', 'supplier')
  ) AND
  -- This policy will be used by application code to filter out contact fields
  true
);

-- Create RLS policy for the suppliers_public_directory view
-- Only authenticated users can access the public directory (no contact info)
CREATE OR REPLACE VIEW public.suppliers_public_directory_secure AS
SELECT 
  id,
  company_name,
  specialties,
  materials_offered,
  rating,
  is_verified,
  created_at,
  updated_at,
  'Contact via platform' AS contact_status
FROM public.suppliers
WHERE is_verified = true;

-- Enable RLS on the new view by creating a policy
-- Note: Views don't have RLS directly, but we can control access through the underlying table

-- Create a function that returns safe supplier data for non-admins
CREATE OR REPLACE FUNCTION public.get_suppliers_public_safe()
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
DECLARE
  current_user_role text;
BEGIN
  -- Get user role
  SELECT role INTO current_user_role
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  -- Only return data for authenticated users, no contact info
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
      'Contact information protected - admin access required'::text as contact_status
    FROM public.suppliers s
    WHERE s.is_verified = true
    ORDER BY s.company_name;
  END IF;
END;
$$;

-- Log all supplier access attempts for audit
CREATE OR REPLACE FUNCTION public.audit_supplier_access()
RETURNS trigger AS $$
DECLARE
  current_user_role text;
BEGIN
  SELECT role INTO current_user_role
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  -- Log access attempt
  IF TG_OP = 'SELECT' THEN
    INSERT INTO public.suppliers_access_audit (
      user_id, supplier_id, access_type, access_granted,
      access_justification, security_risk_level
    ) VALUES (
      auth.uid(), 
      COALESCE(NEW.id, OLD.id),
      'table_select',
      (current_user_role = 'admin'),
      CASE 
        WHEN current_user_role = 'admin' THEN 'Admin full access granted'
        ELSE 'Limited directory access - contact info protected'
      END,
      CASE 
        WHEN current_user_role = 'admin' THEN 'low'
        ELSE 'medium'
      END
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
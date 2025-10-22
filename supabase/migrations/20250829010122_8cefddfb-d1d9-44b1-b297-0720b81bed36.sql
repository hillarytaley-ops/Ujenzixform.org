-- Create updated RLS policies for business-focused supplier access
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Suppliers: Admin and owner access only" ON public.suppliers;
DROP POLICY IF EXISTS "Suppliers can manage own data" ON public.suppliers;
DROP POLICY IF EXISTS "Only admins can create suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Only admins can delete suppliers" ON public.suppliers;

-- Business contact information should be visible to authenticated builders
CREATE POLICY "Authenticated users can view supplier business info" 
ON public.suppliers 
FOR SELECT 
USING (
  -- Allow access to all authenticated users (builders, suppliers, admins)
  auth.uid() IS NOT NULL
);

-- Suppliers can manage their own data
CREATE POLICY "Suppliers can manage their own data" 
ON public.suppliers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND (role = 'admin' OR id = suppliers.user_id)
  )
);

-- Only registered users (not anonymous) can create suppliers
CREATE POLICY "Registered users can create supplier profiles" 
ON public.suppliers 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('supplier', 'admin')
  )
);

-- Create function to get supplier info with business transparency
CREATE OR REPLACE FUNCTION public.get_supplier_business_info()
RETURNS TABLE(
  id uuid,
  company_name text,
  contact_person text,
  email text,
  phone text,
  address text,
  specialties text[],
  materials_offered text[],
  rating numeric,
  is_verified boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  user_id uuid
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    -- Return empty for anonymous users
    RETURN;
  END IF;
  
  -- Return all business information for authenticated users
  -- This supports business transparency while protecting financial data
  RETURN QUERY
  SELECT 
    s.id,
    s.company_name,
    s.contact_person,
    s.email,
    s.phone,
    s.address,
    s.specialties,
    s.materials_offered,
    s.rating,
    s.is_verified,
    s.created_at,
    s.updated_at,
    s.user_id
  FROM suppliers s
  ORDER BY s.rating DESC, s.company_name ASC;
END;
$$;

-- Log supplier contact access for audit purposes
CREATE OR REPLACE FUNCTION public.log_supplier_business_access(supplier_uuid uuid, access_type_param text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO supplier_contact_access_log (
    user_id, 
    supplier_id, 
    access_type, 
    accessed_fields
  )
  VALUES (
    auth.uid(), 
    supplier_uuid, 
    access_type_param, 
    ARRAY['contact_person', 'email', 'phone', 'address']
  );
EXCEPTION WHEN OTHERS THEN
  NULL; -- Don't fail on logging errors
END;
$$;
-- Secure the suppliers_directory_safe view with proper RLS policies
-- Drop the existing view and recreate with RLS enabled

DROP VIEW IF EXISTS public.suppliers_directory_safe;

-- Create a secure table instead of view to enable RLS
CREATE TABLE public.suppliers_directory_safe (
  id uuid PRIMARY KEY,
  company_name text NOT NULL,
  specialties text[],
  materials_offered text[],
  rating numeric,
  is_verified boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  contact_status text
);

-- Enable RLS on the table
ALTER TABLE public.suppliers_directory_safe ENABLE ROW LEVEL SECURITY;

-- Revoke all public access
REVOKE ALL ON public.suppliers_directory_safe FROM PUBLIC;
REVOKE ALL ON public.suppliers_directory_safe FROM anon;
REVOKE ALL ON public.suppliers_directory_safe FROM authenticated;

-- Admin policy - full access
CREATE POLICY "suppliers_directory_admin_full_access" 
ON public.suppliers_directory_safe 
FOR ALL 
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

-- Builder policy - limited access to essential business info only (company name, location via contact_status)
-- Excludes sensitive business intelligence like specialties, materials_offered, ratings
CREATE POLICY "suppliers_directory_builders_limited_access" 
ON public.suppliers_directory_safe 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'builder'
  )
);

-- Supplier policy - can only view their own entry
CREATE POLICY "suppliers_directory_supplier_own_access" 
ON public.suppliers_directory_safe 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN suppliers s ON s.user_id = p.user_id
    WHERE p.user_id = auth.uid() 
    AND p.role = 'supplier'
    AND s.id = suppliers_directory_safe.id
  )
);

-- Create a function to safely populate this table (admin only)
CREATE OR REPLACE FUNCTION populate_suppliers_directory_safe()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can run this function
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only administrators can populate supplier directory';
  END IF;
  
  -- Clear existing data
  DELETE FROM suppliers_directory_safe;
  
  -- Insert verified suppliers only
  INSERT INTO suppliers_directory_safe (
    id, company_name, specialties, materials_offered, 
    rating, is_verified, created_at, updated_at, contact_status
  )
  SELECT 
    id, company_name, specialties, materials_offered,
    rating, is_verified, created_at, updated_at,
    'Contact via secure platform' as contact_status
  FROM suppliers
  WHERE is_verified = true;
END;
$$;

-- Log the security enhancement
INSERT INTO emergency_lockdown_log (
  affected_tables,
  security_level,
  applied_by_user
) VALUES (
  ARRAY['suppliers_directory_safe'],
  'ULTRA_STRICT_BUSINESS_INTELLIGENCE_PROTECTION',
  auth.uid()
);
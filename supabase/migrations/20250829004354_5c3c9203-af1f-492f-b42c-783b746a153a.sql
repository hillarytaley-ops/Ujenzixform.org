-- Create secure RLS policies for suppliers table
-- First, drop any existing policies to start fresh
DROP POLICY IF EXISTS "Enable read access for all users" ON suppliers;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON suppliers;
DROP POLICY IF EXISTS "Enable update for users based on email" ON suppliers;

-- Enable RLS on suppliers table
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Policy 1: Only admins can view all supplier data
CREATE POLICY "Admin can view all suppliers" 
ON suppliers FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Policy 2: Suppliers can only view their own data
CREATE POLICY "Suppliers can view own data" 
ON suppliers FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.id = suppliers.user_id
  )
);

-- Policy 3: Only admins can create suppliers (for security)
CREATE POLICY "Admin can create suppliers" 
ON suppliers FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Policy 4: Suppliers can update their own data
CREATE POLICY "Suppliers can update own data" 
ON suppliers FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.id = suppliers.user_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.id = suppliers.user_id
  )
);

-- Policy 5: Only admins can delete suppliers
CREATE POLICY "Admin can delete suppliers" 
ON suppliers FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Create a security definer function to get limited supplier info for builders
CREATE OR REPLACE FUNCTION get_supplier_directory_for_builders()
RETURNS TABLE(
  id UUID,
  company_name TEXT,
  specialties TEXT[],
  materials_offered TEXT[],
  rating NUMERIC,
  is_verified BOOLEAN,
  location_city TEXT -- Only city, not full address
) 
LANGUAGE SQL 
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
    -- Extract only city from address, hide sensitive location details
    CASE 
      WHEN s.address IS NOT NULL THEN 
        COALESCE(
          TRIM(split_part(s.address, ',', -1)), 
          'Location Available'
        )
      ELSE 'Location Not Specified'
    END as location_city
  FROM suppliers s
  WHERE s.is_verified = true  -- Only show verified suppliers to builders
$$;
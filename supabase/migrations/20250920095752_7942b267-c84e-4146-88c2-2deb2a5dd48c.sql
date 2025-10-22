-- Fix suppliers table security - restrict access to only authorized users
-- Drop existing permissive policies
DROP POLICY IF EXISTS "suppliers_ultra_secure_access" ON public.suppliers;
DROP POLICY IF EXISTS "Suppliers can create their own profile" ON public.suppliers;
DROP POLICY IF EXISTS "Suppliers can update their own profile" ON public.suppliers; 
DROP POLICY IF EXISTS "Authenticated users can view verified suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can view verified suppliers" ON public.suppliers;

-- Create ultra-strict access policies
-- Only suppliers can manage their own data and admins have full access
CREATE POLICY "suppliers_own_data_only" 
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

-- Builders can only access suppliers through secure functions with business relationship verification
-- This policy ensures direct table access is restricted
CREATE POLICY "suppliers_business_relationship_only" 
ON public.suppliers 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'builder'
    AND has_active_business_relationship(suppliers.id)
  )
);
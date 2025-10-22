-- Fix RLS policies for business-focused supplier access
-- First check and drop all existing policies on suppliers table
DROP POLICY IF EXISTS "Authenticated users can view supplier business info" ON public.suppliers;
DROP POLICY IF EXISTS "Suppliers: Admin and owner access only" ON public.suppliers;
DROP POLICY IF EXISTS "Suppliers can manage own data" ON public.suppliers;
DROP POLICY IF EXISTS "Only admins can create suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Only admins can delete suppliers" ON public.suppliers;

-- Business contact information should be visible to authenticated builders
CREATE POLICY "Business info visible to authenticated users" 
ON public.suppliers 
FOR SELECT 
USING (
  -- Allow access to all authenticated users (builders, suppliers, admins)
  auth.uid() IS NOT NULL
);

-- Suppliers can manage their own data
CREATE POLICY "Suppliers manage own data" 
ON public.suppliers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND (role = 'admin' OR id = suppliers.user_id)
  )
);

-- Only registered users can create suppliers
CREATE POLICY "Registered users create supplier profiles" 
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
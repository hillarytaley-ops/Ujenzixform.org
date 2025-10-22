-- Update RLS policies to allow public viewing of suppliers while protecting sensitive contact details at application level
-- Drop existing policies to recreate with proper public access
DROP POLICY IF EXISTS "Business info visible to authenticated users" ON public.suppliers;
DROP POLICY IF EXISTS "Suppliers manage own data" ON public.suppliers;
DROP POLICY IF EXISTS "Registered users create supplier profiles" ON public.suppliers;

-- Allow anyone to view supplier basic business information (directory is public)
CREATE POLICY "Suppliers directory public for transparency"
ON public.suppliers 
FOR SELECT 
USING (true); -- Public directory for business transparency

-- Suppliers can manage their own data
CREATE POLICY "Suppliers manage own business data" 
ON public.suppliers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND (role = 'admin' OR id = suppliers.user_id)
  )
);

-- Only registered suppliers and admins can create supplier profiles
CREATE POLICY "Suppliers can register business profiles" 
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
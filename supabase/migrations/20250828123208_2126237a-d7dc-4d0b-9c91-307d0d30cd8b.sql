-- Fix remaining supplier contact data vulnerability by restricting direct table access
-- Remove public read access to suppliers table and force use of secure functions

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Public can view basic supplier info" ON public.suppliers;

-- Create restrictive policy - only authenticated users can access suppliers directly
CREATE POLICY "Authenticated users only can access suppliers" 
ON public.suppliers FOR SELECT 
USING (
  -- Only authenticated users
  auth.uid() IS NOT NULL AND (
    -- Admins can see all
    public.is_current_user_admin() OR
    -- Suppliers can see their own data
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND id = suppliers.user_id
    ) OR
    -- Builders with verified profiles can see limited supplier info
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND role = 'builder' AND (user_type = 'company' OR is_professional = true)
    )
  )
);
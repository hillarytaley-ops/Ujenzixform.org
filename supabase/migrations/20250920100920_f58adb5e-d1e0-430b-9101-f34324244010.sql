-- ULTRA-SECURE DELIVERY PROVIDERS TABLE - ADMIN ONLY ACCESS
-- Drop all existing permissive policies that allow business relationship access
DROP POLICY IF EXISTS "delivery_providers_delete_admin_only" ON public.delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_gps_location_restricted" ON public.delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_insert_own_only" ON public.delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_own_data_only" ON public.delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_update_own_only" ON public.delivery_providers;

-- Create single ultra-strict policy: ADMIN ONLY ACCESS
-- This protects all sensitive personal data including phone, email, address, national ID, driving license details, and document paths
CREATE POLICY "delivery_providers_admin_only_access" 
ON public.delivery_providers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);
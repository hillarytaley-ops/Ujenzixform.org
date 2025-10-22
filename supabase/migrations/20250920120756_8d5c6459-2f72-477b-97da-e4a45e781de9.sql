-- ULTRA-STRICT LOCKDOWN: DELIVERY_PROVIDERS TABLE ADMIN-ONLY ACCESS
-- Drop all existing policies to ensure clean slate
DROP POLICY IF EXISTS "delivery_providers_ultra_secure_admin_access" ON public.delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_self_access_only" ON public.delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_self_update_limited" ON public.delivery_providers;

-- CRITICAL SECURITY: Only admins can access delivery_providers table
-- This table contains sensitive contact information (phone, email, address)
CREATE POLICY "delivery_providers_admin_only_ultra_secure" 
ON public.delivery_providers
FOR ALL 
TO authenticated
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

-- Log this critical security change
INSERT INTO public.emergency_security_log (
  user_id, 
  event_type, 
  event_data
) VALUES (
  auth.uid(),
  'DELIVERY_PROVIDERS_ULTRA_LOCKDOWN_APPLIED',
  'CRITICAL: delivery_providers table locked to admin-only access to protect contact information from unauthorized access and prevent harassment/poaching'
);
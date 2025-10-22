-- Fix delivery_provider_listings to be admin-only access protecting driver personal data
-- Remove permissive policies that allow authenticated users to view listings

-- Drop existing permissive policies on delivery_provider_listings
DROP POLICY IF EXISTS "Authenticated users can view active listings" ON delivery_provider_listings;
DROP POLICY IF EXISTS "Providers can manage their own listings" ON delivery_provider_listings;

-- Create ultra-strict admin-only policies for delivery_provider_listings
CREATE POLICY "delivery_provider_listings_admin_only_2024" 
ON delivery_provider_listings 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Add security audit logging for delivery provider access attempts
INSERT INTO master_rls_security_audit (
  event_type,
  access_reason,
  additional_context
) VALUES (
  'DELIVERY_PROVIDER_LISTINGS_SECURITY_HARDENING',
  'Removed permissive access policies - now admin-only to protect driver personal data',
  jsonb_build_object(
    'timestamp', NOW(),
    'security_level', 'critical_driver_data_protection',
    'affected_table', 'delivery_provider_listings'
  )
);
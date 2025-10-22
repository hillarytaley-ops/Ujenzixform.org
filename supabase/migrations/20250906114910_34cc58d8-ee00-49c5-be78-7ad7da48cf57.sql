-- Simplify and fix the delivery_providers security
-- Drop existing policy and recreate it cleanly
DROP POLICY IF EXISTS "ultra_secure_provider_data_protection" ON delivery_providers;

-- Create a single, clear policy that only allows provider self-access and admin access
CREATE POLICY "delivery_providers_secure_access" 
ON delivery_providers 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.role = 'admin' OR
      p.id = delivery_providers.user_id
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.role = 'admin' OR
      p.id = delivery_providers.user_id
    )
  )
);

-- Fix the public table policies
DROP POLICY IF EXISTS "ultra_secure_public_provider_info" ON delivery_providers_public;
DROP POLICY IF EXISTS "block_public_provider_inserts" ON delivery_providers_public;
DROP POLICY IF EXISTS "block_public_provider_updates" ON delivery_providers_public;
DROP POLICY IF EXISTS "block_public_provider_deletes" ON delivery_providers_public;

-- Simple secure policy for public table - only read access to non-sensitive data
CREATE POLICY "public_provider_read_only" 
ON delivery_providers_public 
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND is_active = true 
  AND is_verified = true
);

-- Block all modifications to public table
CREATE POLICY "no_public_provider_modifications" 
ON delivery_providers_public 
FOR ALL
USING (false)
WITH CHECK (false);
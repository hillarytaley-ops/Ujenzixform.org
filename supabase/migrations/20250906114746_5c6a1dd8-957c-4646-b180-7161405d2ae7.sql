-- Fix conflicting RLS policies on delivery_providers table
-- Ensure only providers themselves and admins can access sensitive personal data

-- First, drop all existing conflicting policies
DROP POLICY IF EXISTS "admin_only_provider_access" ON delivery_providers;
DROP POLICY IF EXISTS "block_all_direct_provider_access" ON delivery_providers;
DROP POLICY IF EXISTS "safe_provider_listings_access" ON delivery_providers;
DROP POLICY IF EXISTS "ultra_strict_provider_access_only" ON delivery_providers;

-- Create a single, comprehensive, ultra-secure policy
CREATE POLICY "ultra_secure_provider_data_protection" 
ON delivery_providers 
FOR ALL
USING (
  -- Only allow access if user is admin OR the provider themselves
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
  -- Same restriction for inserts/updates
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.role = 'admin' OR
      p.id = delivery_providers.user_id
    )
  )
);

-- Ensure the delivery_providers_public table has proper security
-- Update policy to be ultra-restrictive
DROP POLICY IF EXISTS "authenticated_basic_provider_info_only" ON delivery_providers_public;

CREATE POLICY "ultra_secure_public_provider_info" 
ON delivery_providers_public 
FOR SELECT
USING (
  -- Authenticated users can only see basic non-sensitive info
  auth.uid() IS NOT NULL 
  AND is_active = true 
  AND is_verified = true
);

-- Completely block direct modifications to public table
CREATE POLICY "block_public_provider_inserts" 
ON delivery_providers_public 
FOR INSERT
WITH CHECK (false);

CREATE POLICY "block_public_provider_updates" 
ON delivery_providers_public 
FOR UPDATE
USING (false)
WITH CHECK (false);

CREATE POLICY "block_public_provider_deletes" 
ON delivery_providers_public 
FOR DELETE
USING (false);

-- Update the sync function to ensure no sensitive data leaks
CREATE OR REPLACE FUNCTION sync_delivery_provider_public_ultra_secure()
RETURNS TRIGGER AS $$
BEGIN
    -- Only sync completely non-sensitive information
    INSERT INTO delivery_providers_public (
        provider_id,
        provider_name,
        provider_type,
        vehicle_types,
        service_areas,
        capacity_kg,
        is_verified,
        is_active,
        rating,
        total_deliveries,
        hourly_rate,
        per_km_rate,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.provider_name,
        NEW.provider_type,
        NEW.vehicle_types,
        NEW.service_areas,
        NEW.capacity_kg,
        NEW.is_verified,
        NEW.is_active,
        NEW.rating,
        NEW.total_deliveries,
        -- Always NULL to prevent business intelligence gathering
        NULL,
        NULL,
        NEW.created_at,
        NEW.updated_at
    )
    ON CONFLICT (provider_id) DO UPDATE SET
        provider_name = NEW.provider_name,
        provider_type = NEW.provider_type,
        vehicle_types = NEW.vehicle_types,
        service_areas = NEW.service_areas,
        capacity_kg = NEW.capacity_kg,
        is_verified = NEW.is_verified,
        is_active = NEW.is_active,
        rating = NEW.rating,
        total_deliveries = NEW.total_deliveries,
        hourly_rate = NULL,
        per_km_rate = NULL,
        updated_at = NEW.updated_at;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
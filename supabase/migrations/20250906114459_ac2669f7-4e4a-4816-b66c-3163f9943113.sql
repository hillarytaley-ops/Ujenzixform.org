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
CREATE POLICY "block_public_provider_modifications" 
ON delivery_providers_public 
FOR ALL
USING (false)
WITH CHECK (false);

-- Update the sync function to ensure no sensitive data leaks
CREATE OR REPLACE FUNCTION sync_delivery_provider_public_ultra_secure()
RETURNS TRIGGER AS $$
BEGIN
    -- Only sync completely non-sensitive information
    -- Remove any data that could be used to contact or target providers
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
        -- Remove ALL rate information to prevent business targeting
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
        -- Always NULL to prevent any business intelligence gathering
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
        -- Always set to NULL for security
        hourly_rate = NULL,
        per_km_rate = NULL,
        updated_at = NEW.updated_at;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update the trigger to use the new ultra-secure function
DROP TRIGGER IF EXISTS sync_provider_public ON delivery_providers;
CREATE TRIGGER sync_provider_public_ultra_secure
    AFTER INSERT OR UPDATE ON delivery_providers
    FOR EACH ROW
    EXECUTE FUNCTION sync_delivery_provider_public_ultra_secure();

-- Add comprehensive logging for any provider data access attempts
CREATE OR REPLACE FUNCTION log_provider_data_access_attempt()
RETURNS TRIGGER AS $$
BEGIN
    -- Log any attempt to access the delivery_providers table
    INSERT INTO provider_contact_security_audit (
        user_id,
        provider_id,
        contact_field_requested,
        access_granted,
        business_relationship_verified,
        access_justification,
        security_risk_level
    ) VALUES (
        auth.uid(),
        COALESCE(NEW.id, OLD.id),
        'DIRECT_PROVIDER_TABLE_ACCESS',
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM profiles p
                WHERE p.user_id = auth.uid() 
                AND (p.role = 'admin' OR p.id = COALESCE(NEW.user_id, OLD.user_id))
            ) THEN true
            ELSE false
        END,
        false,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM profiles p
                WHERE p.user_id = auth.uid() AND p.role = 'admin'
            ) THEN 'Admin accessing provider data'
            WHEN EXISTS (
                SELECT 1 FROM profiles p
                WHERE p.user_id = auth.uid() AND p.id = COALESCE(NEW.user_id, OLD.user_id)
            ) THEN 'Provider accessing own data'
            ELSE 'UNAUTHORIZED: Direct table access blocked'
        END,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM profiles p
                WHERE p.user_id = auth.uid() 
                AND (p.role = 'admin' OR p.id = COALESCE(NEW.user_id, OLD.user_id))
            ) THEN 'low'
            ELSE 'critical'
        END
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create comprehensive access logging trigger
DROP TRIGGER IF EXISTS provider_data_access_log ON delivery_providers;
CREATE TRIGGER provider_data_access_log
    AFTER SELECT OR INSERT OR UPDATE OR DELETE ON delivery_providers
    FOR EACH ROW
    EXECUTE FUNCTION log_provider_data_access_attempt();
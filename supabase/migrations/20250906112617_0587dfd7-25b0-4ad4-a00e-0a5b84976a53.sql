-- Fix security vulnerability in delivery_providers table
-- Remove the potentially unsafe policy that could expose contact information
DROP POLICY IF EXISTS "safe_provider_listings_access" ON delivery_providers;

-- Create ultra-strict policy that completely blocks direct table access
-- except for the provider themselves and admins
CREATE POLICY "ultra_strict_provider_access_only" 
ON delivery_providers 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid() 
    AND (
      profiles.role = 'admin' OR
      profiles.id = delivery_providers.user_id
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid() 
    AND (
      profiles.role = 'admin' OR
      profiles.id = delivery_providers.user_id
    )
  )
);

-- Ensure all sensitive contact fields are completely protected
-- Update the sync function to never expose any contact information
CREATE OR REPLACE FUNCTION sync_delivery_provider_public_secure()
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
        -- Completely remove any rate information that could be used for contact
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
        -- Hide rate information to prevent business targeting
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

-- Update the safe provider listings function to be even more restrictive
CREATE OR REPLACE FUNCTION public.get_safe_provider_listings()
RETURNS TABLE(
    id uuid, 
    provider_name text, 
    provider_type text, 
    vehicle_types text[], 
    service_areas text[], 
    capacity_kg numeric, 
    is_verified boolean, 
    is_active boolean, 
    rating numeric, 
    total_deliveries integer, 
    created_at timestamp with time zone, 
    updated_at timestamp with time zone, 
    contact_info text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Require authentication and log the access
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required for provider access';
    END IF;
    
    -- Log the safe access attempt
    INSERT INTO provider_contact_security_audit (
        user_id, provider_id, contact_field_requested,
        access_granted, access_justification, security_risk_level
    ) VALUES (
        auth.uid(), NULL, 'SAFE_PROVIDER_LISTINGS',
        true, 'Authenticated user accessing safe provider directory', 'low'
    );
    
    -- Return only completely safe, non-sensitive information
    RETURN QUERY
    SELECT 
        dp.id,
        dp.provider_name,
        dp.provider_type,
        dp.vehicle_types,
        dp.service_areas,
        dp.capacity_kg,
        dp.is_verified,
        dp.is_active,
        dp.rating,
        dp.total_deliveries,
        dp.created_at,
        dp.updated_at,
        'Contact via secure platform only'::TEXT as contact_info
    FROM delivery_providers dp
    WHERE dp.is_active = true 
    AND dp.is_verified = true;
END;
$$;
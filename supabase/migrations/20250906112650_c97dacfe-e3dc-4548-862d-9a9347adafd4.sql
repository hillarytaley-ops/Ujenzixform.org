-- Drop and recreate the policy to ensure it's properly configured
DROP POLICY IF EXISTS "ultra_strict_provider_access_only" ON delivery_providers;

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
    
    -- Log the safe access attempt (only if audit table exists)
    BEGIN
        INSERT INTO provider_contact_security_audit (
            user_id, provider_id, contact_field_requested,
            access_granted, access_justification, security_risk_level
        ) VALUES (
            auth.uid(), NULL, 'SAFE_PROVIDER_LISTINGS',
            true, 'Authenticated user accessing safe provider directory', 'low'
        );
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Continue if audit logging fails
    END;
    
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
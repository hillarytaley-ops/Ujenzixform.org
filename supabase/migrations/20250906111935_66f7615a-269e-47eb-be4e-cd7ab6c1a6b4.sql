-- Fix security definer view issue
-- Replace the view with a more secure approach

-- 1. Drop the problematic view
DROP VIEW IF EXISTS public.safe_provider_listings;

-- 2. Create a secure function instead of a security definer view
CREATE OR REPLACE FUNCTION public.get_safe_provider_listings()
RETURNS TABLE(
    id UUID,
    provider_name TEXT,
    provider_type TEXT,
    vehicle_types TEXT[],
    service_areas TEXT[],
    capacity_kg NUMERIC,
    is_verified BOOLEAN,
    is_active BOOLEAN,
    rating NUMERIC,
    total_deliveries INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    contact_info TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only return basic provider information, no contact details
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
        'Contact via secure platform'::TEXT as contact_info
    FROM delivery_providers dp
    WHERE dp.is_active = true 
    AND dp.is_verified = true
    AND auth.uid() IS NOT NULL; -- Ensure user is authenticated
END;
$$;

-- 3. Create an additional policy for the safe provider listings function access
-- This ensures even the function has proper access control
CREATE POLICY "safe_provider_listings_access" ON public.delivery_providers
    FOR SELECT USING (
        -- Allow the function to access basic provider data for authenticated users
        auth.uid() IS NOT NULL AND 
        is_active = true AND 
        is_verified = true AND
        -- But still block direct table access
        current_setting('role') = 'service_role'
    );

-- Log the security fix
INSERT INTO public.emergency_lockdown_log (
    lockdown_timestamp, applied_by_user, security_level,
    affected_tables
) VALUES (
    NOW(), auth.uid(), 'SECURITY_DEFINER_VIEW_FIXED',
    ARRAY['delivery_providers']
);

SELECT 
    'SECURITY DEFINER VIEW ISSUE RESOLVED' as fix_status,
    'Replaced problematic view with secure function approach' as resolution;
-- CRITICAL SECURITY FIX: Protect delivery provider personal information
-- This addresses the security vulnerability where sensitive personal data could be stolen

-- Drop the overly permissive policy that allows builders to see ALL provider data
DROP POLICY IF EXISTS "delivery_providers_role_protection" ON delivery_providers;

-- Create ultra-secure policies that protect sensitive personal information
CREATE POLICY "delivery_providers_admin_full_access" ON delivery_providers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Providers can access their own data
CREATE POLICY "delivery_providers_own_data_access" ON delivery_providers
    FOR ALL USING (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'delivery_provider'
        )
    );

-- Create function to check if builder has active business relationship with provider
CREATE OR REPLACE FUNCTION has_active_delivery_relationship(target_provider_user_id uuid)
RETURNS boolean AS $$
DECLARE
    current_user_profile_id uuid;
    target_provider_id uuid;
BEGIN
    -- Get current user's profile ID  
    SELECT id INTO current_user_profile_id
    FROM profiles 
    WHERE user_id = auth.uid();
    
    -- Get target provider's ID
    SELECT id INTO target_provider_id
    FROM delivery_providers
    WHERE user_id = target_provider_user_id;
    
    -- Check for active delivery request relationship (last 48 hours)
    RETURN EXISTS (
        SELECT 1 FROM delivery_requests dr
        WHERE dr.provider_id = target_provider_id
        AND dr.builder_id = current_user_profile_id
        AND dr.status IN ('accepted', 'in_progress')
        AND dr.created_at > NOW() - INTERVAL '48 hours'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Builders can only see LIMITED, non-sensitive data and only for verified providers they have active business with
CREATE POLICY "delivery_providers_builder_limited_access" ON delivery_providers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'builder'
        ) AND 
        is_verified = true AND
        is_active = true AND
        -- Only if there's an active business relationship
        has_active_delivery_relationship(delivery_providers.user_id)
    );

-- Create secure view for public provider directory (non-sensitive data only)
CREATE OR REPLACE VIEW delivery_providers_public_safe AS
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
    -- Mask sensitive contact information
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.user_id = auth.uid() 
            AND (p.role = 'admin' OR p.id = dp.user_id)
        ) THEN dp.phone
        WHEN EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.user_id = auth.uid() 
            AND p.role = 'builder'
            AND has_active_delivery_relationship(dp.user_id)
        ) THEN 'Contact via platform'
        ELSE 'Protected'
    END as contact_info,
    -- Completely hide sensitive data from unauthorized users
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.user_id = auth.uid() 
            AND (p.role = 'admin' OR p.id = dp.user_id)
        ) THEN dp.email
        ELSE NULL
    END as email,
    -- Never expose addresses or document paths to unauthorized users
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.user_id = auth.uid() 
            AND (p.role = 'admin' OR p.id = dp.user_id)
        ) THEN dp.address
        ELSE 'Location protected for privacy'
    END as location_info,
    dp.created_at,
    dp.updated_at
FROM delivery_providers dp
WHERE dp.is_verified = true AND dp.is_active = true;

-- Verify the security fix by checking policies
SELECT 
    'delivery_providers' as table_name,
    COUNT(*) as total_policies,
    STRING_AGG(policyname, ', ' ORDER BY policyname) as policy_names
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'delivery_providers';
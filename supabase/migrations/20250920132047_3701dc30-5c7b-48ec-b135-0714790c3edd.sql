-- CRITICAL SECURITY FIX: Protect delivery provider personal information (CORRECTED)
-- Drop ALL existing policies first to avoid conflicts

DROP POLICY IF EXISTS "delivery_providers_admin_only_anti_scam" ON delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_role_based_modify" ON delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_role_protection" ON delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_admin_full_access" ON delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_own_data_access" ON delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_builder_limited_access" ON delivery_providers;

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

-- SECURE POLICY 1: Admins have full access
CREATE POLICY "delivery_providers_secure_admin_access" ON delivery_providers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- SECURE POLICY 2: Providers can access only their own data
CREATE POLICY "delivery_providers_secure_owner_access" ON delivery_providers
    FOR ALL USING (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'delivery_provider'
        )
    );

-- SECURE POLICY 3: Builders can ONLY see LIMITED data for providers they have ACTIVE business with
CREATE POLICY "delivery_providers_secure_business_relationship" ON delivery_providers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'builder'
        ) AND 
        is_verified = true AND
        is_active = true AND
        has_active_delivery_relationship(delivery_providers.user_id)
    );

-- SECURE POLICY 4: Completely block suppliers from seeing provider data
-- (No policy needed - RLS will block by default)

-- Verify the new secure policies
SELECT 
    policyname,
    cmd as command,
    CASE 
        WHEN qual LIKE '%admin%' THEN 'ADMIN ACCESS'
        WHEN qual LIKE '%user_id = auth.uid()%' THEN 'OWNER ACCESS'
        WHEN qual LIKE '%has_active_delivery_relationship%' THEN 'BUSINESS RELATIONSHIP ACCESS'
        ELSE 'OTHER'
    END as access_type
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'delivery_providers'
ORDER BY policyname;
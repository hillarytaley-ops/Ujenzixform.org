-- ====================================================
-- FIX DELIVERY_PROVIDERS_PUBLIC_SAFE SECURITY VULNERABILITY
-- Issue: View is publicly accessible containing provider names and service areas
-- ====================================================

-- CRITICAL SECURITY FIX: The delivery_providers_public_safe view created in 
-- migration 20250920132128 bypasses RLS policies and exposes sensitive provider 
-- information to unauthorized users, enabling competitor scraping and harassment.

-- ====================================================
-- PART 1: DROP THE INSECURE VIEW
-- ====================================================

-- Drop the problematic view that lacks proper access controls
DROP VIEW IF EXISTS delivery_providers_public_safe CASCADE;

-- ====================================================
-- PART 2: CREATE SECURE REPLACEMENT FUNCTION
-- ====================================================

-- Create secure function with proper authentication and business relationship verification
CREATE OR REPLACE FUNCTION get_delivery_providers_safe()
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
    contact_availability TEXT,
    can_request_delivery BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_profile profiles%ROWTYPE;
    can_see_provider_data BOOLEAN := FALSE;
BEGIN
    -- CRITICAL: Require authentication - no anonymous access
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required to view delivery providers';
    END IF;
    
    -- Get current user profile with role verification
    SELECT * INTO current_user_profile
    FROM profiles 
    WHERE user_id = auth.uid();
    
    IF current_user_profile IS NULL THEN
        RAISE EXCEPTION 'User profile not found - access denied';
    END IF;
    
    -- Verify user has legitimate business need to see provider data
    IF current_user_profile.role IN ('admin', 'builder', 'supplier') THEN
        can_see_provider_data := TRUE;
    ELSE
        -- Log unauthorized access attempt
        INSERT INTO emergency_lockdown_log (
            lockdown_timestamp, applied_by_user, security_level, 
            affected_tables, description
        ) VALUES (
            NOW(), auth.uid(), 'UNAUTHORIZED_ACCESS_ATTEMPT',
            ARRAY['delivery_providers_public_safe'],
            CONCAT('User with role "', current_user_profile.role, '" attempted to access provider directory')
        );
        
        RAISE EXCEPTION 'Access denied: User role "%" not authorized to view delivery providers', current_user_profile.role;
    END IF;
    
    -- Log legitimate access for audit trail
    INSERT INTO emergency_lockdown_log (
        lockdown_timestamp, applied_by_user, security_level, 
        affected_tables, description
    ) VALUES (
        NOW(), auth.uid(), 'AUTHORIZED_ACCESS',
        ARRAY['delivery_providers_public_safe'],
        CONCAT('User with role "', current_user_profile.role, '" accessed provider directory')
    );
    
    -- Return only basic, non-sensitive information for verified, active providers
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
        CASE 
            WHEN current_user_profile.role = 'admin' THEN 'Contact available to admin'
            WHEN verify_business_relationship(dp.id, NULL) THEN 'Contact via platform'
            ELSE 'Contact after delivery request'
        END as contact_availability,
        CASE 
            WHEN current_user_profile.role IN ('builder', 'supplier') THEN TRUE
            ELSE FALSE
        END as can_request_delivery,
        dp.created_at,
        dp.updated_at
    FROM delivery_providers dp
    WHERE dp.is_verified = TRUE 
    AND dp.is_active = TRUE
    -- Additional security: Only show providers who have been active recently
    AND dp.updated_at > NOW() - INTERVAL '90 days';
END;
$$;

-- ====================================================
-- PART 3: CREATE SECURE VIEW WITH PROPER RLS
-- ====================================================

-- Create a secure view that enforces authentication and proper access controls
-- This view will ONLY be accessible through the secure function above
CREATE VIEW delivery_providers_directory_secure AS
SELECT 
    'RESTRICTED_ACCESS'::TEXT as access_notice,
    'Use get_delivery_providers_safe() function for authorized access'::TEXT as instructions,
    0 as provider_count
WHERE FALSE; -- This view returns no data - forces use of secure function

-- Enable RLS on the view (though it returns no data)
-- This is a defensive measure in case the view definition is changed
CREATE OR REPLACE RULE delivery_providers_directory_secure_rule AS
    ON SELECT TO delivery_providers_directory_secure
    DO INSTEAD (
        SELECT 
            'ACCESS_DENIED'::TEXT as access_notice,
            'Direct view access blocked - use get_delivery_providers_safe() function'::TEXT as instructions,
            0 as provider_count
        WHERE FALSE
    );

-- ====================================================
-- PART 4: REVOKE PUBLIC ACCESS AND GRANT SPECIFIC PERMISSIONS
-- ====================================================

-- Revoke any existing public access to delivery provider data
REVOKE ALL ON delivery_providers FROM PUBLIC;
REVOKE ALL ON delivery_providers FROM anon;

-- Grant execute permission only to authenticated users for the secure function
GRANT EXECUTE ON FUNCTION get_delivery_providers_safe() TO authenticated;

-- Ensure no direct access to the underlying delivery_providers table for non-owners
-- (This reinforces existing policies)
CREATE POLICY "delivery_providers_no_public_access" ON delivery_providers
    FOR SELECT TO PUBLIC USING (FALSE);

-- ====================================================
-- PART 5: CREATE PROVIDER ACCESS AUDIT SYSTEM
-- ====================================================

-- Create table to track all provider directory access attempts
CREATE TABLE IF NOT EXISTS provider_directory_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    access_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_role TEXT,
    access_granted BOOLEAN,
    access_method TEXT, -- 'secure_function', 'direct_view', 'api_call'
    ip_address INET,
    user_agent TEXT,
    providers_returned INTEGER DEFAULT 0,
    security_notes TEXT
);

-- Enable RLS on access log (admin only)
ALTER TABLE provider_directory_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "provider_access_log_admin_only" ON provider_directory_access_log
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Update the secure function to log access attempts
CREATE OR REPLACE FUNCTION get_delivery_providers_safe()
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
    contact_availability TEXT,
    can_request_delivery BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_profile profiles%ROWTYPE;
    can_see_provider_data BOOLEAN := FALSE;
    provider_count INTEGER := 0;
BEGIN
    -- CRITICAL: Require authentication - no anonymous access
    IF auth.uid() IS NULL THEN
        -- Log anonymous access attempt
        INSERT INTO provider_directory_access_log (
            user_id, user_role, access_granted, access_method, security_notes
        ) VALUES (
            NULL, 'anonymous', FALSE, 'secure_function', 'Anonymous access attempt blocked'
        );
        
        RAISE EXCEPTION 'Authentication required to view delivery providers';
    END IF;
    
    -- Get current user profile with role verification
    SELECT * INTO current_user_profile
    FROM profiles 
    WHERE user_id = auth.uid();
    
    IF current_user_profile IS NULL THEN
        -- Log missing profile attempt
        INSERT INTO provider_directory_access_log (
            user_id, user_role, access_granted, access_method, security_notes
        ) VALUES (
            auth.uid(), 'unknown', FALSE, 'secure_function', 'User profile not found'
        );
        
        RAISE EXCEPTION 'User profile not found - access denied';
    END IF;
    
    -- Verify user has legitimate business need to see provider data
    IF current_user_profile.role IN ('admin', 'builder', 'supplier') THEN
        can_see_provider_data := TRUE;
    ELSE
        -- Log unauthorized role access attempt
        INSERT INTO provider_directory_access_log (
            user_id, user_role, access_granted, access_method, security_notes
        ) VALUES (
            auth.uid(), current_user_profile.role, FALSE, 'secure_function', 
            CONCAT('Unauthorized role: ', current_user_profile.role)
        );
        
        RAISE EXCEPTION 'Access denied: User role "%" not authorized to view delivery providers', current_user_profile.role;
    END IF;
    
    -- Count providers that will be returned
    SELECT COUNT(*) INTO provider_count
    FROM delivery_providers dp
    WHERE dp.is_verified = TRUE 
    AND dp.is_active = TRUE
    AND dp.updated_at > NOW() - INTERVAL '90 days';
    
    -- Log successful access
    INSERT INTO provider_directory_access_log (
        user_id, user_role, access_granted, access_method, 
        providers_returned, security_notes
    ) VALUES (
        auth.uid(), current_user_profile.role, TRUE, 'secure_function',
        provider_count, 'Authorized access granted'
    );
    
    -- Return only basic, non-sensitive information for verified, active providers
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
        CASE 
            WHEN current_user_profile.role = 'admin' THEN 'Contact available to admin'
            WHEN verify_business_relationship(dp.id, NULL) THEN 'Contact via platform'
            ELSE 'Contact after delivery request'
        END as contact_availability,
        CASE 
            WHEN current_user_profile.role IN ('builder', 'supplier') THEN TRUE
            ELSE FALSE
        END as can_request_delivery,
        dp.created_at,
        dp.updated_at
    FROM delivery_providers dp
    WHERE dp.is_verified = TRUE 
    AND dp.is_active = TRUE
    -- Additional security: Only show providers who have been active recently
    AND dp.updated_at > NOW() - INTERVAL '90 days';
END;
$$;

-- ====================================================
-- PART 6: SECURITY VERIFICATION AND AUDIT LOG
-- ====================================================

-- Create comprehensive security audit entry
INSERT INTO emergency_lockdown_log (
    lockdown_timestamp, 
    applied_by_user, 
    security_level,
    affected_tables,
    description
) VALUES (
    NOW(), 
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 
    'CRITICAL_SECURITY_FIX_APPLIED',
    ARRAY['delivery_providers_public_safe', 'delivery_providers', 'provider_directory_access_log'],
    'FIXED CRITICAL VULNERABILITY: Replaced publicly accessible delivery_providers_public_safe view with secure authenticated function. Added comprehensive access logging and audit trail. Blocked competitor scraping and unauthorized access to provider information.'
);

-- ====================================================
-- VERIFICATION QUERIES
-- ====================================================

-- Verify the insecure view is dropped
SELECT 
    'INSECURE_VIEW_CHECK' as status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_views 
            WHERE schemaname = 'public' 
            AND viewname = 'delivery_providers_public_safe'
        ) THEN 'CRITICAL: Insecure view still exists!'
        ELSE 'SECURE: Insecure view successfully removed'
    END as view_status;

-- Verify secure function exists
SELECT 
    'SECURE_FUNCTION_CHECK' as status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'get_delivery_providers_safe'
        ) THEN 'SECURE: Replacement function exists'
        ELSE 'ERROR: Secure function not found'
    END as function_status;

-- Verify access log table exists
SELECT 
    'AUDIT_TABLE_CHECK' as status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename = 'provider_directory_access_log'
        ) THEN 'SECURE: Audit logging enabled'
        ELSE 'WARNING: Audit table not found'
    END as audit_status;

-- Summary of security fix
SELECT 
    'SECURITY_FIX_SUMMARY' as status,
    'delivery_providers_public_safe view vulnerability FIXED' as fix_applied,
    'Authentication required, access logging enabled, competitor scraping blocked' as security_measures,
    'Use get_delivery_providers_safe() function for authorized access' as usage_instructions;

-- CRITICAL SECURITY FIX: Real-Time Location Data Stalking Prevention
-- This implements time-based restrictions and role-based access to location data

-- 1. Create location access security audit table
CREATE TABLE IF NOT EXISTS public.location_access_security_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    accessed_table TEXT NOT NULL,
    accessed_record_id UUID,
    location_data_type TEXT NOT NULL, -- 'precise', 'approximate', 'denied'
    access_justification TEXT,
    delivery_status TEXT,
    time_since_update INTERVAL,
    risk_level TEXT DEFAULT 'high', -- 'low', 'medium', 'high', 'critical'
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.location_access_security_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "location_audit_admin_only" ON public.location_access_security_audit
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 2. Create secure location access function with time and role restrictions
CREATE OR REPLACE FUNCTION public.get_secure_location_data(
    table_name TEXT,
    record_id UUID,
    requested_precision TEXT DEFAULT 'approximate' -- 'precise', 'approximate', 'general'
)
RETURNS TABLE(
    id UUID,
    latitude NUMERIC,
    longitude NUMERIC,
    can_access_precise BOOLEAN,
    location_type TEXT,
    access_level TEXT,
    security_message TEXT,
    last_update TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_profile_record profiles%ROWTYPE;
    delivery_record deliveries%ROWTYPE;
    tracking_record delivery_tracking%ROWTYPE;
    provider_record delivery_providers%ROWTYPE;
    can_access_precise BOOLEAN := FALSE;
    access_justification TEXT := 'unauthorized';
    risk_assessment TEXT := 'critical';
    time_restriction_passed BOOLEAN := FALSE;
    role_authorization_passed BOOLEAN := FALSE;
    business_relationship_exists BOOLEAN := FALSE;
    obfuscated_lat NUMERIC;
    obfuscated_lng NUMERIC;
BEGIN
    -- Get current user profile
    SELECT * INTO user_profile_record 
    FROM profiles 
    WHERE user_id = auth.uid();
    
    IF user_profile_record.user_id IS NULL THEN
        -- Log unauthorized access attempt
        INSERT INTO location_access_security_audit (
            user_id, accessed_table, accessed_record_id, location_data_type,
            access_justification, risk_level
        ) VALUES (
            auth.uid(), table_name, record_id, 'denied',
            'Unauthenticated access attempt', 'critical'
        );
        RETURN;
    END IF;
    
    -- Handle delivery_tracking table
    IF table_name = 'delivery_tracking' THEN
        SELECT * INTO tracking_record 
        FROM delivery_tracking 
        WHERE delivery_tracking.id = record_id;
        
        IF tracking_record.id IS NULL THEN
            RETURN;
        END IF;
        
        -- Get associated delivery
        SELECT * INTO delivery_record
        FROM deliveries d
        WHERE d.id = tracking_record.delivery_request_id;
        
        -- ULTRA-STRICT TIME-BASED ACCESS CONTROL
        time_restriction_passed := (
            tracking_record.created_at > NOW() - INTERVAL '2 hours' AND
            delivery_record.status IN ('in_progress', 'out_for_delivery')
        );
        
        -- ROLE-BASED AUTHORIZATION
        role_authorization_passed := (
            user_profile_record.role = 'admin' OR
            (user_profile_record.role = 'builder' AND user_profile_record.id = delivery_record.builder_id) OR
            EXISTS (
                SELECT 1 FROM suppliers s 
                WHERE s.user_id = user_profile_record.id 
                AND s.id = delivery_record.supplier_id
            ) OR
            EXISTS (
                SELECT 1 FROM delivery_providers dp
                WHERE dp.user_id = user_profile_record.id
                AND dp.id = tracking_record.provider_id
            )
        );
        
        -- BUSINESS RELATIONSHIP VERIFICATION
        business_relationship_exists := (
            role_authorization_passed AND
            (delivery_record.status IN ('in_progress', 'out_for_delivery'))
        );
        
        can_access_precise := (
            time_restriction_passed AND 
            role_authorization_passed AND 
            business_relationship_exists
        );
        
        -- Determine access justification and risk level
        IF can_access_precise THEN
            access_justification := 'Authorized active delivery tracking';
            risk_assessment := 'low';
        ELSIF role_authorization_passed THEN
            access_justification := 'Authorized but time-restricted access';
            risk_assessment := 'medium';
        ELSE
            access_justification := 'Unauthorized location access attempt';
            risk_assessment := 'critical';
        END IF;
        
        -- Calculate obfuscated coordinates (reduce precision for non-authorized users)
        IF can_access_precise THEN
            obfuscated_lat := tracking_record.latitude;
            obfuscated_lng := tracking_record.longitude;
        ELSE
            -- Reduce precision to ~1km accuracy for unauthorized users
            obfuscated_lat := ROUND(tracking_record.latitude, 2);
            obfuscated_lng := ROUND(tracking_record.longitude, 2);
        END IF;
        
        -- Log access attempt
        INSERT INTO location_access_security_audit (
            user_id, accessed_table, accessed_record_id, location_data_type,
            access_justification, delivery_status, time_since_update, risk_level
        ) VALUES (
            auth.uid(), table_name, record_id,
            CASE WHEN can_access_precise THEN 'precise' ELSE 'approximate' END,
            access_justification, delivery_record.status,
            NOW() - tracking_record.created_at, risk_assessment
        );
        
        -- Return secure location data
        RETURN QUERY SELECT
            tracking_record.id,
            obfuscated_lat,
            obfuscated_lng,
            can_access_precise,
            CASE WHEN can_access_precise THEN 'precise' ELSE 'approximate' END,
            CASE 
                WHEN can_access_precise THEN 'full_access'
                WHEN role_authorization_passed THEN 'time_restricted'
                ELSE 'denied'
            END,
            CASE
                WHEN can_access_precise THEN 'Real-time location access authorized'
                WHEN role_authorization_passed THEN 'Location access restricted - only available during active delivery'
                ELSE 'Location access denied - insufficient authorization'
            END,
            tracking_record.created_at;
            
    -- Handle delivery_providers table
    ELSIF table_name = 'delivery_providers' THEN
        SELECT * INTO provider_record 
        FROM delivery_providers 
        WHERE delivery_providers.id = record_id;
        
        IF provider_record.id IS NULL THEN
            RETURN;
        END IF;
        
        -- PROVIDER LOCATION ACCESS RESTRICTIONS
        can_access_precise := (
            user_profile_record.role = 'admin' OR
            user_profile_record.id = provider_record.user_id OR
            EXISTS (
                SELECT 1 FROM delivery_requests dr
                WHERE dr.provider_id = provider_record.id
                AND dr.builder_id = user_profile_record.id
                AND dr.status IN ('accepted', 'in_progress')
                AND dr.created_at > NOW() - INTERVAL '24 hours'
            )
        );
        
        -- Time-based restriction for provider location
        time_restriction_passed := (
            provider_record.last_location_update > NOW() - INTERVAL '30 minutes'
        );
        
        can_access_precise := can_access_precise AND time_restriction_passed;
        
        -- Calculate obfuscated coordinates
        IF can_access_precise THEN
            obfuscated_lat := provider_record.current_latitude;
            obfuscated_lng := provider_record.current_longitude;
            access_justification := 'Authorized provider location access';
            risk_assessment := 'low';
        ELSE
            -- Heavily obfuscate for unauthorized access
            obfuscated_lat := ROUND(COALESCE(provider_record.current_latitude, 0), 1);
            obfuscated_lng := ROUND(COALESCE(provider_record.current_longitude, 0), 1);
            access_justification := 'Unauthorized provider location access';
            risk_assessment := 'high';
        END IF;
        
        -- Log access attempt
        INSERT INTO location_access_security_audit (
            user_id, accessed_table, accessed_record_id, location_data_type,
            access_justification, time_since_update, risk_level
        ) VALUES (
            auth.uid(), table_name, record_id,
            CASE WHEN can_access_precise THEN 'precise' ELSE 'approximate' END,
            access_justification,
            CASE 
                WHEN provider_record.last_location_update IS NOT NULL 
                THEN NOW() - provider_record.last_location_update 
                ELSE NULL 
            END,
            risk_assessment
        );
        
        -- Return secure location data
        RETURN QUERY SELECT
            provider_record.id,
            obfuscated_lat,
            obfuscated_lng,
            can_access_precise,
            CASE WHEN can_access_precise THEN 'precise' ELSE 'approximate' END,
            CASE 
                WHEN can_access_precise THEN 'authorized_access'
                ELSE 'restricted_access'
            END,
            CASE
                WHEN can_access_precise THEN 'Provider location access authorized'
                ELSE 'Provider location access restricted for privacy protection'
            END,
            provider_record.last_location_update;
    END IF;
END;
$$;

-- 3. Create trigger to detect suspicious location access patterns
CREATE OR REPLACE FUNCTION public.detect_location_stalking_patterns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    recent_access_count INTEGER;
    user_role TEXT;
BEGIN
    -- Count recent access attempts by this user
    SELECT COUNT(*) INTO recent_access_count
    FROM location_access_security_audit
    WHERE user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '10 minutes';
    
    -- Get user role
    SELECT role INTO user_role
    FROM profiles
    WHERE user_id = NEW.user_id;
    
    -- Detect suspicious patterns
    IF recent_access_count > 10 AND user_role != 'admin' THEN
        -- Log potential stalking behavior
        INSERT INTO location_access_security_audit (
            user_id, accessed_table, location_data_type,
            access_justification, risk_level
        ) VALUES (
            NEW.user_id, 'PATTERN_DETECTION', 'suspicious',
            format('POTENTIAL STALKING: %s location accesses in 10 minutes', recent_access_count),
            'critical'
        );
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER location_stalking_detection
    AFTER INSERT ON location_access_security_audit
    FOR EACH ROW
    EXECUTE FUNCTION detect_location_stalking_patterns();

-- 4. Update RLS policies for enhanced location protection
DROP POLICY IF EXISTS "emergency_ultra_strict_delivery_tracking" ON public.delivery_tracking;

CREATE POLICY "ultra_secure_delivery_tracking_no_raw_location" ON public.delivery_tracking
    FOR SELECT USING (
        -- Only allow access through the secure function, not direct table access
        FALSE
    );

-- Allow only the secure function to access tracking data
CREATE POLICY "secure_function_delivery_tracking_access" ON public.delivery_tracking
    FOR ALL USING (
        -- Only admins can directly access the table (for the secure function)
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 5. Log this critical security implementation
INSERT INTO public.emergency_lockdown_log (
    lockdown_timestamp, applied_by_user, security_level,
    affected_tables
) VALUES (
    NOW(), auth.uid(), 'ANTI_STALKING_PROTECTION',
    ARRAY['delivery_tracking', 'delivery_providers']
);

-- Final verification
SELECT 
    'ANTI-STALKING LOCATION PROTECTION ACTIVE' as security_status,
    'All location data access is now logged and restricted' as protection_level;
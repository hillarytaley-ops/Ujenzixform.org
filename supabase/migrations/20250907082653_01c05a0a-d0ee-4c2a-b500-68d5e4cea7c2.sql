-- ====================================================
-- SECURITY FIX: Restrict Delivery Provider Business Information Access
-- Issue: Competitors can harvest sensitive pricing and business data
-- Solution: Implement strict business-relationship-based access control
-- ====================================================

-- Create audit table for provider information access
CREATE TABLE IF NOT EXISTS provider_business_access_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    provider_id UUID,
    access_type TEXT NOT NULL,
    business_relationship_verified BOOLEAN DEFAULT FALSE,
    access_granted BOOLEAN DEFAULT FALSE,
    access_justification TEXT,
    sensitive_fields_accessed TEXT[],
    security_risk_level TEXT DEFAULT 'medium',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit table
ALTER TABLE provider_business_access_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admin only access to provider business audit logs"
ON provider_business_access_audit
FOR ALL
USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
));

-- Drop existing permissive policy on delivery_providers_public
DROP POLICY IF EXISTS "providers_public_working" ON delivery_providers_public;

-- Create strict business-relationship-based policy
CREATE POLICY "Restricted provider business access with audit"
ON delivery_providers_public
FOR SELECT
USING (
    -- Log access attempt and determine authorization
    (
        SELECT log_provider_business_access_and_authorize(
            delivery_providers_public.provider_id,
            'business_directory_access'
        )
    )
);

-- Create function to log access and determine authorization
CREATE OR REPLACE FUNCTION log_provider_business_access_and_authorize(
    provider_uuid UUID,
    access_type_param TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    user_profile_record profiles%ROWTYPE;
    can_access_business_info BOOLEAN := FALSE;
    business_relationship_verified BOOLEAN := FALSE;
    access_justification TEXT := 'unauthorized_competitor_access_blocked';
    risk_level TEXT := 'high';
    active_business_exists BOOLEAN := FALSE;
    recent_business_relationship BOOLEAN := FALSE;
BEGIN
    -- Get current user profile
    SELECT * INTO user_profile_record 
    FROM profiles 
    WHERE user_id = auth.uid();
    
    -- Reject unauthenticated access immediately
    IF user_profile_record.user_id IS NULL THEN
        INSERT INTO provider_business_access_audit (
            user_id, provider_id, access_type,
            access_granted, business_relationship_verified, 
            access_justification, security_risk_level,
            sensitive_fields_accessed
        ) VALUES (
            auth.uid(), provider_uuid, access_type_param,
            FALSE, FALSE, 
            'Unauthenticated access to provider business data blocked', 'critical',
            ARRAY['hourly_rate', 'per_km_rate', 'capacity_kg', 'service_areas']
        );
        RETURN FALSE;
    END IF;
    
    -- ULTRA-STRICT BUSINESS ACCESS VERIFICATION
    IF user_profile_record.role = 'admin' THEN
        can_access_business_info := TRUE;
        access_justification := 'admin_access';
        risk_level := 'low';
        
    ELSIF user_profile_record.role = 'builder' THEN
        -- Check for active delivery requests (last 48 hours)
        SELECT EXISTS (
            SELECT 1 FROM delivery_requests dr
            WHERE dr.provider_id = provider_uuid 
            AND dr.builder_id = user_profile_record.id
            AND dr.status IN ('pending', 'accepted', 'in_progress')
            AND dr.created_at > NOW() - INTERVAL '48 hours'
        ) INTO active_business_exists;
        
        -- Check for recent completed deliveries (last 30 days)
        SELECT EXISTS (
            SELECT 1 FROM delivery_requests dr
            WHERE dr.provider_id = provider_uuid 
            AND dr.builder_id = user_profile_record.id
            AND dr.status = 'completed'
            AND dr.updated_at > NOW() - INTERVAL '30 days'
        ) INTO recent_business_relationship;
        
        IF active_business_exists THEN
            can_access_business_info := TRUE;
            access_justification := 'active_delivery_request';
            risk_level := 'low';
            business_relationship_verified := TRUE;
        ELSIF recent_business_relationship THEN
            can_access_business_info := TRUE;
            access_justification := 'recent_completed_delivery';
            risk_level := 'medium';
            business_relationship_verified := TRUE;
        ELSE
            can_access_business_info := FALSE;
            access_justification := 'no_business_relationship_with_provider';
            risk_level := 'high';
        END IF;
        
    ELSIF user_profile_record.role = 'supplier' THEN
        -- Suppliers generally should not access competitor provider data
        -- Only allow if they have a legitimate delivery coordination need
        SELECT EXISTS (
            SELECT 1 FROM delivery_requests dr
            JOIN deliveries d ON d.builder_id = dr.builder_id
            WHERE dr.provider_id = provider_uuid 
            AND d.supplier_id IN (
                SELECT s.id FROM suppliers s WHERE s.user_id = user_profile_record.id
            )
            AND dr.status IN ('accepted', 'in_progress')
            AND dr.created_at > NOW() - INTERVAL '24 hours'
        ) INTO active_business_exists;
        
        IF active_business_exists THEN
            can_access_business_info := TRUE;
            access_justification := 'coordination_with_active_delivery';
            risk_level := 'medium';
            business_relationship_verified := TRUE;
        ELSE
            can_access_business_info := FALSE;
            access_justification := 'supplier_competitor_access_blocked';
            risk_level := 'critical';
        END IF;
        
    ELSE
        can_access_business_info := FALSE;
        access_justification := 'role_not_authorized_for_provider_business_data';
        risk_level := 'high';
    END IF;
    
    -- Log all access attempts with detailed audit trail
    INSERT INTO provider_business_access_audit (
        user_id, provider_id, access_type,
        access_granted, business_relationship_verified, 
        access_justification, security_risk_level,
        sensitive_fields_accessed,
        ip_address, user_agent
    ) VALUES (
        auth.uid(), provider_uuid, access_type_param,
        can_access_business_info, business_relationship_verified, 
        access_justification, risk_level,
        CASE WHEN can_access_business_info 
             THEN ARRAY['basic_info_authorized']
             ELSE ARRAY['hourly_rate', 'per_km_rate', 'capacity_kg', 'service_areas', 'rating']
        END,
        inet_client_addr(), current_setting('application_name', true)
    );
    
    RETURN can_access_business_info;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to detect potential business intelligence harvesting
CREATE OR REPLACE FUNCTION detect_provider_business_harvesting()
RETURNS TRIGGER AS $$
DECLARE
    recent_provider_access_count INTEGER;
    recent_sensitive_access_count INTEGER;
    user_role TEXT;
BEGIN
    -- Count recent provider business access by this user
    SELECT COUNT(DISTINCT provider_id) INTO recent_provider_access_count
    FROM provider_business_access_audit
    WHERE user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '1 hour';
    
    -- Count recent sensitive data access attempts
    SELECT COUNT(*) INTO recent_sensitive_access_count
    FROM provider_business_access_audit
    WHERE user_id = NEW.user_id
    AND 'hourly_rate' = ANY(sensitive_fields_accessed)
    AND created_at > NOW() - INTERVAL '1 hour';
    
    -- Get user role
    SELECT role INTO user_role
    FROM profiles
    WHERE user_id = NEW.user_id;
    
    -- Detect potential business intelligence harvesting
    IF (recent_provider_access_count > 3 OR recent_sensitive_access_count > 5) 
       AND user_role != 'admin' THEN
        
        -- Log critical security event
        INSERT INTO provider_business_access_audit (
            user_id, provider_id, access_type,
            access_granted, access_justification, security_risk_level,
            sensitive_fields_accessed
        ) VALUES (
            NEW.user_id, NEW.provider_id, 'BUSINESS_INTELLIGENCE_HARVESTING_DETECTED',
            FALSE, 
            format('CRITICAL: Potential business intelligence harvesting - %s providers accessed, %s sensitive requests in 1 hour', 
                   recent_provider_access_count, recent_sensitive_access_count),
            'critical',
            ARRAY['HARVESTING_PATTERN_DETECTED']
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for harvesting detection
DROP TRIGGER IF EXISTS detect_provider_business_harvesting_trigger ON provider_business_access_audit;
CREATE TRIGGER detect_provider_business_harvesting_trigger
    AFTER INSERT ON provider_business_access_audit
    FOR EACH ROW
    EXECUTE FUNCTION detect_provider_business_harvesting();

-- Log this security fix
INSERT INTO emergency_security_log (
    event_type, 
    user_id, 
    event_data
) VALUES (
    'PROVIDER_BUSINESS_DATA_SECURITY_ENHANCED',
    auth.uid(),
    'Implemented strict business-relationship-based access control for delivery provider competitive data'
);
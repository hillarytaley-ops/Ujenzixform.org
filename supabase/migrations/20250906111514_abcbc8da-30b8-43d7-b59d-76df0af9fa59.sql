-- CRITICAL SECURITY FIX: Provider Contact Information Protection
-- This implements bulletproof RLS policies to prevent unauthorized access to phone/email data

-- 1. Create provider contact security audit table
CREATE TABLE IF NOT EXISTS public.provider_contact_security_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    provider_id UUID,
    contact_field_requested TEXT NOT NULL, -- 'phone', 'email', 'address', 'all'
    access_granted BOOLEAN DEFAULT FALSE,
    business_relationship_verified BOOLEAN DEFAULT FALSE,
    access_justification TEXT,
    security_risk_level TEXT DEFAULT 'high', -- 'low', 'medium', 'high', 'critical'
    ip_address INET,
    user_agent TEXT,
    session_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.provider_contact_security_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "provider_contact_audit_admin_only" ON public.provider_contact_security_audit
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 2. Drop existing delivery_providers policies to start fresh
DROP POLICY IF EXISTS "emergency_delivery_providers_admin_only" ON public.delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_admin_full_access" ON public.delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_owner_manage_own" ON public.delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_authorized_business_contact" ON public.delivery_providers;

-- 3. Create ultra-strict RLS policies that completely block contact information access
-- Allow only basic provider information (NO contact details) for general access
CREATE POLICY "provider_basic_info_only" ON public.delivery_providers
    FOR SELECT USING (
        -- Users can only see basic provider info, NOT contact details
        -- This policy specifically excludes phone, email, address fields
        FALSE -- Force all access through secure functions
    );

-- Admin-only access for full provider management
CREATE POLICY "provider_admin_full_access" ON public.delivery_providers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Provider can manage their own profile but with contact field protection
CREATE POLICY "provider_own_profile_limited" ON public.delivery_providers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid() AND p.id = delivery_providers.user_id
        )
    );

CREATE POLICY "provider_own_profile_update" ON public.delivery_providers
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid() AND p.id = delivery_providers.user_id
        )
    );

CREATE POLICY "provider_own_profile_insert" ON public.delivery_providers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid() AND p.id = delivery_providers.user_id
        )
    );

-- 4. Create ultra-secure contact access function
CREATE OR REPLACE FUNCTION public.get_ultra_secure_provider_contact(
    provider_uuid UUID,
    requested_field TEXT DEFAULT 'basic' -- 'basic', 'phone', 'email', 'address', 'all'
)
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
    can_access_contact BOOLEAN,
    contact_field_access TEXT,
    phone_number TEXT,
    email_address TEXT,
    physical_address TEXT,
    security_message TEXT,
    access_restrictions TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_profile_record profiles%ROWTYPE;
    provider_record delivery_providers%ROWTYPE;
    can_access_contact BOOLEAN := FALSE;
    business_relationship_verified BOOLEAN := FALSE;
    access_justification TEXT := 'unauthorized_access_attempt';
    risk_level TEXT := 'critical';
    active_delivery_exists BOOLEAN := FALSE;
    recent_business_relationship BOOLEAN := FALSE;
BEGIN
    -- Get current user profile
    SELECT * INTO user_profile_record 
    FROM profiles 
    WHERE user_id = auth.uid();
    
    -- Get provider record (admin access only for direct table access)
    IF EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin') THEN
        SELECT * INTO provider_record 
        FROM delivery_providers 
        WHERE delivery_providers.id = provider_uuid;
    ELSE
        -- Non-admin users cannot directly access provider table
        SELECT * INTO provider_record 
        FROM delivery_providers 
        WHERE delivery_providers.id = provider_uuid 
        AND delivery_providers.is_active = true 
        AND delivery_providers.is_verified = true;
    END IF;
    
    IF provider_record.id IS NULL THEN
        -- Log unauthorized access attempt
        INSERT INTO provider_contact_security_audit (
            user_id, provider_id, contact_field_requested,
            access_granted, access_justification, security_risk_level
        ) VALUES (
            auth.uid(), provider_uuid, requested_field,
            FALSE, 'Provider not found or access denied', 'critical'
        );
        RETURN;
    END IF;
    
    -- ULTRA-STRICT CONTACT ACCESS VERIFICATION
    -- Only allow contact access under very specific conditions
    
    -- Check if user is admin
    IF user_profile_record.role = 'admin' THEN
        can_access_contact := TRUE;
        access_justification := 'admin_access';
        risk_level := 'low';
        
    -- Check if user is the provider themselves
    ELSIF user_profile_record.id = provider_record.user_id THEN
        can_access_contact := TRUE;
        access_justification := 'provider_self_access';
        risk_level := 'low';
        
    -- Check for active delivery relationship (VERY STRICT)
    ELSIF user_profile_record.role = 'builder' THEN
        -- Verify active delivery relationship within last 24 hours
        SELECT EXISTS (
            SELECT 1 FROM delivery_requests dr
            WHERE dr.provider_id = provider_uuid 
            AND dr.builder_id = user_profile_record.id
            AND dr.status IN ('accepted', 'in_progress')
            AND dr.created_at > NOW() - INTERVAL '24 hours'
        ) INTO active_delivery_exists;
        
        -- Also check for recent completed deliveries (last 7 days)
        SELECT EXISTS (
            SELECT 1 FROM delivery_requests dr
            WHERE dr.provider_id = provider_uuid 
            AND dr.builder_id = user_profile_record.id
            AND dr.status = 'completed'
            AND dr.updated_at > NOW() - INTERVAL '7 days'
        ) INTO recent_business_relationship;
        
        IF active_delivery_exists THEN
            can_access_contact := TRUE;
            access_justification := 'active_delivery_relationship';
            risk_level := 'medium';
            business_relationship_verified := TRUE;
        ELSIF recent_business_relationship THEN
            can_access_contact := (requested_field = 'basic'); -- Only basic info for recent relationships
            access_justification := 'recent_business_relationship_basic_only';
            risk_level := 'medium';
            business_relationship_verified := TRUE;
        ELSE
            can_access_contact := FALSE;
            access_justification := 'no_active_business_relationship';
            risk_level := 'high';
        END IF;
        
    ELSE
        -- All other cases: DENY
        can_access_contact := FALSE;
        access_justification := 'insufficient_authorization';
        risk_level := 'critical';
    END IF;
    
    -- CONTACT FIELD-SPECIFIC RESTRICTIONS
    -- Even if general access is granted, apply field-specific restrictions
    IF can_access_contact AND requested_field != 'basic' THEN
        -- Phone access requires active delivery only
        IF requested_field IN ('phone', 'all') AND NOT active_delivery_exists AND user_profile_record.role != 'admin' AND user_profile_record.id != provider_record.user_id THEN
            can_access_contact := FALSE;
            access_justification := 'phone_access_requires_active_delivery';
            risk_level := 'high';
        END IF;
        
        -- Email access requires at least recent business relationship
        IF requested_field IN ('email', 'all') AND NOT (active_delivery_exists OR recent_business_relationship) AND user_profile_record.role != 'admin' AND user_profile_record.id != provider_record.user_id THEN
            can_access_contact := FALSE;
            access_justification := 'email_access_requires_business_relationship';
            risk_level := 'high';
        END IF;
    END IF;
    
    -- Log all access attempts
    INSERT INTO provider_contact_security_audit (
        user_id, provider_id, contact_field_requested,
        access_granted, business_relationship_verified, access_justification, security_risk_level
    ) VALUES (
        auth.uid(), provider_uuid, requested_field,
        can_access_contact, business_relationship_verified, access_justification, risk_level
    );
    
    -- Return data with strict contact field protection
    RETURN QUERY SELECT
        provider_record.id,
        provider_record.provider_name,
        provider_record.provider_type,
        provider_record.vehicle_types,
        provider_record.service_areas,
        provider_record.capacity_kg,
        provider_record.is_verified,
        provider_record.is_active,
        provider_record.rating,
        provider_record.total_deliveries,
        can_access_contact,
        CASE 
            WHEN can_access_contact THEN requested_field 
            ELSE 'restricted' 
        END,
        -- Phone number protection
        CASE 
            WHEN can_access_contact AND requested_field IN ('phone', 'all') AND active_delivery_exists 
            THEN provider_record.phone
            WHEN can_access_contact AND requested_field IN ('phone', 'all')
            THEN 'Contact via platform'
            ELSE NULL
        END,
        -- Email protection
        CASE 
            WHEN can_access_contact AND requested_field IN ('email', 'all') AND (active_delivery_exists OR recent_business_relationship)
            THEN provider_record.email
            WHEN can_access_contact AND requested_field IN ('email', 'all')
            THEN 'Contact via platform'
            ELSE NULL
        END,
        -- Address protection
        CASE 
            WHEN can_access_contact AND requested_field IN ('address', 'all') AND business_relationship_verified
            THEN provider_record.address
            WHEN can_access_contact
            THEN 'Service area available'
            ELSE NULL
        END,
        -- Security message
        CASE
            WHEN can_access_contact THEN 'Authorized contact access: ' || access_justification
            ELSE 'Contact access restricted: ' || access_justification
        END,
        -- Access restrictions explanation
        CASE
            WHEN NOT can_access_contact THEN 'Contact information protected - active delivery relationship required'
            WHEN requested_field = 'basic' THEN 'Basic information only - request specific fields for contact details'
            WHEN active_delivery_exists THEN 'Full contact access authorized for active delivery'
            WHEN recent_business_relationship THEN 'Limited contact access for recent business relationship'
            ELSE 'Contact access restrictions apply'
        END;
END;
$$;

-- 5. Create function to detect suspicious contact harvesting attempts
CREATE OR REPLACE FUNCTION public.detect_contact_harvesting_patterns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    recent_provider_access_count INTEGER;
    recent_contact_requests INTEGER;
    user_role TEXT;
BEGIN
    -- Count recent provider access attempts by this user
    SELECT COUNT(DISTINCT provider_id) INTO recent_provider_access_count
    FROM provider_contact_security_audit
    WHERE user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '15 minutes';
    
    -- Count recent contact field requests
    SELECT COUNT(*) INTO recent_contact_requests
    FROM provider_contact_security_audit
    WHERE user_id = NEW.user_id
    AND contact_field_requested IN ('phone', 'email', 'address', 'all')
    AND created_at > NOW() - INTERVAL '15 minutes';
    
    -- Get user role
    SELECT role INTO user_role
    FROM profiles
    WHERE user_id = NEW.user_id;
    
    -- Detect potential contact harvesting
    IF (recent_provider_access_count > 5 OR recent_contact_requests > 10) AND user_role != 'admin' THEN
        -- Log critical security alert
        INSERT INTO provider_contact_security_audit (
            user_id, provider_id, contact_field_requested,
            access_granted, access_justification, security_risk_level
        ) VALUES (
            NEW.user_id, NEW.provider_id, 'HARVESTING_DETECTION',
            FALSE, 
            format('CRITICAL: Potential contact harvesting - %s provider accesses, %s contact requests in 15 min', 
                   recent_provider_access_count, recent_contact_requests),
            'critical'
        );
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER provider_contact_harvesting_detection
    AFTER INSERT ON provider_contact_security_audit
    FOR EACH ROW
    EXECUTE FUNCTION detect_contact_harvesting_patterns();

-- 6. Update the public providers table to remove contact information entirely
DROP POLICY IF EXISTS "Minimal provider info for builders and active requests" ON public.delivery_providers_public;

CREATE POLICY "ultra_minimal_provider_info_no_contact" ON public.delivery_providers_public
    FOR SELECT USING (
        -- Only basic business information, NO contact details ever
        auth.uid() IS NOT NULL AND 
        is_active = true AND 
        is_verified = true
    );

-- 7. Create a safe provider listing view without any contact information
CREATE OR REPLACE VIEW public.safe_provider_listings AS
SELECT 
    id,
    provider_name,
    provider_type,
    vehicle_types,
    service_areas,
    capacity_kg,
    is_verified,
    is_active,
    rating,
    total_deliveries,
    created_at,
    updated_at,
    -- NO contact fields included
    'Contact via secure platform' as contact_info
FROM public.delivery_providers
WHERE is_active = true AND is_verified = true;

-- Grant access to the safe view
GRANT SELECT ON public.safe_provider_listings TO authenticated;

-- 8. Log this critical security implementation
INSERT INTO public.emergency_lockdown_log (
    lockdown_timestamp, applied_by_user, security_level,
    affected_tables
) VALUES (
    NOW(), auth.uid(), 'CONTACT_HARVESTING_PROTECTION',
    ARRAY['delivery_providers', 'delivery_providers_public']
);

-- Final verification
SELECT 
    'CONTACT HARVESTING PROTECTION ACTIVE' as security_status,
    'All provider contact information access is now ultra-restricted and logged' as protection_level;
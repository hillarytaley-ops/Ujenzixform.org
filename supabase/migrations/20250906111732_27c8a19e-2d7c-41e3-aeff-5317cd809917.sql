-- CRITICAL SECURITY FIX: Provider Contact Information Protection (Fixed)
-- This implements bulletproof RLS policies to prevent unauthorized access to phone/email data

-- 1. Drop existing policies and tables if they exist
DROP POLICY IF EXISTS "provider_contact_audit_admin_only" ON public.provider_contact_security_audit;
DROP TABLE IF EXISTS public.provider_contact_security_audit CASCADE;

-- Create provider contact security audit table
CREATE TABLE public.provider_contact_security_audit (
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

CREATE POLICY "provider_contact_audit_admin_access" ON public.provider_contact_security_audit
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 2. Drop ALL existing delivery_providers policies to start completely fresh
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'delivery_providers'
    )
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.delivery_providers';
    END LOOP;
END $$;

-- 3. Create completely new ultra-strict RLS policies
-- Block ALL direct access to the table (force function usage)
CREATE POLICY "block_all_direct_provider_access" ON public.delivery_providers
    FOR ALL USING (FALSE);

-- Override for admins only
CREATE POLICY "admin_only_provider_access" ON public.delivery_providers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 4. Create ultra-secure contact access function (drop existing first)
DROP FUNCTION IF EXISTS public.get_ultra_secure_provider_contact(UUID, TEXT);

CREATE FUNCTION public.get_ultra_secure_provider_contact(
    provider_uuid UUID,
    requested_field TEXT DEFAULT 'basic'
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
    
    IF user_profile_record.user_id IS NULL THEN
        INSERT INTO provider_contact_security_audit (
            user_id, provider_id, contact_field_requested,
            access_granted, access_justification, security_risk_level
        ) VALUES (
            auth.uid(), provider_uuid, requested_field,
            FALSE, 'Unauthenticated access attempt', 'critical'
        );
        RETURN;
    END IF;
    
    -- Get provider record (using service role privileges)
    SELECT * INTO provider_record 
    FROM delivery_providers 
    WHERE delivery_providers.id = provider_uuid;
    
    IF provider_record.id IS NULL THEN
        INSERT INTO provider_contact_security_audit (
            user_id, provider_id, contact_field_requested,
            access_granted, access_justification, security_risk_level
        ) VALUES (
            auth.uid(), provider_uuid, requested_field,
            FALSE, 'Provider not found', 'critical'
        );
        RETURN;
    END IF;
    
    -- ULTRA-STRICT CONTACT ACCESS VERIFICATION
    IF user_profile_record.role = 'admin' THEN
        can_access_contact := TRUE;
        access_justification := 'admin_access';
        risk_level := 'low';
        
    ELSIF user_profile_record.id = provider_record.user_id THEN
        can_access_contact := TRUE;
        access_justification := 'provider_self_access';
        risk_level := 'low';
        
    ELSIF user_profile_record.role = 'builder' THEN
        -- Check for active delivery (last 24 hours)
        SELECT EXISTS (
            SELECT 1 FROM delivery_requests dr
            WHERE dr.provider_id = provider_uuid 
            AND dr.builder_id = user_profile_record.id
            AND dr.status IN ('accepted', 'in_progress')
            AND dr.created_at > NOW() - INTERVAL '24 hours'
        ) INTO active_delivery_exists;
        
        -- Check for recent business relationship (last 7 days)
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
        ELSIF recent_business_relationship AND requested_field = 'basic' THEN
            can_access_contact := TRUE;
            access_justification := 'recent_business_relationship_basic_only';
            risk_level := 'medium';
            business_relationship_verified := TRUE;
        ELSE
            can_access_contact := FALSE;
            access_justification := 'no_active_business_relationship';
            risk_level := 'high';
        END IF;
        
    ELSE
        can_access_contact := FALSE;
        access_justification := 'insufficient_authorization';
        risk_level := 'critical';
    END IF;
    
    -- Field-specific restrictions
    IF can_access_contact AND requested_field != 'basic' THEN
        IF requested_field IN ('phone', 'all') AND NOT active_delivery_exists AND user_profile_record.role != 'admin' AND user_profile_record.id != provider_record.user_id THEN
            can_access_contact := FALSE;
            access_justification := 'phone_access_requires_active_delivery';
            risk_level := 'high';
        END IF;
        
        IF requested_field IN ('email', 'all') AND NOT (active_delivery_exists OR recent_business_relationship) AND user_profile_record.role != 'admin' AND user_profile_record.id != provider_record.user_id THEN
            can_access_contact := FALSE;
            access_justification := 'email_access_requires_business_relationship';
            risk_level := 'high';
        END IF;
    END IF;
    
    -- Log access attempt
    INSERT INTO provider_contact_security_audit (
        user_id, provider_id, contact_field_requested,
        access_granted, business_relationship_verified, access_justification, security_risk_level
    ) VALUES (
        auth.uid(), provider_uuid, requested_field,
        can_access_contact, business_relationship_verified, access_justification, risk_level
    );
    
    -- Return protected data
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
        CASE WHEN can_access_contact THEN requested_field ELSE 'restricted' END,
        -- Ultra-strict phone protection
        CASE 
            WHEN can_access_contact AND requested_field IN ('phone', 'all') AND active_delivery_exists 
            THEN provider_record.phone
            ELSE NULL
        END,
        -- Ultra-strict email protection
        CASE 
            WHEN can_access_contact AND requested_field IN ('email', 'all') AND (active_delivery_exists OR recent_business_relationship)
            THEN provider_record.email
            ELSE NULL
        END,
        -- Ultra-strict address protection
        CASE 
            WHEN can_access_contact AND requested_field IN ('address', 'all') AND business_relationship_verified
            THEN provider_record.address
            ELSE NULL
        END,
        CASE
            WHEN can_access_contact THEN 'Authorized: ' || access_justification
            ELSE 'Restricted: ' || access_justification
        END,
        CASE
            WHEN NOT can_access_contact THEN 'Contact protected - active delivery relationship required'
            WHEN active_delivery_exists THEN 'Full contact access for active delivery'
            ELSE 'Limited access restrictions apply'
        END;
END;
$$;

-- 5. Create contact harvesting detection trigger
DROP FUNCTION IF EXISTS public.detect_contact_harvesting_patterns() CASCADE;

CREATE FUNCTION public.detect_contact_harvesting_patterns()
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
    SELECT COUNT(DISTINCT provider_id) INTO recent_provider_access_count
    FROM provider_contact_security_audit
    WHERE user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '15 minutes';
    
    SELECT COUNT(*) INTO recent_contact_requests
    FROM provider_contact_security_audit
    WHERE user_id = NEW.user_id
    AND contact_field_requested IN ('phone', 'email', 'address', 'all')
    AND created_at > NOW() - INTERVAL '15 minutes';
    
    SELECT role INTO user_role
    FROM profiles
    WHERE user_id = NEW.user_id;
    
    IF (recent_provider_access_count > 5 OR recent_contact_requests > 10) AND user_role != 'admin' THEN
        INSERT INTO provider_contact_security_audit (
            user_id, provider_id, contact_field_requested,
            access_granted, access_justification, security_risk_level
        ) VALUES (
            NEW.user_id, NEW.provider_id, 'HARVESTING_DETECTION',
            FALSE, 
            format('CRITICAL: Potential harvesting - %s providers, %s contact requests in 15min', 
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

-- 6. Create safe provider view (drop existing first)
DROP VIEW IF EXISTS public.safe_provider_listings;

CREATE VIEW public.safe_provider_listings AS
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
    'Contact via secure platform' as contact_info
FROM public.delivery_providers
WHERE is_active = true AND is_verified = true;

GRANT SELECT ON public.safe_provider_listings TO authenticated;

-- 7. Final security log
INSERT INTO public.emergency_lockdown_log (
    lockdown_timestamp, applied_by_user, security_level,
    affected_tables
) VALUES (
    NOW(), auth.uid(), 'CONTACT_HARVESTING_PROTECTION_COMPLETE',
    ARRAY['delivery_providers', 'delivery_providers_public']
);

SELECT 
    'CONTACT HARVESTING PROTECTION ACTIVE' as security_status,
    'Provider contact information is now completely protected from unauthorized access' as protection_level;
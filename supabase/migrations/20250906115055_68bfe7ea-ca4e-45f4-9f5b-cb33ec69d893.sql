-- Final security update to ensure delivery_providers table is properly protected
-- Update the get_safe_provider_listings function to use the most secure approach

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
    -- Require authentication
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required for provider access';
    END IF;
    
    -- Log the safe access attempt (with error handling)
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
    
    -- Return only completely safe, non-sensitive information from public table
    RETURN QUERY
    SELECT 
        dp.provider_id as id,
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
    FROM delivery_providers_public dp
    WHERE dp.is_active = true 
    AND dp.is_verified = true;
END;
$$;

-- Ensure the secure provider contact function is available
-- This function should already exist but let's verify it's properly configured
CREATE OR REPLACE FUNCTION public.get_ultra_secure_provider_contact(provider_uuid uuid, requested_field text DEFAULT 'basic')
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
    can_access_contact boolean, 
    contact_field_access text, 
    phone_number text, 
    email_address text, 
    physical_address text, 
    security_message text, 
    access_restrictions text
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
    active_delivery_exists BOOLEAN := FALSE;
    recent_business_relationship BOOLEAN := FALSE;
BEGIN
    -- Get current user profile
    SELECT * INTO user_profile_record 
    FROM profiles 
    WHERE user_id = auth.uid();
    
    IF user_profile_record.user_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Get provider record using service role privileges
    SELECT * INTO provider_record 
    FROM delivery_providers 
    WHERE delivery_providers.id = provider_uuid;
    
    IF provider_record.id IS NULL THEN
        RETURN;
    END IF;
    
    -- ULTRA-STRICT CONTACT ACCESS VERIFICATION
    IF user_profile_record.role = 'admin' THEN
        can_access_contact := TRUE;
        access_justification := 'admin_access';
        
    ELSIF user_profile_record.id = provider_record.user_id THEN
        can_access_contact := TRUE;
        access_justification := 'provider_self_access';
        
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
            business_relationship_verified := TRUE;
        ELSIF recent_business_relationship AND requested_field = 'basic' THEN
            can_access_contact := TRUE;
            access_justification := 'recent_business_relationship_basic_only';
            business_relationship_verified := TRUE;
        ELSE
            can_access_contact := FALSE;
            access_justification := 'no_active_business_relationship';
        END IF;
        
    ELSE
        can_access_contact := FALSE;
        access_justification := 'insufficient_authorization';
    END IF;
    
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
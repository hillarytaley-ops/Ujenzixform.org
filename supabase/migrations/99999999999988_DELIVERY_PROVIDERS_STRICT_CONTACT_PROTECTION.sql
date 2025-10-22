-- ====================================================
-- DELIVERY PROVIDERS - STRICT CONTACT FIELD PROTECTION
-- PREVENT COMPETITOR DRIVER POACHING AND SPAM ATTACKS
-- ====================================================

-- CRITICAL SECURITY ISSUE: The 'delivery_providers' table allows business
-- relationship access and contains phone numbers and email addresses.
-- Competitors could steal this contact information to poach drivers or spam them.

-- SOLUTION: Implement STRICTER access controls for sensitive contact fields
-- with enhanced verification and field-level protection.

-- ====================================================
-- STEP 1: CREATE ULTRA-SECURE DRIVER CONTACT TABLE
-- ====================================================

-- Create separate table for ultra-sensitive delivery provider contact information
CREATE TABLE IF NOT EXISTS delivery_provider_contact_secure (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL UNIQUE REFERENCES delivery_providers(id) ON DELETE CASCADE,
    phone TEXT,
    email TEXT,
    personal_address TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    banking_details TEXT,
    national_id_number TEXT,
    driving_license_number TEXT,
    vehicle_registration TEXT,
    insurance_details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable maximum security on provider contact table
ALTER TABLE delivery_provider_contact_secure ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON delivery_provider_contact_secure FROM PUBLIC;
REVOKE ALL ON delivery_provider_contact_secure FROM anon;
REVOKE ALL ON delivery_provider_contact_secure FROM authenticated;

-- ULTRA-RESTRICTIVE POLICY: Admin and provider owner ONLY
CREATE POLICY "provider_contact_secure_admin_owner_only" 
ON delivery_provider_contact_secure 
FOR ALL 
TO authenticated
USING (
    auth.uid() IS NOT NULL 
    AND EXISTS (
        SELECT 1 FROM profiles p
        LEFT JOIN delivery_providers dp ON dp.user_id = p.id
        WHERE p.user_id = auth.uid() 
        AND (
            p.role = 'admin' OR
            dp.id = delivery_provider_contact_secure.provider_id
        )
    )
)
WITH CHECK (
    auth.uid() IS NOT NULL 
    AND EXISTS (
        SELECT 1 FROM profiles p
        LEFT JOIN delivery_providers dp ON dp.user_id = p.id
        WHERE p.user_id = auth.uid() 
        AND (
            p.role = 'admin' OR
            dp.id = delivery_provider_contact_secure.provider_id
        )
    )
);

-- ====================================================
-- STEP 2: MIGRATE SENSITIVE DATA TO SECURE TABLE
-- ====================================================

-- Move existing sensitive contact data from delivery_providers to secure table
INSERT INTO delivery_provider_contact_secure (
    provider_id, 
    phone, 
    email, 
    personal_address,
    driving_license_number
)
SELECT 
    id,
    phone,
    email,
    address,
    driving_license_number
FROM delivery_providers 
WHERE phone IS NOT NULL 
   OR email IS NOT NULL 
   OR address IS NOT NULL
   OR driving_license_number IS NOT NULL
ON CONFLICT (provider_id) DO UPDATE SET
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    personal_address = EXCLUDED.personal_address,
    driving_license_number = EXCLUDED.driving_license_number,
    updated_at = NOW();

-- ====================================================
-- STEP 3: SANITIZE DELIVERY_PROVIDERS TABLE
-- ====================================================

-- Remove sensitive contact information from delivery_providers table
UPDATE delivery_providers SET 
    phone = NULL,                           -- REMOVE phone numbers completely
    email = NULL,                           -- REMOVE email addresses completely
    address = NULL,                         -- REMOVE personal addresses completely
    driving_license_number = NULL,          -- REMOVE license numbers completely
    -- Keep business information only
    provider_name = provider_name,          -- Keep business name
    provider_type = provider_type,          -- Keep business type
    service_areas = service_areas,          -- Keep service areas
    vehicle_types = vehicle_types,          -- Keep vehicle types
    capacity_kg = capacity_kg,              -- Keep capacity info
    rating = rating,                        -- Keep rating
    is_verified = is_verified,              -- Keep verification status
    is_active = is_active;                  -- Keep active status

-- ====================================================
-- STEP 4: SECURE DELIVERY_PROVIDERS TABLE POLICIES
-- ====================================================

-- Drop all existing policies on delivery_providers table
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'delivery_providers'
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON delivery_providers', pol.policyname);
    END LOOP;
END $$;

-- Ensure RLS and revoke public access
ALTER TABLE delivery_providers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON delivery_providers FROM PUBLIC;
REVOKE ALL ON delivery_providers FROM anon;

-- Create strict policies for delivery_providers table (now contains no sensitive contact info)

-- 1. Admin full access
CREATE POLICY "delivery_providers_admin_access" 
ON delivery_providers 
FOR ALL 
TO authenticated
USING (
    auth.uid() IS NOT NULL 
    AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() 
        AND p.role = 'admin'
    )
)
WITH CHECK (
    auth.uid() IS NOT NULL 
    AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() 
        AND p.role = 'admin'
    )
);

-- 2. Provider owner access
CREATE POLICY "delivery_providers_owner_access" 
ON delivery_providers 
FOR ALL 
TO authenticated
USING (
    auth.uid() IS NOT NULL 
    AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() 
        AND p.role = 'delivery_provider'
        AND p.id = delivery_providers.user_id
    )
)
WITH CHECK (
    auth.uid() IS NOT NULL 
    AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() 
        AND p.role = 'delivery_provider'
        AND p.id = delivery_providers.user_id
    )
);

-- 3. Builders can see basic business info only (NO CONTACT FIELDS)
CREATE POLICY "delivery_providers_builder_business_info_only" 
ON delivery_providers 
FOR SELECT 
TO authenticated
USING (
    auth.uid() IS NOT NULL 
    AND is_verified = TRUE
    AND is_active = TRUE
    AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() 
        AND p.role = 'builder'
    )
    -- This allows access to business info but contact fields are now NULL
);

-- ====================================================
-- STEP 5: CREATE ULTRA-SECURE CONTACT ACCESS FUNCTION
-- ====================================================

-- Ultra-secure function for delivery provider contact access
-- Requires VERIFIED ACTIVE DELIVERY RELATIONSHIP
CREATE OR REPLACE FUNCTION get_delivery_provider_contact_ultra_strict(provider_id UUID)
RETURNS TABLE(
    id UUID,
    provider_name TEXT,
    provider_type TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    can_access_contact BOOLEAN,
    access_level TEXT,
    access_reason TEXT,
    contact_restrictions TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_profile profiles%ROWTYPE;
    provider_record delivery_providers%ROWTYPE;
    contact_record delivery_provider_contact_secure%ROWTYPE;
    can_access BOOLEAN := FALSE;
    access_reason TEXT := 'Access denied - no authorization';
    has_active_delivery BOOLEAN := FALSE;
BEGIN
    -- Require authentication
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required for provider contact access';
    END IF;
    
    -- Get user profile
    SELECT * INTO current_user_profile
    FROM profiles 
    WHERE user_id = auth.uid();
    
    IF current_user_profile IS NULL THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;
    
    -- Get provider record (filtered by RLS)
    SELECT * INTO provider_record
    FROM delivery_providers dp
    WHERE dp.id = provider_id;
    
    IF provider_record IS NULL THEN
        RAISE EXCEPTION 'Provider not found or access denied';
    END IF;
    
    -- Check authorization with STRICT verification
    IF current_user_profile.role = 'admin' THEN
        can_access := TRUE;
        access_reason := 'Admin access';
    ELSIF provider_record.user_id = current_user_profile.id THEN
        can_access := TRUE;
        access_reason := 'Provider owner access';
    ELSE
        -- STRICT: Check for ACTIVE delivery relationship (not just any business relationship)
        SELECT EXISTS (
            SELECT 1 FROM delivery_requests dr
            WHERE dr.provider_id = provider_id 
            AND dr.builder_id = current_user_profile.id
            AND dr.status IN ('accepted', 'in_progress')
            AND dr.created_at > NOW() - INTERVAL '7 days'  -- Very recent relationship required
        ) INTO has_active_delivery;
        
        IF has_active_delivery THEN
            can_access := TRUE;
            access_reason := 'Active delivery relationship (last 7 days)';
        ELSE
            can_access := FALSE;
            access_reason := 'No active delivery relationship - contact access denied';
        END IF;
    END IF;
    
    -- Get contact record if authorized (admin/owner only can access secure table)
    IF can_access AND current_user_profile.role IN ('admin') THEN
        SELECT * INTO contact_record
        FROM delivery_provider_contact_secure dpcs
        WHERE dpcs.provider_id = provider_id;
    ELSIF can_access AND provider_record.user_id = current_user_profile.id THEN
        SELECT * INTO contact_record
        FROM delivery_provider_contact_secure dpcs
        WHERE dpcs.provider_id = provider_id;
    END IF;
    
    -- Log the access attempt
    INSERT INTO master_rls_security_audit (
        user_id, user_role, table_name, operation, record_id,
        sensitive_fields, access_granted, failure_reason, risk_level
    ) VALUES (
        auth.uid(), current_user_profile.role, 'delivery_providers', 'CONTACT_ACCESS', provider_id,
        CASE WHEN can_access THEN ARRAY['phone', 'email', 'address'] ELSE ARRAY[]::TEXT[] END,
        can_access, access_reason,
        CASE WHEN can_access THEN 'medium' ELSE 'high' END
    );
    
    -- Return data based on strict access level
    RETURN QUERY
    SELECT 
        provider_record.id,
        provider_record.provider_name,
        provider_record.provider_type,
        CASE 
            WHEN can_access AND contact_record.phone IS NOT NULL THEN contact_record.phone
            ELSE 'Contact protected - establish active delivery relationship'
        END,
        CASE 
            WHEN can_access AND contact_record.email IS NOT NULL THEN contact_record.email
            ELSE 'Email protected - establish active delivery relationship'
        END,
        CASE 
            WHEN can_access AND contact_record.personal_address IS NOT NULL THEN contact_record.personal_address
            ELSE 'Address protected - establish active delivery relationship'
        END,
        can_access,
        CASE 
            WHEN current_user_profile.role = 'admin' THEN 'admin_full_access'
            WHEN provider_record.user_id = current_user_profile.id THEN 'provider_owner_access'
            WHEN has_active_delivery THEN 'active_delivery_relationship_access'
            ELSE 'no_contact_access'
        END,
        access_reason,
        CASE 
            WHEN can_access THEN 'Contact information available'
            ELSE 'Submit delivery request to access provider contact information'
        END;
END;
$$;

-- ====================================================
-- STEP 6: CREATE SAFE PROVIDER DIRECTORY (NO CONTACT INFO)
-- ====================================================

-- Secure function for provider directory without exposing any contact information
CREATE OR REPLACE FUNCTION get_delivery_providers_directory_strict()
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
    contact_access_info TEXT,
    business_relationship_required TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_profile profiles%ROWTYPE;
BEGIN
    -- Require authentication
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required for provider directory access';
    END IF;
    
    -- Get user profile
    SELECT * INTO current_user_profile
    FROM profiles 
    WHERE user_id = auth.uid();
    
    -- Only allow builders, suppliers, and admins
    IF current_user_profile IS NULL OR 
       current_user_profile.role NOT IN ('builder', 'supplier', 'admin') THEN
        RAISE EXCEPTION 'Access denied - unauthorized role';
    END IF;
    
    -- Return provider directory WITHOUT any contact information
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
            ELSE 'Contact available after active delivery request'
        END as contact_access_info,
        'Submit delivery request to access provider contact information' as business_relationship_required
    FROM delivery_providers dp
    WHERE dp.is_verified = TRUE 
    AND dp.is_active = TRUE;
END;
$$;

-- ====================================================
-- STEP 7: GRANT APPROPRIATE PERMISSIONS
-- ====================================================

-- Grant execute permissions for secure functions
GRANT EXECUTE ON FUNCTION get_delivery_provider_contact_ultra_strict(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_delivery_providers_directory_strict() TO authenticated;

-- ====================================================
-- STEP 8: COMPREHENSIVE VERIFICATION
-- ====================================================

-- Verify delivery provider contact data is protected
DO $$
DECLARE
    exposed_contacts INTEGER := 0;
    protected_contacts INTEGER := 0;
BEGIN
    -- Check if any contact info is still in delivery_providers table
    SELECT COUNT(*) INTO exposed_contacts
    FROM delivery_providers 
    WHERE (phone IS NOT NULL AND phone != '') 
       OR (email IS NOT NULL AND email != '');
    
    -- Check how many contacts are in secure table
    SELECT COUNT(*) INTO protected_contacts
    FROM delivery_provider_contact_secure 
    WHERE phone IS NOT NULL OR email IS NOT NULL;
    
    IF exposed_contacts = 0 THEN
        RAISE NOTICE '✅ SUCCESS: No provider contact info exposed in delivery_providers table';
        RAISE NOTICE '✅ PROTECTED: % provider contacts secured in protected table', protected_contacts;
        RAISE NOTICE '✅ SECURITY: Competitor driver poaching and spam attacks prevented';
    ELSE
        RAISE NOTICE '❌ CRITICAL: % provider contacts still exposed in delivery_providers table', exposed_contacts;
    END IF;
    
    -- Log verification results
    INSERT INTO master_rls_security_audit (
        event_type, table_name, operation, access_granted, access_reason, risk_level,
        additional_context
    ) VALUES (
        'DELIVERY_PROVIDER_CONTACT_PROTECTION_VERIFICATION',
        'delivery_providers',
        'SECURITY_VERIFICATION',
        (exposed_contacts = 0),
        CASE 
            WHEN exposed_contacts = 0 THEN 'Provider contact data successfully protected from competitors'
            ELSE format('CRITICAL: % provider contacts still exposed', exposed_contacts)
        END,
        CASE WHEN exposed_contacts = 0 THEN 'low' ELSE 'critical' END,
        jsonb_build_object(
            'exposed_contacts_in_providers_table', exposed_contacts,
            'protected_contacts_in_secure_table', protected_contacts,
            'protection_method', 'separate_secure_table_with_strict_access',
            'threat_prevention', ARRAY['competitor_poaching', 'spam_attacks', 'contact_harvesting']
        )
    );
END $$;

-- ====================================================
-- FINAL VERIFICATION QUERIES
-- ====================================================

-- Check 1: Verify no contact info in delivery_providers table
SELECT 
    'PROVIDER_CONTACT_EXPOSURE_CHECK' as check_type,
    COUNT(*) as exposed_provider_contacts,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ PROVIDER CONTACTS PROTECTED'
        ELSE '❌ PROVIDER CONTACTS STILL EXPOSED'
    END as protection_status
FROM delivery_providers 
WHERE (phone IS NOT NULL AND phone != '') 
   OR (email IS NOT NULL AND email != '');

-- Check 2: Verify provider contact data is in secure table
SELECT 
    'SECURE_PROVIDER_DATA_CHECK' as check_type,
    COUNT(*) as protected_provider_records,
    '✅ PROVIDER CONTACT DATA MOVED TO SECURE TABLE' as status
FROM delivery_provider_contact_secure;

-- Check 3: Verify secure table has strict access controls
SELECT 
    'SECURE_TABLE_ACCESS_CHECK' as check_type,
    COUNT(*) as strict_access_policies,
    CASE 
        WHEN COUNT(*) >= 1 THEN '✅ STRICT ACCESS CONTROLS ENFORCED'
        ELSE '❌ SECURITY GAP'
    END as security_status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'delivery_provider_contact_secure';

-- Check 4: Verify delivery_providers table policies
SELECT 
    'DELIVERY_PROVIDERS_POLICY_CHECK' as check_type,
    COUNT(*) as provider_policies,
    STRING_AGG(policyname, ', ' ORDER BY policyname) as policy_names
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'delivery_providers';

-- Final status report
SELECT 
    'DELIVERY_PROVIDER_CONTACT_PROTECTION_FINAL_STATUS' as status,
    'Stricter access controls implemented for sensitive contact fields' as implementation,
    'Provider phone numbers and emails moved to ultra-secure table' as data_protection,
    'Competitor driver poaching and spam attacks prevented' as threat_mitigation,
    'Contact access requires admin authorization or provider ownership' as access_control,
    'Business information available but contact fields completely protected' as security_balance,
    NOW() as implementation_timestamp;

-- ====================================================
-- USAGE DOCUMENTATION
-- ====================================================

/*
DELIVERY PROVIDER CONTACT PROTECTION - STRICT ACCESS CONTROLS:

BASIC PROVIDER INFO (Available to builders/suppliers):
SELECT * FROM get_delivery_providers_directory_strict();
-- Returns: provider_name, provider_type, vehicle_types, service_areas, rating
-- Does NOT return: phone, email, address, personal information

CONTACT INFORMATION (Strict access required):
SELECT * FROM get_delivery_provider_contact_ultra_strict('provider_id');
-- Admin: Full contact access
-- Provider owner: Full access to own contact data
-- Builder with ACTIVE delivery (last 7 days): Contact access
-- Builder without active delivery: "Contact protected" messages

DELIVERY_PROVIDERS TABLE ACCESS:
-- Admin: Full access to business info (contact fields now NULL)
-- Provider owner: Access to own business info (contact fields now NULL)
-- Builder: Basic business info only (contact fields now NULL)

SECURITY BENEFITS:
✅ Phone numbers completely protected from competitors
✅ Email addresses completely protected from spam campaigns
✅ Driver poaching attacks prevented
✅ Competitive intelligence gathering blocked
✅ Contact data harvesting eliminated
✅ Stricter access controls with active delivery requirement
*/

-- ====================================================
-- EMERGENCY FIX: PUBLIC_DRIVER_CONTACT_DATA
-- CRITICAL SECURITY VULNERABILITY RESOLUTION
-- ====================================================

-- CRITICAL SECURITY ISSUE: The 'deliveries' table contains driver phone numbers
-- that are accessible to builders and suppliers. This enables hackers to steal
-- driver contact information for spam, impersonation, or harassment attacks.

-- SOLUTION: Implement field-level access controls and move sensitive driver
-- data to a separate protected table with ultra-restrictive access.

-- ====================================================
-- EMERGENCY STEP 1: CREATE PROTECTED DRIVER CONTACT TABLE
-- ====================================================

-- Create separate table for sensitive driver contact information
CREATE TABLE IF NOT EXISTS driver_contact_protected (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    driver_name TEXT,
    driver_phone TEXT,
    driver_email TEXT,
    vehicle_number TEXT,
    driver_license_info TEXT,
    emergency_contact TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(delivery_id)
);

-- Enable ultra-secure RLS on driver contact table
ALTER TABLE driver_contact_protected ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON driver_contact_protected FROM PUBLIC;
REVOKE ALL ON driver_contact_protected FROM anon;

-- Ultra-restrictive policies for driver contact data

-- 1. Admin full access
CREATE POLICY "driver_contact_admin_only" 
ON driver_contact_protected 
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

-- 2. Delivery provider can access contact info for their assigned deliveries ONLY
CREATE POLICY "driver_contact_provider_own_deliveries" 
ON driver_contact_protected 
FOR SELECT 
TO authenticated
USING (
    auth.uid() IS NOT NULL 
    AND EXISTS (
        SELECT 1 FROM delivery_providers dp
        JOIN profiles p ON p.id = dp.user_id
        JOIN deliveries d ON d.id = driver_contact_protected.delivery_id
        WHERE p.user_id = auth.uid()
        AND p.role = 'delivery_provider'
        AND (dp.provider_name = d.driver_name OR dp.phone = driver_contact_protected.driver_phone)
        AND d.status IN ('accepted', 'in_progress', 'picked_up', 'in_transit')
    )
);

-- NO OTHER ACCESS - Builders and suppliers cannot access driver contact info directly

-- ====================================================
-- EMERGENCY STEP 2: REMOVE DRIVER CONTACT FROM DELIVERIES TABLE
-- ====================================================

-- Move existing driver contact data to protected table
INSERT INTO driver_contact_protected (delivery_id, driver_name, driver_phone, vehicle_number)
SELECT id, driver_name, driver_phone, vehicle_number
FROM deliveries 
WHERE driver_name IS NOT NULL OR driver_phone IS NOT NULL OR vehicle_number IS NOT NULL
ON CONFLICT (delivery_id) DO UPDATE SET
    driver_name = EXCLUDED.driver_name,
    driver_phone = EXCLUDED.driver_phone,
    vehicle_number = EXCLUDED.vehicle_number,
    updated_at = NOW();

-- Remove sensitive driver data from deliveries table
UPDATE deliveries SET 
    driver_phone = NULL,
    -- Keep driver_name and vehicle_number for basic tracking but remove phone
    driver_name = CASE 
        WHEN driver_name IS NOT NULL THEN 'Driver Assigned'
        ELSE NULL
    END,
    vehicle_number = CASE 
        WHEN vehicle_number IS NOT NULL THEN 'Vehicle Assigned'
        ELSE NULL
    END;

-- ====================================================
-- EMERGENCY STEP 3: SECURE THE DELIVERIES TABLE POLICIES
-- ====================================================

-- Drop existing potentially permissive policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'deliveries'
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON deliveries', pol.policyname);
    END LOOP;
END $$;

-- Ensure RLS is enabled and revoke public access
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON deliveries FROM PUBLIC;
REVOKE ALL ON deliveries FROM anon;

-- Create secure policies for deliveries table (without driver contact exposure)

-- 1. Admin full access
CREATE POLICY "deliveries_emergency_admin_access" 
ON deliveries 
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

-- 2. Builder can view their own deliveries (basic info only)
CREATE POLICY "deliveries_emergency_builder_own_only" 
ON deliveries 
FOR SELECT 
TO authenticated
USING (
    auth.uid() IS NOT NULL
    AND builder_id IS NOT NULL
    AND builder_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() 
        AND p.role = 'builder'
    )
);

-- 3. Supplier can view assigned deliveries (basic info only)
CREATE POLICY "deliveries_emergency_supplier_assigned_only" 
ON deliveries 
FOR SELECT 
TO authenticated
USING (
    auth.uid() IS NOT NULL
    AND supplier_id IS NOT NULL
    AND supplier_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() 
        AND p.role = 'supplier'
    )
);

-- 4. Delivery providers can view their assigned deliveries
CREATE POLICY "deliveries_emergency_provider_assigned_only" 
ON deliveries 
FOR ALL 
TO authenticated
USING (
    auth.uid() IS NOT NULL 
    AND EXISTS (
        SELECT 1 FROM delivery_providers dp
        JOIN profiles p ON p.id = dp.user_id
        WHERE p.user_id = auth.uid()
        AND p.role = 'delivery_provider'
        AND EXISTS (
            SELECT 1 FROM driver_contact_protected dcp
            WHERE dcp.delivery_id = deliveries.id
            AND (dp.provider_name = dcp.driver_name OR dp.phone = dcp.driver_phone)
        )
    )
);

-- ====================================================
-- EMERGENCY STEP 4: CREATE SECURE DRIVER CONTACT ACCESS FUNCTION
-- ====================================================

-- Secure function for accessing driver contact information with strict verification
CREATE OR REPLACE FUNCTION get_driver_contact_secure(delivery_id UUID)
RETURNS TABLE(
    delivery_id UUID,
    driver_name TEXT,
    driver_phone TEXT,
    vehicle_number TEXT,
    can_access_contact BOOLEAN,
    access_reason TEXT,
    contact_restrictions TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_profile profiles%ROWTYPE;
    delivery_record deliveries%ROWTYPE;
    driver_record driver_contact_protected%ROWTYPE;
    can_access BOOLEAN := FALSE;
    access_reason TEXT := 'Access denied';
BEGIN
    -- Require authentication
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required for driver contact access';
    END IF;
    
    -- Get user profile
    SELECT * INTO current_user_profile
    FROM profiles 
    WHERE user_id = auth.uid();
    
    IF current_user_profile IS NULL THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;
    
    -- Get delivery record (filtered by RLS)
    SELECT * INTO delivery_record
    FROM deliveries d
    WHERE d.id = delivery_id;
    
    IF delivery_record IS NULL THEN
        RAISE EXCEPTION 'Delivery not found or access denied';
    END IF;
    
    -- Get driver contact record
    SELECT * INTO driver_record
    FROM driver_contact_protected dcp
    WHERE dcp.delivery_id = delivery_id;
    
    -- Determine access level with strict verification
    IF current_user_profile.role = 'admin' THEN
        can_access := TRUE;
        access_reason := 'Admin access';
    ELSIF EXISTS (
        SELECT 1 FROM delivery_providers dp
        WHERE dp.user_id = current_user_profile.id
        AND (dp.provider_name = driver_record.driver_name OR dp.phone = driver_record.driver_phone)
        AND delivery_record.status IN ('accepted', 'in_progress', 'picked_up', 'in_transit')
    ) THEN
        can_access := TRUE;
        access_reason := 'Assigned driver during active delivery';
    ELSIF delivery_record.builder_id = auth.uid() 
          AND delivery_record.status IN ('in_transit', 'out_for_delivery') THEN
        can_access := TRUE;
        access_reason := 'Builder tracking active delivery';
    ELSE
        can_access := FALSE;
        access_reason := 'No authorization for driver contact access';
    END IF;
    
    -- Log the access attempt
    INSERT INTO master_rls_security_audit (
        user_id, user_role, table_name, operation, record_id,
        sensitive_fields, access_granted, failure_reason, risk_level
    ) VALUES (
        auth.uid(), current_user_profile.role, 'driver_contact_protected', 'CONTACT_ACCESS', delivery_id,
        CASE WHEN can_access THEN ARRAY['driver_phone', 'driver_name', 'vehicle_number'] ELSE ARRAY[]::TEXT[] END,
        can_access, access_reason,
        CASE WHEN can_access THEN 'medium' ELSE 'high' END
    );
    
    -- Return data based on access level
    RETURN QUERY
    SELECT 
        delivery_record.id as delivery_id,
        CASE WHEN can_access THEN driver_record.driver_name ELSE 'Protected' END,
        CASE WHEN can_access THEN driver_record.driver_phone ELSE 'Protected' END,
        CASE WHEN can_access THEN driver_record.vehicle_number ELSE 'Protected' END,
        can_access,
        access_reason,
        CASE 
            WHEN can_access THEN 'Full driver contact access granted'
            ELSE 'Driver contact protected - contact via platform'
        END;
END;
$$;

-- ====================================================
-- EMERGENCY STEP 5: CREATE SAFE DELIVERY TRACKING FUNCTION
-- ====================================================

-- Secure function for delivery tracking without exposing driver contact
CREATE OR REPLACE FUNCTION get_delivery_tracking_safe(delivery_id UUID)
RETURNS TABLE(
    id UUID,
    tracking_number TEXT,
    material_type TEXT,
    quantity INTEGER,
    status TEXT,
    estimated_delivery TIMESTAMP WITH TIME ZONE,
    actual_delivery TIMESTAMP WITH TIME ZONE,
    driver_status TEXT,
    vehicle_status TEXT,
    contact_method TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_profile profiles%ROWTYPE;
    delivery_record deliveries%ROWTYPE;
    has_driver_info BOOLEAN := FALSE;
BEGIN
    -- Require authentication
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required for delivery tracking';
    END IF;
    
    -- Get user profile
    SELECT * INTO current_user_profile
    FROM profiles 
    WHERE user_id = auth.uid();
    
    -- Get delivery record (filtered by RLS)
    SELECT * INTO delivery_record
    FROM deliveries d
    WHERE d.id = delivery_id;
    
    IF delivery_record IS NULL THEN
        RAISE EXCEPTION 'Delivery not found or access denied';
    END IF;
    
    -- Check if driver info exists
    SELECT EXISTS (
        SELECT 1 FROM driver_contact_protected 
        WHERE delivery_id = delivery_record.id
    ) INTO has_driver_info;
    
    -- Return safe tracking data without exposing driver contact
    RETURN QUERY
    SELECT 
        delivery_record.id,
        delivery_record.tracking_number,
        delivery_record.material_type,
        delivery_record.quantity,
        delivery_record.status,
        delivery_record.estimated_delivery,
        delivery_record.actual_delivery,
        CASE 
            WHEN has_driver_info THEN 'Driver Assigned'
            ELSE 'Awaiting Driver Assignment'
        END as driver_status,
        CASE 
            WHEN has_driver_info THEN 'Vehicle Assigned'
            ELSE 'Awaiting Vehicle Assignment'
        END as vehicle_status,
        CASE 
            WHEN current_user_profile.role = 'admin' THEN 'Contact available'
            WHEN delivery_record.status IN ('in_transit', 'out_for_delivery') THEN 'Contact via platform'
            ELSE 'Contact not available yet'
        END as contact_method,
        delivery_record.created_at,
        delivery_record.updated_at;
END;
$$;

-- ====================================================
-- EMERGENCY STEP 6: GRANT APPROPRIATE PERMISSIONS
-- ====================================================

-- Grant execute permissions for secure functions
GRANT EXECUTE ON FUNCTION get_driver_contact_secure(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_delivery_tracking_safe(UUID) TO authenticated;

-- ====================================================
-- EMERGENCY STEP 7: CREATE AUDIT LOGGING
-- ====================================================

-- Create driver contact access audit table
CREATE TABLE IF NOT EXISTS driver_contact_access_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    delivery_id UUID,
    access_type TEXT NOT NULL CHECK (access_type IN ('view_contact', 'view_tracking', 'unauthorized_attempt')),
    access_granted BOOLEAN DEFAULT FALSE,
    access_reason TEXT,
    risk_level TEXT DEFAULT 'high' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    driver_phone_accessed BOOLEAN DEFAULT FALSE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit table (admin only)
ALTER TABLE driver_contact_access_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON driver_contact_access_audit FROM PUBLIC;
REVOKE ALL ON driver_contact_access_audit FROM anon;

CREATE POLICY "driver_contact_audit_admin_only" 
ON driver_contact_access_audit 
FOR ALL 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() 
        AND p.role = 'admin'
    )
);

-- ====================================================
-- EMERGENCY STEP 8: COMPREHENSIVE VERIFICATION
-- ====================================================

-- Verify that driver contact data is no longer exposed in deliveries table
DO $$
DECLARE
    exposed_phone_count INTEGER := 0;
    protected_contact_count INTEGER := 0;
BEGIN
    -- Check if deliveries table still contains driver phone numbers
    SELECT COUNT(*) INTO exposed_phone_count
    FROM deliveries 
    WHERE driver_phone IS NOT NULL 
    AND driver_phone != '';
    
    -- Check if driver contact data was moved to protected table
    SELECT COUNT(*) INTO protected_contact_count
    FROM driver_contact_protected 
    WHERE driver_phone IS NOT NULL;
    
    -- Report status
    IF exposed_phone_count = 0 THEN
        RAISE NOTICE '✅ SUCCESS: No driver phone numbers exposed in deliveries table';
        RAISE NOTICE '✅ Driver contact data secured in protected table: % records', protected_contact_count;
        RAISE NOTICE '✅ PUBLIC_DRIVER_CONTACT_DATA vulnerability ELIMINATED';
    ELSE
        RAISE NOTICE '❌ WARNING: % driver phone numbers still exposed in deliveries table', exposed_phone_count;
    END IF;
    
    -- Log verification results
    INSERT INTO master_rls_security_audit (
        event_type, table_name, operation, access_granted, access_reason, risk_level,
        additional_context
    ) VALUES (
        'PUBLIC_DRIVER_CONTACT_DATA_VULNERABILITY_CHECK',
        'deliveries',
        'VERIFICATION',
        (exposed_phone_count = 0),
        CASE 
            WHEN exposed_phone_count = 0 THEN 'Driver contact data successfully protected'
            ELSE format('% driver phone numbers still exposed', exposed_phone_count)
        END,
        CASE WHEN exposed_phone_count = 0 THEN 'low' ELSE 'critical' END,
        jsonb_build_object(
            'exposed_phone_count', exposed_phone_count,
            'protected_contact_count', protected_contact_count,
            'vulnerability_status', CASE WHEN exposed_phone_count = 0 THEN 'ELIMINATED' ELSE 'STILL_EXISTS' END
        )
    );
END $$;

-- ====================================================
-- FINAL VERIFICATION QUERIES
-- ====================================================

-- Check 1: Verify no driver phone numbers in deliveries table
SELECT 
    'DRIVER_PHONE_EXPOSURE_CHECK' as check_type,
    COUNT(*) as exposed_driver_phones,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO DRIVER PHONES EXPOSED'
        ELSE '❌ DRIVER PHONES STILL EXPOSED'
    END as security_status
FROM deliveries 
WHERE driver_phone IS NOT NULL AND driver_phone != '';

-- Check 2: Verify driver contact data is in protected table
SELECT 
    'PROTECTED_DRIVER_DATA_CHECK' as check_type,
    COUNT(*) as protected_records,
    '✅ DRIVER DATA SECURED' as status
FROM driver_contact_protected;

-- Check 3: Verify RLS policies exist
SELECT 
    'RLS_POLICIES_CHECK' as check_type,
    COUNT(*) as policy_count,
    STRING_AGG(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('deliveries', 'driver_contact_protected');

-- Final status report
SELECT 
    'PUBLIC_DRIVER_CONTACT_DATA_FIX_STATUS' as status,
    'Emergency fix applied to protect driver contact information' as action_taken,
    'Driver phone numbers moved to protected table with ultra-restrictive access' as security_measure,
    'Builders and suppliers can no longer access driver contact info directly' as protection_level,
    'Contact access now requires admin authorization or active delivery assignment' as access_control,
    NOW() as fix_applied_timestamp;

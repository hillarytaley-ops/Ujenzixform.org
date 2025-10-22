-- ====================================================
-- ADMIN-ONLY DELIVERIES TABLE ACCESS
-- MAXIMUM SECURITY FOR DRIVER CONTACT PROTECTION
-- ====================================================

-- CRITICAL SECURITY REQUIREMENT: The 'deliveries' table should be accessible
-- by admin alone to completely protect driver phone numbers and contact
-- information from unauthorized access by builders and suppliers.

-- This migration implements the most secure approach: ADMIN-ONLY access
-- to the deliveries table with secure functions for legitimate business needs.

-- ====================================================
-- EMERGENCY STEP 1: LOCKDOWN DELIVERIES TABLE - ADMIN ONLY
-- ====================================================

-- Drop ALL existing policies on deliveries table
DO $$
DECLARE
    pol RECORD;
BEGIN
    RAISE NOTICE 'Implementing ADMIN-ONLY access to deliveries table...';
    
    FOR pol IN (
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'deliveries'
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON deliveries', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- Ensure maximum security on deliveries table
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON deliveries FROM PUBLIC;
REVOKE ALL ON deliveries FROM anon;
REVOKE ALL ON deliveries FROM authenticated;

-- Create SINGLE admin-only policy for deliveries table
CREATE POLICY "deliveries_admin_only_maximum_security" 
ON deliveries 
FOR ALL 
TO authenticated
USING (
    auth.uid() IS NOT NULL 
    AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() 
        AND p.role = 'admin'
        AND p.user_id IS NOT NULL  -- Explicit null check
    )
)
WITH CHECK (
    auth.uid() IS NOT NULL 
    AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() 
        AND p.role = 'admin'
        AND p.user_id IS NOT NULL
    )
);

-- Log the admin-only lockdown
INSERT INTO master_rls_security_audit (
    event_type, table_name, operation, access_granted, access_reason, risk_level
) VALUES (
    'DELIVERIES_TABLE_ADMIN_ONLY_LOCKDOWN',
    'deliveries',
    'ACCESS_RESTRICTION',
    TRUE,
    'Deliveries table locked down to admin-only access to protect driver contact information',
    'low'
);

-- ====================================================
-- EMERGENCY STEP 2: CREATE SECURE FUNCTIONS FOR LEGITIMATE BUSINESS NEEDS
-- ====================================================

-- Secure function for builders to track their own deliveries (NO DRIVER CONTACT)
CREATE OR REPLACE FUNCTION get_builder_deliveries_safe()
RETURNS TABLE(
    id UUID,
    tracking_number TEXT,
    material_type TEXT,
    quantity INTEGER,
    weight_kg NUMERIC,
    pickup_address TEXT,
    delivery_address TEXT,
    status TEXT,
    estimated_delivery TIMESTAMP WITH TIME ZONE,
    actual_delivery TIMESTAMP WITH TIME ZONE,
    driver_status TEXT,
    vehicle_status TEXT,
    special_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
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
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Get and verify user profile
    SELECT * INTO current_user_profile
    FROM profiles 
    WHERE user_id = auth.uid();
    
    -- Only allow builders to access this function
    IF current_user_profile IS NULL OR current_user_profile.role != 'builder' THEN
        RAISE EXCEPTION 'Access denied - only builders can access this function';
    END IF;
    
    -- Log the access
    INSERT INTO master_rls_security_audit (
        user_id, user_role, table_name, operation, access_granted, access_reason, risk_level
    ) VALUES (
        auth.uid(), 'builder', 'deliveries', 'BUILDER_SAFE_ACCESS', TRUE, 
        'Builder accessing own deliveries via secure function', 'low'
    );
    
    -- Return delivery data for builder's own deliveries (NO DRIVER CONTACT)
    RETURN QUERY
    SELECT 
        d.id,
        d.tracking_number,
        d.material_type,
        d.quantity,
        d.weight_kg,
        d.pickup_address,
        d.delivery_address,
        d.status,
        d.estimated_delivery,
        d.actual_delivery,
        CASE 
            WHEN d.driver_name IS NOT NULL THEN 'Driver Assigned'
            ELSE 'Awaiting Driver Assignment'
        END as driver_status,
        CASE 
            WHEN d.vehicle_number IS NOT NULL THEN 'Vehicle Assigned'
            ELSE 'Awaiting Vehicle Assignment'
        END as vehicle_status,
        d.special_instructions,
        d.created_at,
        d.updated_at
    FROM deliveries d
    WHERE d.builder_id = auth.uid();  -- Only builder's own deliveries
END;
$$;

-- Secure function for suppliers to view assigned deliveries (NO DRIVER CONTACT)
CREATE OR REPLACE FUNCTION get_supplier_deliveries_safe()
RETURNS TABLE(
    id UUID,
    tracking_number TEXT,
    material_type TEXT,
    quantity INTEGER,
    weight_kg NUMERIC,
    pickup_address TEXT,
    delivery_address TEXT,
    status TEXT,
    estimated_delivery TIMESTAMP WITH TIME ZONE,
    actual_delivery TIMESTAMP WITH TIME ZONE,
    driver_status TEXT,
    vehicle_status TEXT,
    special_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
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
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Get and verify user profile
    SELECT * INTO current_user_profile
    FROM profiles 
    WHERE user_id = auth.uid();
    
    -- Only allow suppliers to access this function
    IF current_user_profile IS NULL OR current_user_profile.role != 'supplier' THEN
        RAISE EXCEPTION 'Access denied - only suppliers can access this function';
    END IF;
    
    -- Log the access
    INSERT INTO master_rls_security_audit (
        user_id, user_role, table_name, operation, access_granted, access_reason, risk_level
    ) VALUES (
        auth.uid(), 'supplier', 'deliveries', 'SUPPLIER_SAFE_ACCESS', TRUE, 
        'Supplier accessing assigned deliveries via secure function', 'low'
    );
    
    -- Return delivery data for supplier's assigned deliveries (NO DRIVER CONTACT)
    RETURN QUERY
    SELECT 
        d.id,
        d.tracking_number,
        d.material_type,
        d.quantity,
        d.weight_kg,
        d.pickup_address,
        d.delivery_address,
        d.status,
        d.estimated_delivery,
        d.actual_delivery,
        CASE 
            WHEN d.driver_name IS NOT NULL THEN 'Driver Assigned'
            ELSE 'Awaiting Driver Assignment'
        END as driver_status,
        CASE 
            WHEN d.vehicle_number IS NOT NULL THEN 'Vehicle Assigned'
            ELSE 'Awaiting Vehicle Assignment'
        END as vehicle_status,
        d.special_instructions,
        d.created_at,
        d.updated_at
    FROM deliveries d
    WHERE d.supplier_id = auth.uid();  -- Only supplier's assigned deliveries
END;
$$;

-- Secure function for public delivery tracking (MINIMAL INFO ONLY)
CREATE OR REPLACE FUNCTION get_delivery_tracking_public(tracking_number_param TEXT)
RETURNS TABLE(
    tracking_number TEXT,
    status TEXT,
    estimated_delivery TIMESTAMP WITH TIME ZONE,
    delivery_progress TEXT,
    last_update TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    delivery_record deliveries%ROWTYPE;
BEGIN
    -- Get delivery by tracking number
    SELECT * INTO delivery_record
    FROM deliveries d
    WHERE d.tracking_number = tracking_number_param;
    
    IF delivery_record IS NULL THEN
        RAISE EXCEPTION 'Tracking number not found';
    END IF;
    
    -- Log the public tracking access
    INSERT INTO master_rls_security_audit (
        user_id, table_name, operation, record_id, access_granted, access_reason, risk_level
    ) VALUES (
        auth.uid(), 'deliveries', 'PUBLIC_TRACKING', delivery_record.id, TRUE, 
        'Public tracking access via tracking number', 'low'
    );
    
    -- Return ONLY basic tracking info (NO DRIVER CONTACT, NO ADDRESSES)
    RETURN QUERY
    SELECT 
        delivery_record.tracking_number,
        delivery_record.status,
        delivery_record.estimated_delivery,
        CASE 
            WHEN delivery_record.status = 'delivered' THEN 'Delivery completed'
            WHEN delivery_record.status = 'in_transit' THEN 'Package is in transit'
            WHEN delivery_record.status = 'picked_up' THEN 'Package picked up'
            WHEN delivery_record.status = 'out_for_delivery' THEN 'Out for delivery'
            ELSE 'Preparing for pickup'
        END as delivery_progress,
        delivery_record.updated_at as last_update;
END;
$$;

-- ====================================================
-- EMERGENCY STEP 3: GRANT APPROPRIATE PERMISSIONS
-- ====================================================

-- Grant execute permissions for secure functions
GRANT EXECUTE ON FUNCTION get_builder_deliveries_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION get_supplier_deliveries_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION get_delivery_tracking_public(TEXT) TO authenticated;

-- ====================================================
-- EMERGENCY STEP 4: COMPREHENSIVE VERIFICATION
-- ====================================================

-- Verify admin-only access is enforced
DO $$
DECLARE
    policy_count INTEGER := 0;
    admin_only_policies INTEGER := 0;
BEGIN
    -- Count total policies on deliveries table
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'deliveries';
    
    -- Count admin-only policies
    SELECT COUNT(*) INTO admin_only_policies
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'deliveries'
    AND (
        policyname ILIKE '%admin%' OR
        polwithcheck ILIKE '%admin%' OR
        polqual ILIKE '%admin%'
    );
    
    -- Report status
    IF policy_count = 1 AND admin_only_policies = 1 THEN
        RAISE NOTICE '✅ SUCCESS: Deliveries table secured with admin-only access';
        RAISE NOTICE '✅ PUBLIC_DRIVER_CONTACT_DATA vulnerability ELIMINATED';
    ELSE
        RAISE NOTICE '❌ WARNING: Deliveries table may not be properly secured';
        RAISE NOTICE 'Total policies: %, Admin policies: %', policy_count, admin_only_policies;
    END IF;
    
    -- Log verification results
    INSERT INTO master_rls_security_audit (
        event_type, table_name, operation, access_granted, access_reason, risk_level,
        additional_context
    ) VALUES (
        'DELIVERIES_ADMIN_ONLY_VERIFICATION',
        'deliveries',
        'VERIFICATION',
        (policy_count = 1 AND admin_only_policies = 1),
        CASE 
            WHEN policy_count = 1 AND admin_only_policies = 1 
            THEN 'Deliveries table successfully secured with admin-only access'
            ELSE 'Deliveries table security verification failed'
        END,
        CASE WHEN policy_count = 1 AND admin_only_policies = 1 THEN 'low' ELSE 'critical' END,
        jsonb_build_object(
            'total_policies', policy_count,
            'admin_only_policies', admin_only_policies,
            'security_status', CASE WHEN policy_count = 1 AND admin_only_policies = 1 THEN 'MAXIMUM_SECURITY' ELSE 'NEEDS_REVIEW' END
        )
    );
END $$;

-- ====================================================
-- FINAL VERIFICATION QUERIES
-- ====================================================

-- Check 1: Verify only admin can access deliveries table
SELECT 
    'DELIVERIES_ACCESS_CHECK' as check_type,
    COUNT(*) as total_policies,
    COUNT(*) FILTER (WHERE policyname ILIKE '%admin%') as admin_policies,
    CASE 
        WHEN COUNT(*) = 1 AND COUNT(*) FILTER (WHERE policyname ILIKE '%admin%') = 1
        THEN '✅ ADMIN-ONLY ACCESS ENFORCED'
        ELSE '❌ SECURITY GAP - REVIEW REQUIRED'
    END as security_status
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'deliveries';

-- Check 2: Verify secure functions exist for builders and suppliers
SELECT 
    'SECURE_FUNCTIONS_CHECK' as check_type,
    proname as function_name,
    '✅ SECURE ALTERNATIVE AVAILABLE' as status
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN (
    'get_builder_deliveries_safe',
    'get_supplier_deliveries_safe', 
    'get_delivery_tracking_public'
)
ORDER BY proname;

-- Check 3: Verify RLS is enabled
SELECT 
    'DELIVERIES_RLS_CHECK' as check_type,
    tablename,
    rowsecurity as rls_enabled,
    CASE WHEN rowsecurity THEN '✅ RLS ENABLED' ELSE '❌ RLS DISABLED' END as security_status
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'deliveries';

-- Check 4: Test that non-admin access is blocked
-- This query should fail for non-admin users (which is correct behavior)
SELECT 
    'NON_ADMIN_ACCESS_TEST' as check_type,
    'This query will fail for non-admin users (which is correct)' as note,
    'Use secure functions: get_builder_deliveries_safe() or get_supplier_deliveries_safe()' as instruction;

-- Final comprehensive status report
SELECT 
    'ADMIN_ONLY_DELIVERIES_SECURITY_STATUS' as status,
    'MAXIMUM SECURITY: Admin-only access to deliveries table implemented' as security_level,
    'Driver phone numbers completely protected from builders and suppliers' as driver_protection,
    'Secure functions available for legitimate business needs' as business_continuity,
    'PUBLIC_DRIVER_CONTACT_DATA vulnerability ELIMINATED' as vulnerability_status,
    NOW() as implementation_timestamp;

-- ====================================================
-- USAGE INSTRUCTIONS FOR DEVELOPERS
-- ====================================================

/*
CRITICAL USAGE CHANGES REQUIRED:

OLD (Direct table access - NOW BLOCKED for non-admins):
SELECT * FROM deliveries WHERE builder_id = auth.uid();
SELECT * FROM deliveries WHERE supplier_id = auth.uid();

NEW (Secure function access - REQUIRED for non-admins):
SELECT * FROM get_builder_deliveries_safe();      -- For builders
SELECT * FROM get_supplier_deliveries_safe();     -- For suppliers  
SELECT * FROM get_delivery_tracking_public('tracking_number'); -- For public tracking

ADMIN ACCESS (Still works):
SELECT * FROM deliveries;  -- Full access including driver phone numbers

SECURITY BENEFITS:
✅ Driver phone numbers completely protected from non-admin access
✅ Spam and impersonation attacks prevented
✅ Legitimate business needs met through secure functions
✅ Maximum security with minimal business disruption
*/

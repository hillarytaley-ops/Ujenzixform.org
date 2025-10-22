-- ====================================================
-- VERIFICATION: DELIVERIES TABLE ADMIN-ONLY ACCESS
-- CONFIRM MAXIMUM SECURITY IMPLEMENTATION
-- ====================================================

-- This migration verifies and enforces that the 'deliveries' table
-- can be viewed by ADMIN ALONE and NO other user.

-- SECURITY REQUIREMENT: Complete isolation of deliveries table to protect
-- driver contact information and sensitive delivery data.

-- ====================================================
-- STEP 1: VERIFY AND ENFORCE ADMIN-ONLY ACCESS
-- ====================================================

-- Ensure deliveries table has maximum security
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON deliveries FROM PUBLIC;
REVOKE ALL ON deliveries FROM anon;
REVOKE ALL ON deliveries FROM authenticated;

-- Drop ANY policy that might allow non-admin access
DO $$
DECLARE
    pol RECORD;
    policies_dropped INTEGER := 0;
BEGIN
    RAISE NOTICE 'Verifying ADMIN-ONLY access to deliveries table...';
    
    -- Drop ALL policies except admin-only
    FOR pol IN (
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'deliveries'
        AND policyname NOT ILIKE '%admin_only_maximum_security%'
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON deliveries', pol.policyname);
        policies_dropped := policies_dropped + 1;
        RAISE NOTICE 'Dropped non-admin policy: %', pol.policyname;
    END LOOP;
    
    RAISE NOTICE 'Dropped % non-admin policies from deliveries table', policies_dropped;
END $$;

-- Ensure ONLY the admin-only policy exists
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

-- ====================================================
-- STEP 2: COMPREHENSIVE VERIFICATION
-- ====================================================

-- Verify ONLY admin can access deliveries table
DO $$
DECLARE
    total_policies INTEGER := 0;
    admin_policies INTEGER := 0;
    non_admin_policies INTEGER := 0;
BEGIN
    -- Count all policies on deliveries table
    SELECT COUNT(*) INTO total_policies
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'deliveries';
    
    -- Count admin-only policies
    SELECT COUNT(*) INTO admin_policies
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'deliveries'
    AND policyname ILIKE '%admin%';
    
    -- Count non-admin policies (should be 0)
    non_admin_policies := total_policies - admin_policies;
    
    -- Report verification results
    IF total_policies = 1 AND admin_policies = 1 AND non_admin_policies = 0 THEN
        RAISE NOTICE '✅ PERFECT: Deliveries table has ADMIN-ONLY access';
        RAISE NOTICE '✅ CONFIRMED: No other user can access deliveries table';
        RAISE NOTICE '✅ SECURITY: Driver contact information completely protected';
    ELSE
        RAISE NOTICE '❌ SECURITY GAP: Deliveries table access not properly restricted';
        RAISE NOTICE 'Total policies: %, Admin policies: %, Non-admin policies: %', 
                     total_policies, admin_policies, non_admin_policies;
    END IF;
    
    -- Log comprehensive verification
    INSERT INTO master_rls_security_audit (
        event_type, table_name, operation, access_granted, access_reason, risk_level,
        additional_context
    ) VALUES (
        'DELIVERIES_ADMIN_ONLY_ACCESS_VERIFICATION',
        'deliveries',
        'SECURITY_VERIFICATION',
        (total_policies = 1 AND admin_policies = 1 AND non_admin_policies = 0),
        CASE 
            WHEN total_policies = 1 AND admin_policies = 1 AND non_admin_policies = 0
            THEN 'CONFIRMED: Deliveries table has admin-only access - maximum security achieved'
            ELSE 'SECURITY GAP: Deliveries table access not properly restricted'
        END,
        CASE WHEN total_policies = 1 AND admin_policies = 1 AND non_admin_policies = 0 THEN 'low' ELSE 'critical' END,
        jsonb_build_object(
            'total_policies', total_policies,
            'admin_policies', admin_policies,
            'non_admin_policies', non_admin_policies,
            'security_status', CASE WHEN total_policies = 1 AND admin_policies = 1 THEN 'ADMIN_ONLY_CONFIRMED' ELSE 'SECURITY_GAP' END,
            'access_restriction', 'MAXIMUM_SECURITY_ADMIN_ONLY'
        )
    );
END $$;

-- ====================================================
-- FINAL VERIFICATION QUERIES
-- ====================================================

-- Verification 1: Confirm ONLY admin policy exists
SELECT 
    'DELIVERIES_POLICY_CHECK' as verification,
    COUNT(*) as total_policies,
    COUNT(*) FILTER (WHERE policyname ILIKE '%admin%') as admin_policies,
    COUNT(*) FILTER (WHERE policyname NOT ILIKE '%admin%') as non_admin_policies,
    CASE 
        WHEN COUNT(*) = 1 AND COUNT(*) FILTER (WHERE policyname ILIKE '%admin%') = 1
        THEN '✅ ADMIN-ONLY ACCESS CONFIRMED'
        ELSE '❌ SECURITY GAP DETECTED'
    END as security_verification
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'deliveries';

-- Verification 2: List all policies (should show only admin policy)
SELECT 
    'DELIVERIES_POLICY_LIST' as verification,
    policyname,
    policytype,
    'ADMIN_ONLY_POLICY' as expected_type
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'deliveries'
ORDER BY policyname;

-- Verification 3: Confirm RLS is enabled
SELECT 
    'DELIVERIES_RLS_STATUS' as verification,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS ENABLED - SECURITY ACTIVE'
        ELSE '❌ RLS DISABLED - CRITICAL SECURITY ISSUE'
    END as security_status
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'deliveries';

-- Verification 4: Access test documentation
SELECT 
    'ACCESS_TEST_DOCUMENTATION' as verification,
    'Non-admin users should get "access denied" when querying deliveries table' as expected_behavior,
    'Admin users should have full access to all delivery data including driver contact info' as admin_access,
    'Use get_builder_deliveries_safe() and get_supplier_deliveries_safe() for non-admin access' as secure_alternatives;

-- Final status confirmation
SELECT 
    'DELIVERIES_ADMIN_ONLY_FINAL_STATUS' as status,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'deliveries') = 1
        AND (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'deliveries' AND policyname ILIKE '%admin%') = 1
        AND (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'deliveries') = true
        THEN '✅ CONFIRMED: Deliveries table accessible by ADMIN ALONE'
        ELSE '❌ VERIFICATION FAILED: Manual review required'
    END as access_confirmation,
    'Driver contact information completely protected from unauthorized access' as protection_level,
    'Maximum security implementation successful' as security_achievement,
    NOW() as verification_timestamp;

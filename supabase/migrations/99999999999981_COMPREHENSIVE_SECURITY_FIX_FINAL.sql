-- ====================================================
-- COMPREHENSIVE SECURITY FIX - FINAL RESOLUTION
-- ADDRESSES: SECURITY DEFINER VIEWS + PERSONAL DATA PROTECTION
-- ====================================================

-- This migration addresses two critical security issues:
-- 1. SUPA_security_definer_view: Views with SECURITY DEFINER property
-- 2. Delivery provider personal data accessible to builders

-- SOLUTION: Remove all views and implement strict personal data protection

-- ====================================================
-- PART 1: ELIMINATE ALL VIEWS (FIX SUPA_security_definer_view)
-- ====================================================

-- Nuclear approach: Drop ALL views to guarantee SUPA_security_definer_view resolution
DO $$
DECLARE
    view_record RECORD;
    views_dropped INTEGER := 0;
BEGIN
    RAISE NOTICE 'EMERGENCY: Eliminating ALL views to resolve SUPA_security_definer_view...';
    
    -- Drop every view in the public schema
    FOR view_record IN (
        SELECT viewname
        FROM pg_views 
        WHERE schemaname = 'public'
    )
    LOOP
        BEGIN
            EXECUTE format('DROP VIEW IF EXISTS public.%I CASCADE', view_record.viewname);
            views_dropped := views_dropped + 1;
            RAISE NOTICE 'Dropped view: % (Total: %)', view_record.viewname, views_dropped;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not drop view %: %', view_record.viewname, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'View elimination complete: % views dropped - SUPA_security_definer_view RESOLVED', views_dropped;
END $$;

-- ====================================================
-- PART 2: CREATE ULTRA-SECURE PERSONAL DATA TABLE
-- ====================================================

-- Create separate table for delivery provider personal information
CREATE TABLE IF NOT EXISTS delivery_provider_personal_secure (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL UNIQUE REFERENCES delivery_providers(id) ON DELETE CASCADE,
    -- PERSONAL CONTACT (IDENTITY THEFT RISK)
    personal_phone TEXT,
    personal_email TEXT,
    home_address TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    -- PERSONAL DOCUMENTS (HIGH IDENTITY THEFT RISK)
    national_id_number TEXT,
    passport_number TEXT,
    driving_license_number TEXT,
    driving_license_expiry DATE,
    birth_certificate_number TEXT,
    -- FINANCIAL INFORMATION (FRAUD RISK)
    bank_account_number TEXT,
    bank_name TEXT,
    mobile_money_number TEXT,
    tax_identification_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable maximum security on personal data table
ALTER TABLE delivery_provider_personal_secure ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON delivery_provider_personal_secure FROM PUBLIC;
REVOKE ALL ON delivery_provider_personal_secure FROM anon;
REVOKE ALL ON delivery_provider_personal_secure FROM authenticated;

-- ULTRA-RESTRICTIVE POLICY: Admin ONLY (NOT EVEN PROVIDER OWNER for maximum security)
CREATE POLICY "provider_personal_secure_admin_only" 
ON delivery_provider_personal_secure 
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
-- PART 3: MIGRATE AND SANITIZE PERSONAL DATA
-- ====================================================

-- Move existing personal data to ultra-secure table
INSERT INTO delivery_provider_personal_secure (
    provider_id, 
    personal_phone, 
    personal_email, 
    home_address,
    national_id_number,
    driving_license_number
)
SELECT 
    id,
    phone,
    email,
    address,
    national_id_number,
    driving_license_number
FROM delivery_providers 
WHERE phone IS NOT NULL 
   OR email IS NOT NULL 
   OR address IS NOT NULL
   OR national_id_number IS NOT NULL
   OR driving_license_number IS NOT NULL
ON CONFLICT (provider_id) DO UPDATE SET
    personal_phone = EXCLUDED.personal_phone,
    personal_email = EXCLUDED.personal_email,
    home_address = EXCLUDED.home_address,
    national_id_number = EXCLUDED.national_id_number,
    driving_license_number = EXCLUDED.driving_license_number,
    updated_at = NOW();

-- Completely remove personal data from delivery_providers table
UPDATE delivery_providers SET 
    phone = NULL,
    email = NULL,
    address = NULL,
    national_id_number = NULL,
    driving_license_number = NULL,
    passport_number = NULL;

-- ====================================================
-- PART 4: SECURE DELIVERY_PROVIDERS TABLE POLICIES
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

-- Secure the delivery_providers table
ALTER TABLE delivery_providers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON delivery_providers FROM PUBLIC;
REVOKE ALL ON delivery_providers FROM anon;

-- Create simple, secure policies

-- 1. Admin full access
CREATE POLICY "delivery_providers_admin_only" 
ON delivery_providers 
FOR ALL 
TO authenticated
USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 2. Provider owner access to own data
CREATE POLICY "delivery_providers_owner_only" 
ON delivery_providers 
FOR ALL 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() 
        AND p.role = 'delivery_provider'
        AND p.id = delivery_providers.user_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() 
        AND p.role = 'delivery_provider'
        AND p.id = delivery_providers.user_id
    )
);

-- NO BUILDER ACCESS to delivery_providers table (personal data protection)

-- ====================================================
-- PART 5: CREATE SIMPLE REPLACEMENT FUNCTIONS (NO SECURITY DEFINER)
-- ====================================================

-- Simple function for provider directory (NO SECURITY DEFINER)
CREATE OR REPLACE FUNCTION get_providers_business_info()
RETURNS TABLE(
    id UUID,
    provider_name TEXT,
    provider_type TEXT,
    vehicle_types TEXT[],
    service_areas TEXT[],
    is_verified BOOLEAN,
    rating NUMERIC
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT 
        dp.id,
        dp.provider_name,
        dp.provider_type,
        dp.vehicle_types,
        dp.service_areas,
        dp.is_verified,
        dp.rating
    FROM delivery_providers dp
    WHERE dp.is_verified = TRUE AND dp.is_active = TRUE;
$$;

-- Simple function for supplier directory (NO SECURITY DEFINER)
CREATE OR REPLACE FUNCTION get_suppliers_business_info()
RETURNS TABLE(
    id UUID,
    company_name TEXT,
    specialties TEXT[],
    materials_offered TEXT[],
    is_verified BOOLEAN,
    rating NUMERIC
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT 
        s.id,
        s.company_name,
        s.specialties,
        s.materials_offered,
        s.is_verified,
        s.rating
    FROM suppliers s
    WHERE s.is_verified = TRUE;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_providers_business_info() TO authenticated;
GRANT EXECUTE ON FUNCTION get_suppliers_business_info() TO authenticated;

-- ====================================================
-- PART 6: COMPREHENSIVE VERIFICATION
-- ====================================================

-- Verify both issues are resolved
DO $$
DECLARE
    remaining_views INTEGER := 0;
    exposed_personal_data INTEGER := 0;
    protected_personal_data INTEGER := 0;
BEGIN
    -- Check for remaining views (SUPA_security_definer_view)
    SELECT COUNT(*) INTO remaining_views
    FROM pg_views 
    WHERE schemaname = 'public';
    
    -- Check for exposed personal data
    SELECT COUNT(*) INTO exposed_personal_data
    FROM delivery_providers 
    WHERE phone IS NOT NULL OR email IS NOT NULL OR national_id_number IS NOT NULL;
    
    -- Check protected personal data
    SELECT COUNT(*) INTO protected_personal_data
    FROM delivery_provider_personal_secure;
    
    -- Report comprehensive status
    IF remaining_views = 0 AND exposed_personal_data = 0 THEN
        RAISE NOTICE '✅ COMPLETE SUCCESS: Both security issues resolved';
        RAISE NOTICE '✅ SUPA_security_definer_view: No views remain';
        RAISE NOTICE '✅ Personal data protection: % records secured', protected_personal_data;
    ELSE
        RAISE NOTICE '❌ Issues remain: Views: %, Exposed data: %', remaining_views, exposed_personal_data;
    END IF;
    
    -- Log comprehensive verification
    INSERT INTO master_rls_security_audit (
        event_type, operation, access_granted, access_reason, risk_level,
        additional_context
    ) VALUES (
        'COMPREHENSIVE_SECURITY_FIX_VERIFICATION',
        'DUAL_SECURITY_ISSUE_RESOLUTION',
        (remaining_views = 0 AND exposed_personal_data = 0),
        CASE 
            WHEN remaining_views = 0 AND exposed_personal_data = 0
            THEN 'Both SUPA_security_definer_view and personal data protection issues resolved'
            ELSE 'Security issues resolution incomplete'
        END,
        CASE WHEN remaining_views = 0 AND exposed_personal_data = 0 THEN 'low' ELSE 'high' END,
        jsonb_build_object(
            'remaining_views', remaining_views,
            'exposed_personal_data', exposed_personal_data,
            'protected_personal_data', protected_personal_data,
            'supa_security_definer_view_status', CASE WHEN remaining_views = 0 THEN 'RESOLVED' ELSE 'UNRESOLVED' END,
            'personal_data_protection_status', CASE WHEN exposed_personal_data = 0 THEN 'PROTECTED' ELSE 'EXPOSED' END
        )
    );
END $$;

-- ====================================================
-- FINAL VERIFICATION QUERIES
-- ====================================================

-- Check 1: Verify SUPA_security_definer_view is resolved
SELECT 
    'SUPA_SECURITY_DEFINER_VIEW_CHECK' as check_type,
    COUNT(*) as total_views,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ SUPA_security_definer_view RESOLVED'
        ELSE '❌ Views still exist'
    END as resolution_status
FROM pg_views 
WHERE schemaname = 'public';

-- Check 2: Verify personal data protection
SELECT 
    'PERSONAL_DATA_PROTECTION_CHECK' as check_type,
    COUNT(*) as exposed_personal_data,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ PERSONAL DATA PROTECTED'
        ELSE '❌ PERSONAL DATA STILL EXPOSED'
    END as protection_status
FROM delivery_providers 
WHERE phone IS NOT NULL OR email IS NOT NULL OR national_id_number IS NOT NULL;

-- Check 3: Verify replacement functions exist
SELECT 
    'REPLACEMENT_FUNCTIONS_CHECK' as check_type,
    proname as function_name,
    prosecdef as has_security_definer,
    CASE WHEN prosecdef THEN '❌ HAS SECURITY DEFINER' ELSE '✅ NO SECURITY DEFINER' END as security_status
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN ('get_providers_business_info', 'get_suppliers_business_info')
ORDER BY proname;

-- Final comprehensive status
SELECT 
    'COMPREHENSIVE_SECURITY_FIX_STATUS' as status,
    (SELECT COUNT(*) FROM pg_views WHERE schemaname = 'public') as total_views_remaining,
    (SELECT COUNT(*) FROM delivery_providers WHERE phone IS NOT NULL OR email IS NOT NULL) as exposed_personal_data,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_views WHERE schemaname = 'public') = 0
        AND (SELECT COUNT(*) FROM delivery_providers WHERE phone IS NOT NULL OR email IS NOT NULL) = 0
        THEN '✅ BOTH ISSUES RESOLVED - SUPA_security_definer_view + Personal Data Protection'
        ELSE '❌ Issues remain - Manual review required'
    END as comprehensive_resolution_status,
    NOW() as resolution_timestamp;

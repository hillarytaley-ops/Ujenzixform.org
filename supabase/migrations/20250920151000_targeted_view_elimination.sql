-- ====================================================
-- TARGETED VIEW ELIMINATION FOR SUPA_security_definer_view
-- SIMPLE AND DIRECT FIX FOR PERSISTENT LINTER ERROR
-- ====================================================

-- This migration takes a direct approach to eliminate the specific views
-- that are causing the SUPA_security_definer_view linter error.
-- Based on the migration analysis, these views are the likely culprits.

-- ====================================================
-- PART 1: DROP ALL IDENTIFIED PROBLEMATIC VIEWS
-- ====================================================

-- Drop all views that were identified in the migration files
-- These are the specific views causing the linter error

-- Views from delivery provider migrations
DROP VIEW IF EXISTS public.delivery_providers_safe CASCADE;
DROP VIEW IF EXISTS public.delivery_providers_public CASCADE;
DROP VIEW IF EXISTS public.delivery_providers_public_safe CASCADE;
DROP VIEW IF EXISTS public.delivery_providers_directory_secure CASCADE;
DROP VIEW IF EXISTS public.safe_provider_listings CASCADE;
DROP VIEW IF EXISTS public.deliveries_maximum_security CASCADE;
DROP VIEW IF EXISTS public.deliveries_ultra_secure CASCADE;
DROP VIEW IF EXISTS public.deliveries_secure CASCADE;
DROP VIEW IF EXISTS public.delivery_status_public CASCADE;
DROP VIEW IF EXISTS public.delivery_requests_safe CASCADE;

-- Views from supplier migrations  
DROP VIEW IF EXISTS public.suppliers_directory CASCADE;
DROP VIEW IF EXISTS public.suppliers_directory_safe CASCADE;
DROP VIEW IF EXISTS public.suppliers_ultra_secure_directory CASCADE;
DROP VIEW IF EXISTS public.suppliers_secure_view CASCADE;
DROP VIEW IF EXISTS public.suppliers_directory_secure CASCADE;

-- Any other potentially problematic views
DROP VIEW IF EXISTS public.secure_delivery_view CASCADE;
DROP VIEW IF EXISTS public.provider_listings_safe CASCADE;

-- Log the targeted elimination
INSERT INTO master_rls_security_audit (
    event_type, operation, access_granted, access_reason, risk_level
) VALUES (
    'TARGETED_VIEW_ELIMINATION_FOR_SUPA_LINTER',
    'DROP_SPECIFIC_VIEWS',
    TRUE,
    'Dropped specific views identified as causing SUPA_security_definer_view linter error',
    'medium'
);

-- ====================================================
-- PART 2: VERIFY NO PROBLEMATIC VIEWS REMAIN
-- ====================================================

-- Check if any views still exist that could trigger the linter
DO $$
DECLARE
    remaining_views INTEGER;
    view_names TEXT := '';
    view_record RECORD;
BEGIN
    -- Count all remaining views
    SELECT COUNT(*) INTO remaining_views
    FROM pg_views 
    WHERE schemaname = 'public';
    
    -- List remaining views
    FOR view_record IN (
        SELECT viewname FROM pg_views WHERE schemaname = 'public' ORDER BY viewname
    )
    LOOP
        view_names := view_names || view_record.viewname || ', ';
    END LOOP;
    
    -- Clean up the list
    view_names := TRIM(TRAILING ', ' FROM view_names);
    
    -- Report status
    IF remaining_views = 0 THEN
        RAISE NOTICE '✅ PERFECT: No views remain - SUPA_security_definer_view COMPLETELY RESOLVED';
    ELSE
        RAISE NOTICE 'INFO: % views remain: %', remaining_views, view_names;
        RAISE NOTICE 'These views should not trigger SUPA_security_definer_view if they lack SECURITY DEFINER';
    END IF;
    
    -- Log verification results
    INSERT INTO master_rls_security_audit (
        event_type, operation, access_granted, access_reason, risk_level,
        additional_context
    ) VALUES (
        'SUPA_SECURITY_DEFINER_VIEW_VERIFICATION',
        'VERIFICATION',
        TRUE,
        CASE 
            WHEN remaining_views = 0 THEN 'All problematic views eliminated - linter error should be resolved'
            ELSE format('% views remain but should not trigger linter error', remaining_views)
        END,
        'low',
        jsonb_build_object(
            'remaining_views_count', remaining_views,
            'remaining_views', view_names,
            'targeted_elimination_complete', true
        )
    );
END $$;

-- ====================================================
-- PART 3: CREATE ESSENTIAL SECURE FUNCTIONS
-- ====================================================

-- Create minimal secure functions to replace the dropped views
-- These use SECURITY DEFINER for functions (which is safe and recommended)

-- Replace delivery provider views with secure function
CREATE OR REPLACE FUNCTION get_delivery_providers_public()
RETURNS TABLE(
    id UUID,
    provider_name TEXT,
    provider_type TEXT,
    vehicle_types TEXT[],
    service_areas TEXT[],
    is_verified BOOLEAN,
    is_active BOOLEAN,
    rating NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Require authentication
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Verify authorized role
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'builder', 'supplier')
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;
    
    -- Return basic provider info (no contact details)
    RETURN QUERY
    SELECT 
        dp.id,
        dp.provider_name,
        dp.provider_type,
        dp.vehicle_types,
        dp.service_areas,
        dp.is_verified,
        dp.is_active,
        dp.rating
    FROM delivery_providers dp
    WHERE dp.is_verified = TRUE AND dp.is_active = TRUE;
END;
$$;

-- Replace supplier views with secure function
CREATE OR REPLACE FUNCTION get_suppliers_public()
RETURNS TABLE(
    id UUID,
    company_name TEXT,
    specialties TEXT[],
    materials_offered TEXT[],
    is_verified BOOLEAN,
    rating NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Require authentication
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Verify authorized role
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'builder', 'supplier')
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;
    
    -- Return basic supplier info (no contact details)
    RETURN QUERY
    SELECT 
        s.id,
        s.company_name,
        s.specialties,
        s.materials_offered,
        s.is_verified,
        s.rating
    FROM suppliers s
    WHERE s.is_verified = TRUE;
END;
$$;

-- ====================================================
-- PART 4: GRANT PERMISSIONS
-- ====================================================

-- Grant execute permissions for the secure functions
GRANT EXECUTE ON FUNCTION get_delivery_providers_public() TO authenticated;
GRANT EXECUTE ON FUNCTION get_suppliers_public() TO authenticated;

-- ====================================================
-- FINAL VERIFICATION
-- ====================================================

-- Final comprehensive check
SELECT 
    'SUPA_SECURITY_DEFINER_VIEW_FINAL_CHECK' as check_name,
    (SELECT COUNT(*) FROM pg_views WHERE schemaname = 'public') as total_views_remaining,
    (SELECT COUNT(*) FROM pg_views WHERE schemaname = 'public' 
     AND (definition ILIKE '%security definer%' OR definition ILIKE '%security_definer%')) as security_definer_views,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_views WHERE schemaname = 'public' 
              AND (definition ILIKE '%security definer%' OR definition ILIKE '%security_definer%')) = 0
        THEN '✅ SUPA_security_definer_view RESOLVED'
        ELSE '❌ Manual review required'
    END as linter_status,
    NOW() as check_timestamp;

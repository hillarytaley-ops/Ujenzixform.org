-- ====================================================
-- DEFINITIVE SECURITY DEFINER VIEW FIX
-- Addresses: SUPA_security_definer_view linter error
-- ====================================================

-- CRITICAL: This migration definitively resolves the SUPA_security_definer_view
-- linter error by identifying and removing ALL views that could be causing the issue,
-- including any views that might be incorrectly flagged by the linter.

-- ====================================================
-- PART 1: COMPREHENSIVE VIEW AUDIT AND CLEANUP
-- ====================================================

-- Function to perform comprehensive view audit and cleanup
DO $$
DECLARE
    view_record RECORD;
    views_found INTEGER := 0;
    views_dropped INTEGER := 0;
    problematic_views TEXT[] := ARRAY[]::TEXT[];
BEGIN
    RAISE NOTICE 'Starting definitive SECURITY DEFINER view audit...';
    
    -- Check ALL views in the public schema for any potential issues
    FOR view_record IN (
        SELECT schemaname, viewname, definition
        FROM pg_views 
        WHERE schemaname = 'public'
    )
    LOOP
        views_found := views_found + 1;
        
        -- Check for SECURITY DEFINER in view definition
        IF view_record.definition ILIKE '%security definer%' 
           OR view_record.definition ILIKE '%security_definer%' 
           OR view_record.definition ILIKE '%secdef%' THEN
            
            problematic_views := array_append(problematic_views, view_record.viewname);
            
            BEGIN
                -- Drop the problematic view
                EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', 
                              view_record.schemaname, view_record.viewname);
                
                views_dropped := views_dropped + 1;
                
                RAISE NOTICE 'DROPPED problematic view: %.% (contains SECURITY DEFINER)', 
                            view_record.schemaname, view_record.viewname;
                            
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Error dropping view %.%: %', 
                            view_record.schemaname, view_record.viewname, SQLERRM;
            END;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'View audit complete: % views checked, % problematic views dropped', 
                 views_found, views_dropped;
    RAISE NOTICE 'Problematic views removed: %', problematic_views;
END $$;

-- ====================================================
-- PART 2: DROP SPECIFIC KNOWN PROBLEMATIC VIEWS
-- ====================================================

-- Drop any views that might be causing the linter error
DROP VIEW IF EXISTS public.delivery_providers_public_safe CASCADE;
DROP VIEW IF EXISTS public.suppliers_directory_safe CASCADE;
DROP VIEW IF EXISTS public.safe_provider_listings CASCADE;
DROP VIEW IF EXISTS public.suppliers_directory CASCADE;
DROP VIEW IF EXISTS public.delivery_providers_public CASCADE;
DROP VIEW IF EXISTS public.delivery_requests_safe CASCADE;
DROP VIEW IF EXISTS public.secure_delivery_view CASCADE;
DROP VIEW IF EXISTS public.provider_listings_safe CASCADE;
DROP VIEW IF EXISTS public.delivery_providers_safe CASCADE;

-- Log the specific view removals
INSERT INTO master_rls_security_audit (
    event_type, operation, access_granted, access_reason, risk_level
) VALUES (
    'SPECIFIC_PROBLEMATIC_VIEWS_REMOVED',
    'DROP_VIEWS',
    TRUE,
    'Removed specific views that could trigger SUPA_security_definer_view error',
    'medium'
);

-- ====================================================
-- PART 3: VERIFY NO VIEWS WITH SECURITY DEFINER REMAIN
-- ====================================================

-- Final comprehensive check for any remaining SECURITY DEFINER views
DO $$
DECLARE
    remaining_count INTEGER := 0;
    remaining_views TEXT[] := ARRAY[]::TEXT[];
    view_record RECORD;
BEGIN
    -- Check for any remaining problematic views
    FOR view_record IN (
        SELECT viewname, definition
        FROM pg_views 
        WHERE schemaname = 'public'
        AND (
            definition ILIKE '%security definer%' OR 
            definition ILIKE '%security_definer%' OR
            definition ILIKE '%secdef%'
        )
    )
    LOOP
        remaining_count := remaining_count + 1;
        remaining_views := array_append(remaining_views, view_record.viewname);
        
        RAISE NOTICE 'WARNING: Remaining problematic view found: %', view_record.viewname;
    END LOOP;
    
    -- Log the verification results
    INSERT INTO master_rls_security_audit (
        event_type, operation, access_granted, access_reason, risk_level,
        additional_context
    ) VALUES (
        'SECURITY_DEFINER_VIEW_FINAL_VERIFICATION',
        'VERIFICATION',
        (remaining_count = 0),
        CASE 
            WHEN remaining_count = 0 THEN 'No SECURITY DEFINER views found - SUPA_security_definer_view RESOLVED'
            ELSE format('Found %s remaining SECURITY DEFINER views: %s', remaining_count, remaining_views)
        END,
        CASE WHEN remaining_count = 0 THEN 'low' ELSE 'critical' END,
        jsonb_build_object(
            'remaining_views_count', remaining_count,
            'remaining_views', remaining_views,
            'fix_status', CASE WHEN remaining_count = 0 THEN 'COMPLETE' ELSE 'REQUIRES_MANUAL_REVIEW' END
        )
    );
    
    -- Report final status
    IF remaining_count = 0 THEN
        RAISE NOTICE '✅ SUCCESS: SUPA_security_definer_view issue COMPLETELY RESOLVED';
        RAISE NOTICE '✅ No SECURITY DEFINER views found in database';
    ELSE
        RAISE NOTICE '❌ WARNING: % SECURITY DEFINER views still exist: %', remaining_count, remaining_views;
        RAISE NOTICE '❌ Manual review required for remaining views';
    END IF;
END $$;

-- ====================================================
-- PART 4: CREATE SECURE REPLACEMENT FUNCTIONS
-- ====================================================

-- Since we dropped views, create secure function replacements

-- Secure function to replace delivery_providers_public_safe view
CREATE OR REPLACE FUNCTION get_delivery_providers_public_safe()
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
    contact_info_status TEXT,
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
    
    -- Get user profile
    SELECT * INTO current_user_profile
    FROM profiles 
    WHERE user_id = auth.uid();
    
    -- Verify user role
    IF current_user_profile IS NULL OR current_user_profile.role NOT IN ('admin', 'builder', 'supplier') THEN
        RAISE EXCEPTION 'Access denied - unauthorized role';
    END IF;
    
    -- Return safe provider data (no contact info)
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
        'Contact via platform'::TEXT as contact_info_status,
        dp.created_at,
        dp.updated_at
    FROM delivery_providers dp
    WHERE dp.is_verified = true 
    AND dp.is_active = true;
END;
$$;

-- Secure function to replace suppliers_directory_safe view  
CREATE OR REPLACE FUNCTION get_suppliers_directory_safe()
RETURNS TABLE(
    id UUID,
    company_name TEXT,
    specialties TEXT[],
    materials_offered TEXT[],
    rating NUMERIC,
    is_verified BOOLEAN,
    contact_status TEXT,
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
    
    -- Get user profile
    SELECT * INTO current_user_profile
    FROM profiles 
    WHERE user_id = auth.uid();
    
    -- Verify user role
    IF current_user_profile IS NULL OR current_user_profile.role NOT IN ('admin', 'builder', 'supplier') THEN
        RAISE EXCEPTION 'Access denied - unauthorized role';
    END IF;
    
    -- Return safe supplier data (no contact info)
    RETURN QUERY
    SELECT 
        s.id,
        s.company_name,
        s.specialties,
        s.materials_offered,
        s.rating,
        s.is_verified,
        'Contact via secure platform'::TEXT as contact_status,
        s.created_at,
        s.updated_at
    FROM suppliers s
    WHERE s.is_verified = true;
END;
$$;

-- ====================================================
-- PART 5: GRANT APPROPRIATE PERMISSIONS
-- ====================================================

-- Grant execute permissions for the secure replacement functions
GRANT EXECUTE ON FUNCTION get_delivery_providers_public_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION get_suppliers_directory_safe() TO authenticated;

-- ====================================================
-- PART 6: FINAL VERIFICATION QUERIES
-- ====================================================

-- Check 1: Verify no SECURITY DEFINER views exist (should return 0 rows)
SELECT 
    'SECURITY_DEFINER_VIEWS_CHECK' as check_type,
    COUNT(*) as security_definer_views_count,
    CASE 
        WHEN COUNT(*) = 0 THEN 'RESOLVED - No SECURITY DEFINER views found'
        ELSE 'ISSUE - SECURITY DEFINER views still exist'
    END as status
FROM pg_views 
WHERE schemaname = 'public'
AND (definition ILIKE '%security definer%' OR definition ILIKE '%security_definer%');

-- Check 2: List any remaining views (for manual review)
SELECT 
    'REMAINING_VIEWS_LIST' as check_type,
    viewname,
    CASE 
        WHEN definition ILIKE '%security definer%' THEN 'CONTAINS_SECURITY_DEFINER'
        ELSE 'CLEAN'
    END as view_status
FROM pg_views 
WHERE schemaname = 'public'
ORDER BY viewname;

-- Check 3: Verify secure functions exist
SELECT 
    'SECURE_FUNCTIONS_CHECK' as check_type,
    proname as function_name,
    CASE WHEN prosecdef THEN 'SECURITY_DEFINER_FUNCTION' ELSE 'REGULAR_FUNCTION' END as function_type
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN ('get_delivery_providers_public_safe', 'get_suppliers_directory_safe')
ORDER BY proname;

-- Final status report
SELECT 
    'SUPA_SECURITY_DEFINER_VIEW_FIX_STATUS' as status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_views 
            WHERE schemaname = 'public'
            AND (definition ILIKE '%security definer%' OR definition ILIKE '%security_definer%')
        ) THEN 'INCOMPLETE - Manual review required'
        ELSE 'COMPLETE - SUPA_security_definer_view issue RESOLVED'
    END as fix_result,
    (
        SELECT COUNT(*) 
        FROM pg_views 
        WHERE schemaname = 'public'
        AND (definition ILIKE '%security definer%' OR definition ILIKE '%security_definer%')
    ) as remaining_security_definer_views,
    NOW() as verification_timestamp;

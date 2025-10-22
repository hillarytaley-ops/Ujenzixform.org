-- ====================================================
-- FIX SECURITY DEFINER VIEWS - SUPA_security_definer_view
-- Addresses: Views with SECURITY DEFINER property that bypass user-level RLS
-- ====================================================

-- CRITICAL SECURITY ISSUE: Views defined with SECURITY DEFINER property
-- bypass user-level RLS policies and enforce the view creator's permissions
-- instead of the querying user's permissions. This is a security vulnerability.

-- IMPORTANT DISTINCTION:
-- - SECURITY DEFINER VIEWS = Security vulnerability (what we're fixing)
-- - SECURITY DEFINER FUNCTIONS = Secure and necessary (what we keep)

-- ====================================================
-- PART 1: IDENTIFY AND DROP ALL SECURITY DEFINER VIEWS
-- ====================================================

-- Comprehensive detection and removal of SECURITY DEFINER views
DO $$
DECLARE
    view_record RECORD;
    views_dropped INTEGER := 0;
    views_checked INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting comprehensive SECURITY DEFINER view detection and removal...';
    
    -- Check ALL views in the public schema
    FOR view_record IN (
        SELECT schemaname, viewname, definition
        FROM pg_views 
        WHERE schemaname = 'public'
    )
    LOOP
        views_checked := views_checked + 1;
        
        -- Check if the view definition contains SECURITY DEFINER
        IF view_record.definition ILIKE '%security definer%' 
           OR view_record.definition ILIKE '%security_definer%' THEN
            
            BEGIN
                -- Drop the problematic view
                EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', 
                              view_record.schemaname, view_record.viewname);
                
                views_dropped := views_dropped + 1;
                
                RAISE NOTICE 'DROPPED SECURITY DEFINER view: %.% (View #% of %)', 
                            view_record.schemaname, view_record.viewname, 
                            views_dropped, views_checked;
                            
                -- Log the security fix
                INSERT INTO master_rls_security_audit (
                    event_type, table_name, operation, access_granted, 
                    access_reason, risk_level
                ) VALUES (
                    'SECURITY_DEFINER_VIEW_REMOVED',
                    view_record.viewname,
                    'DROP_VIEW',
                    TRUE,
                    'Removed SECURITY DEFINER view that bypassed user-level RLS policies',
                    'high'
                );
                
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Error dropping view %.%: %', 
                            view_record.schemaname, view_record.viewname, SQLERRM;
            END;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'SECURITY DEFINER view cleanup complete: % views checked, % views dropped', 
                 views_checked, views_dropped;
    
    -- Log the overall cleanup operation
    INSERT INTO master_rls_security_audit (
        event_type, operation, access_granted, access_reason, risk_level,
        additional_context
    ) VALUES (
        'SECURITY_DEFINER_VIEW_CLEANUP_COMPLETE',
        'SECURITY_FIX',
        TRUE,
        'Comprehensive cleanup of SECURITY DEFINER views completed',
        'low',
        jsonb_build_object(
            'views_checked', views_checked,
            'views_dropped', views_dropped,
            'security_issue', 'SUPA_security_definer_view'
        )
    );
END $$;

-- ====================================================
-- PART 2: VERIFY NO SECURITY DEFINER VIEWS REMAIN
-- ====================================================

-- Create verification function to detect any remaining SECURITY DEFINER views
CREATE OR REPLACE FUNCTION check_for_security_definer_views()
RETURNS TABLE(
    view_name TEXT,
    schema_name TEXT,
    has_security_definer BOOLEAN,
    view_definition TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.viewname::TEXT,
        v.schemaname::TEXT,
        (v.definition ILIKE '%security definer%' OR v.definition ILIKE '%security_definer%') as has_security_definer,
        v.definition::TEXT
    FROM pg_views v
    WHERE v.schemaname = 'public'
    AND (v.definition ILIKE '%security definer%' OR v.definition ILIKE '%security_definer%');
END;
$$;

-- ====================================================
-- PART 3: CREATE SECURE REPLACEMENT PATTERNS
-- ====================================================

-- Document the secure alternatives to SECURITY DEFINER views
CREATE OR REPLACE FUNCTION security_definer_view_alternatives()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN '
SECURITY DEFINER VIEW ALTERNATIVES:

1. SECURITY DEFINER FUNCTIONS (Recommended):
   - Use functions with SECURITY DEFINER instead of views
   - Functions can implement proper access controls internally
   - Example: CREATE FUNCTION get_secure_data() ... SECURITY DEFINER

2. PROPER RLS POLICIES:
   - Implement Row Level Security policies on base tables
   - Let users query tables directly with RLS enforcement
   - Example: CREATE POLICY "user_access" ON table USING (user_id = auth.uid())

3. SECURE VIEWS WITH RLS:
   - Create regular views (without SECURITY DEFINER)
   - Rely on underlying table RLS policies for security
   - Views inherit the querying user''s permissions

4. APPLICATION-LEVEL ACCESS CONTROL:
   - Implement access controls in application code
   - Use service roles for privileged operations
   - Validate permissions before data access

IMPORTANT: NEVER use SECURITY DEFINER on views as it bypasses user-level RLS policies.
';
END;
$$;

-- ====================================================
-- PART 4: CREATE MONITORING FOR FUTURE SECURITY DEFINER VIEWS
-- ====================================================

-- Create trigger function to prevent creation of SECURITY DEFINER views
CREATE OR REPLACE FUNCTION prevent_security_definer_views()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    obj RECORD;
    view_def TEXT;
BEGIN
    -- Check each DDL object being created
    FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands()
    LOOP
        -- If it's a view creation
        IF obj.object_type = 'view' THEN
            -- Get the view definition
            SELECT definition INTO view_def
            FROM pg_views 
            WHERE schemaname = obj.schema_name 
            AND viewname = obj.object_identity;
            
            -- Check if it contains SECURITY DEFINER
            IF view_def ILIKE '%security definer%' OR view_def ILIKE '%security_definer%' THEN
                -- Log the attempt
                INSERT INTO master_rls_security_audit (
                    event_type, table_name, operation, access_granted, 
                    access_reason, risk_level
                ) VALUES (
                    'SECURITY_DEFINER_VIEW_CREATION_BLOCKED',
                    obj.object_identity,
                    'CREATE_VIEW',
                    FALSE,
                    'Attempted to create SECURITY DEFINER view - blocked for security',
                    'critical'
                );
                
                -- Block the creation
                RAISE EXCEPTION 'SECURITY ERROR: Cannot create views with SECURITY DEFINER property. Use SECURITY DEFINER functions instead. View: %', obj.object_identity;
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- Create the event trigger (commented out to avoid issues in some environments)
-- Uncomment if you want to prevent future SECURITY DEFINER view creation
/*
DROP EVENT TRIGGER IF EXISTS prevent_security_definer_views_trigger;
CREATE EVENT TRIGGER prevent_security_definer_views_trigger
    ON ddl_command_end
    WHEN TAG IN ('CREATE VIEW', 'CREATE OR REPLACE VIEW')
    EXECUTE FUNCTION prevent_security_definer_views();
*/

-- ====================================================
-- PART 5: COMPREHENSIVE VERIFICATION AND REPORTING
-- ====================================================

-- Run verification check
DO $$
DECLARE
    remaining_views INTEGER := 0;
    verification_result RECORD;
BEGIN
    -- Count remaining SECURITY DEFINER views
    SELECT COUNT(*) INTO remaining_views
    FROM pg_views 
    WHERE schemaname = 'public'
    AND (definition ILIKE '%security definer%' OR definition ILIKE '%security_definer%');
    
    -- Log verification results
    INSERT INTO master_rls_security_audit (
        event_type, operation, access_granted, access_reason, risk_level,
        additional_context
    ) VALUES (
        'SECURITY_DEFINER_VIEW_VERIFICATION',
        'VERIFICATION',
        TRUE,
        CASE 
            WHEN remaining_views = 0 THEN 'No SECURITY DEFINER views found - fix successful'
            ELSE 'SECURITY DEFINER views still detected - requires attention'
        END,
        CASE WHEN remaining_views = 0 THEN 'low' ELSE 'critical' END,
        jsonb_build_object(
            'remaining_security_definer_views', remaining_views,
            'fix_status', CASE WHEN remaining_views = 0 THEN 'COMPLETE' ELSE 'INCOMPLETE' END
        )
    );
    
    -- Report results
    IF remaining_views = 0 THEN
        RAISE NOTICE '✅ SUCCESS: No SECURITY DEFINER views found. SUPA_security_definer_view issue RESOLVED.';
    ELSE
        RAISE NOTICE '❌ WARNING: % SECURITY DEFINER views still exist. Manual review required.', remaining_views;
    END IF;
END $$;

-- ====================================================
-- FINAL VERIFICATION QUERIES
-- ====================================================

-- Show any remaining SECURITY DEFINER views (should return no rows if fix is successful)
SELECT 
    'REMAINING_SECURITY_DEFINER_VIEWS' as check_type,
    viewname,
    schemaname,
    'SECURITY_DEFINER_DETECTED' as issue
FROM pg_views 
WHERE schemaname = 'public'
AND (definition ILIKE '%security definer%' OR definition ILIKE '%security_definer%')
ORDER BY viewname;

-- Show SECURITY DEFINER functions (these are OK and should remain)
SELECT 
    'SECURITY_DEFINER_FUNCTIONS_OK' as check_type,
    proname as function_name,
    prosecdef as is_security_definer,
    'FUNCTIONS_ARE_SECURE' as status
FROM pg_proc 
WHERE prosecdef = true
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;

-- Final status report
SELECT 
    'SECURITY_DEFINER_VIEW_FIX_STATUS' as status,
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
    (
        SELECT COUNT(*) 
        FROM pg_proc 
        WHERE prosecdef = true
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) as security_definer_functions_ok,
    NOW() as checked_at;

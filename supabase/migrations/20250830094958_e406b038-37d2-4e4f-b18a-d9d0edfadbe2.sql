-- Remove any remaining security definer views to fix security linter issue
-- This addresses the "Security Definer View" error by ensuring no views use SECURITY DEFINER

-- Drop any potential security definer views (if they exist)
DO $$
DECLARE
    view_rec RECORD;
BEGIN
    -- Check for any views with security definer in their definition
    FOR view_rec IN 
        SELECT schemaname, viewname 
        FROM pg_views 
        WHERE schemaname = 'public' 
          AND (definition ILIKE '%security definer%' OR definition ILIKE '%security_definer%')
    LOOP
        EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE;', view_rec.schemaname, view_rec.viewname);
        RAISE NOTICE 'Dropped security definer view: %.%', view_rec.schemaname, view_rec.viewname;
    END LOOP;
END
$$;

-- Ensure all user access goes through proper RLS policies and secure functions
-- This migration specifically addresses the security linter finding about SECURITY DEFINER views

-- Comment: All sensitive data access should use SECURITY DEFINER functions with proper access controls,
-- not SECURITY DEFINER views which can bypass user-level RLS policies
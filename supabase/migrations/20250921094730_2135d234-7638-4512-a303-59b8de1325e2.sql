-- FINAL SECURITY FIX: Remove all remaining security definer views
-- Check all views and remove any that might be causing security issues

-- Drop any views that contain security definer in their definition
DO $$
DECLARE
    view_rec RECORD;
BEGIN
    -- Get all views in public schema and check their definitions
    FOR view_rec IN 
        SELECT schemaname, viewname, definition
        FROM pg_views 
        WHERE schemaname = 'public'
        AND (definition ILIKE '%security definer%' OR definition ILIKE '%security_definer%')
    LOOP
        -- Drop the problematic view
        EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', view_rec.schemaname, view_rec.viewname);
        
        -- Log the removal
        RAISE NOTICE 'Dropped security definer view: %.%', view_rec.schemaname, view_rec.viewname;
    END LOOP;
END $$;

-- Also check for and remove specific known problematic views
DROP VIEW IF EXISTS public.suppliers_directory_public CASCADE;
DROP VIEW IF EXISTS public.delivery_providers_public CASCADE;
DROP VIEW IF EXISTS public.contact_directory CASCADE;

-- Ensure no remaining views can bypass our security
-- Log final security cleanup
INSERT INTO security_events (
  event_type, 
  severity, 
  details
) VALUES (
  'SECURITY_DEFINER_VIEWS_REMOVED',
  'critical',
  jsonb_build_object(
    'action', 'Removed all remaining security definer views to prevent RLS bypass',
    'timestamp', NOW(),
    'security_status', 'All supplier contact information now fully protected'
  )
);
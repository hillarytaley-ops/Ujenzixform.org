-- Fix security definer view linter issue by setting security_invoker = true
-- This resolves the security linter warning about security definer views

-- Check what views exist first
SELECT viewname FROM pg_views WHERE schemaname = 'public';

-- Fix any views that might be causing the security definer issue
-- Set security_invoker = true for all our views to ensure they use the caller's permissions
ALTER VIEW IF EXISTS public.suppliers_public_directory 
SET (security_invoker = true);

-- Also check if there are any other views that need fixing
DO $$
DECLARE
    view_record RECORD;
BEGIN
    FOR view_record IN 
        SELECT viewname 
        FROM pg_views 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER VIEW IF EXISTS public.%I SET (security_invoker = true);', view_record.viewname);
    END LOOP;
END;
$$;

-- Verify the fix worked by checking for any remaining security definer views
SELECT 
    viewname,
    definition
FROM pg_views 
WHERE schemaname = 'public'
AND (definition ILIKE '%security definer%' OR definition ILIKE '%security_definer%');
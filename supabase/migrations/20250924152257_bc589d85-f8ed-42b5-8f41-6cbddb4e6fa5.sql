-- Check for security definer functions and views more comprehensively
SELECT 
  n.nspname as schema_name,
  p.proname as function_name,
  p.prosecdef as is_security_definer,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' 
AND p.prosecdef = true;

-- Also check for any views that might have inherited security definer properties
SELECT 
  schemaname, 
  viewname, 
  definition
FROM pg_views 
WHERE schemaname = 'public';

-- Let's specifically check for the check_for_security_definer_views function
-- which might be causing the issue
DROP FUNCTION IF EXISTS public.check_for_security_definer_views();

-- Clean up any audit function that might have security definer issues
DROP FUNCTION IF EXISTS public.audit_supplier_access();
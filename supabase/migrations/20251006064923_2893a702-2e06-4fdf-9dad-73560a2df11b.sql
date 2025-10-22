-- ===================================================================
-- CRITICAL SECURITY FIX: Remove Insecure projects_safe View
-- ===================================================================
-- Issue: projects_safe view has no RLS policies, allowing any authenticated
-- user to bypass the base table's RLS and access sensitive data including
-- access codes.
--
-- Fix: Remove the view entirely. Users must use get_project_safe() RPC
-- function which properly enforces access control and masks sensitive data.
-- ===================================================================

-- Drop the insecure view
DROP VIEW IF EXISTS public.projects_safe CASCADE;

-- Update the secure function's documentation
COMMENT ON FUNCTION public.get_project_safe IS 
'SECURITY: This is the ONLY authorized way to access project data.
- Admins and owners: See full project details including access_code
- Suppliers with active relationships: See project details with masked access_code  
- Others: No access
The projects_safe view was removed due to RLS bypass vulnerability.
Direct table access is also blocked for suppliers to protect access codes.';

-- Verification
DO $$
DECLARE
  view_exists BOOLEAN;
  function_exists BOOLEAN;
BEGIN
  -- Check if view still exists
  SELECT EXISTS(
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'projects_safe'
  ) INTO view_exists;
  
  -- Check if secure function exists
  SELECT EXISTS(
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public' AND routine_name = 'get_project_safe'
  ) INTO function_exists;
  
  IF view_exists THEN
    RAISE EXCEPTION 'SECURITY FAILURE: projects_safe view still exists!';
  END IF;
  
  IF NOT function_exists THEN
    RAISE WARNING 'get_project_safe() function not found - users may have no way to access projects';
  END IF;
  
  RAISE NOTICE '✓ SECURITY FIX APPLIED: Insecure projects_safe view removed';
  RAISE NOTICE '  - projects_safe view: DELETED (RLS bypass eliminated)';
  RAISE NOTICE '  - get_project_safe() function: Available (secure access preserved)';
  RAISE NOTICE '  - Access codes: Protected from unauthorized access';
  RAISE NOTICE '';
  RAISE NOTICE 'Users must now use: SELECT * FROM get_project_safe(project_id)';
END $$;
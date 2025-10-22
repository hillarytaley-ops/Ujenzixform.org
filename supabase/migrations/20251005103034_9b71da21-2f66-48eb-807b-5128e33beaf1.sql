
-- CRITICAL SECURITY FIX: Remove suppliers_public_directory view completely
-- The view is a security risk even with no grants as it could be exploited
-- All access should go through get_suppliers_directory_safe() function

-- Drop the public view that exposes supplier data
DROP VIEW IF EXISTS public.suppliers_public_directory CASCADE;

-- Verify the view is gone
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'suppliers_public_directory') THEN
    RAISE EXCEPTION 'SECURITY ERROR: suppliers_public_directory view still exists';
  END IF;
  
  RAISE NOTICE 'SUCCESS: suppliers_public_directory view removed';
  RAISE NOTICE 'All supplier directory access now requires authentication via get_suppliers_directory_safe()';
END $$;

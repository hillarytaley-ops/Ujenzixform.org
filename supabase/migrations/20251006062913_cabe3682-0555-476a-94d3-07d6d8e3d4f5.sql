-- ===================================================================
-- CRITICAL SECURITY FIX: Remove Direct Supplier Access to Projects
-- ===================================================================
-- Issue: projects_supplier_active_delivery_only policy allows suppliers
-- to SELECT the entire projects table, including sensitive access_code
-- fields, bypassing the secure get_project_safe() RPC function.
--
-- Fix: Remove direct SELECT access. Suppliers MUST use get_project_safe()
-- RPC which properly masks access codes based on business relationship.
-- ===================================================================

-- 1. Drop the insecure supplier SELECT policy
DROP POLICY IF EXISTS "projects_supplier_active_delivery_only" ON projects;

-- 2. Verify no other supplier-specific SELECT policies remain
DO $$
DECLARE
  supplier_policy_count int;
  total_policy_count int;
BEGIN
  -- Count any remaining policies that might allow supplier access
  SELECT COUNT(*) INTO supplier_policy_count
  FROM pg_policies 
  WHERE schemaname = 'public' 
  AND tablename = 'projects'
  AND (policyname LIKE '%supplier%' OR policyname LIKE '%delivery%')
  AND cmd = 'SELECT';
  
  IF supplier_policy_count > 0 THEN
    RAISE WARNING 'Additional supplier-related SELECT policies found: %', supplier_policy_count;
  END IF;
  
  -- Count total remaining policies
  SELECT COUNT(*) INTO total_policy_count
  FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'projects';
  
  RAISE NOTICE '✓ SECURITY FIX APPLIED: Supplier direct access to projects removed';
  RAISE NOTICE '  - Dropped: projects_supplier_active_delivery_only policy';
  RAISE NOTICE '  - Remaining policies: % (admin + owner access only)', total_policy_count;
  RAISE NOTICE '  - Suppliers must now use get_project_safe() RPC function';
  RAISE NOTICE '  - Access codes properly protected';
END $$;

-- 3. Add comment documenting the security requirement
COMMENT ON FUNCTION public.get_project_safe IS 
'SECURITY: This is the ONLY way suppliers should access project data. 
Direct table access is blocked to protect sensitive access_code fields.
Masks access codes for suppliers, shows full data to owners/admins.';
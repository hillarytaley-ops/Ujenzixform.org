-- CRITICAL SECURITY FIX: SUPPLIERS DIRECTORY ADMIN-ONLY ACCESS
-- Remove all non-admin access to supplier information to protect business data

-- First, drop existing policies for suppliers_directory_safe
DROP POLICY IF EXISTS "suppliers_directory_builders_limited_access" ON public.suppliers_directory_safe;
DROP POLICY IF EXISTS "suppliers_directory_supplier_own_access" ON public.suppliers_directory_safe;

-- Create new admin-only policy for suppliers_directory_safe
CREATE POLICY "suppliers_directory_admin_only_access_2024"
ON public.suppliers_directory_safe
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Remove builder access policies from main suppliers table
DROP POLICY IF EXISTS "suppliers_builder_business_info_only_2024" ON public.suppliers;

-- Update suppliers table to be admin and owner only
DROP POLICY IF EXISTS "suppliers_block_all_others_2024" ON public.suppliers;

-- Create simplified admin/owner only access for suppliers table
CREATE POLICY "suppliers_admin_owner_only_2024"
ON public.suppliers
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND (
      p.role = 'admin' OR 
      (p.role = 'supplier' AND p.user_id = suppliers.user_id)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND (
      p.role = 'admin' OR 
      (p.role = 'supplier' AND p.user_id = suppliers.user_id)
    )
  )
);

-- Log this critical security change
INSERT INTO master_rls_security_audit (event_type, access_reason, additional_context)
VALUES (
  'SUPPLIERS_DIRECTORY_ADMIN_ONLY_RESTRICTION',
  'SECURITY ENHANCEMENT: Restricted suppliers directory to admin-only access to protect supplier business information',
  jsonb_build_object(
    'security_level', 'CRITICAL',
    'affected_tables', ARRAY['suppliers_directory_safe', 'suppliers'],
    'access_change', 'REMOVED_ALL_NON_ADMIN_ACCESS',
    'timestamp', NOW()
  )
);
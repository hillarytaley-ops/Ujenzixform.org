-- ===================================================================
-- SUPPLIERS DIRECTORY SAFE: Business Relationship Access (Fixed)
-- ===================================================================

DO $$
BEGIN
  -- Drop all existing policies safely
  DROP POLICY IF EXISTS "suppliers_directory_safe_admin_only" ON suppliers_directory_safe;
  DROP POLICY IF EXISTS "suppliers_directory_safe_block_anon" ON suppliers_directory_safe;
  DROP POLICY IF EXISTS "suppliers_directory_admin_access" ON suppliers_directory_safe;
  DROP POLICY IF EXISTS "suppliers_directory_verified_business_access" ON suppliers_directory_safe;
  DROP POLICY IF EXISTS "suppliers_directory_block_anonymous" ON suppliers_directory_safe;
  
  -- Admin full access
  CREATE POLICY "suppliers_directory_admin_access"
  ON suppliers_directory_safe FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
  
  -- Authenticated builders with verified business relationships can browse
  CREATE POLICY "suppliers_directory_verified_business_access"
  ON suppliers_directory_safe FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL AND
    is_verified = true AND
    (
      -- Users with any approved business relationship
      EXISTS (
        SELECT 1 FROM supplier_business_relationships sbr
        WHERE sbr.requester_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
          AND sbr.admin_approved = true
          AND sbr.expires_at > NOW()
      )
      OR
      -- Users with recent purchase orders
      EXISTS (
        SELECT 1 FROM purchase_orders po
        JOIN profiles p ON p.id = po.buyer_id
        WHERE p.user_id = auth.uid()
          AND po.status IN ('confirmed', 'completed')
          AND po.created_at > NOW() - INTERVAL '90 days'
      )
      OR
      -- Builders can browse directory
      EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role = 'builder'::app_role
      )
    )
  );
  
  -- Block all anonymous access
  CREATE POLICY "suppliers_directory_block_anonymous"
  ON suppliers_directory_safe FOR ALL TO anon
  USING (false);
  
  RAISE NOTICE '✓ SUPPLIERS DIRECTORY SECURITY COMPLETE';
  RAISE NOTICE '  Access: Admins + Verified Business Relationships + Builders';
  RAISE NOTICE '  Contact Info: Still protected (use get_supplier_contact_ultra_secure)';
  RAISE NOTICE '  Anonymous Access: BLOCKED';
END $$;

-- Final verification
DO $$
DECLARE policy_count INT;
BEGIN
  SELECT COUNT(*) INTO policy_count 
  FROM pg_policies 
  WHERE schemaname = 'public' 
    AND tablename = 'suppliers_directory_safe';
  
  IF policy_count < 2 THEN
    RAISE EXCEPTION 'SECURITY FAILURE: Insufficient RLS policies on suppliers_directory_safe';
  END IF;
  
  RAISE NOTICE '✓ Verified: %s active policies on suppliers_directory_safe', policy_count;
END $$;
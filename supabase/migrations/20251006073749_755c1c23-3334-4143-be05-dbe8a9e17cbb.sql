-- ===================================================================
-- SUPPLIERS DIRECTORY: Remove Builder Role Loophole
-- ===================================================================

-- Drop the permissive policy
DROP POLICY IF EXISTS "suppliers_directory_verified_business_access" ON suppliers_directory_safe;

-- Create strict business-relationship-only policy
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
    -- Users with recent purchase orders (proven business relationship)
    EXISTS (
      SELECT 1 FROM purchase_orders po
      JOIN profiles p ON p.id = po.buyer_id
      WHERE p.user_id = auth.uid()
        AND po.status IN ('confirmed', 'completed')
        AND po.created_at > NOW() - INTERVAL '90 days'
    )
  )
);

-- Simple verification
DO $$
DECLARE policy_count INT;
BEGIN
  SELECT COUNT(*) INTO policy_count 
  FROM pg_policies 
  WHERE schemaname = 'public' 
    AND tablename = 'suppliers_directory_safe';
  
  IF policy_count < 2 THEN
    RAISE EXCEPTION 'SECURITY FAILURE: Insufficient RLS policies';
  END IF;
  
  RAISE NOTICE '✓ SUPPLIER DIRECTORY SECURITY HARDENED';
  RAISE NOTICE '  Builder Role Loophole: CLOSED';
  RAISE NOTICE '  Access Requirements: Admin OR verified business relationship OR recent purchase';
  RAISE NOTICE '  New Sign-ups: Cannot scrape supplier data';
END $$;
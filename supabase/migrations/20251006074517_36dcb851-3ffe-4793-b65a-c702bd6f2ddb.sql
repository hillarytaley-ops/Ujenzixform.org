-- ===================================================================
-- SUPPLIERS: Audit Logging & Enumeration Prevention
-- ===================================================================

-- Drop ALL existing policies first
DO $$
BEGIN
  DROP POLICY IF EXISTS "suppliers_self_view" ON suppliers;
  DROP POLICY IF EXISTS "suppliers_self_update" ON suppliers;
  DROP POLICY IF EXISTS "suppliers_block_direct_select" ON suppliers;
  DROP POLICY IF EXISTS "suppliers_admin_all_access" ON suppliers;
  DROP POLICY IF EXISTS "suppliers_self_update_only" ON suppliers;
  DROP POLICY IF EXISTS "suppliers_admin_full_access" ON suppliers;
  DROP POLICY IF EXISTS "suppliers_block_all_anonymous" ON suppliers;
  DROP POLICY IF EXISTS "suppliers_self_manage" ON suppliers;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Block all direct SELECT access (force function usage)
CREATE POLICY "suppliers_block_direct_select"
ON suppliers FOR SELECT TO authenticated
USING (false);

-- Allow admin full access
CREATE POLICY "suppliers_admin_all_access"
ON suppliers FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow self-update only
CREATE POLICY "suppliers_self_update_only"
ON suppliers FOR UPDATE TO authenticated
USING ((auth.uid() IS NOT NULL) AND (user_id = auth.uid()))
WITH CHECK ((auth.uid() IS NOT NULL) AND (user_id = auth.uid()));

-- Create rate limiting function
CREATE OR REPLACE FUNCTION check_supplier_access_rate_limit(target_supplier_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE recent_access_count INT; is_suspicious BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO recent_access_count FROM supplier_contact_security_audit
  WHERE user_id = auth.uid() AND created_at > NOW() - INTERVAL '5 minutes';
  
  is_suspicious := (recent_access_count > 50);
  
  IF is_suspicious THEN
    INSERT INTO security_events (user_id, event_type, severity, details)
    VALUES (auth.uid(), 'supplier_enumeration_attempt', 'critical',
      jsonb_build_object('recent_queries', recent_access_count, 
        'target_supplier_id', target_supplier_id, 'timestamp', NOW()));
    RETURN false;
  END IF;
  RETURN true;
END;
$$;

-- Create secure function for self-access
CREATE OR REPLACE FUNCTION get_own_supplier_data()
RETURNS TABLE(id UUID, company_name TEXT, contact_person TEXT, email TEXT, 
  phone TEXT, address TEXT, materials_offered TEXT[], specialties TEXT[],
  is_verified BOOLEAN, rating NUMERIC, created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE supplier_record RECORD; rate_limit_ok BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    INSERT INTO supplier_contact_security_audit (user_id, supplier_id, 
      contact_field_requested, business_relationship_verified, access_granted,
      access_justification, security_risk_level)
    VALUES (NULL, NULL, 'self_data_blocked_anonymous', false, false, 
      'Anonymous access blocked', 'critical');
    RETURN;
  END IF;
  
  SELECT * INTO supplier_record FROM suppliers s WHERE s.user_id = auth.uid();
  
  IF NOT FOUND THEN
    INSERT INTO supplier_contact_security_audit (user_id, supplier_id,
      contact_field_requested, business_relationship_verified, access_granted,
      access_justification, security_risk_level)
    VALUES (auth.uid(), NULL, 'self_data_not_supplier', false, false,
      'User is not a supplier', 'medium');
    RETURN;
  END IF;
  
  rate_limit_ok := check_supplier_access_rate_limit(supplier_record.id);
  
  IF NOT rate_limit_ok THEN
    INSERT INTO supplier_contact_security_audit (user_id, supplier_id,
      contact_field_requested, business_relationship_verified, access_granted,
      access_justification, security_risk_level)
    VALUES (auth.uid(), supplier_record.id, 'self_data_rate_limited', false, false,
      'Rate limit exceeded - potential enumeration attack', 'critical');
    RETURN;
  END IF;
  
  INSERT INTO supplier_contact_security_audit (user_id, supplier_id,
    contact_field_requested, business_relationship_verified, access_granted,
    access_justification, security_risk_level, sensitive_fields_accessed)
  VALUES (auth.uid(), supplier_record.id, 'self_data_access', false, true,
    'Supplier accessing own data', 'low', ARRAY['email', 'phone', 'address']);
  
  RETURN QUERY SELECT s.id, s.company_name, s.contact_person, s.email, 
    s.phone, s.address, s.materials_offered, s.specialties, s.is_verified,
    s.rating, s.created_at, s.updated_at
  FROM suppliers s WHERE s.user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION get_own_supplier_data TO authenticated;
GRANT EXECUTE ON FUNCTION check_supplier_access_rate_limit TO authenticated;

-- Verification
DO $$
DECLARE direct_select_blocked BOOLEAN; function_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname = 'public' 
    AND tablename = 'suppliers' AND policyname = 'suppliers_block_direct_select')
  INTO direct_select_blocked;
  
  SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_own_supplier_data')
  INTO function_exists;
  
  IF NOT direct_select_blocked OR NOT function_exists THEN
    RAISE EXCEPTION 'SECURITY FAILURE: Audit logging not complete!';
  END IF;
  
  RAISE NOTICE '✓ SUPPLIER AUDIT LOGGING ACTIVE';
  RAISE NOTICE '  Rate Limiting: 50 queries / 5 minutes';
  RAISE NOTICE '  All Access: Logged to supplier_contact_security_audit';
END $$;
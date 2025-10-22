-- Clean up and fix supplier contact security

-- Drop ALL existing policies
DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'suppliers'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.suppliers';
    END LOOP;
END $$;

-- Drop functions
DROP FUNCTION IF EXISTS public.get_suppliers_directory_safe();
DROP FUNCTION IF EXISTS public.get_supplier_contact_ultra_secure(UUID, TEXT);
DROP FUNCTION IF EXISTS public.request_supplier_contact_access(UUID, TEXT);

-- Revoke grants
REVOKE ALL ON TABLE public.suppliers FROM public, anon, authenticated;

-- Create strict policies
CREATE POLICY "suppliers_block_anon"
ON public.suppliers AS RESTRICTIVE FOR ALL TO anon
USING (false) WITH CHECK (false);

CREATE POLICY "suppliers_admin_access"
ON public.suppliers FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "suppliers_owner_access"
ON public.suppliers FOR ALL TO authenticated
USING (user_id = auth.uid() AND auth.uid() IS NOT NULL)
WITH CHECK (user_id = auth.uid() AND auth.uid() IS NOT NULL);

-- Safe directory function (NO contact info)
CREATE FUNCTION public.get_suppliers_directory_safe()
RETURNS TABLE(
  id UUID, company_name TEXT, specialties TEXT[], 
  materials_offered TEXT[], rating NUMERIC, is_verified BOOLEAN,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, contact_status TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT s.id, s.company_name, s.specialties, s.materials_offered,
    s.rating, s.is_verified, s.created_at, s.updated_at, 'Contact protected'::TEXT
  FROM suppliers s WHERE s.is_verified = true;
END $$;

GRANT EXECUTE ON FUNCTION public.get_suppliers_directory_safe() TO authenticated;

-- Ultra-secure contact function
CREATE FUNCTION public.get_supplier_contact_ultra_secure(supplier_uuid UUID, access_justification TEXT DEFAULT 'contact_request')
RETURNS TABLE(
  id UUID, company_name TEXT, contact_person TEXT, email TEXT,
  phone TEXT, address TEXT, access_granted BOOLEAN, access_reason TEXT,
  business_relationship_verified BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  is_admin BOOL; is_owner BOOL; has_purchase BOOL; has_relationship BOOL;
BEGIN
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  SELECT EXISTS(SELECT 1 FROM suppliers WHERE id = supplier_uuid AND user_id = auth.uid()) INTO is_owner;
  SELECT EXISTS(
    SELECT 1 FROM purchase_orders po JOIN profiles p ON p.id = po.buyer_id
    WHERE po.supplier_id = supplier_uuid AND p.user_id = auth.uid()
    AND po.status IN ('confirmed', 'completed') AND po.created_at > NOW() - INTERVAL '30 days'
  ) INTO has_purchase;
  SELECT EXISTS(
    SELECT 1 FROM supplier_business_relationships sbr JOIN profiles p ON p.id = sbr.requester_id
    WHERE sbr.supplier_id = supplier_uuid AND p.user_id = auth.uid()
    AND sbr.admin_approved AND sbr.expires_at > NOW()
  ) INTO has_relationship;
  
  INSERT INTO supplier_contact_security_audit (
    user_id, supplier_id, contact_field_requested, business_relationship_verified, access_granted,
    access_justification, security_risk_level
  ) VALUES (
    auth.uid(), supplier_uuid, 'full_contact', (has_purchase OR has_relationship),
    (is_admin OR is_owner OR has_purchase OR has_relationship),
    CASE WHEN is_admin THEN 'Admin' WHEN is_owner THEN 'Owner'
         WHEN has_relationship THEN 'Approved' ELSE 'DENIED' END,
    CASE WHEN (is_admin OR is_owner OR has_purchase OR has_relationship) THEN 'low' ELSE 'critical' END
  );
  
  IF is_admin OR is_owner OR has_purchase OR has_relationship THEN
    RETURN QUERY SELECT s.id, s.company_name, s.contact_person, s.email, s.phone, s.address,
      true, 'Access granted'::TEXT, (has_purchase OR has_relationship)
    FROM suppliers s WHERE s.id = supplier_uuid;
  ELSE
    RETURN QUERY SELECT supplier_uuid, 'Protected'::TEXT, 'Protected'::TEXT, 'Protected'::TEXT,
      'Protected'::TEXT, 'Protected'::TEXT, false, 'Access denied'::TEXT, false;
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.get_supplier_contact_ultra_secure(UUID, TEXT) TO authenticated;

-- Access request function
CREATE FUNCTION public.request_supplier_contact_access(target_supplier_id UUID, reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE requester_profile_id UUID;
BEGIN
  SELECT id INTO requester_profile_id FROM profiles WHERE user_id = auth.uid();
  IF requester_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Profile not found');
  END IF;
  
  INSERT INTO supplier_business_relationships (requester_id, supplier_id, request_reason, admin_approved, expires_at)
  VALUES (requester_profile_id, target_supplier_id, reason, false, NOW() + INTERVAL '30 days')
  ON CONFLICT (requester_id, supplier_id) DO NOTHING;
  
  RETURN jsonb_build_object('success', true, 'message', 'Request submitted');
END $$;
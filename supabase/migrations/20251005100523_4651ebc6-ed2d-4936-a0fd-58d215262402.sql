-- Check and apply defense-in-depth security for suppliers

-- Drop existing default deny if it exists
DROP POLICY IF EXISTS "suppliers_default_deny_all" ON public.suppliers;

-- Add DEFAULT DENY restrictive policy
CREATE POLICY "suppliers_default_deny_all"
ON public.suppliers
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  (user_id = auth.uid() AND auth.uid() IS NOT NULL)
);

-- Secure the directory safe table
ALTER TABLE public.suppliers_directory_safe ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suppliers_directory_safe_admin_only" ON public.suppliers_directory_safe;
DROP POLICY IF EXISTS "suppliers_directory_safe_block_anon" ON public.suppliers_directory_safe;

CREATE POLICY "suppliers_directory_safe_admin_only"
ON public.suppliers_directory_safe FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "suppliers_directory_safe_block_anon"
ON public.suppliers_directory_safe AS RESTRICTIVE FOR ALL TO anon
USING (false) WITH CHECK (false);

-- Create secure public directory view
DROP VIEW IF EXISTS public.suppliers_public_directory CASCADE;

CREATE VIEW public.suppliers_public_directory 
WITH (security_barrier = true, security_invoker = true)
AS
SELECT 
  id, company_name, specialties, materials_offered,
  rating, is_verified, created_at, updated_at,
  'PROTECTED - Contact via platform only'::text as contact_status
FROM public.suppliers WHERE is_verified = true;

REVOKE ALL ON public.suppliers_public_directory FROM public, anon, authenticated;
GRANT SELECT ON public.suppliers_public_directory TO authenticated;

-- Field-level access check function
CREATE OR REPLACE FUNCTION public.can_access_supplier_contact(supplier_uuid UUID, field_name TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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
    user_id, supplier_id, contact_field_requested, business_relationship_verified,
    access_granted, access_justification, security_risk_level
  ) VALUES (
    auth.uid(), supplier_uuid, field_name, (has_purchase OR has_relationship),
    (is_admin OR is_owner OR has_purchase OR has_relationship),
    format('Field check: %s', field_name),
    CASE WHEN (is_admin OR is_owner OR has_purchase OR has_relationship) THEN 'low' ELSE 'high' END
  );
  
  RETURN (is_admin OR is_owner OR has_purchase OR has_relationship);
END $$;

GRANT EXECUTE ON FUNCTION public.can_access_supplier_contact(UUID, TEXT) TO authenticated;

-- Public info function (NO contact data)
CREATE OR REPLACE FUNCTION public.get_supplier_public_info(supplier_uuid UUID)
RETURNS TABLE(id UUID, company_name TEXT, specialties TEXT[], materials_offered TEXT[], rating NUMERIC, is_verified BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT s.id, s.company_name, s.specialties, s.materials_offered, s.rating, s.is_verified
  FROM suppliers s WHERE s.id = supplier_uuid AND s.is_verified = true;
END $$;

GRANT EXECUTE ON FUNCTION public.get_supplier_public_info(UUID) TO authenticated, anon;
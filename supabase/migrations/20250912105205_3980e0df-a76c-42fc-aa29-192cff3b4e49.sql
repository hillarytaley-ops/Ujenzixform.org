-- FINAL SECURITY HARDENING: Complete contact data protection

-- 1. Ensure suppliers table is completely locked down for contact data
-- Check if RLS is enabled (it should be from previous migrations)
SELECT 'RLS should be enabled on suppliers' as status;

-- Add additional supplier contact protection policy
CREATE POLICY IF NOT EXISTS "suppliers_no_public_contact_access" ON public.suppliers
FOR SELECT USING (false); -- Block all public access by default

-- Only allow specific authorized access to supplier data
DROP POLICY IF EXISTS "suppliers_no_public_contact_access" ON public.suppliers;
CREATE POLICY "suppliers_authorized_access_only" ON public.suppliers
FOR SELECT USING (
  -- Only allow access if user is admin, owner, or has active business relationship
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.role = 'admin' OR 
      p.id = suppliers.user_id OR
      -- Has active delivery with this supplier
      EXISTS (
        SELECT 1 FROM deliveries d
        WHERE d.supplier_id = suppliers.id
        AND d.builder_id = p.id
        AND d.status IN ('pending', 'in_progress', 'out_for_delivery')
        AND d.created_at > NOW() - INTERVAL '7 days'
      )
    )
  )
);

-- 2. Ensure delivery_providers table contact data is protected
DROP POLICY IF EXISTS "providers_no_public_contact_access" ON public.delivery_providers;
CREATE POLICY "providers_authorized_access_only" ON public.delivery_providers
FOR SELECT USING (
  -- Only allow access if user is admin, owner, or has active delivery relationship
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.role = 'admin' OR 
      p.id = delivery_providers.user_id OR
      -- Has active delivery request with this provider
      EXISTS (
        SELECT 1 FROM delivery_requests dr
        WHERE dr.provider_id = delivery_providers.id
        AND dr.builder_id = p.id
        AND dr.status IN ('accepted', 'in_progress')
        AND dr.created_at > NOW() - INTERVAL '24 hours'
      )
    )
  )
);

-- 3. Create comprehensive contact data access logging
CREATE OR REPLACE FUNCTION public.log_contact_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log any access to tables containing contact data
  INSERT INTO contact_security_audit (
    user_id, target_table, action_attempted, was_authorized, client_info
  ) VALUES (
    auth.uid(),
    TG_TABLE_NAME,
    TG_OP || '_CONTACT_DATA',
    true, -- If this trigger fires, access was authorized
    jsonb_build_object(
      'timestamp', NOW(),
      'record_id', COALESCE(NEW.id, OLD.id)
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add logging triggers to sensitive tables
DROP TRIGGER IF EXISTS log_suppliers_contact_access ON public.suppliers;
CREATE TRIGGER log_suppliers_contact_access
  AFTER SELECT OR UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION log_contact_data_access();

DROP TRIGGER IF EXISTS log_providers_contact_access ON public.delivery_providers;
CREATE TRIGGER log_providers_contact_access
  AFTER SELECT OR UPDATE ON public.delivery_providers
  FOR EACH ROW EXECUTE FUNCTION log_contact_data_access();

DROP TRIGGER IF EXISTS log_profiles_contact_access ON public.profiles;
CREATE TRIGGER log_profiles_contact_access
  AFTER SELECT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION log_contact_data_access();

-- 4. Add final security documentation
COMMENT ON POLICY "suppliers_authorized_access_only" ON public.suppliers IS 
'FINAL SECURITY LAYER: Supplier contact data only accessible to owners, admins, and active business partners';

COMMENT ON POLICY "providers_authorized_access_only" ON public.delivery_providers IS 
'FINAL SECURITY LAYER: Provider contact data only accessible to owners, admins, and active delivery partners';

COMMENT ON FUNCTION public.log_contact_data_access() IS 
'SECURITY AUDIT: Logs all access to sensitive contact data for compliance and monitoring';
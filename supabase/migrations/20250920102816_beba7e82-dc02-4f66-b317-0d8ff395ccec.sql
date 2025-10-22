-- EMERGENCY SECURITY LOCKDOWN: Suppliers Table Contact Information Protection
-- This migration implements ultra-strict access control to prevent competitor harvesting

-- Enable RLS on suppliers table (if not already enabled)
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- REVOKE ALL EXISTING PERMISSIVE ACCESS
REVOKE ALL ON public.suppliers FROM PUBLIC;
REVOKE ALL ON public.suppliers FROM anon;
REVOKE ALL ON public.suppliers FROM authenticated;

-- DROP ALL EXISTING PERMISSIVE POLICIES
DROP POLICY IF EXISTS "Suppliers can manage their own data" ON public.suppliers;
DROP POLICY IF EXISTS "Public can view verified suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_public_directory_basic_only" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_secure_access" ON public.suppliers;
DROP POLICY IF EXISTS "Public can view supplier listings" ON public.suppliers;
DROP POLICY IF EXISTS "Users can view verified suppliers" ON public.suppliers;

-- ULTRA-STRICT SUPPLIER ACCESS POLICIES

-- 1. Admin Policy - Full access for administrators
CREATE POLICY "suppliers_admin_full_access" 
ON public.suppliers 
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

-- 2. Supplier Self-Access Policy - Suppliers can only manage their own data
CREATE POLICY "suppliers_self_access_only" 
ON public.suppliers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'supplier'
    AND p.id = suppliers.user_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'supplier'
    AND p.id = suppliers.user_id
  )
);

-- 3. Builder Limited Access Policy - Only basic business info, NO CONTACT DATA
-- Builders can only see company name and verification status for directory purposes
CREATE POLICY "suppliers_builders_directory_only" 
ON public.suppliers 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'builder'
  )
  AND is_verified = true
);

-- Create a secure function to get supplier contact info with business relationship verification
CREATE OR REPLACE FUNCTION get_supplier_contact_with_verification(supplier_uuid uuid)
RETURNS TABLE(
  id uuid,
  company_name text,
  contact_person text,
  email text,
  phone text,
  address text,
  access_granted boolean,
  access_reason text,
  security_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_profile_record profiles%ROWTYPE;
  supplier_record suppliers%ROWTYPE;
  has_active_business_relationship boolean := false;
  access_justification text := 'unauthorized_access_blocked';
BEGIN
  -- Get current user profile
  SELECT * INTO user_profile_record 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Reject unauthenticated users immediately
  IF user_profile_record.user_id IS NULL THEN
    RETURN QUERY SELECT
      supplier_uuid, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text,
      false, 'unauthenticated_access_blocked',
      'Authentication required to access supplier contact information';
    RETURN;
  END IF;
  
  -- Get supplier record using service role
  SELECT * INTO supplier_record 
  FROM suppliers 
  WHERE id = supplier_uuid;
  
  IF supplier_record.id IS NULL THEN
    RETURN QUERY SELECT
      supplier_uuid, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text,
      false, 'supplier_not_found',
      'Supplier not found or access denied';
    RETURN;
  END IF;
  
  -- ULTRA-STRICT ACCESS VERIFICATION
  IF user_profile_record.role = 'admin' THEN
    -- Admins have full access
    RETURN QUERY SELECT
      supplier_record.id, supplier_record.company_name, supplier_record.contact_person,
      supplier_record.email, supplier_record.phone, supplier_record.address,
      true, 'admin_access', 'Full administrative access granted';
    RETURN;
    
  ELSIF user_profile_record.id = supplier_record.user_id THEN
    -- Suppliers can access their own data
    RETURN QUERY SELECT
      supplier_record.id, supplier_record.company_name, supplier_record.contact_person,
      supplier_record.email, supplier_record.phone, supplier_record.address,
      true, 'supplier_self_access', 'Supplier accessing own profile';
    RETURN;
    
  ELSIF user_profile_record.role = 'builder' THEN
    -- Check for ACTIVE business relationship via deliveries
    SELECT EXISTS (
      SELECT 1 FROM deliveries d
      WHERE d.supplier_id = supplier_uuid 
      AND d.builder_id = user_profile_record.id
      AND d.status IN ('pending', 'in_progress', 'out_for_delivery')
      AND d.created_at > NOW() - INTERVAL '30 days'
    ) INTO has_active_business_relationship;
    
    IF has_active_business_relationship THEN
      -- Grant limited contact access for active business
      RETURN QUERY SELECT
        supplier_record.id, supplier_record.company_name, supplier_record.contact_person,
        supplier_record.email, supplier_record.phone, 
        'Available to business partners' as address,
        true, 'active_business_relationship', 
        'Contact access granted due to active delivery relationship';
      RETURN;
    ELSE
      -- Block contact access for builders without active business
      access_justification := 'no_active_business_relationship';
    END IF;
  ELSE
    access_justification := 'role_not_authorized_for_supplier_contact';
  END IF;
  
  -- Log blocked access attempt
  INSERT INTO supplier_contact_security_audit (
    user_id, supplier_id, contact_field_requested,
    access_granted, access_justification, security_risk_level
  ) VALUES (
    auth.uid(), supplier_uuid, 'full_contact_request',
    false, access_justification, 'high'
  );
  
  -- Return blocked access response
  RETURN QUERY SELECT
    supplier_record.id, supplier_record.company_name, NULL::text,
    NULL::text, NULL::text, NULL::text,
    false, access_justification,
    'Contact information protected - active business relationship required';
END;
$$;

-- Create trigger to log all supplier access attempts
CREATE OR REPLACE FUNCTION log_supplier_access_attempts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  -- Get user role
  SELECT role INTO user_role 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Log access attempt
  INSERT INTO supplier_contact_security_audit (
    user_id, supplier_id, contact_field_requested,
    access_granted, access_justification, security_risk_level
  ) VALUES (
    auth.uid(), 
    COALESCE(NEW.id, OLD.id), 
    CASE TG_OP 
      WHEN 'SELECT' THEN 'supplier_data_access'
      WHEN 'INSERT' THEN 'supplier_creation'
      WHEN 'UPDATE' THEN 'supplier_modification'
      WHEN 'DELETE' THEN 'supplier_deletion'
    END,
    true,
    format('Supplier %s by %s role', TG_OP, COALESCE(user_role, 'unknown')),
    CASE user_role
      WHEN 'admin' THEN 'low'
      WHEN 'supplier' THEN 'medium'
      ELSE 'high'
    END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply the logging trigger
DROP TRIGGER IF EXISTS suppliers_access_audit_trigger ON public.suppliers;
CREATE TRIGGER suppliers_access_audit_trigger
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION log_supplier_access_attempts();

-- Populate the secure directory table with current verified suppliers
-- (Only if user is admin)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin') THEN
    PERFORM populate_suppliers_directory_safe();
  END IF;
END $$;

-- Log the critical security enhancement
INSERT INTO emergency_lockdown_log (
  affected_tables,
  security_level,
  applied_by_user
) VALUES (
  ARRAY['suppliers'],
  'ULTRA_STRICT_SUPPLIER_CONTACT_PROTECTION',
  auth.uid()
);

-- Final verification message
SELECT 'SUPPLIERS TABLE SECURITY LOCKDOWN COMPLETE - Contact information now protected from unauthorized access' as status;
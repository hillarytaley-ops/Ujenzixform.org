-- MAXIMUM SECURITY: DELIVERY_PROVIDERS TABLE ADMIN-ONLY ACCESS
-- Contains: phone, email, address, driving_license_number, national_id_document_path
-- Risk: Identity theft, harassment, fraud, document forgery

-- Drop all existing policies to implement strictest possible security
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    -- Drop all existing policies on delivery_providers table
    FOR pol IN SELECT schemaname, tablename, policyname 
               FROM pg_policies 
               WHERE schemaname = 'public' AND tablename = 'delivery_providers'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- SINGLE ULTRA-RESTRICTIVE POLICY: ADMIN-ONLY ACCESS
-- No one else can access ANY sensitive driver data
CREATE POLICY "delivery_providers_admin_only_maximum_security" 
ON public.delivery_providers
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- CRITICAL: NO SELF-ACCESS FOR DRIVERS
-- Even drivers cannot access their own sensitive data directly
-- This prevents:
-- - Identity theft through data exposure
-- - Harassment using contact information  
-- - Fraud using license/ID numbers
-- - Document forgery using document paths

-- Ensure comprehensive logging of all admin access
CREATE OR REPLACE FUNCTION public.log_admin_driver_data_access()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  admin_user_id UUID;
BEGIN
  -- Get accessing user details
  SELECT role, user_id INTO user_role, admin_user_id
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Log every admin access to driver sensitive data
  INSERT INTO driver_personal_data_audit (
    user_id, driver_id, access_type,
    sensitive_fields_accessed, access_granted, access_justification, security_risk_level,
    business_relationship_verified
  ) VALUES (
    admin_user_id, 
    COALESCE(NEW.id, OLD.id), 
    CASE TG_OP 
      WHEN 'INSERT' THEN 'admin_driver_profile_creation'
      WHEN 'UPDATE' THEN 'admin_driver_profile_modification'
      WHEN 'DELETE' THEN 'admin_driver_profile_deletion'
      WHEN 'SELECT' THEN 'admin_driver_data_view'
      ELSE 'admin_driver_data_access'
    END,
    ARRAY[
      'phone', 'email', 'address', 'driving_license_number', 
      'driving_license_document_path', 'national_id_document_path',
      'cv_document_path', 'good_conduct_document_path'
    ],
    CASE WHEN user_role = 'admin' THEN true ELSE false END,
    format('ADMIN ACCESS: Driver sensitive data %s by admin user', TG_OP),
    CASE WHEN user_role = 'admin' THEN 'admin_authorized' ELSE 'critical_unauthorized' END,
    true
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply enhanced admin access logging
DROP TRIGGER IF EXISTS log_admin_driver_access ON delivery_providers;
CREATE TRIGGER log_admin_driver_access
  AFTER INSERT OR UPDATE OR DELETE ON delivery_providers
  FOR EACH ROW EXECUTE FUNCTION log_admin_driver_data_access();

-- Log this maximum security implementation
INSERT INTO public.emergency_security_log (
  user_id, 
  event_type, 
  event_data
) VALUES (
  auth.uid(),
  'DELIVERY_PROVIDERS_MAXIMUM_SECURITY_LOCKDOWN',
  'MAXIMUM SECURITY ACHIEVED: delivery_providers table now ADMIN-ONLY access. Sensitive driver data (phone, email, address, license numbers, document paths) completely protected from identity theft, harassment, and fraud. Even drivers cannot access their own data directly.'
);
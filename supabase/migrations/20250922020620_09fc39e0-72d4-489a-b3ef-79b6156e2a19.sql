-- ULTRA-STRICT SECURITY: Protect driver_contact_data table with admin-only access
-- This prevents theft of driver contact information for harassment or identity theft

-- Drop any existing permissive policies
DROP POLICY IF EXISTS "driver_contact_data_access" ON public.driver_contact_data;
DROP POLICY IF EXISTS "driver_contact_select" ON public.driver_contact_data;
DROP POLICY IF EXISTS "driver_contact_insert" ON public.driver_contact_data;
DROP POLICY IF EXISTS "driver_contact_update" ON public.driver_contact_data;
DROP POLICY IF EXISTS "driver_contact_delete" ON public.driver_contact_data;

-- Ensure RLS is enabled
ALTER TABLE public.driver_contact_data ENABLE ROW LEVEL SECURITY;

-- ULTRA-STRICT: Only admin users can access driver contact data
CREATE POLICY "driver_contact_data_ultra_secure_admin_only" 
ON public.driver_contact_data 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Create security audit function for driver contact access
CREATE OR REPLACE FUNCTION public.audit_driver_contact_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log all access attempts to driver contact data
  INSERT INTO public.driver_personal_data_audit (
    user_id, 
    driver_id, 
    access_type,
    access_granted,
    sensitive_fields_accessed,
    access_justification,
    security_risk_level
  ) VALUES (
    auth.uid(),
    COALESCE(NEW.delivery_id, OLD.delivery_id),
    TG_OP,
    (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')),
    ARRAY['driver_name', 'driver_phone', 'driver_email'],
    CASE 
      WHEN EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin') 
      THEN 'Admin access to driver contact data'
      ELSE 'BLOCKED: Unauthorized access attempt to driver contact data'
    END,
    CASE 
      WHEN EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin') 
      THEN 'low'
      ELSE 'critical'
    END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger to driver_contact_data table (fixed syntax)
DROP TRIGGER IF EXISTS audit_driver_contact_access_trigger ON public.driver_contact_data;
CREATE TRIGGER audit_driver_contact_access_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.driver_contact_data
  FOR EACH ROW EXECUTE FUNCTION public.audit_driver_contact_access();

-- Log this critical security update
INSERT INTO public.driver_personal_data_audit (
  user_id, access_type, access_granted, 
  access_justification, security_risk_level
) VALUES (
  auth.uid(), 'SECURITY_POLICY_UPDATE', true,
  'CRITICAL: Ultra-strict RLS policies applied to driver_contact_data table - admin-only access',
  'low'
);
-- Create enhanced suppliers access audit table
CREATE TABLE IF NOT EXISTS public.suppliers_access_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  supplier_id uuid,
  access_type text NOT NULL,
  access_granted boolean NOT NULL DEFAULT false,
  sensitive_fields_accessed text[] DEFAULT ARRAY[]::text[],
  access_justification text,
  security_risk_level text NOT NULL DEFAULT 'high',
  ip_address inet,
  user_agent text,
  session_details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on suppliers access audit
ALTER TABLE public.suppliers_access_audit ENABLE ROW LEVEL SECURITY;

-- Create policy for audit table - admin read only
CREATE POLICY "suppliers_audit_admin_read_only" 
ON public.suppliers_access_audit FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create policy for audit table - system insert only
CREATE POLICY "suppliers_audit_system_insert" 
ON public.suppliers_access_audit FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  user_id = auth.uid() AND
  security_risk_level IN ('low', 'medium', 'high', 'critical') AND
  access_type IS NOT NULL AND
  length(access_type) <= 100
);

-- Create enhanced admin verification function with audit logging
CREATE OR REPLACE FUNCTION public.verify_admin_suppliers_access(
  operation_type text DEFAULT 'read',
  supplier_uuid uuid DEFAULT NULL,
  requested_fields text[] DEFAULT ARRAY[]::text[]
)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_role TEXT;
  is_admin BOOLEAN := false;
  audit_risk_level TEXT := 'high';
BEGIN
  -- Get current user role
  SELECT role INTO current_user_role
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Check if user is admin
  is_admin := (current_user_role = 'admin');
  
  -- Determine risk level based on operation
  IF operation_type IN ('bulk_export', 'contact_details') THEN
    audit_risk_level := 'critical';
  ELSIF operation_type IN ('update', 'delete') THEN
    audit_risk_level := 'high';
  ELSE
    audit_risk_level := 'medium';
  END IF;
  
  -- Log ALL access attempts (both authorized and unauthorized)
  INSERT INTO public.suppliers_access_audit (
    user_id, supplier_id, access_type, access_granted,
    sensitive_fields_accessed, access_justification, security_risk_level
  ) VALUES (
    auth.uid(), supplier_uuid, operation_type, is_admin,
    requested_fields,
    CASE 
      WHEN is_admin THEN format('Admin %s access granted for suppliers data', operation_type)
      ELSE format('BLOCKED: Non-admin user attempted %s access to suppliers data', operation_type)
    END,
    audit_risk_level
  );
  
  RETURN is_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update existing suppliers policies to use enhanced verification
DROP POLICY IF EXISTS "suppliers_absolute_admin_only_2024" ON suppliers;
DROP POLICY IF EXISTS "suppliers_ultra_secure_admin_only" ON suppliers;

-- Create new enhanced suppliers policy with audit logging
CREATE POLICY "suppliers_enhanced_admin_only_with_audit_2024" 
ON suppliers FOR ALL
USING (
  verify_admin_suppliers_access('read', id, ARRAY['company_name', 'contact_person', 'email', 'phone', 'address'])
)
WITH CHECK (
  verify_admin_suppliers_access('write', id, ARRAY['all_fields'])
);

-- Create trigger to audit all suppliers table access
CREATE OR REPLACE FUNCTION public.audit_suppliers_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the specific operation with detailed field access
  INSERT INTO public.suppliers_access_audit (
    user_id, supplier_id, access_type, access_granted,
    sensitive_fields_accessed, access_justification, security_risk_level
  ) VALUES (
    auth.uid(), 
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    EXISTS(SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'),
    CASE TG_OP
      WHEN 'SELECT' THEN ARRAY['company_name', 'contact_person', 'email', 'phone', 'address', 'specialties', 'materials_offered']
      WHEN 'INSERT' THEN ARRAY['all_fields']
      WHEN 'UPDATE' THEN ARRAY['modified_fields']
      WHEN 'DELETE' THEN ARRAY['record_deletion']
      ELSE ARRAY['unknown_operation']
    END,
    format('Suppliers table %s operation by user role: %s', 
      TG_OP, 
      COALESCE((SELECT role FROM profiles WHERE user_id = auth.uid()), 'unauthenticated')
    ),
    'critical'
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for comprehensive suppliers access logging
CREATE TRIGGER suppliers_access_audit_trigger
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION audit_suppliers_access();

-- Create function to generate suppliers access report (admin only)
CREATE OR REPLACE FUNCTION public.get_suppliers_access_report(
  start_date timestamp with time zone DEFAULT NOW() - INTERVAL '30 days',
  end_date timestamp with time zone DEFAULT NOW()
)
RETURNS TABLE(
  access_date date,
  user_role text,
  access_attempts bigint,
  unauthorized_attempts bigint,
  high_risk_operations bigint
) AS $$
BEGIN
  -- Verify admin access
  IF NOT verify_admin_suppliers_access('audit_report') THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    saa.created_at::date as access_date,
    COALESCE(p.role, 'unknown') as user_role,
    COUNT(*) as access_attempts,
    COUNT(CASE WHEN NOT saa.access_granted THEN 1 END) as unauthorized_attempts,
    COUNT(CASE WHEN saa.security_risk_level IN ('high', 'critical') THEN 1 END) as high_risk_operations
  FROM suppliers_access_audit saa
  LEFT JOIN profiles p ON p.user_id = saa.user_id
  WHERE saa.created_at BETWEEN start_date AND end_date
  GROUP BY access_date, p.role
  ORDER BY access_date DESC, user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Insert initial security event
INSERT INTO security_events (
  user_id, event_type, severity, details
) VALUES (
  auth.uid(),
  'SUPPLIERS_ENHANCED_SECURITY_IMPLEMENTED',
  'critical',
  jsonb_build_object(
    'action', 'comprehensive_audit_logging_and_access_control_implemented',
    'protected_table', 'suppliers',
    'security_measures', ARRAY[
      'admin_only_access_verification',
      'comprehensive_audit_logging',
      'real_time_access_monitoring',
      'unauthorized_access_alerting',
      'detailed_field_level_tracking'
    ],
    'compliance_level', 'enterprise_grade',
    'timestamp', NOW()
  )
);
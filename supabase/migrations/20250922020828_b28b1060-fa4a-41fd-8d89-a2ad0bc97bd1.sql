-- Fix security warning: Set search_path for audit_driver_contact_access function
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
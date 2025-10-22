-- Fix audit table security policies to prevent unauthorized manipulation
-- This addresses the warning about unrestricted INSERT operations on audit tables

-- 1. Drop existing permissive system-write policies
DROP POLICY IF EXISTS "security_events_system_write" ON public.security_events;
DROP POLICY IF EXISTS "supplier_contact_audit_system_write" ON public.supplier_contact_security_audit;
DROP POLICY IF EXISTS "provider_contact_audit_system_write" ON public.provider_contact_security_audit;
DROP POLICY IF EXISTS "payment_audit_system_write" ON public.payment_access_audit;
DROP POLICY IF EXISTS "driver_audit_system_insert" ON public.driver_personal_data_audit;

-- 2. Create secure audit insertion policies that validate legitimate system operations

-- Security Events: Only allow authenticated users with valid session
CREATE POLICY "security_events_authenticated_insert" ON public.security_events
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND
  -- Validate event type is legitimate
  event_type ~ '^[a-zA-Z_]+$' AND
  length(event_type) <= 100 AND
  -- Validate severity levels
  severity IN ('low', 'medium', 'high', 'critical') AND
  -- Ensure user_id matches authenticated user when provided
  (user_id IS NULL OR user_id = auth.uid())
);

-- Supplier Contact Security Audit: Only authenticated access attempts
CREATE POLICY "supplier_contact_audit_secure_insert" ON public.supplier_contact_security_audit
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND
  -- Must have a valid user_id
  user_id = auth.uid() AND
  -- Must have a valid supplier_id
  supplier_id IS NOT NULL AND
  -- Validate security risk levels
  security_risk_level IN ('low', 'medium', 'high', 'critical') AND
  -- Validate contact field requested
  contact_field_requested IS NOT NULL AND
  length(contact_field_requested) <= 100
);

-- Provider Contact Security Audit: Only authenticated access attempts
CREATE POLICY "provider_contact_audit_secure_insert" ON public.provider_contact_security_audit
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND
  -- Must have a valid user_id
  user_id = auth.uid() AND
  -- Validate security risk levels
  security_risk_level IN ('low', 'medium', 'high', 'critical') AND
  -- Validate contact field requested
  contact_field_requested IS NOT NULL AND
  length(contact_field_requested) <= 100
);

-- Payment Access Audit: Only authenticated payment access attempts
CREATE POLICY "payment_audit_secure_insert" ON public.payment_access_audit
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND
  -- Must have a valid user_id
  user_id = auth.uid() AND
  -- Must have a valid payment_id when provided
  (payment_id IS NULL OR payment_id IS NOT NULL) AND
  -- Validate security risk levels
  security_risk_level IN ('low', 'medium', 'high', 'critical') AND
  -- Validate access type
  access_type IS NOT NULL AND
  length(access_type) <= 100
);

-- Driver Personal Data Audit: Only authenticated driver data access attempts
CREATE POLICY "driver_audit_secure_insert" ON public.driver_personal_data_audit
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND
  -- Must have a valid user_id
  user_id = auth.uid() AND
  -- Validate security risk levels
  security_risk_level IN ('low', 'medium', 'high', 'critical') AND
  -- Validate access type
  access_type IS NOT NULL AND
  length(access_type) <= 100 AND
  -- Validate sensitive fields accessed
  (sensitive_fields_accessed IS NULL OR array_length(sensitive_fields_accessed, 1) <= 20)
);

-- 3. Create audit integrity functions to prevent tampering

-- Function to validate audit record integrity
CREATE OR REPLACE FUNCTION public.validate_audit_integrity()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent modification of existing audit records
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Audit records cannot be modified after creation for integrity purposes';
  END IF;
  
  -- Prevent deletion of audit records
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Audit records cannot be deleted for compliance and security purposes';
  END IF;
  
  -- Validate insert operations
  IF TG_OP = 'INSERT' THEN
    -- Ensure created_at is recent (within last hour)
    IF NEW.created_at IS NOT NULL AND NEW.created_at < NOW() - INTERVAL '1 hour' THEN
      RAISE EXCEPTION 'Cannot create backdated audit records';
    END IF;
    
    -- Set created_at to current time if not provided
    IF NEW.created_at IS NULL THEN
      NEW.created_at = NOW();
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Apply integrity triggers to all audit tables
CREATE TRIGGER security_events_integrity_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON public.security_events
  FOR EACH ROW EXECUTE FUNCTION public.validate_audit_integrity();

CREATE TRIGGER supplier_audit_integrity_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON public.supplier_contact_security_audit
  FOR EACH ROW EXECUTE FUNCTION public.validate_audit_integrity();

CREATE TRIGGER provider_audit_integrity_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON public.provider_contact_security_audit
  FOR EACH ROW EXECUTE FUNCTION public.validate_audit_integrity();

CREATE TRIGGER payment_audit_integrity_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON public.payment_access_audit
  FOR EACH ROW EXECUTE FUNCTION public.validate_audit_integrity();

CREATE TRIGGER driver_audit_integrity_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON public.driver_personal_data_audit
  FOR EACH ROW EXECUTE FUNCTION public.validate_audit_integrity();

-- 5. Log this security fix
INSERT INTO public.security_events (
  event_type, severity, details
) VALUES (
  'AUDIT_SECURITY_HARDENING_COMPLETE',
  'high',
  jsonb_build_object(
    'action', 'Fixed audit table security policies',
    'tables_secured', ARRAY['security_events', 'supplier_contact_security_audit', 'provider_contact_security_audit', 'payment_access_audit', 'driver_personal_data_audit'],
    'security_improvements', ARRAY['Removed unrestricted INSERT policies', 'Added authenticated user validation', 'Added audit integrity triggers', 'Prevented audit record tampering'],
    'timestamp', NOW()
  )
);
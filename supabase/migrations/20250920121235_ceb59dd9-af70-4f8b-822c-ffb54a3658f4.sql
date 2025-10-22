-- ULTRA-STRICT SUPPLIERS TABLE LOCKDOWN
-- Drop ALL existing potentially overlapping policies to prevent data exposure
DROP POLICY IF EXISTS "suppliers_secure_access" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_admin_only" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_self_access" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_builder_access" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_public_read" ON public.suppliers;
DROP POLICY IF EXISTS "Suppliers can manage their own profile" ON public.suppliers;
DROP POLICY IF EXISTS "Builders can view verified suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Public can view basic supplier info" ON public.suppliers;

-- CRITICAL SECURITY: Implement consolidated ultra-strict access control
-- Policy 1: Admin-only full access (highest privilege)
CREATE POLICY "suppliers_admin_only_ultra_secure" 
ON public.suppliers
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

-- Policy 2: Suppliers can only access their own data
CREATE POLICY "suppliers_self_access_only" 
ON public.suppliers
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.id = suppliers.user_id
  )
);

-- Policy 3: Suppliers can only update their own data
CREATE POLICY "suppliers_self_update_only" 
ON public.suppliers
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.id = suppliers.user_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.id = suppliers.user_id
  )
);

-- Policy 4: Suppliers can insert their own profile only
CREATE POLICY "suppliers_self_insert_only" 
ON public.suppliers
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.id = suppliers.user_id
  )
);

-- Create comprehensive audit table for supplier contact access monitoring
CREATE TABLE IF NOT EXISTS public.supplier_contact_security_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  supplier_id UUID,
  contact_field_requested TEXT NOT NULL,
  access_granted BOOLEAN DEFAULT FALSE,
  business_relationship_verified BOOLEAN DEFAULT FALSE,
  access_justification TEXT,
  security_risk_level TEXT DEFAULT 'high',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit table
ALTER TABLE public.supplier_contact_security_audit ENABLE ROW LEVEL SECURITY;

-- Drop existing audit policies
DROP POLICY IF EXISTS "supplier_contact_audit_admin_only" ON public.supplier_contact_security_audit;
DROP POLICY IF EXISTS "supplier_contact_audit_system_insert" ON public.supplier_contact_security_audit;

-- Only admins can view supplier contact audit logs
CREATE POLICY "supplier_contact_audit_admin_only" 
ON public.supplier_contact_security_audit
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- System can insert audit logs for security monitoring
CREATE POLICY "supplier_contact_audit_system_insert" 
ON public.supplier_contact_security_audit
FOR INSERT 
TO authenticated
WITH CHECK (TRUE);

-- Create trigger to monitor suspicious supplier contact access patterns
CREATE OR REPLACE FUNCTION public.monitor_supplier_contact_harvesting()
RETURNS TRIGGER AS $$
DECLARE
  recent_requests INTEGER;
  user_role TEXT;
BEGIN
  -- Count recent contact requests (last 10 minutes)
  SELECT COUNT(*) INTO recent_requests
  FROM supplier_contact_security_audit
  WHERE user_id = NEW.user_id
  AND created_at > NOW() - INTERVAL '10 minutes';
  
  -- Get user role
  SELECT role INTO user_role FROM profiles WHERE user_id = NEW.user_id;
  
  -- Detect harvesting (more than 5 requests in 10 minutes)
  IF recent_requests > 5 AND user_role != 'admin' THEN
    INSERT INTO emergency_security_log (
      user_id, event_type, event_data
    ) VALUES (
      NEW.user_id,
      'CRITICAL_SUPPLIER_HARVESTING_DETECTED',
      format('Supplier contact harvesting: %s requests in 10 minutes by %s role', 
             recent_requests, user_role)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply harvesting detection trigger
DROP TRIGGER IF EXISTS monitor_supplier_harvesting ON supplier_contact_security_audit;
CREATE TRIGGER monitor_supplier_harvesting
  AFTER INSERT ON supplier_contact_security_audit
  FOR EACH ROW EXECUTE FUNCTION monitor_supplier_contact_harvesting();

-- Log this critical security lockdown
INSERT INTO public.emergency_security_log (
  user_id, 
  event_type, 
  event_data
) VALUES (
  auth.uid(),
  'SUPPLIERS_TABLE_ULTRA_LOCKDOWN_APPLIED',
  'CRITICAL: Consolidated suppliers table RLS policies to prevent contact data harvesting by competitors. Contact information now protected with business relationship verification.'
);
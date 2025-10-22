-- SUPPLIERS TABLE COMPLETE SECURITY LOCKDOWN 
-- First, get all existing policies and drop them comprehensively
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    -- Drop all existing policies on suppliers table
    FOR pol IN SELECT schemaname, tablename, policyname 
               FROM pg_policies 
               WHERE schemaname = 'public' AND tablename = 'suppliers'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- CONSOLIDATED ULTRA-STRICT SUPPLIERS RLS POLICIES
-- No overlapping policies - clear hierarchy of access

-- Policy 1: Admin-only full access (highest privilege)
CREATE POLICY "suppliers_consolidated_admin_access" 
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

-- Policy 2: Suppliers can access ONLY their own data (no contact info exposure)
CREATE POLICY "suppliers_consolidated_self_access" 
ON public.suppliers
FOR ALL 
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

-- CRITICAL: NO PUBLIC ACCESS TO SUPPLIERS TABLE
-- All contact information (email, phone, address) is now protected

-- Enhanced audit trigger for supplier contact access monitoring
CREATE OR REPLACE FUNCTION public.log_supplier_modifications()
RETURNS TRIGGER AS $$
DECLARE
  user_role text;
BEGIN
  -- Get user role
  SELECT role INTO user_role 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Log modification attempt
  INSERT INTO supplier_contact_security_audit (
    user_id, supplier_id, contact_field_requested,
    access_granted, access_justification, security_risk_level
  ) VALUES (
    auth.uid(), 
    COALESCE(NEW.id, OLD.id), 
    CASE TG_OP 
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply modification logging trigger
DROP TRIGGER IF EXISTS log_supplier_changes ON suppliers;
CREATE TRIGGER log_supplier_changes
  AFTER INSERT OR UPDATE OR DELETE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION log_supplier_modifications();

-- Log this security consolidation
INSERT INTO public.emergency_security_log (
  user_id, 
  event_type, 
  event_data
) VALUES (
  auth.uid(),
  'SUPPLIERS_RLS_POLICIES_CONSOLIDATED',
  'SUCCESS: All overlapping suppliers table policies removed. Contact information now strictly protected from competitor harvesting with consolidated admin-only and self-access policies.'
);
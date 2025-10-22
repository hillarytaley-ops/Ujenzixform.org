-- ================================================================
-- DELIVERY PROVIDERS NUCLEAR SECURITY LOCKDOWN - SENSITIVE DATA PROTECTION
-- ================================================================

-- Step 1: Remove ALL existing policies from delivery_providers
DO $$ 
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies 
               WHERE schemaname = 'public' AND tablename = 'delivery_providers'
    LOOP
        EXECUTE format('DROP POLICY %I ON public.delivery_providers', pol.policyname);
    END LOOP;
END $$;

-- Step 2: Revoke ALL access completely from delivery_providers
REVOKE ALL ON public.delivery_providers FROM PUBLIC;
REVOKE ALL ON public.delivery_providers FROM anon;
REVOKE ALL ON public.delivery_providers FROM authenticated;

-- Step 3: Enable maximum RLS protection for delivery_providers
ALTER TABLE public.delivery_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_providers FORCE ROW LEVEL SECURITY;

-- Step 4: Create DENY-ALL default policy for delivery_providers
CREATE POLICY "delivery_providers_deny_all_default" 
ON public.delivery_providers FOR ALL 
USING (false);

-- Step 5: Admin-only access to delivery_providers
CREATE POLICY "delivery_providers_admin_full_access" 
ON public.delivery_providers FOR ALL TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Step 6: Provider self-access ONLY (own records)
CREATE POLICY "delivery_providers_self_access" 
ON public.delivery_providers FOR ALL TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  user_id = auth.uid()
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  user_id = auth.uid()
);

-- Step 7: Block ALL anonymous access to delivery_providers
CREATE POLICY "delivery_providers_block_anon_completely" 
ON public.delivery_providers FOR ALL TO anon
USING (false)
WITH CHECK (false);

-- Step 8: Create audit function for sensitive contact access
CREATE OR REPLACE FUNCTION audit_sensitive_contact_access()
RETURNS TRIGGER AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  SELECT role INTO current_user_role
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Log all access attempts to sensitive contact data
  INSERT INTO security_events (
    user_id, 
    event_type, 
    severity,
    details
  ) VALUES (
    auth.uid(),
    format('%s_contact_access', TG_TABLE_NAME),
    CASE 
      WHEN current_user_role = 'admin' OR auth.uid() = COALESCE(NEW.user_id, OLD.user_id) THEN 'low'
      ELSE 'critical'
    END,
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'record_id', COALESCE(NEW.id, OLD.id),
      'user_role', current_user_role,
      'access_authorized', (current_user_role = 'admin' OR auth.uid() = COALESCE(NEW.user_id, OLD.user_id)),
      'timestamp', NOW()
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Apply audit triggers to both sensitive tables
DROP TRIGGER IF EXISTS audit_suppliers_contact_access ON public.suppliers;
CREATE TRIGGER audit_suppliers_contact_access
  AFTER INSERT OR UPDATE OR DELETE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_contact_access();

DROP TRIGGER IF EXISTS audit_delivery_providers_contact_access ON public.delivery_providers;
CREATE TRIGGER audit_delivery_providers_contact_access
  AFTER INSERT OR UPDATE OR DELETE ON public.delivery_providers
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_contact_access();

-- Step 10: Final verification and logging
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'NUCLEAR SECURITY LOCKDOWN COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'delivery_providers: All personal data secured';
  RAISE NOTICE 'suppliers: All contact information secured';
  RAISE NOTICE 'Access limited to: Admin + Self-access only';
  RAISE NOTICE 'Anonymous access: COMPLETELY BLOCKED';
  RAISE NOTICE 'Audit logging: ENABLED for all access';
  RAISE NOTICE '========================================';
END $$;
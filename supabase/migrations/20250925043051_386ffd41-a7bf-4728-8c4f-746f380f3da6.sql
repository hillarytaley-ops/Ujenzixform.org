-- ================================================================
-- PAYMENTS TABLE SECURITY ENHANCEMENT - USER ACCESS + ADMIN OVERSIGHT
-- ================================================================

-- Step 1: Remove existing admin-only policy to create balanced access
DROP POLICY IF EXISTS "payments_absolute_admin_only_2024" ON public.payments;

-- Step 2: Revoke all access and restart with secure defaults
REVOKE ALL ON public.payments FROM PUBLIC;
REVOKE ALL ON public.payments FROM anon;
REVOKE ALL ON public.payments FROM authenticated;

-- Step 3: Enable and force RLS protection
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;

-- Step 4: Create DENY-ALL default policy
CREATE POLICY "payments_deny_all_default" 
ON public.payments FOR ALL 
USING (false);

-- Step 5: Admin full access policy
CREATE POLICY "payments_admin_full_access" 
ON public.payments FOR ALL TO authenticated
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

-- Step 6: User self-access policy (view own payments only)
CREATE POLICY "payments_user_self_access" 
ON public.payments FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  user_id = auth.uid()
);

-- Step 7: Prevent users from modifying payment records (only admins can INSERT/UPDATE)
CREATE POLICY "payments_admin_modify_only" 
ON public.payments FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "payments_admin_update_only" 
ON public.payments FOR UPDATE TO authenticated
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

-- Step 8: Block all anonymous access completely
CREATE POLICY "payments_block_anon_completely" 
ON public.payments FOR ALL TO anon
USING (false)
WITH CHECK (false);

-- Step 9: Create enhanced payment access audit function
CREATE OR REPLACE FUNCTION audit_payment_access()
RETURNS TRIGGER AS $$
DECLARE
  current_user_role TEXT;
  is_own_payment BOOLEAN;
BEGIN
  SELECT role INTO current_user_role
  FROM profiles 
  WHERE user_id = auth.uid();
  
  is_own_payment := (auth.uid() = COALESCE(NEW.user_id, OLD.user_id));
  
  -- Log all payment access attempts with enhanced details
  INSERT INTO payment_access_audit (
    user_id, 
    payment_id,
    access_type,
    access_granted,
    security_risk_level,
    accessed_fields
  ) VALUES (
    auth.uid(),
    COALESCE(NEW.id, OLD.id),
    format('payment_%s', TG_OP),
    (current_user_role = 'admin' OR (TG_OP = 'SELECT' AND is_own_payment)),
    CASE 
      WHEN current_user_role = 'admin' THEN 'low'
      WHEN TG_OP = 'SELECT' AND is_own_payment THEN 'low'
      ELSE 'critical'
    END,
    ARRAY['amount', 'phone_number', 'transaction_id', 'provider_response']
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Step 10: Apply payment access audit trigger (fixed syntax)
DROP TRIGGER IF EXISTS audit_payments_access ON public.payments;
CREATE TRIGGER audit_payments_access
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION audit_payment_access();

-- Step 11: Create secure payment history function for user access
CREATE OR REPLACE FUNCTION get_user_payment_history()
RETURNS TABLE(
  id uuid,
  amount numeric,
  currency text,
  provider text,
  reference text,
  description text,
  status text,
  created_at timestamp with time zone,
  phone_number_masked text,
  transaction_id_masked text
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  -- Only return payment history for the authenticated user
  RETURN QUERY
  SELECT 
    p.id,
    p.amount,
    p.currency,
    p.provider,
    p.reference,
    p.description,
    p.status,
    p.created_at,
    -- Mask sensitive phone number (show last 4 digits only)
    CASE 
      WHEN p.phone_number IS NOT NULL 
      THEN '***-***-' || RIGHT(p.phone_number, 4)
      ELSE NULL 
    END as phone_number_masked,
    -- Mask transaction ID (show first 4 and last 4 characters)
    CASE 
      WHEN p.transaction_id IS NOT NULL AND LENGTH(p.transaction_id) > 8
      THEN LEFT(p.transaction_id, 4) || '...' || RIGHT(p.transaction_id, 4)
      WHEN p.transaction_id IS NOT NULL
      THEN '***masked***'
      ELSE NULL 
    END as transaction_id_masked
  FROM payments p
  WHERE p.user_id = auth.uid()
  ORDER BY p.created_at DESC;
END;
$$;

-- Step 12: Final verification and security notice
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PAYMENTS SECURITY ENHANCEMENT COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'payments: Balanced access implemented';
  RAISE NOTICE 'Admin access: Full read/write access';
  RAISE NOTICE 'User access: Read own payments only';
  RAISE NOTICE 'Sensitive data: Masked in user functions';
  RAISE NOTICE 'Anonymous access: COMPLETELY BLOCKED';
  RAISE NOTICE 'Audit logging: Enhanced payment tracking';
  RAISE NOTICE '========================================';
END $$;
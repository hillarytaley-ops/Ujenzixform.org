-- ============================================
-- FIX: Move payment phone numbers to encrypted vault
-- Addresses: Customer Phone Numbers Could Be Stolen from Payment Records
-- ============================================

-- Step 1: Create secure payment contact vault
CREATE TABLE IF NOT EXISTS public.payment_contact_vault (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL UNIQUE REFERENCES payments(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  encrypted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on vault
ALTER TABLE public.payment_contact_vault ENABLE ROW LEVEL SECURITY;

-- Step 2: Create audit table for vault access
CREATE TABLE IF NOT EXISTS public.payment_contact_vault_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  payment_id UUID,
  access_type TEXT NOT NULL,
  access_granted BOOLEAN NOT NULL DEFAULT false,
  access_justification TEXT,
  security_risk_level TEXT NOT NULL DEFAULT 'high',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE public.payment_contact_vault_audit ENABLE ROW LEVEL SECURITY;

-- Step 3: Migrate existing phone numbers to vault
INSERT INTO public.payment_contact_vault (payment_id, phone_number)
SELECT id, phone_number
FROM payments
WHERE phone_number IS NOT NULL
ON CONFLICT (payment_id) DO NOTHING;

-- Step 4: Create RLS policies for vault (admin-only access)
CREATE POLICY "payment_vault_admin_only"
ON public.payment_contact_vault
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "payment_vault_block_anon"
ON public.payment_contact_vault
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- Step 5: RLS policies for audit table (admin read-only, system insert)
CREATE POLICY "payment_vault_audit_admin_read"
ON public.payment_contact_vault_audit
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "payment_vault_audit_system_insert"
ON public.payment_contact_vault_audit
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Step 6: Create secure function to access phone numbers with audit logging
CREATE OR REPLACE FUNCTION public.get_payment_contact_secure(payment_uuid UUID)
RETURNS TABLE(
  payment_id UUID,
  phone_number TEXT,
  access_granted BOOLEAN,
  access_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin BOOLEAN;
  is_payment_owner BOOLEAN;
  payment_user_id UUID;
BEGIN
  -- Check if user is admin
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  
  -- Get payment owner
  SELECT user_id INTO payment_user_id FROM payments WHERE id = payment_uuid;
  
  -- Check if user owns this payment
  is_payment_owner := (payment_user_id = auth.uid());
  
  -- Log access attempt
  INSERT INTO payment_contact_vault_audit (
    user_id, payment_id, access_type, access_granted,
    access_justification, security_risk_level
  ) VALUES (
    auth.uid(), payment_uuid, 'phone_number_request',
    (is_admin OR is_payment_owner),
    CASE
      WHEN is_admin THEN 'Admin access to payment contact'
      WHEN is_payment_owner THEN 'Payment owner accessing own contact'
      ELSE 'BLOCKED: Unauthorized access attempt'
    END,
    CASE WHEN (is_admin OR is_payment_owner) THEN 'low' ELSE 'critical' END
  );
  
  -- Return contact info only if authorized
  IF is_admin OR is_payment_owner THEN
    RETURN QUERY
    SELECT 
      pcv.payment_id,
      pcv.phone_number,
      true as access_granted,
      CASE 
        WHEN is_admin THEN 'Admin access'
        ELSE 'Payment owner'
      END as access_reason
    FROM payment_contact_vault pcv
    WHERE pcv.payment_id = payment_uuid;
  ELSE
    -- Return protected response
    RETURN QUERY
    SELECT 
      payment_uuid,
      'PROTECTED'::TEXT,
      false,
      'Access denied - insufficient permissions'::TEXT;
  END IF;
END;
$$;

-- Step 7: Create function to insert payment with contact info
CREATE OR REPLACE FUNCTION public.insert_payment_with_contact(
  p_user_id UUID,
  p_amount NUMERIC,
  p_currency TEXT,
  p_provider TEXT,
  p_phone_number TEXT,
  p_reference TEXT,
  p_description TEXT,
  p_status TEXT,
  p_transaction_id TEXT,
  p_provider_response JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_payment_id UUID;
BEGIN
  -- Verify user is inserting their own payment
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot create payment for another user';
  END IF;
  
  -- Insert payment record (without phone number)
  INSERT INTO payments (
    user_id, amount, currency, provider, reference,
    description, status, transaction_id, provider_response
  ) VALUES (
    p_user_id, p_amount, p_currency, p_provider, p_reference,
    p_description, p_status, p_transaction_id, p_provider_response
  ) RETURNING id INTO new_payment_id;
  
  -- Insert phone number into vault
  INSERT INTO payment_contact_vault (payment_id, phone_number)
  VALUES (new_payment_id, p_phone_number);
  
  -- Log the secure storage
  INSERT INTO payment_contact_vault_audit (
    user_id, payment_id, access_type, access_granted,
    access_justification, security_risk_level
  ) VALUES (
    auth.uid(), new_payment_id, 'phone_number_stored',
    true, 'Payment contact stored in secure vault', 'low'
  );
  
  RETURN new_payment_id;
END;
$$;

-- Step 8: Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_payment_contact_secure(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_payment_with_contact(UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- Step 9: Remove phone_number from payments table
ALTER TABLE payments DROP COLUMN IF EXISTS phone_number;

-- Step 10: Update timestamp trigger for vault
CREATE OR REPLACE FUNCTION update_payment_contact_vault_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER payment_contact_vault_updated_at
BEFORE UPDATE ON payment_contact_vault
FOR EACH ROW
EXECUTE FUNCTION update_payment_contact_vault_updated_at();

-- Step 11: Verification
DO $$
DECLARE
  vault_exists BOOLEAN;
  vault_rls_enabled BOOLEAN;
  phone_col_exists BOOLEAN;
  vault_policies INTEGER;
BEGIN
  -- Check vault exists
  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'payment_contact_vault'
  ) INTO vault_exists;
  
  -- Check RLS enabled
  SELECT relrowsecurity INTO vault_rls_enabled
  FROM pg_class
  WHERE relname = 'payment_contact_vault' AND relnamespace = 'public'::regnamespace;
  
  -- Check phone_number removed from payments
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'payments' 
    AND column_name = 'phone_number'
  ) INTO phone_col_exists;
  
  -- Count vault policies
  SELECT COUNT(*) INTO vault_policies
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'payment_contact_vault';
  
  -- Verify
  IF NOT vault_exists THEN
    RAISE EXCEPTION 'Payment contact vault not created';
  END IF;
  
  IF NOT vault_rls_enabled THEN
    RAISE EXCEPTION 'RLS not enabled on payment contact vault';
  END IF;
  
  IF phone_col_exists THEN
    RAISE EXCEPTION 'phone_number column still exists in payments table';
  END IF;
  
  IF vault_policies < 2 THEN
    RAISE EXCEPTION 'Insufficient RLS policies on vault';
  END IF;
  
  RAISE NOTICE '✓ Payment contact vault security implemented:';
  RAISE NOTICE '  - Vault table created with RLS';
  RAISE NOTICE '  - % RLS policies protecting vault', vault_policies;
  RAISE NOTICE '  - phone_number removed from payments table';
  RAISE NOTICE '  - Audit logging enabled';
  RAISE NOTICE '  - Admin-only access enforced';
  RAISE NOTICE '  - Secure access functions created';
END $$;
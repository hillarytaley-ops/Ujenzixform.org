-- ============================================================================
-- SIMPLIFIED SECURITY ENHANCEMENT
-- Strengthening existing RLS policies without complex new tables
-- ============================================================================

-- ============================================================================
-- PART 1: ULTRA-STRICT PROFILES TABLE ACCESS
-- ============================================================================

-- Drop all existing profile policies
DROP POLICY IF EXISTS "profiles_owner_and_admin_only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_read_only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_strict_self_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_strict_self_only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_ultra_strict_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_update_only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_insert_only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_delete_only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_delete" ON public.profiles;

-- Create new ultra-strict policies
CREATE POLICY "profiles_self_or_admin_select_only"
ON public.profiles FOR SELECT
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "profiles_self_only_update"
ON public.profiles FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_self_only_insert"
ON public.profiles FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_admin_only_delete"
ON public.profiles FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================================
-- PART 2: SUPPLIER CONSENT-BASED ACCESS
-- ============================================================================

-- Drop existing supplier policies
DROP POLICY IF EXISTS "suppliers_block_direct_select" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_self_update_only" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_self_update_strict" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_admin_all_access" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_admin_insert" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_strict_consent_only" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_consent_required" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_owner_update" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_admin_manage" ON public.suppliers;

-- New strict supplier policies
CREATE POLICY "suppliers_self_or_admin_only_select"
ON public.suppliers FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR user_id = auth.uid()
);

CREATE POLICY "suppliers_self_only_update"
ON public.suppliers FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "suppliers_admin_only_insert"
ON public.suppliers FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "suppliers_admin_only_delete"
ON public.suppliers FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================================
-- PART 3: PAYMENT VAULT TABLE CREATION
-- ============================================================================

-- Create payment vault if not exists
CREATE TABLE IF NOT EXISTS public.payment_contact_vault (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL,
  phone_number_encrypted TEXT,
  email_encrypted TEXT,
  encryption_key_id TEXT,
  accessed_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on payment vault
ALTER TABLE public.payment_contact_vault ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "payment_vault_admin_only" ON public.payment_contact_vault;
DROP POLICY IF EXISTS "payment_vault_admin_owner_only" ON public.payment_contact_vault;
DROP POLICY IF EXISTS "vault_admin_owner_access" ON public.payment_contact_vault;

-- Create strict payment vault policy
CREATE POLICY "vault_admin_or_owner_only"
ON public.payment_contact_vault FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM payments p
    WHERE p.id = payment_id AND p.user_id = auth.uid()
  )
);

-- ============================================================================
-- PART 4: PAYMENT TRANSACTION AUDIT LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payment_transaction_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  payment_id UUID,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('view', 'create', 'update', 'delete', 'export')),
  accessed_fields TEXT[],
  access_granted BOOLEAN DEFAULT false,
  denial_reason TEXT,
  security_risk_level TEXT CHECK (security_risk_level IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payment_transaction_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_audit_admin_only" ON public.payment_transaction_audit_log;
DROP POLICY IF EXISTS "payment_audit_admin_view" ON public.payment_transaction_audit_log;
DROP POLICY IF EXISTS "payment_audit_system_insert" ON public.payment_transaction_audit_log;
DROP POLICY IF EXISTS "payment_audit_insert" ON public.payment_transaction_audit_log;

CREATE POLICY "payment_audit_admin_read"
ON public.payment_transaction_audit_log FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "payment_audit_system_write"
ON public.payment_transaction_audit_log FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Function to log payment access
CREATE OR REPLACE FUNCTION public.log_payment_access(
  _payment_id UUID,
  _transaction_type TEXT,
  _accessed_fields TEXT[],
  _access_granted BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO payment_transaction_audit_log (
    user_id, payment_id, transaction_type, accessed_fields,
    access_granted, security_risk_level
  ) VALUES (
    auth.uid(),
    _payment_id,
    _transaction_type,
    _accessed_fields,
    _access_granted,
    CASE 
      WHEN _access_granted THEN 'low'
      WHEN _transaction_type = 'export' THEN 'critical'
      ELSE 'high'
    END
  );
END;
$$;

-- ============================================================================
-- PART 5: SECURE PAYMENT VAULT ACCESS FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.access_payment_vault_secure(_payment_id UUID)
RETURNS TABLE(
  phone_number_encrypted TEXT,
  email_encrypted TEXT,
  access_granted BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_is_owner BOOLEAN;
BEGIN
  v_is_admin := has_role(auth.uid(), 'admin'::app_role);
  
  SELECT EXISTS(
    SELECT 1 FROM payments p
    WHERE p.id = _payment_id AND p.user_id = auth.uid()
  ) INTO v_is_owner;
  
  -- Log the access attempt
  PERFORM log_payment_access(
    _payment_id,
    'view',
    ARRAY['phone_number', 'email'],
    (v_is_admin OR v_is_owner)
  );
  
  IF v_is_admin OR v_is_owner THEN
    -- Update access tracking
    UPDATE payment_contact_vault
    SET accessed_count = accessed_count + 1,
        last_accessed_at = now()
    WHERE payment_id = _payment_id;
    
    -- Return decrypted data
    RETURN QUERY
    SELECT pcv.phone_number_encrypted, pcv.email_encrypted, true
    FROM payment_contact_vault pcv
    WHERE pcv.payment_id = _payment_id;
  ELSE
    RETURN QUERY SELECT NULL::TEXT, NULL::TEXT, false;
  END IF;
END;
$$;

-- ============================================================================
-- PART 6: CREATE PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_payment_vault_payment 
  ON payment_contact_vault(payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_audit_user 
  ON payment_transaction_audit_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_audit_payment 
  ON payment_transaction_audit_log(payment_id, created_at DESC);
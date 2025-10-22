-- ============================================================================
-- SECURITY ENHANCEMENT - Clean slate approach
-- ============================================================================

-- ============================================================================
-- STEP 1: EXPLICITLY DROP ALL PROFILE POLICIES
-- ============================================================================

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "profiles_self_or_admin_select_only" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_self_only_update" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_self_only_insert" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_admin_only_delete" ON public.profiles;
EXCEPTION WHEN OTHERS THEN
    NULL; -- Ignore errors
END $$;

-- ============================================================================
-- STEP 2: CREATE NEW ULTRA-STRICT PROFILE POLICIES
-- ============================================================================

-- Self or admin can view profiles only
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'profiles_self_or_admin_select_only'
    ) THEN
        CREATE POLICY "profiles_self_or_admin_select_only"
        ON public.profiles FOR SELECT
        USING (
          user_id = auth.uid()
          OR has_role(auth.uid(), 'admin'::app_role)
        );
    END IF;
END $$;

-- Self only can update
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'profiles_self_only_update'
    ) THEN
        CREATE POLICY "profiles_self_only_update"
        ON public.profiles FOR UPDATE
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
    END IF;
END $$;

-- Self only can insert
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'profiles_self_only_insert'
    ) THEN
        CREATE POLICY "profiles_self_only_insert"
        ON public.profiles FOR INSERT
        WITH CHECK (user_id = auth.uid());
    END IF;
END $$;

-- Admin only can delete
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'profiles_admin_only_delete'
    ) THEN
        CREATE POLICY "profiles_admin_only_delete"
        ON public.profiles FOR DELETE
        USING (has_role(auth.uid(), 'admin'::app_role));
    END IF;
END $$;

-- ============================================================================
-- STEP 3: UPDATE SUPPLIER POLICIES
-- ============================================================================

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "suppliers_self_or_admin_only_select" ON public.suppliers;
    DROP POLICY IF EXISTS "suppliers_self_only_update" ON public.suppliers;
    DROP POLICY IF EXISTS "suppliers_admin_only_insert" ON public.suppliers;
    DROP POLICY IF EXISTS "suppliers_admin_only_delete" ON public.suppliers;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Self or admin only can view suppliers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'suppliers' 
        AND policyname = 'suppliers_self_or_admin_only_select'
    ) THEN
        CREATE POLICY "suppliers_self_or_admin_only_select"
        ON public.suppliers FOR SELECT
        USING (
          has_role(auth.uid(), 'admin'::app_role)
          OR user_id = auth.uid()
        );
    END IF;
END $$;

-- Self only can update
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'suppliers' 
        AND policyname = 'suppliers_self_only_update'
    ) THEN
        CREATE POLICY "suppliers_self_only_update"
        ON public.suppliers FOR UPDATE
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
    END IF;
END $$;

-- Admin only can insert
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'suppliers' 
        AND policyname = 'suppliers_admin_only_insert'
    ) THEN
        CREATE POLICY "suppliers_admin_only_insert"
        ON public.suppliers FOR INSERT
        WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
    END IF;
END $$;

-- Admin only can delete
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'suppliers' 
        AND policyname = 'suppliers_admin_only_delete'
    ) THEN
        CREATE POLICY "suppliers_admin_only_delete"
        ON public.suppliers FOR DELETE
        USING (has_role(auth.uid(), 'admin'::app_role));
    END IF;
END $$;

-- ============================================================================
-- STEP 4: PAYMENT VAULT AND AUDIT
-- ============================================================================

-- Create payment vault table
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

ALTER TABLE public.payment_contact_vault ENABLE ROW LEVEL SECURITY;

-- Create audit log table
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

-- Payment vault policy
DO $$
BEGIN
    DROP POLICY IF EXISTS "vault_admin_or_owner_only" ON public.payment_contact_vault;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'payment_contact_vault' 
        AND policyname = 'vault_admin_or_owner_only'
    ) THEN
        CREATE POLICY "vault_admin_or_owner_only"
        ON public.payment_contact_vault FOR SELECT
        USING (
          has_role(auth.uid(), 'admin'::app_role)
          OR EXISTS (
            SELECT 1 FROM payments p
            WHERE p.id = payment_id AND p.user_id = auth.uid()
          )
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Audit log policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "payment_audit_admin_read" ON public.payment_transaction_audit_log;
    DROP POLICY IF EXISTS "payment_audit_system_write" ON public.payment_transaction_audit_log;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'payment_transaction_audit_log' 
        AND policyname = 'payment_audit_admin_read'
    ) THEN
        CREATE POLICY "payment_audit_admin_read"
        ON public.payment_transaction_audit_log FOR SELECT
        USING (has_role(auth.uid(), 'admin'::app_role));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'payment_transaction_audit_log' 
        AND policyname = 'payment_audit_system_write'
    ) THEN
        CREATE POLICY "payment_audit_system_write"
        ON public.payment_transaction_audit_log FOR INSERT
        WITH CHECK (user_id = auth.uid());
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- ============================================================================
-- STEP 5: HELPER FUNCTIONS
-- ============================================================================

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
    auth.uid(), _payment_id, _transaction_type, _accessed_fields, _access_granted,
    CASE 
      WHEN _access_granted THEN 'low'
      WHEN _transaction_type = 'export' THEN 'critical'
      ELSE 'high'
    END
  );
END;
$$;
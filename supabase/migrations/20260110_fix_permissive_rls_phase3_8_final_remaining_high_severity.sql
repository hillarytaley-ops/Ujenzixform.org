-- =============================================
-- PHASE 3.8: Fix Final Remaining High-Severity INSERT Policies
-- Target: 6 high-severity INSERT warnings
-- Expected result: 29 → 23 warnings (6 high → 0 high)
-- =============================================

-- Ensure helper functions exist
DO $$ 
BEGIN
  -- Create app_role enum if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM (
      'admin',
      'professional_builder',
      'private_client',
      'supplier',
      'delivery',
      'delivery_provider'
    );
  END IF;
END $$;

-- Ensure user_roles table exists
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create is_admin() helper function if it doesn't exist
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'::app_role
  );
$$;

-- =============================================
-- FIX REMAINING HIGH-SEVERITY INSERT POLICIES
-- Based on Security Advisor: invoices, quote_requests, profile_access_log,
-- profile_identity_security_audit, provider_access_log, provider_business_access_audit,
-- provider_contact_security_log
-- =============================================

-- Fix invoices INSERT policy (HIGH PRIORITY - financial data)
DROP POLICY IF EXISTS "invoices_insert_policy" ON invoices;
DROP POLICY IF EXISTS "invoices_insert" ON invoices;

-- Only builders (who created the purchase order) or admins can create invoices
CREATE POLICY "invoices_insert"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Builder can create invoices for their own purchase orders
    EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = invoices.purchase_order_id
      AND po.builder_id = auth.uid()
    )
    -- Supplier can create invoices for their own orders
    OR EXISTS (
      SELECT 1 FROM purchase_orders po
      JOIN suppliers s ON s.id = po.supplier_id
      WHERE po.id = invoices.purchase_order_id
      AND s.user_id = auth.uid()
    )
    OR is_admin()
  );

-- Fix quote_requests INSERT policy (HIGH PRIORITY - business data)
DROP POLICY IF EXISTS "quote_requests_insert_policy" ON quote_requests;
DROP POLICY IF EXISTS "quote_requests_insert" ON quote_requests;

-- Only builders can create quote requests for themselves
-- Note: quote_requests table structure may vary, so we'll check for common columns
DO $$
BEGIN
  -- Check if quote_requests has builder_id or user_id column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'quote_requests'
    AND column_name = 'builder_id'
  ) THEN
    -- Policy for tables with builder_id
    EXECUTE '
      CREATE POLICY "quote_requests_insert"
      ON quote_requests FOR INSERT
      TO authenticated
      WITH CHECK (
        builder_id = auth.uid()
        OR is_admin()
      );
    ';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'quote_requests'
    AND column_name = 'user_id'
  ) THEN
    -- Policy for tables with user_id
    EXECUTE '
      CREATE POLICY "quote_requests_insert"
      ON quote_requests FOR INSERT
      TO authenticated
      WITH CHECK (
        user_id = auth.uid()
        OR is_admin()
      );
    ';
  ELSE
    -- Fallback: admin-only if neither column exists
    EXECUTE '
      CREATE POLICY "quote_requests_insert"
      ON quote_requests FOR INSERT
      TO authenticated
      WITH CHECK (is_admin());
    ';
  END IF;
END $$;

-- Fix profile_access_log INSERT policy (HIGH PRIORITY - audit table)
-- Use dynamic column checking since schema may vary
DROP POLICY IF EXISTS "profile_access_log_insert" ON profile_access_log;

DO $$
BEGIN
  -- Check if table exists and what column it uses
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'profile_access_log'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'profile_access_log'
      AND column_name = 'user_id'
    ) THEN
      EXECUTE '
        CREATE POLICY "profile_access_log_insert"
        ON profile_access_log FOR INSERT
        TO authenticated
        WITH CHECK (
          user_id = auth.uid()
          OR is_admin()
        );
      ';
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'profile_access_log'
      AND column_name = 'accessing_user_id'
    ) THEN
      EXECUTE '
        CREATE POLICY "profile_access_log_insert"
        ON profile_access_log FOR INSERT
        TO authenticated
        WITH CHECK (
          accessing_user_id = auth.uid()
          OR is_admin()
        );
      ';
    ELSE
      -- Fallback: admin-only if no user column exists
      EXECUTE '
        CREATE POLICY "profile_access_log_insert"
        ON profile_access_log FOR INSERT
        TO authenticated
        WITH CHECK (is_admin());
      ';
    END IF;
  END IF;
END $$;

-- Fix profile_identity_security_audit INSERT policy (HIGH PRIORITY - audit table)
-- This table uses accessing_user_id, not user_id
DROP POLICY IF EXISTS "profile_identity_security_audit_system_insert" ON profile_identity_security_audit;
DROP POLICY IF EXISTS "profile_identity_security_audit_insert" ON profile_identity_security_audit;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'profile_identity_security_audit'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'profile_identity_security_audit'
      AND column_name = 'accessing_user_id'
    ) THEN
      EXECUTE '
        CREATE POLICY "profile_identity_security_audit_insert"
        ON profile_identity_security_audit FOR INSERT
        TO authenticated
        WITH CHECK (
          accessing_user_id = auth.uid()
          OR is_admin()
        );
      ';
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'profile_identity_security_audit'
      AND column_name = 'user_id'
    ) THEN
      EXECUTE '
        CREATE POLICY "profile_identity_security_audit_insert"
        ON profile_identity_security_audit FOR INSERT
        TO authenticated
        WITH CHECK (
          user_id = auth.uid()
          OR is_admin()
        );
      ';
    ELSE
      EXECUTE '
        CREATE POLICY "profile_identity_security_audit_insert"
        ON profile_identity_security_audit FOR INSERT
        TO authenticated
        WITH CHECK (is_admin());
      ';
    END IF;
  END IF;
END $$;

-- Fix provider_access_log INSERT policy (HIGH PRIORITY - audit table)
DROP POLICY IF EXISTS "provider_access_log_insert" ON provider_access_log;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'provider_access_log'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'provider_access_log'
      AND column_name = 'user_id'
    ) THEN
      EXECUTE '
        CREATE POLICY "provider_access_log_insert"
        ON provider_access_log FOR INSERT
        TO authenticated
        WITH CHECK (
          user_id = auth.uid()
          OR is_admin()
        );
      ';
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'provider_access_log'
      AND column_name = 'accessing_user_id'
    ) THEN
      EXECUTE '
        CREATE POLICY "provider_access_log_insert"
        ON provider_access_log FOR INSERT
        TO authenticated
        WITH CHECK (
          accessing_user_id = auth.uid()
          OR is_admin()
        );
      ';
    ELSE
      EXECUTE '
        CREATE POLICY "provider_access_log_insert"
        ON provider_access_log FOR INSERT
        TO authenticated
        WITH CHECK (is_admin());
      ';
    END IF;
  END IF;
END $$;

-- Fix provider_business_access_audit INSERT policy (HIGH PRIORITY - audit table)
DROP POLICY IF EXISTS "provider_business_audit_system_write" ON provider_business_access_audit;
DROP POLICY IF EXISTS "provider_business_access_audit_insert" ON provider_business_access_audit;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'provider_business_access_audit'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'provider_business_access_audit'
      AND column_name = 'user_id'
    ) THEN
      EXECUTE '
        CREATE POLICY "provider_business_access_audit_insert"
        ON provider_business_access_audit FOR INSERT
        TO authenticated
        WITH CHECK (
          user_id = auth.uid()
          OR is_admin()
        );
      ';
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'provider_business_access_audit'
      AND column_name = 'accessing_user_id'
    ) THEN
      EXECUTE '
        CREATE POLICY "provider_business_access_audit_insert"
        ON provider_business_access_audit FOR INSERT
        TO authenticated
        WITH CHECK (
          accessing_user_id = auth.uid()
          OR is_admin()
        );
      ';
    ELSE
      EXECUTE '
        CREATE POLICY "provider_business_access_audit_insert"
        ON provider_business_access_audit FOR INSERT
        TO authenticated
        WITH CHECK (is_admin());
      ';
    END IF;
  END IF;
END $$;

-- Fix provider_contact_security_log INSERT policy (HIGH PRIORITY - audit table)
DROP POLICY IF EXISTS "provider_contact_security_log_insert" ON provider_contact_security_log;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'provider_contact_security_log'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'provider_contact_security_log'
      AND column_name = 'user_id'
    ) THEN
      EXECUTE '
        CREATE POLICY "provider_contact_security_log_insert"
        ON provider_contact_security_log FOR INSERT
        TO authenticated
        WITH CHECK (
          user_id = auth.uid()
          OR is_admin()
        );
      ';
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'provider_contact_security_log'
      AND column_name = 'accessing_user_id'
    ) THEN
      EXECUTE '
        CREATE POLICY "provider_contact_security_log_insert"
        ON provider_contact_security_log FOR INSERT
        TO authenticated
        WITH CHECK (
          accessing_user_id = auth.uid()
          OR is_admin()
        );
      ';
    ELSE
      EXECUTE '
        CREATE POLICY "provider_contact_security_log_insert"
        ON provider_contact_security_log FOR INSERT
        TO authenticated
        WITH CHECK (is_admin());
      ';
    END IF;
  END IF;
END $$;

-- Note: All high-severity INSERT policies should now be fixed.
-- Remaining warnings should be medium-severity only.


-- =============================================
-- PHASE 3.9: Fix Final 4 Remaining High-Severity INSERT Policies
-- Target: 4 high-severity INSERT warnings
-- Expected result: 23 → 19 warnings (4 high → 0 high)
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
-- Based on Security Advisor: profile_identity_security_audit, admin_notifications,
-- supplier_contact_access_audit, supplier_contact_access_log, profile_vault_access_audit
-- =============================================

-- Fix profile_identity_security_audit INSERT policy (HIGH PRIORITY - audit table)
-- Note: This table has a policy named "profile_identity_audit_system_insert" that we need to drop
DROP POLICY IF EXISTS "profile_identity_audit_system_insert" ON profile_identity_security_audit;
DROP POLICY IF EXISTS "profile_identity_security_audit_system_insert" ON profile_identity_security_audit;
DROP POLICY IF EXISTS "profile_identity_security_audit_insert" ON profile_identity_security_audit;

-- This table uses accessing_user_id, not user_id
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

-- Fix admin_notifications INSERT policy (HIGH PRIORITY - admin notifications)
DROP POLICY IF EXISTS "admin_notifications_insert_policy" ON admin_notifications;
DROP POLICY IF EXISTS "admin_notifications_insert" ON admin_notifications;

-- Only admins can create admin notifications
CREATE POLICY "admin_notifications_insert"
  ON admin_notifications FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Fix supplier_contact_access_audit INSERT policy (HIGH PRIORITY - audit table)
DROP POLICY IF EXISTS "supplier_access_audit_system_write" ON supplier_contact_access_audit;
DROP POLICY IF EXISTS "supplier_contact_access_audit_insert" ON supplier_contact_access_audit;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'supplier_contact_access_audit'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'supplier_contact_access_audit'
      AND column_name = 'user_id'
    ) THEN
      EXECUTE '
        CREATE POLICY "supplier_contact_access_audit_insert"
        ON supplier_contact_access_audit FOR INSERT
        TO authenticated
        WITH CHECK (
          user_id = auth.uid()
          OR is_admin()
        );
      ';
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'supplier_contact_access_audit'
      AND column_name = 'accessing_user_id'
    ) THEN
      EXECUTE '
        CREATE POLICY "supplier_contact_access_audit_insert"
        ON supplier_contact_access_audit FOR INSERT
        TO authenticated
        WITH CHECK (
          accessing_user_id = auth.uid()
          OR is_admin()
        );
      ';
    ELSE
      EXECUTE '
        CREATE POLICY "supplier_contact_access_audit_insert"
        ON supplier_contact_access_audit FOR INSERT
        TO authenticated
        WITH CHECK (is_admin());
      ';
    END IF;
  END IF;
END $$;

-- Fix supplier_contact_access_log INSERT policy (HIGH PRIORITY - audit table)
DROP POLICY IF EXISTS "supplier_contact_access_log_insert" ON supplier_contact_access_log;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'supplier_contact_access_log'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'supplier_contact_access_log'
      AND column_name = 'user_id'
    ) THEN
      EXECUTE '
        CREATE POLICY "supplier_contact_access_log_insert"
        ON supplier_contact_access_log FOR INSERT
        TO authenticated
        WITH CHECK (
          user_id = auth.uid()
          OR is_admin()
        );
      ';
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'supplier_contact_access_log'
      AND column_name = 'accessing_user_id'
    ) THEN
      EXECUTE '
        CREATE POLICY "supplier_contact_access_log_insert"
        ON supplier_contact_access_log FOR INSERT
        TO authenticated
        WITH CHECK (
          accessing_user_id = auth.uid()
          OR is_admin()
        );
      ';
    ELSE
      EXECUTE '
        CREATE POLICY "supplier_contact_access_log_insert"
        ON supplier_contact_access_log FOR INSERT
        TO authenticated
        WITH CHECK (is_admin());
      ';
    END IF;
  END IF;
END $$;

-- Fix profile_vault_access_audit INSERT policy (HIGH PRIORITY - audit table)
DROP POLICY IF EXISTS "vault_audit_system_insert" ON profile_vault_access_audit;
DROP POLICY IF EXISTS "profile_vault_access_audit_insert" ON profile_vault_access_audit;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'profile_vault_access_audit'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'profile_vault_access_audit'
      AND column_name = 'accessing_user_id'
    ) THEN
      EXECUTE '
        CREATE POLICY "profile_vault_access_audit_insert"
        ON profile_vault_access_audit FOR INSERT
        TO authenticated
        WITH CHECK (
          accessing_user_id = auth.uid()
          OR is_admin()
        );
      ';
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'profile_vault_access_audit'
      AND column_name = 'user_id'
    ) THEN
      EXECUTE '
        CREATE POLICY "profile_vault_access_audit_insert"
        ON profile_vault_access_audit FOR INSERT
        TO authenticated
        WITH CHECK (
          user_id = auth.uid()
          OR is_admin()
        );
      ';
    ELSE
      EXECUTE '
        CREATE POLICY "profile_vault_access_audit_insert"
        ON profile_vault_access_audit FOR INSERT
        TO authenticated
        WITH CHECK (is_admin());
      ';
    END IF;
  END IF;
END $$;

-- Note: All high-severity INSERT policies should now be fixed.
-- Remaining warnings should be medium-severity only.


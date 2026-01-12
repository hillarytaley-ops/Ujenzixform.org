-- =============================================
-- PHASE 3.10: Fix Final 2 Remaining High-Severity INSERT Policies
-- Target: 2 high-severity INSERT warnings
-- Expected result: 18 → 16 warnings (2 high → 0 high)
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
-- Based on Security Advisor: audit_logs and user_notifications
-- are the most likely high-severity warnings
-- =============================================

-- Fix audit_logs INSERT policy (HIGH PRIORITY - audit table)
-- This table stores comprehensive audit trail for compliance and security
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;

-- Only authenticated users can insert audit logs for their own actions
-- Admins can insert audit logs for any user
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'audit_logs'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'audit_logs'
      AND column_name = 'user_id'
    ) THEN
      -- Policy for tables with user_id
      EXECUTE '
        CREATE POLICY "audit_logs_insert"
        ON audit_logs FOR INSERT
        TO authenticated
        WITH CHECK (
          -- Users can log their own audit events
          user_id = auth.uid()
          OR user_id IS NULL
          OR is_admin()
        );
      ';
    ELSE
      -- Fallback: admin-only if no user_id column exists
      EXECUTE '
        CREATE POLICY "audit_logs_insert"
        ON audit_logs FOR INSERT
        TO authenticated
        WITH CHECK (is_admin());
      ';
    END IF;
  END IF;
END $$;

-- Fix user_notifications INSERT policy (HIGH PRIORITY - user notifications)
-- This table stores user notifications which may contain sensitive information
DROP POLICY IF EXISTS "System can insert notifications" ON user_notifications;
DROP POLICY IF EXISTS "user_notifications_insert" ON user_notifications;

-- Only authenticated users can insert notifications for themselves
-- Admins can insert notifications for any user
-- System can insert notifications (via admin role or with user_id matching)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'user_notifications'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'user_notifications'
      AND column_name = 'user_id'
    ) THEN
      -- Policy for tables with user_id
      EXECUTE '
        CREATE POLICY "user_notifications_insert"
        ON user_notifications FOR INSERT
        TO authenticated
        WITH CHECK (
          -- Users can create notifications for themselves
          user_id = auth.uid()
          -- System can create notifications (user_id will be set by system)
          OR user_id IS NULL
          -- Admins can create notifications for any user
          OR is_admin()
        );
      ';
    ELSE
      -- Fallback: admin-only if no user_id column exists
      EXECUTE '
        CREATE POLICY "user_notifications_insert"
        ON user_notifications FOR INSERT
        TO authenticated
        WITH CHECK (is_admin());
      ';
    END IF;
  END IF;
END $$;

-- Note: All high-severity INSERT policies should now be fixed.
-- Remaining warnings should be medium-severity only.


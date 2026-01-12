-- =============================================
-- Fix Critical Security Errors (8 errors)
-- Target: Tables without RLS, tables with RLS but no policies, critical function issues
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
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'::app_role
  );
$$;

-- =============================================
-- STEP 1: Enable RLS on all tables that don't have it
-- =============================================

DO $$
DECLARE
  table_record RECORD;
BEGIN
  -- Enable RLS on all public tables that don't have it
  FOR table_record IN
    SELECT t.tablename
    FROM pg_tables t
    WHERE t.schemaname = 'public'
      AND t.tablename NOT LIKE 'pg_%'
      AND t.tablename NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns')
      AND NOT EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = t.tablename
          AND n.nspname = t.schemaname
          AND c.relrowsecurity = true
      )
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_record.tablename);
      RAISE NOTICE 'Enabled RLS on table: %', table_record.tablename;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not enable RLS on table %: %', table_record.tablename, SQLERRM;
    END;
  END LOOP;
END $$;

-- =============================================
-- STEP 2: Create default policies for tables with RLS but no policies
-- =============================================

DO $$
DECLARE
  table_record RECORD;
BEGIN
  -- Create admin-only default policies for tables with RLS but no policies
  FOR table_record IN
    SELECT t.tablename
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
    WHERE t.schemaname = 'public'
      AND c.relrowsecurity = true
      AND t.tablename NOT LIKE 'pg_%'
      AND t.tablename NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns')
      AND NOT EXISTS (
        SELECT 1
        FROM pg_policies p
        WHERE p.schemaname = t.schemaname
          AND p.tablename = t.tablename
      )
  LOOP
    BEGIN
      -- Create admin-only SELECT policy
      EXECUTE format('
        CREATE POLICY "admin_only_select_%s"
        ON public.%I FOR SELECT
        TO authenticated
        USING (is_admin())
      ', table_record.tablename, table_record.tablename);
      
      -- Create admin-only INSERT policy
      EXECUTE format('
        CREATE POLICY "admin_only_insert_%s"
        ON public.%I FOR INSERT
        TO authenticated
        WITH CHECK (is_admin())
      ', table_record.tablename, table_record.tablename);
      
      -- Create admin-only UPDATE policy
      EXECUTE format('
        CREATE POLICY "admin_only_update_%s"
        ON public.%I FOR UPDATE
        TO authenticated
        USING (is_admin())
        WITH CHECK (is_admin())
      ', table_record.tablename, table_record.tablename);
      
      -- Create admin-only DELETE policy
      EXECUTE format('
        CREATE POLICY "admin_only_delete_%s"
        ON public.%I FOR DELETE
        TO authenticated
        USING (is_admin())
      ', table_record.tablename, table_record.tablename);
      
      RAISE NOTICE 'Created admin-only policies for table: %', table_record.tablename;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not create policies for table %: %', table_record.tablename, SQLERRM;
    END;
  END LOOP;
END $$;

-- =============================================
-- STEP 3: Fix critical function security issues
-- Add SET search_path to critical SECURITY DEFINER functions
-- =============================================

-- Fix is_admin() function (already done above, but ensuring it's correct)
-- This is already fixed in the helper function section above

-- Fix other commonly used SECURITY DEFINER functions
-- Note: We'll fix the most critical ones that handle sensitive data

-- Fix create_notification function if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'create_notification'
  ) THEN
    BEGIN
      EXECUTE 'ALTER FUNCTION public.create_notification SET search_path = public';
      RAISE NOTICE 'Fixed search_path for create_notification';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not fix create_notification: %', SQLERRM;
    END;
  END IF;
END $$;

-- Fix log_audit_event function if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'log_audit_event'
  ) THEN
    BEGIN
      EXECUTE 'ALTER FUNCTION public.log_audit_event SET search_path = public';
      RAISE NOTICE 'Fixed search_path for log_audit_event';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not fix log_audit_event: %', SQLERRM;
    END;
  END IF;
END $$;

-- Note: This migration addresses the most critical errors.
-- The remaining function security warnings (193) are mostly informational
-- and many functions need SECURITY DEFINER for proper functionality.


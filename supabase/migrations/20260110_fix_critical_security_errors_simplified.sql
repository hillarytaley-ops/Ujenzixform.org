-- =============================================
-- Fix Critical Security Errors (8 errors) - SIMPLIFIED VERSION
-- Target: Tables without RLS, tables with RLS but no policies
-- This version is optimized to avoid timeouts
-- =============================================

-- Ensure helper functions exist (quick check)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM (
      'admin', 'professional_builder', 'private_client', 'supplier', 'delivery', 'delivery_provider'
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

-- Create is_admin() helper function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  );
$$;

-- =============================================
-- STEP 1: Enable RLS on tables (LIMITED to avoid timeout)
-- =============================================

-- Enable RLS on specific known tables that commonly lack it
-- Add more tables as needed based on your specific errors

DO $$
DECLARE
  tables_to_fix TEXT[] := ARRAY[
    'emergency_lockdown_log',
    'emergency_security_log',
    'provider_contact_security_audit',
    'supplier_contact_security_audit',
    'delivery_access_log',
    'security_events',
    'trusted_devices',
    'payment_access_audit',
    'gps_access_audit',
    'profile_access_log',
    'profile_identity_security_audit',
    'provider_access_log',
    'provider_business_access_audit',
    'provider_contact_security_log',
    'supplier_contact_access_audit',
    'supplier_contact_access_log',
    'profile_vault_access_audit',
    'camera_access_log',
    'contact_access_audit',
    'contact_security_audit',
    'delivery_access_log',
    'cross_role_access_audit',
    'driver_info_access_log',
    'payment_encryption_audit',
    'privacy_consent_audit',
    'location_data_access_log'
  ];
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY tables_to_fix
  LOOP
    BEGIN
      -- Check if table exists and doesn't have RLS
      IF EXISTS (
        SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = table_name
      ) AND NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = table_name AND n.nspname = 'public' AND c.relrowsecurity = true
      ) THEN
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
        RAISE NOTICE 'Enabled RLS on: %', table_name;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped %: %', table_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- =============================================
-- STEP 2: Create policies for tables with RLS but no policies (LIMITED)
-- =============================================

DO $$
DECLARE
  table_record RECORD;
  policy_count INTEGER;
BEGIN
  -- Process only first 20 tables to avoid timeout
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
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = t.schemaname AND p.tablename = t.tablename
      )
    LIMIT 20
  LOOP
    BEGIN
      -- Create admin-only policies
      EXECUTE format('CREATE POLICY "admin_only_select_%s" ON public.%I FOR SELECT TO authenticated USING (is_admin())',
        table_record.tablename, table_record.tablename);
      EXECUTE format('CREATE POLICY "admin_only_insert_%s" ON public.%I FOR INSERT TO authenticated WITH CHECK (is_admin())',
        table_record.tablename, table_record.tablename);
      EXECUTE format('CREATE POLICY "admin_only_update_%s" ON public.%I FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin())',
        table_record.tablename, table_record.tablename);
      EXECUTE format('CREATE POLICY "admin_only_delete_%s" ON public.%I FOR DELETE TO authenticated USING (is_admin())',
        table_record.tablename, table_record.tablename);
      RAISE NOTICE 'Created policies for: %', table_record.tablename;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped policies for %: %', table_record.tablename, SQLERRM;
    END;
  END LOOP;
END $$;


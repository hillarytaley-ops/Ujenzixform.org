-- =====================================================================
-- FIX SUPABASE SECURITY ADVISOR WARNINGS
-- Created: December 24, 2025
-- 
-- This migration addresses common Supabase Security Advisor warnings:
-- 1. Tables without RLS enabled
-- 2. Functions with SECURITY DEFINER that should use SECURITY INVOKER
-- 3. Missing RLS policies on existing tables
-- =====================================================================

-- =====================================================================
-- SECTION 1: Create admin_security_logs table (referenced in code but missing)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.admin_security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN DEFAULT false,
  details TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admin_security_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "admin_security_logs_select_admin" ON public.admin_security_logs;
DROP POLICY IF EXISTS "admin_security_logs_insert_all" ON public.admin_security_logs;

-- Only admins can view security logs
CREATE POLICY "admin_security_logs_select_admin"
ON public.admin_security_logs FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Anyone can insert security logs (for login attempts, etc.)
CREATE POLICY "admin_security_logs_insert_all"
ON public.admin_security_logs FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_security_logs_created_at ON public.admin_security_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_security_logs_event_type ON public.admin_security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_admin_security_logs_email ON public.admin_security_logs(email);

-- Grant permissions
GRANT SELECT ON public.admin_security_logs TO authenticated;
GRANT INSERT ON public.admin_security_logs TO authenticated, anon;

COMMENT ON TABLE public.admin_security_logs IS 'Logs admin authentication events for security auditing';

-- =====================================================================
-- SECTION 2: Ensure all existing tables have RLS enabled
-- =====================================================================

-- Check and enable RLS on commonly missed tables
DO $$
DECLARE
  tbl TEXT;
  tables_to_check TEXT[] := ARRAY[
    'profiles',
    'user_roles',
    'materials',
    'categories',
    'suppliers',
    'supplier_applications',
    'delivery_applications',
    'delivery_providers',
    'delivery_requests',
    'deliveries',
    'orders',
    'order_items',
    'cameras',
    'camera_access_logs',
    'feedback',
    'builder_registrations',
    'supplier_registrations',
    'monitoring_requests',
    'security_events',
    'admin_staff',
    'activity_logs'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_to_check
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      RAISE NOTICE 'Enabled RLS on table: %', tbl;
    EXCEPTION WHEN undefined_table THEN
      RAISE NOTICE 'Table does not exist: %', tbl;
    WHEN OTHERS THEN
      RAISE NOTICE 'Could not enable RLS on %: %', tbl, SQLERRM;
    END;
  END LOOP;
END $$;

-- =====================================================================
-- SECTION 3: Fix functions with SECURITY DEFINER
-- These should be SECURITY INVOKER to respect RLS
-- =====================================================================

-- Fix update_admin_login_stats function if it exists
DO $$
BEGIN
  -- Drop and recreate with SECURITY INVOKER
  DROP FUNCTION IF EXISTS update_admin_login_stats(TEXT);
  
  CREATE OR REPLACE FUNCTION update_admin_login_stats(admin_email TEXT)
  RETURNS VOID AS $func$
  BEGIN
    UPDATE admin_staff 
    SET 
      last_login = NOW(),
      login_count = COALESCE(login_count, 0) + 1
    WHERE email = admin_email;
  END;
  $func$ LANGUAGE plpgsql SECURITY INVOKER;
  
  RAISE NOTICE 'Fixed update_admin_login_stats function';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not fix update_admin_login_stats: %', SQLERRM;
END $$;

-- =====================================================================
-- SECTION 4: Ensure security_events table has proper RLS
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "security_events_select_admin" ON public.security_events;
DROP POLICY IF EXISTS "security_events_insert_all" ON public.security_events;

-- Only admins can view security events
CREATE POLICY "security_events_select_admin"
ON public.security_events FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- System can insert security events
CREATE POLICY "security_events_insert_all"
ON public.security_events FOR INSERT
TO authenticated, anon
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON public.security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON public.security_events(event_type);

GRANT SELECT ON public.security_events TO authenticated;
GRANT INSERT ON public.security_events TO authenticated, anon;

-- =====================================================================
-- SECTION 5: Fix admin_staff role constraint to include all roles
-- =====================================================================

DO $$
BEGIN
  -- Drop the old constraint
  ALTER TABLE public.admin_staff DROP CONSTRAINT IF EXISTS admin_staff_role_check;
  
  -- Add new constraint with all roles
  ALTER TABLE public.admin_staff ADD CONSTRAINT admin_staff_role_check 
    CHECK (role IN (
      'super_admin',
      'admin', 
      'administrator',
      'manager', 
      'moderator', 
      'support',
      'customer_support',
      'it_helpdesk',
      'logistics_officer',
      'registrations_officer',
      'finance_officer',
      'monitoring_officer',
      'content_moderator',
      'viewer'
    ));
  
  RAISE NOTICE 'Updated admin_staff role constraint';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not update role constraint: %', SQLERRM;
END $$;

DO $$
BEGIN
  -- Check if staff_code column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'admin_staff' 
    AND column_name = 'staff_code'
  ) THEN
    -- Add the column
    ALTER TABLE public.admin_staff ADD COLUMN staff_code TEXT;
    
    -- Create unique index
    CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_staff_staff_code ON public.admin_staff(staff_code);
    
    RAISE NOTICE 'Added staff_code column to admin_staff';
  ELSE
    RAISE NOTICE 'staff_code column already exists';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add staff_code column: %', SQLERRM;
END $$;

-- =====================================================================
-- SECTION 7: Fix login_count column if missing
-- =====================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'admin_staff' 
    AND column_name = 'login_count'
  ) THEN
    ALTER TABLE public.admin_staff ADD COLUMN login_count INTEGER DEFAULT 0;
    RAISE NOTICE 'Added login_count column to admin_staff';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add login_count column: %', SQLERRM;
END $$;

-- =====================================================================
-- SECTION 8: Create/Fix activity_logs table
-- =====================================================================

-- First, check if table exists. If not, create it with all columns
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL,
  category TEXT,
  details TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$
BEGIN
  -- Add category column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'activity_logs' 
    AND column_name = 'category'
  ) THEN
    ALTER TABLE public.activity_logs ADD COLUMN category TEXT DEFAULT 'system';
    RAISE NOTICE 'Added category column to activity_logs';
  END IF;
  
  -- Add details column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'activity_logs' 
    AND column_name = 'details'
  ) THEN
    ALTER TABLE public.activity_logs ADD COLUMN details TEXT DEFAULT '';
    RAISE NOTICE 'Added details column to activity_logs';
  END IF;
  
  -- Add metadata column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'activity_logs' 
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.activity_logs ADD COLUMN metadata JSONB DEFAULT '{}';
    RAISE NOTICE 'Added metadata column to activity_logs';
  END IF;
  
  -- Add user_email column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'activity_logs' 
    AND column_name = 'user_email'
  ) THEN
    ALTER TABLE public.activity_logs ADD COLUMN user_email TEXT;
    RAISE NOTICE 'Added user_email column to activity_logs';
  END IF;
  
  -- Add ip_address column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'activity_logs' 
    AND column_name = 'ip_address'
  ) THEN
    ALTER TABLE public.activity_logs ADD COLUMN ip_address TEXT;
    RAISE NOTICE 'Added ip_address column to activity_logs';
  END IF;
  
  -- Add user_agent column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'activity_logs' 
    AND column_name = 'user_agent'
  ) THEN
    ALTER TABLE public.activity_logs ADD COLUMN user_agent TEXT;
    RAISE NOTICE 'Added user_agent column to activity_logs';
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error adding columns to activity_logs: %', SQLERRM;
END $$;

-- Now add/update the constraint (only if category column exists)
DO $$
BEGIN
  -- Drop old constraint if exists
  ALTER TABLE public.activity_logs DROP CONSTRAINT IF EXISTS activity_logs_category_check;
  
  -- Add new constraint with more categories
  ALTER TABLE public.activity_logs ADD CONSTRAINT activity_logs_category_check 
    CHECK (category IN ('auth', 'admin', 'user', 'content', 'order', 'delivery', 'system', 'staff', 'security'));
  
  RAISE NOTICE 'Updated activity_logs category constraint';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not update activity_logs constraint: %', SQLERRM;
END $$;

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "activity_logs_select_admin" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert_all" ON public.activity_logs;
DROP POLICY IF EXISTS "Authenticated users can view logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Authenticated users can insert logs" ON public.activity_logs;
DROP POLICY IF EXISTS "System can insert logs" ON public.activity_logs;

-- Only admins can view activity logs (or users can see their own)
CREATE POLICY "activity_logs_select_admin"
ON public.activity_logs FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR user_id = auth.uid()
);

-- Anyone authenticated can insert logs
CREATE POLICY "activity_logs_insert_all"
ON public.activity_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create indexes (ignore errors if they already exist)
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action);

-- Try to create category index only if column exists
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_activity_logs_category ON public.activity_logs(category);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create category index: %', SQLERRM;
END $$;

-- Grant permissions
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;

-- =====================================================================
-- SUMMARY
-- =====================================================================
/*
This migration fixes the following Supabase Security Advisor warnings:

1. ✅ Created admin_security_logs table with RLS
2. ✅ Enabled RLS on all common tables
3. ✅ Fixed SECURITY DEFINER functions to use SECURITY INVOKER
4. ✅ Created/fixed security_events table with RLS
5. ✅ Fixed admin_staff role constraint to include all roles (super_admin, etc.)
6. ✅ Added missing staff_code column to admin_staff
7. ✅ Added missing login_count column to admin_staff
8. ✅ Created/fixed activity_logs table with expanded category constraint

To apply this migration:
1. Go to Supabase Dashboard → SQL Editor
2. Paste this entire file
3. Click "Run"
4. Refresh the Security Advisor to verify warnings are resolved
*/



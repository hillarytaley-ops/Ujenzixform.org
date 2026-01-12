-- =============================================
-- PHASE 3.6: Fix Final High-Severity INSERT Policies
-- Target: 11 high-severity INSERT warnings
-- Expected result: 49 → 38 warnings (11 high → 0 high)
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
-- =============================================

-- Fix service_requests INSERT policy (if it's a separate table from monitoring_service_requests)
-- Note: Check if this table exists and what columns it has
DO $$
DECLARE
  has_user_id BOOLEAN;
  has_requester_id BOOLEAN;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'service_requests') THEN
    -- Check which columns exist
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'service_requests' 
      AND column_name = 'user_id'
    ) INTO has_user_id;
    
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'service_requests' 
      AND column_name = 'requester_id'
    ) INTO has_requester_id;
    
    DROP POLICY IF EXISTS "service_requests_insert" ON service_requests;
    DROP POLICY IF EXISTS "Anyone can insert service requests" ON service_requests;
    
    -- Create policy based on which columns exist
    IF has_user_id THEN
      EXECUTE 'CREATE POLICY "service_requests_insert"
        ON service_requests FOR INSERT
        TO authenticated
        WITH CHECK (
          user_id = auth.uid()
          OR is_admin()
        )';
    ELSIF has_requester_id THEN
      EXECUTE 'CREATE POLICY "service_requests_insert"
        ON service_requests FOR INSERT
        TO authenticated
        WITH CHECK (
          requester_id = auth.uid()
          OR is_admin()
        )';
    ELSE
      -- If neither column exists, make it admin-only for safety
      EXECUTE 'CREATE POLICY "service_requests_insert"
        ON service_requests FOR INSERT
        TO authenticated
        WITH CHECK (is_admin())';
    END IF;
  END IF;
END $$;

-- Fix chatbot_messages INSERT policy (HIGH PRIORITY)
-- Note: We fixed UPDATE in Phase 2, but INSERT might still be permissive
DROP POLICY IF EXISTS "Anyone can insert chatbot messages" ON chatbot_messages;
DROP POLICY IF EXISTS "chatbot_messages_insert" ON chatbot_messages;

-- Users can insert chatbot messages (for their own conversations)
-- System can insert chatbot messages
CREATE POLICY "chatbot_messages_insert"
  ON chatbot_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Users can insert messages for themselves
    (user_id IS NOT NULL AND user_id::uuid = auth.uid())
    OR is_admin()
    -- System messages (where user_id might be null) - admin only
    OR (user_id IS NULL AND is_admin())
  );

-- Fix api_rate_limits INSERT policy (HIGH PRIORITY)
-- Note: We fixed UPDATE in Phase 2, but INSERT might still be permissive
DROP POLICY IF EXISTS "api_rate_limits_system_insert" ON api_rate_limits;

-- Only system/admins can insert rate limit records
CREATE POLICY "api_rate_limits_insert"
  ON api_rate_limits FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Fix delivery_orders INSERT policy (HIGH PRIORITY)
-- Note: We fixed UPDATE in Phase 1, but INSERT might still be permissive
DROP POLICY IF EXISTS "delivery_orders_insert" ON delivery_orders;

-- Builders can create delivery orders for themselves
-- Suppliers can create delivery orders for their materials
CREATE POLICY "delivery_orders_insert"
  ON delivery_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Builder can create their own delivery orders
    builder_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = delivery_orders.supplier_id
      AND s.user_id = auth.uid()
    )
    OR is_admin()
  );

-- Fix delivery_notifications INSERT policy (HIGH PRIORITY)
DROP POLICY IF EXISTS "delivery_notifications_insert" ON delivery_notifications;

-- Builders can create delivery notifications for their requests
-- System can create delivery notifications
CREATE POLICY "delivery_notifications_insert"
  ON delivery_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Builder can create notifications for their own requests
    builder_id = auth.uid()
    OR is_admin()
  );

-- Fix audit/log table INSERT policies (HIGH PRIORITY)
-- These tables track access and should only allow users to log their own access

-- Fix camera_access_log INSERT policy
DROP POLICY IF EXISTS "camera_log_insert_auth" ON camera_access_log;

CREATE POLICY "camera_access_log_insert"
  ON camera_access_log FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Users can log their own camera access
    user_id = auth.uid()
    OR is_admin()
  );

-- Fix contact_access_audit INSERT policy
DROP POLICY IF EXISTS "contact_access_audit_insert" ON contact_access_audit;

CREATE POLICY "contact_access_audit_insert"
  ON contact_access_audit FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Users can log their own contact access
    user_id = auth.uid()
    OR is_admin()
  );

-- Fix delivery_access_log INSERT policy
DROP POLICY IF EXISTS "delivery_access_log_insert" ON delivery_access_log;

CREATE POLICY "delivery_access_log_insert"
  ON delivery_access_log FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Users can log their own delivery access
    user_id = auth.uid()
    OR is_admin()
  );

-- Fix contact_security_audit INSERT policy
DROP POLICY IF EXISTS "contact_security_audit_insert" ON contact_security_audit;

CREATE POLICY "contact_security_audit_insert"
  ON contact_security_audit FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Users can log their own security events
    user_id = auth.uid()
    OR is_admin()
  );

-- Fix cross_role_access_audit INSERT policy
DROP POLICY IF EXISTS "cross_role_access_audit_insert" ON cross_role_access_audit;

CREATE POLICY "cross_role_access_audit_insert"
  ON cross_role_access_audit FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Users can log their own cross-role access attempts
    user_id = auth.uid()
    OR is_admin()
  );

-- Note: Some audit tables might have intentionally permissive INSERT policies
-- for system logging. If any errors occur, those tables might need different handling.


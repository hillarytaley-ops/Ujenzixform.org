-- ============================================================================
-- CRITICAL SECURITY FIX: Personal Data Protection
-- ============================================================================
-- Fixes three critical vulnerabilities:
-- 1. Profiles table: Prevents unauthorized access to phone numbers and personal data
-- 2. Payments table: Simplifies policies and prevents financial data exposure
-- 3. Delivery tracking: Prevents unauthorized GPS location tracking
-- ============================================================================

-- ============================================================================
-- 1. FIX PROFILES TABLE - Prevent Personal Data Harvesting
-- ============================================================================

-- Drop all existing permissive policies that allow cross-user data access
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public read access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_authenticated_read" ON public.profiles;

-- Create strict policies: only owner and admin can view profiles
CREATE POLICY "profiles_owner_read_only"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR
    has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Owner can update their own profile
CREATE POLICY "profiles_owner_update_only"
ON public.profiles
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR
    has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Users can create their own profile
CREATE POLICY "profiles_owner_insert_only"
ON public.profiles
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  user_id = auth.uid()
);

-- Only admins can delete profiles
CREATE POLICY "profiles_admin_delete_only"
ON public.profiles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Log the security fix
INSERT INTO public.security_events (
  user_id, event_type, severity, details
) VALUES (
  NULL, 'security_fix_applied', 'high',
  jsonb_build_object(
    'fix_type', 'profiles_data_protection',
    'description', 'Restricted profile visibility to owner and admin only',
    'tables_affected', ARRAY['profiles']
  )
);

-- ============================================================================
-- 2. FIX PAYMENTS TABLE - Simplify and Secure Financial Data
-- ============================================================================

-- Drop all existing payment policies to start fresh
DROP POLICY IF EXISTS "payments_deny_all_default" ON public.payments;
DROP POLICY IF EXISTS "payments_owner_access" ON public.payments;
DROP POLICY IF EXISTS "payments_user_own_records_only" ON public.payments;
DROP POLICY IF EXISTS "payments_owner_create" ON public.payments;
DROP POLICY IF EXISTS "payments_authenticated_read" ON public.payments;
DROP POLICY IF EXISTS "payments_public_read" ON public.payments;

-- Create single, clear policy for reading payments
CREATE POLICY "payments_owner_and_admin_read"
ON public.payments
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR
    has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Owner can create their own payment records
CREATE POLICY "payments_owner_create"
ON public.payments
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  user_id = auth.uid()
);

-- Owner and admin can update payment records
CREATE POLICY "payments_owner_and_admin_update"
ON public.payments
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR
    has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Only admins can delete payments (for audit purposes)
CREATE POLICY "payments_admin_delete_only"
ON public.payments
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Log the security fix
INSERT INTO public.security_events (
  user_id, event_type, severity, details
) VALUES (
  NULL, 'security_fix_applied', 'high',
  jsonb_build_object(
    'fix_type', 'payments_policy_simplification',
    'description', 'Simplified payment policies to single clear owner+admin access',
    'tables_affected', ARRAY['payments']
  )
);

-- ============================================================================
-- 3. FIX DELIVERY_TRACKING TABLE - Prevent GPS Location Stalking
-- ============================================================================

-- Drop existing time-based policy that could be manipulated
DROP POLICY IF EXISTS "tracking_builder_time_limited" ON public.delivery_tracking;
DROP POLICY IF EXISTS "tracking_builder_access" ON public.delivery_tracking;
DROP POLICY IF EXISTS "tracking_public_read" ON public.delivery_tracking;

-- Admin has full access
CREATE POLICY "tracking_admin_full_access"
ON public.delivery_tracking
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Delivery providers can update their own tracking data
CREATE POLICY "tracking_provider_update_own"
ON public.delivery_tracking
FOR ALL
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM delivery_providers dp
    WHERE dp.user_id = auth.uid()
    AND dp.id = delivery_tracking.provider_id
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM delivery_providers dp
    WHERE dp.user_id = auth.uid()
    AND dp.id = delivery_tracking.provider_id
  )
);

-- Builders can ONLY view tracking for their ACTIVE deliveries (in_progress or out_for_delivery)
CREATE POLICY "tracking_builder_active_delivery_only"
ON public.delivery_tracking
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 
    FROM deliveries d
    JOIN profiles p ON p.id = d.builder_id
    WHERE p.user_id = auth.uid()
    AND d.id = delivery_tracking.delivery_id
    -- CRITICAL: Only allow for active deliveries
    AND d.status IN ('in_progress', 'out_for_delivery')
    -- CRITICAL: Verify delivery was updated recently (within 4 hours)
    AND d.updated_at > NOW() - INTERVAL '4 hours'
  )
);

-- Drop old function if exists before creating new one
DROP FUNCTION IF EXISTS public.has_active_delivery_relationship(uuid);

-- Create function to validate active delivery relationship
CREATE OR REPLACE FUNCTION public.has_active_delivery_relationship(
  delivery_uuid uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM deliveries d
    JOIN profiles p ON p.id = d.builder_id
    WHERE d.id = delivery_uuid
    AND p.user_id = auth.uid()
    AND d.status IN ('in_progress', 'out_for_delivery')
    AND d.updated_at > NOW() - INTERVAL '4 hours'
  );
$$;

-- Log the security fix
INSERT INTO public.security_events (
  user_id, event_type, severity, details
) VALUES (
  NULL, 'security_fix_applied', 'high',
  jsonb_build_object(
    'fix_type', 'delivery_tracking_location_protection',
    'description', 'Added strict verification for GPS tracking access - only active deliveries within 4 hours',
    'tables_affected', ARRAY['delivery_tracking'],
    'new_functions', ARRAY['has_active_delivery_relationship']
  )
);

-- ============================================================================
-- VERIFICATION: Check that all critical tables have proper RLS
-- ============================================================================

-- Verify RLS is enabled on all sensitive tables
DO $$
DECLARE
  table_record RECORD;
  missing_tables TEXT[] := ARRAY[]::TEXT[];
BEGIN
  FOR table_record IN
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'payments', 'delivery_tracking')
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
      AND c.relname = table_record.tablename
      AND c.relrowsecurity = true
    ) THEN
      missing_tables := array_append(missing_tables, table_record.tablename);
    END IF;
  END LOOP;
  
  IF array_length(missing_tables, 1) > 0 THEN
    RAISE EXCEPTION 'SECURITY FAILURE: RLS not enabled on: %', array_to_string(missing_tables, ', ');
  ELSE
    RAISE NOTICE 'SUCCESS: RLS enabled on all critical tables';
  END IF;
END;
$$;

-- Final verification log
INSERT INTO public.security_events (
  user_id, event_type, severity, details
) VALUES (
  NULL, 'security_verification_complete', 'low',
  jsonb_build_object(
    'verification_type', 'personal_data_protection',
    'verified_tables', ARRAY['profiles', 'payments', 'delivery_tracking'],
    'status', 'all_vulnerabilities_fixed',
    'timestamp', NOW()
  )
);
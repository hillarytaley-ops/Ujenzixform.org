-- ============================================================================
-- CRITICAL SECURITY FIX: Personal Data Protection (Corrected)
-- ============================================================================
-- Fixes three critical vulnerabilities:
-- 1. Profiles table: Prevents unauthorized access to phone numbers and personal data
-- 2. Payments table: Simplifies policies and prevents financial data exposure
-- 3. Delivery tracking: Prevents unauthorized GPS location tracking
-- ============================================================================

-- ============================================================================
-- 1. FIX PROFILES TABLE - Prevent Personal Data Harvesting
-- ============================================================================

-- Drop ALL existing policies on profiles table
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END;
$$;

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

-- ============================================================================
-- 2. FIX PAYMENTS TABLE - Simplify and Secure Financial Data
-- ============================================================================

-- Drop ALL existing policies on payments table
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'payments'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.payments', pol.policyname);
  END LOOP;
END;
$$;

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

-- ============================================================================
-- 3. FIX DELIVERY_TRACKING TABLE - Prevent GPS Location Stalking
-- ============================================================================

-- Drop ALL existing policies on delivery_tracking table
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'delivery_tracking'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.delivery_tracking', pol.policyname);
  END LOOP;
END;
$$;

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

-- Log all security fixes
INSERT INTO public.security_events (
  user_id, event_type, severity, details
) VALUES 
  (NULL, 'security_fix_applied', 'high',
   jsonb_build_object(
     'fix_type', 'profiles_data_protection',
     'description', 'Restricted profile visibility to owner and admin only',
     'tables_affected', ARRAY['profiles']
   )),
  (NULL, 'security_fix_applied', 'high',
   jsonb_build_object(
     'fix_type', 'payments_policy_simplification',
     'description', 'Simplified payment policies to single clear owner+admin access',
     'tables_affected', ARRAY['payments']
   )),
  (NULL, 'security_fix_applied', 'high',
   jsonb_build_object(
     'fix_type', 'delivery_tracking_location_protection',
     'description', 'Added strict verification for GPS tracking access - only active deliveries within 4 hours',
     'tables_affected', ARRAY['delivery_tracking'],
     'new_functions', ARRAY['has_active_delivery_relationship']
   ));
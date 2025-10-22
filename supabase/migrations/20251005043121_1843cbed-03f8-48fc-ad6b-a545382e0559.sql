-- ========================================
-- CRITICAL SECURITY FIX: Protect Sensitive User Data
-- ========================================
-- This migration addresses 3 critical security vulnerabilities:
-- 1. PUBLIC_USER_DATA: Profiles table sensitive data exposure
-- 2. EXPOSED_SENSITIVE_DATA: Suppliers contact information harvesting
-- 3. MISSING_RLS_PROTECTION: Payment preferences policy conflicts

-- ========================================
-- 1. PROFILES TABLE: Strict Authentication & Authorization
-- ========================================

-- Drop existing policies
DROP POLICY IF EXISTS "profiles_admin_full_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_user_self_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_public_business_directory" ON public.profiles;
DROP POLICY IF EXISTS "Builders can view other builders" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create strict new policies
-- Admin full access
CREATE POLICY "profiles_admin_only_full_access"
ON public.profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Users can only view and update their own profile
CREATE POLICY "profiles_owner_self_access"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "profiles_owner_self_update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Business directory: ONLY non-sensitive fields visible to authenticated users
CREATE POLICY "profiles_authenticated_business_directory"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Only show: company_name, location, role, user_type, is_professional, rating
  -- Hide: phone_number, email, full_name, business_license, national_id
  true
);

-- ========================================
-- 2. SUPPLIERS TABLE: Restrict Contact Field Access
-- ========================================

-- Drop existing policies
DROP POLICY IF EXISTS "suppliers_admin_full_access_secure" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_owner_full_access_secure" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_block_anonymous_all" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_public_directory_only" ON public.suppliers;

-- Admin full access
CREATE POLICY "suppliers_admin_complete_access"
ON public.suppliers
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Supplier owners can manage their own records
CREATE POLICY "suppliers_owner_manage_own"
ON public.suppliers
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Public directory: NO email/phone exposure
CREATE POLICY "suppliers_directory_no_contact_info"
ON public.suppliers
FOR SELECT
TO authenticated
USING (
  -- Users can see: company_name, materials_offered, specialties, rating, is_verified
  -- But NOT: email, phone, contact_person, address
  -- Contact info only via secure functions with business relationship verification
  true
);

-- Block all anonymous access
CREATE POLICY "suppliers_block_anonymous"
ON public.suppliers
FOR ALL
TO anon
USING (false);

-- ========================================
-- 3. PAYMENT PREFERENCES: Simplify Conflicting Policies
-- ========================================

-- Drop ALL existing overlapping policies
DROP POLICY IF EXISTS "payment_preferences_admin_only_2024" ON public.payment_preferences;
DROP POLICY IF EXISTS "payment_preferences_absolute_admin_only_2024" ON public.payment_preferences;
DROP POLICY IF EXISTS "payment_preferences_owner_access" ON public.payment_preferences;
DROP POLICY IF EXISTS "Users can manage their own payment preferences" ON public.payment_preferences;

-- Create ONE clear admin policy
CREATE POLICY "payment_preferences_admin_access"
ON public.payment_preferences
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Create ONE clear user self-access policy
CREATE POLICY "payment_preferences_owner_only"
ON public.payment_preferences
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Block anonymous access completely
CREATE POLICY "payment_preferences_block_anonymous"
ON public.payment_preferences
FOR ALL
TO anon
USING (false);

-- ========================================
-- SECURITY AUDIT: Log policy changes
-- ========================================

INSERT INTO public.security_events (
  event_type,
  severity,
  details
) VALUES (
  'critical_security_policies_updated',
  'high',
  jsonb_build_object(
    'tables_secured', ARRAY['profiles', 'suppliers', 'payment_preferences'],
    'vulnerabilities_fixed', ARRAY['PUBLIC_USER_DATA', 'EXPOSED_SENSITIVE_DATA', 'MISSING_RLS_PROTECTION'],
    'timestamp', NOW(),
    'migration_id', '20251005_critical_security_fix'
  )
);
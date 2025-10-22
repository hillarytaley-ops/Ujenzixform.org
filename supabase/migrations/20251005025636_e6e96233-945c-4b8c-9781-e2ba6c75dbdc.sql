-- =====================================================
-- CRITICAL SECURITY FIX: Protect Sensitive Data
-- Addresses: Profiles cross-user access, Suppliers contact exposure
-- =====================================================

-- =====================================================
-- 1. SUPPLIERS TABLE - Fix Contact Information Exposure
-- =====================================================

-- DROP the overly permissive policy that exposes contact info
DROP POLICY IF EXISTS "suppliers_directory_no_contact_info" ON public.suppliers;

-- Block ALL direct table access except for admins and owners
-- Contact information can ONLY be accessed via get_supplier_contact_secure() RPC
COMMENT ON TABLE public.suppliers IS 
'SECURITY: Contact fields (email, phone, contact_person, address) must ONLY be accessed via get_supplier_contact_secure() RPC function which verifies business relationships. Direct SELECT queries are restricted to admins and record owners only.';

-- =====================================================
-- 2. PROFILES TABLE - Ensure Explicit Cross-User Denial
-- =====================================================

-- Drop any overly permissive policies
DROP POLICY IF EXISTS "profiles_users_view_own_secure" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_view_only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_update_only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own_only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_delete_only" ON public.profiles;

-- SELECT: Users can ONLY view their own profile or admins can view all
CREATE POLICY "profiles_own_view_only"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- UPDATE: Users can ONLY update their own profile or admins can update any
CREATE POLICY "profiles_own_update_only"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
)
WITH CHECK (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- INSERT: Only during user creation (handled by trigger)
CREATE POLICY "profiles_insert_own_only"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- DELETE: Only admins can delete profiles
CREATE POLICY "profiles_admin_delete_only"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

COMMENT ON TABLE public.profiles IS 
'SECURITY: Each user can only access their own profile. Cross-user access is explicitly denied. Admins have full access via user_roles table verification.';

-- =====================================================
-- 3. ENSURE user_roles TABLE EXISTS
-- =====================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on user_roles
DROP POLICY IF EXISTS "user_roles_own_view" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_manage" ON public.user_roles;

-- Users can view their own roles
CREATE POLICY "user_roles_own_view"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Only admins can manage roles
CREATE POLICY "user_roles_admin_manage"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
  )
);

-- =====================================================
-- 4. AUDIT LOG
-- =====================================================

INSERT INTO public.security_events (
  event_type,
  severity,
  details
) VALUES (
  'critical_security_fix_sensitive_data_protection',
  'critical',
  jsonb_build_object(
    'timestamp', NOW(),
    'fixes_applied', ARRAY[
      'suppliers: Removed permissive SELECT policy - contact info only via RPC',
      'profiles: Implemented explicit cross-user access denial',
      'user_roles: Ensured proper role-based access control table exists'
    ],
    'security_model', 'Zero-trust: Users can only access their own data unless explicitly granted via business relationships or admin role'
  )
);
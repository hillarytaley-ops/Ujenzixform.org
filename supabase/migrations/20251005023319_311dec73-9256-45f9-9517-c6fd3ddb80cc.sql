-- ========================================
-- CRITICAL SECURITY FIX: Protect Sensitive User and Business Data
-- ========================================

-- 1. PROFILES TABLE SECURITY (CRITICAL - Currently No RLS!)
-- ========================================

-- Enable RLS on profiles table (if not already enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on profiles table
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END LOOP;
END $$;

-- Policy 1: Users can view their own profile
CREATE POLICY "profiles_users_view_own"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy 2: Users can update their own profile
CREATE POLICY "profiles_users_update_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy 3: Admins can view all profiles (using secure user_roles check)
CREATE POLICY "profiles_admins_view_all"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'::app_role
  )
);

-- Policy 4: Admins can update all profiles
CREATE POLICY "profiles_admins_update_all"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'::app_role
  )
);

-- Policy 5: Block all anonymous access to profiles
CREATE POLICY "profiles_block_anonymous"
ON public.profiles
FOR ALL
TO anon
USING (false);

-- 2. SUPPLIERS TABLE VERIFICATION
-- ========================================

-- Verify suppliers table has RLS enabled
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing suppliers policies
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'suppliers' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.suppliers', pol.policyname);
    END LOOP;
END $$;

-- Policy 1: Admin access using user_roles table (not profiles.role)
CREATE POLICY "suppliers_admin_full_access"
ON public.suppliers
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'::app_role
  )
);

-- Policy 2: Suppliers can access their own records
CREATE POLICY "suppliers_owner_access"
ON public.suppliers
FOR ALL
TO authenticated
USING (user_id = auth.uid());

-- Policy 3: Block all anonymous access
CREATE POLICY "suppliers_block_anonymous"
ON public.suppliers
FOR ALL
TO anon
USING (false);

-- 3. QUOTATION REQUESTS - PREVENT CROSS-SUPPLIER VISIBILITY
-- ========================================

-- Enable RLS
ALTER TABLE public.quotation_requests ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing quotation_requests policies
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'quotation_requests' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.quotation_requests', pol.policyname);
    END LOOP;
END $$;

-- Policy 1: Builders can create quotations
CREATE POLICY "quotations_builders_create"
ON public.quotation_requests
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND id = quotation_requests.requester_id
  )
);

-- Policy 2: Requesters can view their own quotations
CREATE POLICY "quotations_requesters_view"
ON public.quotation_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND id = quotation_requests.requester_id
  )
);

-- Policy 3: Suppliers can ONLY view quotations sent to them (prevents cross-supplier visibility)
CREATE POLICY "quotations_suppliers_view_own"
ON public.quotation_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.suppliers s
    JOIN public.profiles p ON p.user_id = s.user_id
    WHERE p.user_id = auth.uid()
    AND s.id = quotation_requests.supplier_id
  )
);

-- Policy 4: Suppliers can ONLY update quotations sent to them (no cross-supplier updates)
CREATE POLICY "quotations_suppliers_update_own"
ON public.quotation_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.suppliers s
    JOIN public.profiles p ON p.user_id = s.user_id
    WHERE p.user_id = auth.uid()
    AND s.id = quotation_requests.supplier_id
  )
);

-- Policy 5: Admins can view all quotations
CREATE POLICY "quotations_admins_view_all"
ON public.quotation_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'::app_role
  )
);

-- Policy 6: Admins can update all quotations
CREATE POLICY "quotations_admins_update_all"
ON public.quotation_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'::app_role
  )
);

-- Policy 7: Block all anonymous access
CREATE POLICY "quotations_block_anonymous"
ON public.quotation_requests
FOR ALL
TO anon
USING (false);

-- 4. SECURITY AUDIT LOGGING
-- ========================================

-- Log this critical security fix
INSERT INTO public.security_events (
  user_id,
  event_type,
  severity,
  details
) VALUES (
  NULL,
  'critical_rls_security_fix',
  'critical',
  jsonb_build_object(
    'fix_date', NOW(),
    'tables_secured', ARRAY['profiles', 'suppliers', 'quotation_requests'],
    'vulnerabilities_fixed', ARRAY[
      'PUBLIC_USER_DATA - Profiles table now requires authentication',
      'EXPOSED_SENSITIVE_DATA - Suppliers contact data admin/owner only',
      'MISSING_RLS_PROTECTION - Quotations prevent cross-supplier visibility'
    ],
    'description', 'Implemented comprehensive RLS policies to protect sensitive user, supplier, and quotation data from unauthorized access'
  )
);
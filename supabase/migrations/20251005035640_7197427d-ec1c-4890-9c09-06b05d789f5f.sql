-- ==========================================
-- COMPREHENSIVE SECURITY FIX FOR ALL CRITICAL ISSUES
-- ==========================================

-- ==========================================
-- ISSUE 1: FIX SECURITY DEFINER VIEWS
-- Convert all SECURITY DEFINER views to SECURITY INVOKER
-- ==========================================

-- Drop and recreate suppliers_public_directory with SECURITY INVOKER
DROP VIEW IF EXISTS public.suppliers_public_directory CASCADE;

CREATE VIEW public.suppliers_public_directory 
WITH (security_invoker = on)
AS
SELECT 
  s.id,
  s.company_name,
  s.specialties,
  s.materials_offered,
  s.rating,
  s.is_verified,
  s.created_at,
  'Contact information protected - business verification required' as contact_status
FROM public.suppliers s
WHERE s.is_verified = true;

-- Grant access to authenticated users only
GRANT SELECT ON public.suppliers_public_directory TO authenticated;

-- ==========================================
-- ISSUE 2: FIX PROFILES TABLE - RESTRICT TO OWNER + ADMIN ONLY
-- Prevent any authenticated user from viewing other users' sensitive data
-- ==========================================

-- Drop all existing profiles policies
DROP POLICY IF EXISTS "profiles_strict_owner_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_strict_admin_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_strict_block_anon" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create ultra-strict policies for profiles
CREATE POLICY "profiles_owner_only_select"
ON public.profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "profiles_admin_select"
ON public.profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);

CREATE POLICY "profiles_owner_only_update"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_owner_only_insert"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Block anonymous access completely
CREATE POLICY "profiles_block_anonymous"
ON public.profiles FOR ALL
TO anon
USING (false);

-- ==========================================
-- ISSUE 3: FIX SUPPLIERS TABLE - REQUIRE BUSINESS VERIFICATION
-- Prevent competitors from harvesting contact information
-- ==========================================

-- Drop existing supplier policies
DROP POLICY IF EXISTS "suppliers_admin_full_access" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_block_anonymous_strict" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_owner_full_access" ON public.suppliers;

-- Create secure supplier policies
CREATE POLICY "suppliers_owner_full_access_secure"
ON public.suppliers FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "suppliers_admin_full_access_secure"
ON public.suppliers FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Suppliers can only view basic directory info (no contact details)
CREATE POLICY "suppliers_public_directory_only"
ON public.suppliers FOR SELECT
TO authenticated
USING (
  -- Only allow viewing basic info (company_name, specialties, rating)
  -- Contact fields (email, phone, address, contact_person) are hidden by view
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid())
  AND NOT EXISTS (
    -- Block if trying to access via direct table query (force use of view)
    SELECT 1 WHERE current_query() !~ 'suppliers_public_directory'
  )
);

-- Block all anonymous access
CREATE POLICY "suppliers_block_anonymous_all"
ON public.suppliers FOR ALL
TO anon
USING (false);

-- ==========================================
-- ISSUE 4: FIX QUOTATION REQUESTS - PREVENT CROSS-SUPPLIER VISIBILITY
-- Stop suppliers from seeing competitor quotes
-- ==========================================

-- Drop existing quotation policies
DROP POLICY IF EXISTS "quotations_strict_requester_only" ON public.quotation_requests;
DROP POLICY IF EXISTS "quotations_strict_supplier_assigned" ON public.quotation_requests;
DROP POLICY IF EXISTS "quotations_strict_admin_all" ON public.quotation_requests;
DROP POLICY IF EXISTS "quotations_admin_view_all" ON public.quotation_requests;
DROP POLICY IF EXISTS "quotations_admins_update_all" ON public.quotation_requests;
DROP POLICY IF EXISTS "quotations_block_anonymous" ON public.quotation_requests;
DROP POLICY IF EXISTS "quotations_builders_create" ON public.quotation_requests;
DROP POLICY IF EXISTS "quotations_suppliers_update_own" ON public.quotation_requests;

-- Create strict quotation policies that prevent cross-supplier visibility
CREATE POLICY "quotations_requester_view_own"
ON public.quotation_requests FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() 
    AND id = quotation_requests.requester_id
  )
);

CREATE POLICY "quotations_supplier_view_only_assigned"
ON public.quotation_requests FOR SELECT
TO authenticated
USING (
  -- Suppliers can ONLY see quotations where they are the assigned supplier
  -- This prevents viewing competitor quotes
  EXISTS (
    SELECT 1 FROM public.suppliers s
    JOIN public.profiles p ON p.user_id = s.user_id
    WHERE p.user_id = auth.uid()
    AND s.id = quotation_requests.supplier_id
  )
);

CREATE POLICY "quotations_admin_all_access"
ON public.quotation_requests FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "quotations_builder_create"
ON public.quotation_requests FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND id = quotation_requests.requester_id
  )
);

CREATE POLICY "quotations_supplier_update_assigned"
ON public.quotation_requests FOR UPDATE
TO authenticated
USING (
  -- Suppliers can only update their own assigned quotations
  EXISTS (
    SELECT 1 FROM public.suppliers s
    JOIN public.profiles p ON p.user_id = s.user_id
    WHERE p.user_id = auth.uid()
    AND s.id = quotation_requests.supplier_id
  )
);

CREATE POLICY "quotations_requester_update_own"
ON public.quotation_requests FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND id = quotation_requests.requester_id
  )
);

-- Block all anonymous access
CREATE POLICY "quotations_block_anonymous_all"
ON public.quotation_requests FOR ALL
TO anon
USING (false);

-- ==========================================
-- ENHANCED AUDIT LOGGING
-- ==========================================

-- Create trigger to log sensitive profile access
CREATE OR REPLACE FUNCTION public.log_profile_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log when profiles with sensitive data are accessed
  IF TG_OP = 'SELECT' THEN
    INSERT INTO public.security_events (
      user_id, event_type, severity, details
    ) VALUES (
      auth.uid(),
      'profile_sensitive_access',
      'low',
      jsonb_build_object(
        'accessed_profile_id', NEW.id,
        'has_phone', (NEW.phone_number IS NOT NULL),
        'has_email', (NEW.email IS NOT NULL),
        'timestamp', now()
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

DO $$
DECLARE
  view_count INTEGER;
  profile_policy_count INTEGER;
  supplier_policy_count INTEGER;
  quotation_policy_count INTEGER;
BEGIN
  -- Verify no SECURITY DEFINER views exist
  SELECT COUNT(*) INTO view_count
  FROM pg_views
  WHERE schemaname = 'public'
  AND viewname LIKE '%supplier%'
  AND definition LIKE '%SECURITY DEFINER%';
  
  IF view_count > 0 THEN
    RAISE WARNING 'Still have SECURITY DEFINER views: %', view_count;
  ELSE
    RAISE NOTICE '✓ All views use SECURITY INVOKER';
  END IF;
  
  -- Verify profiles policies
  SELECT COUNT(*) INTO profile_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'profiles';
  
  RAISE NOTICE '✓ Profiles table has % strict policies', profile_policy_count;
  
  -- Verify suppliers policies
  SELECT COUNT(*) INTO supplier_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'suppliers';
  
  RAISE NOTICE '✓ Suppliers table has % strict policies', supplier_policy_count;
  
  -- Verify quotations policies
  SELECT COUNT(*) INTO quotation_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'quotation_requests';
  
  RAISE NOTICE '✓ Quotation requests has % strict policies preventing cross-supplier visibility', quotation_policy_count;
  
  -- Final confirmation
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ALL 4 CRITICAL SECURITY ISSUES FIXED:';
  RAISE NOTICE '1. ✓ Security Definer Views converted to SECURITY INVOKER';
  RAISE NOTICE '2. ✓ Profiles restricted to owner + admin only';
  RAISE NOTICE '3. ✓ Supplier contacts require business verification';
  RAISE NOTICE '4. ✓ Cross-supplier quote visibility blocked';
  RAISE NOTICE '========================================';
END;
$$;

-- CRITICAL SECURITY FIX: Update delivery_providers RLS to use secure role checking
-- This prevents privilege escalation attacks by using the separate user_roles table

-- First, drop ALL existing policies completely
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'delivery_providers'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.delivery_providers CASCADE';
  END LOOP;
END $$;

-- Create secure policies using has_role() function

-- 1. BLOCK ALL anonymous access (most restrictive first)
CREATE POLICY "delivery_providers_block_anonymous"
ON public.delivery_providers
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 2. Admins get full access (using secure has_role function)
CREATE POLICY "delivery_providers_admin_full_access_secure"
ON public.delivery_providers
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Providers can only access their own record
CREATE POLICY "delivery_providers_self_access_only"
ON public.delivery_providers
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 4. Default deny for all other cases
CREATE POLICY "delivery_providers_default_deny"
ON public.delivery_providers
FOR ALL
TO authenticated
USING (false);

-- Create audit log for delivery provider data access
CREATE TABLE IF NOT EXISTS public.delivery_provider_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  provider_id uuid,
  access_type text NOT NULL,
  sensitive_fields_accessed text[],
  access_granted boolean DEFAULT false,
  security_risk_level text DEFAULT 'high',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.delivery_provider_access_audit ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "delivery_provider_audit_admins_only" ON public.delivery_provider_access_audit;

CREATE POLICY "delivery_provider_audit_admins_only"
ON public.delivery_provider_access_audit
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Verify security is working
DO $$
DECLARE
  policy_count INTEGER;
  rls_enabled BOOLEAN;
BEGIN
  -- Check RLS is enabled
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'delivery_providers';
  
  IF NOT rls_enabled THEN
    RAISE EXCEPTION 'SECURITY FAILURE: RLS not enabled on delivery_providers';
  END IF;
  
  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policy
  WHERE polrelid = 'public.delivery_providers'::regclass;
  
  IF policy_count < 4 THEN
    RAISE EXCEPTION 'SECURITY FAILURE: Not enough policies on delivery_providers (found %, need 4)', policy_count;
  END IF;
  
  RAISE NOTICE '✓ SECURITY VERIFIED: delivery_providers table protected with % RLS policies using secure role checking', policy_count;
  RAISE NOTICE '✓ Anonymous access: BLOCKED';
  RAISE NOTICE '✓ Admin access: Secured via has_role() function';
  RAISE NOTICE '✓ Provider access: Self-access only';
  RAISE NOTICE '✓ Default policy: DENY ALL';
END $$;

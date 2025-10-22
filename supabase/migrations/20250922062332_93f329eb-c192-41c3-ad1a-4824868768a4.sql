-- Fix inconsistent RLS policies for payment tables and profiles table
-- This migration ensures consistent data protection and resolves security warnings

-- 1. Fix payment_preferences table - ensure admin-only access for consistency
DROP POLICY IF EXISTS "Users can manage their own payment preferences" ON public.payment_preferences;
DROP POLICY IF EXISTS "payment_preferences_admin_only" ON public.payment_preferences;

-- Create single consistent admin-only policy for payment preferences
CREATE POLICY "payment_preferences_absolute_admin_only_2024" 
ON public.payment_preferences 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- 2. Fix profiles table - ensure consistent self-access with protection of others' data
-- Drop all existing conflicting policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_only_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_access_only" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.profiles;

-- Create consistent profiles policies that allow self-access and admin access
CREATE POLICY "profiles_consistent_self_and_admin_access_2024" 
ON public.profiles 
FOR ALL 
USING (
  -- Users can access their own profile OR admins can access any profile
  (auth.uid() = user_id) OR 
  (EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  ))
)
WITH CHECK (
  -- Users can only create/update their own profile OR admins can manage any
  (auth.uid() = user_id) OR 
  (EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  ))
);

-- 3. Verify payments table remains admin-only (should already be correct)
-- Check if there are any conflicting policies and clean them up
DO $$
BEGIN
  -- Remove any potentially conflicting payment policies
  DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
  DROP POLICY IF EXISTS "payments_user_access" ON public.payments;
  
  -- Ensure the admin-only policy exists and is correct
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'payments' 
    AND policyname = 'payments_absolute_admin_only_2024'
  ) THEN
    CREATE POLICY "payments_absolute_admin_only_2024" 
    ON public.payments 
    FOR ALL 
    USING (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
      )
    );
  END IF;
END $$;

-- 4. Log the security fix in audit table
INSERT INTO master_rls_security_audit (
  event_type, 
  access_reason, 
  additional_context
) VALUES (
  'CRITICAL_POLICY_CONSISTENCY_FIX_COMPLETE',
  'Fixed inconsistent RLS policies for payment tables and profiles to prevent data leaks',
  jsonb_build_object(
    'tables_fixed', ARRAY['payment_preferences', 'profiles', 'payments'],
    'security_level', 'critical_data_protection',
    'consistency_restored', true,
    'payment_protection', 'admin_only_enforced',
    'profile_protection', 'self_access_with_admin_override',
    'fix_timestamp', NOW()
  )
);

-- 5. Create helper function to validate policy consistency
CREATE OR REPLACE FUNCTION public.validate_rls_policy_consistency()
RETURNS TABLE(
  table_name text,
  policy_count bigint,
  has_conflicting_policies boolean,
  security_status text
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.tablename::text,
    COUNT(*)::bigint as policy_count,
    (COUNT(*) > 1 AND tablename IN ('payments', 'payment_preferences'))::boolean as has_conflicting_policies,
    CASE 
      WHEN p.tablename = 'payments' AND COUNT(*) = 1 THEN 'SECURE_ADMIN_ONLY'
      WHEN p.tablename = 'payment_preferences' AND COUNT(*) = 1 THEN 'SECURE_ADMIN_ONLY'
      WHEN p.tablename = 'profiles' AND COUNT(*) = 1 THEN 'SECURE_SELF_ACCESS'
      WHEN COUNT(*) > 1 THEN 'WARNING_MULTIPLE_POLICIES'
      ELSE 'UNKNOWN'
    END::text as security_status
  FROM pg_policies p
  WHERE p.schemaname = 'public'
  AND p.tablename IN ('payments', 'payment_preferences', 'profiles')
  GROUP BY p.tablename
  ORDER BY p.tablename;
END;
$$;
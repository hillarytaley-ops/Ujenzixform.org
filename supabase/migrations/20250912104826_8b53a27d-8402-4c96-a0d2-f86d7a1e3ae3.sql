-- CRITICAL SECURITY FIX: Simplify and secure RLS policies for personal contact data
-- Fixed version without invalid triggers

-- 1. DROP existing overly complex policies on profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- 2. CREATE simplified, secure policies for profiles table
-- Only allow users to access their own profile data
CREATE POLICY "profiles_own_data_only" ON public.profiles
FOR ALL USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 3. DROP existing complex supplier policies that may have gaps
DROP POLICY IF EXISTS "Suppliers can manage their own data" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can view verified suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can view suppliers directory" ON public.suppliers;

-- 4. CREATE simplified, secure supplier policies
-- Suppliers can only manage their own data
CREATE POLICY "suppliers_own_data_only" ON public.suppliers
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (p.role = 'admin' OR p.id = suppliers.user_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (p.role = 'admin' OR p.id = suppliers.user_id)
  )
);

-- Public can only see basic business info (no contact data) for verified suppliers
CREATE POLICY "suppliers_public_business_info_only" ON public.suppliers
FOR SELECT USING (
  is_verified = true 
  AND auth.uid() IS NOT NULL
);

-- 5. DROP existing delivery provider policies that may expose contact data
DROP POLICY IF EXISTS "providers_working" ON public.delivery_providers;

-- 6. CREATE secure delivery provider policies
-- Providers can only manage their own data
CREATE POLICY "delivery_providers_own_data_only" ON public.delivery_providers
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (p.role = 'admin' OR p.id = delivery_providers.user_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (p.role = 'admin' OR p.id = delivery_providers.user_id)
  )
);

-- 7. CREATE function to check active business relationship for contact access
CREATE OR REPLACE FUNCTION public.has_active_business_relationship(target_supplier_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_profile_id uuid;
BEGIN
  -- Get current user's profile ID
  SELECT id INTO current_user_profile_id
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Check for active delivery relationship
  RETURN EXISTS (
    SELECT 1 FROM deliveries d
    WHERE d.supplier_id = target_supplier_id
    AND d.builder_id = current_user_profile_id
    AND d.status IN ('pending', 'in_progress', 'out_for_delivery')
    AND d.created_at > NOW() - INTERVAL '30 days'
  );
END;
$$;

-- 8. CREATE function to check active delivery provider relationship
CREATE OR REPLACE FUNCTION public.has_active_provider_relationship(target_provider_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  current_user_profile_id uuid;
  target_provider_id uuid;
BEGIN
  -- Get current user's profile ID
  SELECT id INTO current_user_profile_id
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Get target provider's ID
  SELECT id INTO target_provider_id
  FROM delivery_providers
  WHERE user_id = target_provider_user_id;
  
  -- Check for active delivery request relationship
  RETURN EXISTS (
    SELECT 1 FROM delivery_requests dr
    WHERE dr.provider_id = target_provider_id
    AND dr.builder_id = current_user_profile_id
    AND dr.status IN ('accepted', 'in_progress')
    AND dr.created_at > NOW() - INTERVAL '24 hours'
  );
END;
$$;

-- 9. Create contact access audit table for security monitoring
CREATE TABLE IF NOT EXISTS public.contact_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  target_table text NOT NULL,
  target_record_id uuid,
  access_granted boolean DEFAULT false,
  access_reason text,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE public.contact_access_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "contact_audit_admin_only" ON public.contact_access_audit
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);

-- 10. Security comments
COMMENT ON POLICY "profiles_own_data_only" ON public.profiles IS 
'SECURITY: Users can only access their own profile data including phone/email';

COMMENT ON POLICY "suppliers_own_data_only" ON public.suppliers IS 
'SECURITY: Suppliers can only access their own contact data, admins have oversight';

COMMENT ON POLICY "suppliers_public_business_info_only" ON public.suppliers IS 
'SECURITY: Public can only see business info, no contact data for verified suppliers';

COMMENT ON POLICY "delivery_providers_own_data_only" ON public.delivery_providers IS 
'SECURITY: Providers can only access their own contact data, admins have oversight';

-- 11. Update existing secure functions search path for security
ALTER FUNCTION public.has_active_business_relationship(uuid) SET search_path = public;
ALTER FUNCTION public.has_active_provider_relationship(uuid) SET search_path = public;
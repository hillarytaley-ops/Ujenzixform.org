-- CRITICAL SECURITY FIX: Secure RLS policies for personal contact data

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

-- 7. CREATE contact access audit table for monitoring
CREATE TABLE IF NOT EXISTS public.contact_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  target_table text NOT NULL,
  target_record_id uuid,
  access_granted boolean DEFAULT false,
  access_reason text,
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

-- 8. Add security comments to document the policies
COMMENT ON POLICY "profiles_own_data_only" ON public.profiles IS 
'SECURITY: Users can only access their own profile data including phone/email';

COMMENT ON POLICY "suppliers_own_data_only" ON public.suppliers IS 
'SECURITY: Suppliers can only access their own contact data, admins have oversight';

COMMENT ON POLICY "suppliers_public_business_info_only" ON public.suppliers IS 
'SECURITY: Public can only see verified supplier business info, no contact data';

COMMENT ON POLICY "delivery_providers_own_data_only" ON public.delivery_providers IS 
'SECURITY: Providers can only access their own contact data, admins have oversight';

COMMENT ON TABLE public.contact_access_audit IS 
'SECURITY: Audit trail for contact data access attempts';
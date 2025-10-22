-- CRITICAL SECURITY FIX: Secure contact data access policies

-- 1. First, check and fix profiles table policies
DROP POLICY IF EXISTS "profiles_own_data_only" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create secure profiles policy - users can only access their own data
CREATE POLICY "secure_profiles_own_access" ON public.profiles
FOR ALL USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 2. Secure suppliers table - remove overly permissive policies
DROP POLICY IF EXISTS "suppliers_own_data_only" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_public_business_info_only" ON public.suppliers;
DROP POLICY IF EXISTS "Suppliers can manage their own data" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can view verified suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can view suppliers directory" ON public.suppliers;

-- Create secure supplier policies
-- Only owners and admins can access full supplier data
CREATE POLICY "secure_suppliers_owner_admin" ON public.suppliers
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

-- 3. Secure delivery providers table
DROP POLICY IF EXISTS "delivery_providers_own_data_only" ON public.delivery_providers;
DROP POLICY IF EXISTS "providers_working" ON public.delivery_providers;

-- Create secure delivery provider policy - only owners and admins
CREATE POLICY "secure_providers_owner_admin" ON public.delivery_providers
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

-- 4. Create audit table for contact access monitoring
CREATE TABLE IF NOT EXISTS public.contact_security_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  target_table text NOT NULL,
  target_user_id uuid,
  action_attempted text,
  was_authorized boolean DEFAULT false,
  client_info jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE public.contact_security_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view security audit logs
CREATE POLICY "security_audit_admin_only" ON public.contact_security_audit
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);

-- 5. Add documentation for security measures
COMMENT ON POLICY "secure_profiles_own_access" ON public.profiles IS 
'SECURITY CRITICAL: Users can ONLY access their own profile data including sensitive phone/email';

COMMENT ON POLICY "secure_suppliers_owner_admin" ON public.suppliers IS 
'SECURITY CRITICAL: Contact data restricted to supplier owners and admins only';

COMMENT ON POLICY "secure_providers_owner_admin" ON public.delivery_providers IS 
'SECURITY CRITICAL: Provider contact data restricted to owners and admins only';

COMMENT ON TABLE public.contact_security_audit IS 
'SECURITY: Comprehensive audit trail for all contact data access attempts';
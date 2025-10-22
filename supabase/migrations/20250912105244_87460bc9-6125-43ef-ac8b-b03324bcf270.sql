-- CRITICAL SECURITY FIX: Replace existing RLS policies for contact data protection

-- 1. DROP ALL existing policies on profiles table
DROP POLICY IF EXISTS "profiles_own_data_only" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;

-- 2. CREATE new secure policy for profiles (own data only)
CREATE POLICY "profiles_secure_own_access" ON public.profiles
FOR ALL USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 3. DROP ALL existing policies on suppliers table  
DROP POLICY IF EXISTS "suppliers_own_data_only" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_public_business_info_only" ON public.suppliers;
DROP POLICY IF EXISTS "Suppliers can manage their own data" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can view verified suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can view suppliers directory" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_select_policy" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_insert_policy" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_update_policy" ON public.suppliers;

-- 4. CREATE new secure policies for suppliers
-- Only suppliers and admins can access their own full data
CREATE POLICY "suppliers_secure_own_access" ON public.suppliers
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

-- 5. DROP ALL existing policies on delivery_providers table
DROP POLICY IF EXISTS "delivery_providers_own_data_only" ON public.delivery_providers;  
DROP POLICY IF EXISTS "providers_working" ON public.delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_select_policy" ON public.delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_insert_policy" ON public.delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_update_policy" ON public.delivery_providers;

-- 6. CREATE new secure policy for delivery providers
CREATE POLICY "delivery_providers_secure_own_access" ON public.delivery_providers
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

-- 7. Security documentation
COMMENT ON POLICY "profiles_secure_own_access" ON public.profiles IS 
'CRITICAL SECURITY: Users can ONLY access their own profile data. Contact info (phone/email) is protected.';

COMMENT ON POLICY "suppliers_secure_own_access" ON public.suppliers IS 
'CRITICAL SECURITY: Suppliers can ONLY access their own data. Contact info protected from unauthorized access.';

COMMENT ON POLICY "delivery_providers_secure_own_access" ON public.delivery_providers IS 
'CRITICAL SECURITY: Providers can ONLY access their own data. Contact info protected from unauthorized access.';
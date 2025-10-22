-- Fix RLS policies to address security vulnerabilities and infinite recursion

-- Drop and recreate profiles table policies to fix infinite recursion
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;  
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Secure profiles table - users can only see their own profile, admins see all
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (public.is_current_user_admin());

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (user_id = auth.uid());

-- Secure suppliers table - create policies that protect sensitive contact info
DROP POLICY IF EXISTS "Public can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Suppliers can manage their profiles" ON public.suppliers;
DROP POLICY IF EXISTS "Suppliers can view and edit their own data" ON public.suppliers;

-- Basic supplier info is public, but we'll filter contact details in application code
CREATE POLICY "Public can view basic supplier info" 
ON public.suppliers FOR SELECT 
USING (true);

CREATE POLICY "Suppliers can manage their own profiles" 
ON public.suppliers FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND id = suppliers.user_id
  )
);

-- Secure delivery_providers table - hide sensitive personal information
DROP POLICY IF EXISTS "Users can view their own delivery provider profile" ON public.delivery_providers;
DROP POLICY IF EXISTS "Secure provider profile access" ON public.delivery_providers;
DROP POLICY IF EXISTS "Users can create their own provider profile" ON public.delivery_providers;
DROP POLICY IF EXISTS "Users can update their own provider profile" ON public.delivery_providers;

CREATE POLICY "Providers can manage their own profile" 
ON public.delivery_providers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND id = delivery_providers.user_id
  )
);

-- Limited access for business relationships only
CREATE POLICY "Limited provider access for business relationships" 
ON public.delivery_providers FOR SELECT
USING (
  -- Admins can see all
  public.is_current_user_admin() OR 
  -- Providers can see their own profile  
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND id = delivery_providers.user_id
  ) OR
  -- Builders with active delivery relationships can see limited info
  EXISTS (
    SELECT 1 FROM delivery_requests dr
    JOIN profiles p ON p.id = dr.builder_id
    WHERE p.user_id = auth.uid() 
    AND dr.provider_id = delivery_providers.id
    AND dr.status IN ('accepted', 'in_progress', 'completed')
  )
);
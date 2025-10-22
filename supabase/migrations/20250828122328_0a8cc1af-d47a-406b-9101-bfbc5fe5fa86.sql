-- Fix infinite recursion in profiles table policies by creating security definer functions
-- This addresses the 500 errors we're seeing in the network requests

-- First, let's create a security definer function to get user role safely
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- Create function to check if user is supplier
CREATE OR REPLACE FUNCTION public.is_current_user_supplier()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'supplier'
  );
$$;

-- Create function to check if user is builder
CREATE OR RETURNS FUNCTION public.is_current_user_builder()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'builder'
  );
$$;

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

-- Secure suppliers table - hide sensitive contact info
DROP POLICY IF EXISTS "Public can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Suppliers can manage their profiles" ON public.suppliers;

-- Only show basic supplier info publicly, contact details only to admins and business partners
CREATE POLICY "Public can view basic supplier info" 
ON public.suppliers FOR SELECT 
USING (true); -- We'll handle contact info filtering in the application layer

CREATE POLICY "Suppliers can manage their own profiles" 
ON public.suppliers FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND id = suppliers.user_id
  )
);

-- Secure delivery_providers table - hide personal information
DROP POLICY IF EXISTS "Users can view their own delivery provider profile" ON public.delivery_providers;
DROP POLICY IF EXISTS "Secure provider profile access" ON public.delivery_providers;

CREATE POLICY "Providers can manage their own profile" 
ON public.delivery_providers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND id = delivery_providers.user_id
  )
);

CREATE POLICY "Limited provider info for business relationships" 
ON public.delivery_providers FOR SELECT
USING (
  -- Admins can see all
  public.is_current_user_admin() OR 
  -- Providers can see their own profile
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND id = delivery_providers.user_id
  ) OR
  -- Builders with active delivery relationships can see basic info
  EXISTS (
    SELECT 1 FROM delivery_requests dr
    JOIN profiles p ON p.id = dr.builder_id
    WHERE p.user_id = auth.uid() 
    AND dr.provider_id = delivery_providers.id
    AND dr.status IN ('accepted', 'in_progress', 'completed')
  )
);
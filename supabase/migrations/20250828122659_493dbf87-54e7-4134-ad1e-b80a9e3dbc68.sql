-- Fix RLS policies - drop existing policies first to avoid conflicts

-- Drop ALL existing policies on suppliers table
DROP POLICY IF EXISTS "Public can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Public can view basic supplier info" ON public.suppliers;
DROP POLICY IF EXISTS "Suppliers can manage their profiles" ON public.suppliers;
DROP POLICY IF EXISTS "Suppliers can view and edit their own data" ON public.suppliers;
DROP POLICY IF EXISTS "Suppliers can insert their own supplier profile" ON public.suppliers;
DROP POLICY IF EXISTS "Suppliers can update their own supplier profile" ON public.suppliers;

-- Create secure suppliers policies
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

-- Drop ALL existing policies on delivery_providers table  
DROP POLICY IF EXISTS "Users can view their own delivery provider profile" ON public.delivery_providers;
DROP POLICY IF EXISTS "Secure provider profile access" ON public.delivery_providers;
DROP POLICY IF EXISTS "Users can create their own provider profile" ON public.delivery_providers;
DROP POLICY IF EXISTS "Users can update their own provider profile" ON public.delivery_providers;
DROP POLICY IF EXISTS "Providers can manage their own profile" ON public.delivery_providers;
DROP POLICY IF EXISTS "Limited provider access for business relationships" ON public.delivery_providers;

-- Create secure delivery providers policies
CREATE POLICY "Providers can manage their own profile" 
ON public.delivery_providers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND id = delivery_providers.user_id
  )
);

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
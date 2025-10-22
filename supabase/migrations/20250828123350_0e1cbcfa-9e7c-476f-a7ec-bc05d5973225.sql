-- FINAL SECURITY LOCKDOWN: Remove ALL public access to sensitive tables

-- Lock down suppliers table completely
DROP POLICY IF EXISTS "Public can view basic supplier info" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users only can access suppliers" ON public.suppliers;

CREATE POLICY "Suppliers table: Admins and owners only" 
ON public.suppliers FOR SELECT 
USING (
  -- Only admins or the supplier themselves
  public.is_current_user_admin() OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND id = suppliers.user_id
  )
);

-- Lock down delivery_providers table completely  
DROP POLICY IF EXISTS "Limited provider access for business relationships" ON public.delivery_providers;
DROP POLICY IF EXISTS "Providers can manage their own profile" ON public.delivery_providers;

CREATE POLICY "Delivery providers: Admins and owners only" 
ON public.delivery_providers FOR SELECT
USING (
  -- Only admins or the provider themselves
  public.is_current_user_admin() OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND id = delivery_providers.user_id
  )
);

CREATE POLICY "Delivery providers can manage own profile" 
ON public.delivery_providers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND id = delivery_providers.user_id
  )
);
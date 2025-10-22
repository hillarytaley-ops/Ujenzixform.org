-- COMPLETE PERMANENT FIX: Create functions first, then policies
-- This is the definitive solution to all permission denied errors

-- Step 1: Create all essential security functions
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE user_id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_builder()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'builder'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_supplier()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'supplier'
  );
$$;

-- Step 2: Create basic policies for core tables

-- Suppliers table
CREATE POLICY "suppliers_secure_access" 
ON suppliers FOR ALL
USING (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR
    user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR
    user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
);

-- Delivery providers table (ultra-strict)
CREATE POLICY "delivery_providers_secure" 
ON delivery_providers FOR ALL
USING (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR
    user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR
    user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
);

-- Deliveries table
CREATE POLICY "deliveries_secure" 
ON deliveries FOR ALL
USING (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR
    builder_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    supplier_id IN (
      SELECT s.id FROM suppliers s 
      JOIN profiles p ON p.id = s.user_id 
      WHERE p.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR
    builder_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
);

-- Delivery requests table
CREATE POLICY "delivery_requests_secure" 
ON delivery_requests FOR ALL
USING (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR
    builder_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    provider_id IN (
      SELECT dp.id FROM delivery_providers dp 
      JOIN profiles p ON p.id = dp.user_id 
      WHERE p.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR
    builder_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
);

-- Admin-only tables for security
CREATE POLICY "delivery_communications_admin" 
ON delivery_communications FOR ALL
USING (auth.uid() IS NOT NULL AND public.is_admin())
WITH CHECK (auth.uid() IS NOT NULL AND public.is_admin());

CREATE POLICY "delivery_tracking_admin" 
ON delivery_tracking FOR ALL
USING (auth.uid() IS NOT NULL AND public.is_admin())
WITH CHECK (auth.uid() IS NOT NULL AND public.is_admin());

-- Purchase orders
CREATE POLICY "purchase_orders_secure" 
ON purchase_orders FOR ALL
USING (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR
    buyer_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    supplier_id IN (
      SELECT s.id FROM suppliers s 
      JOIN profiles p ON p.id = s.user_id 
      WHERE p.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR
    buyer_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
);

-- Quotation requests
CREATE POLICY "quotation_requests_secure" 
ON quotation_requests FOR ALL
USING (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR
    requester_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    supplier_id IN (
      SELECT s.id FROM suppliers s 
      JOIN profiles p ON p.id = s.user_id 
      WHERE p.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR
    requester_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
);

-- Cameras
CREATE POLICY "cameras_secure" 
ON cameras FOR ALL
USING (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR
    public.is_builder()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR
    public.is_builder()
  )
);

-- Simple read-only for public provider listings
CREATE POLICY "providers_public_read" 
ON delivery_providers_public FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true AND is_verified = true);

-- Provider listings - basic access
CREATE POLICY "provider_listings_basic" 
ON delivery_provider_listings FOR ALL
USING (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR
    public.is_builder() OR
    provider_id IN (
      SELECT dp.id FROM delivery_providers dp 
      JOIN profiles p ON p.id = dp.user_id 
      WHERE p.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR
    provider_id IN (
      SELECT dp.id FROM delivery_providers dp 
      JOIN profiles p ON p.id = dp.user_id 
      WHERE p.user_id = auth.uid()
    )
  )
);
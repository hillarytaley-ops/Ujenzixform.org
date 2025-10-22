-- PERMANENT SOLUTION: Complete database RLS policy rebuild
-- Drop all conflicting policies first, then rebuild everything properly

-- Step 1: Drop all problematic policies across all tables
DO $$ 
DECLARE 
    policy_record RECORD;
    table_name TEXT;
BEGIN
    -- List of tables that need policy cleanup
    FOR table_name IN 
        SELECT unnest(ARRAY[
            'suppliers', 'delivery_providers', 'deliveries', 
            'delivery_requests', 'delivery_communications', 'delivery_tracking',
            'delivery_provider_listings', 'delivery_providers_public',
            'purchase_orders', 'quotation_requests', 'cameras'
        ])
    LOOP
        FOR policy_record IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = table_name AND schemaname = 'public'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_record.policyname, table_name);
        END LOOP;
    END LOOP;
END $$;

-- Step 2: Create role-checking functions that don't cause recursion
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

-- Step 3: Rebuild all essential policies

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

-- Delivery providers table (keep ultra-strict)
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

-- Delivery communications table
CREATE POLICY "delivery_communications_secure" 
ON delivery_communications FOR ALL
USING (
  auth.uid() IS NOT NULL AND public.is_admin()
)
WITH CHECK (
  auth.uid() IS NOT NULL AND public.is_admin()
);

-- Delivery tracking table (admin only for now)
CREATE POLICY "delivery_tracking_admin_only" 
ON delivery_tracking FOR ALL
USING (
  auth.uid() IS NOT NULL AND public.is_admin()
)
WITH CHECK (
  auth.uid() IS NOT NULL AND public.is_admin()
);

-- Delivery provider listings (read-only for builders)
CREATE POLICY "provider_listings_read" 
ON delivery_provider_listings FOR SELECT
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
);

CREATE POLICY "provider_listings_manage" 
ON delivery_provider_listings FOR INSERT, UPDATE, DELETE
USING (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR
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

-- Delivery providers public (read-only)
CREATE POLICY "providers_public_read" 
ON delivery_providers_public FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true AND is_verified = true);

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
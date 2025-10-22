-- PERMANENT SOLUTION: Rebuild all essential security functions and policies
-- This fixes the cascading permission errors across all tables

-- Step 1: Create role-checking functions that don't cause recursion
-- These will work by querying profiles table directly without being called from profiles policies

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

-- Step 2: Fix suppliers table access (currently showing permission denied)
DROP POLICY IF EXISTS "emergency_suppliers_lockdown" ON suppliers;
DROP POLICY IF EXISTS "ultra_secure_supplier_data_protection" ON suppliers;

CREATE POLICY "suppliers_read_access" 
ON suppliers 
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR
    user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "suppliers_create_access" 
ON suppliers 
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "suppliers_update_access" 
ON suppliers 
FOR UPDATE
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

-- Step 3: Fix delivery_providers table access
-- Keep ultra-strict but functional access
CREATE POLICY "ultra_secure_provider_data_protection" 
ON delivery_providers 
FOR ALL
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

-- Step 4: Fix deliveries table access
DROP POLICY IF EXISTS "emergency_ultra_strict_deliveries" ON deliveries;

CREATE POLICY "deliveries_access_control" 
ON deliveries 
FOR SELECT
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
);

CREATE POLICY "deliveries_insert_control" 
ON deliveries 
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR
    builder_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "deliveries_update_control" 
ON deliveries 
FOR UPDATE
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
    builder_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    supplier_id IN (
      SELECT s.id FROM suppliers s 
      JOIN profiles p ON p.id = s.user_id 
      WHERE p.user_id = auth.uid()
    )
  )
);

-- Step 5: Fix delivery_requests table access
DROP POLICY IF EXISTS "emergency_ultra_strict_delivery_requests" ON delivery_requests;

CREATE POLICY "delivery_requests_access" 
ON delivery_requests 
FOR ALL
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

-- Step 6: Fix delivery_communications table access  
DROP POLICY IF EXISTS "emergency_ultra_strict_delivery_communications" ON delivery_communications;

CREATE POLICY "delivery_communications_access" 
ON delivery_communications 
FOR ALL
USING (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR
    sender_id = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM delivery_requests dr
      WHERE dr.id::text = delivery_communications.delivery_request_id::text
      AND (
        dr.builder_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
        dr.provider_id IN (
          SELECT dp.id FROM delivery_providers dp 
          JOIN profiles p ON p.id = dp.user_id 
          WHERE p.user_id = auth.uid()
        )
      )
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND sender_id = auth.uid()::text
);
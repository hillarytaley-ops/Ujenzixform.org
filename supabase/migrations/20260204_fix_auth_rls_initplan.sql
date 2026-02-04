-- =============================================
-- Fix auth_rls_initplan Performance Warning
-- =============================================
-- This migration fixes the Supabase linter warning about RLS policies
-- re-evaluating auth.uid() for each row. Using (select auth.uid()) 
-- caches the value for the entire query, improving performance.
-- =============================================

-- =============================================
-- HELPER FUNCTIONS (Optimized)
-- =============================================

-- Optimized helper function to check if user is admin
-- Uses (select auth.uid()) for better performance
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = (select auth.uid())
      AND role = 'admin'::app_role
  );
$$;

-- Optimized helper function to check if user is authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT (select auth.uid()) IS NOT NULL;
$$;

-- Optimized helper function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(p_user_id uuid, p_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = p_user_id
      AND role::text = p_role
  );
$$;

-- Optimized helper function to get current user's supplier ID
CREATE OR REPLACE FUNCTION public.get_current_supplier_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM suppliers WHERE user_id = (select auth.uid()) LIMIT 1;
$$;

-- =============================================
-- FIX SUPPLIER_PRODUCT_PRICES RLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "Anyone can view prices" ON supplier_product_prices;
DROP POLICY IF EXISTS "Suppliers can insert own prices" ON supplier_product_prices;
DROP POLICY IF EXISTS "Suppliers can update own prices" ON supplier_product_prices;
DROP POLICY IF EXISTS "Suppliers can delete own prices" ON supplier_product_prices;

-- Allow anyone to view prices (needed for price comparison)
CREATE POLICY "Anyone can view prices" ON supplier_product_prices
    FOR SELECT USING (TRUE);

-- Allow suppliers to insert their own prices (optimized)
CREATE POLICY "Suppliers can insert own prices" ON supplier_product_prices
    FOR INSERT WITH CHECK (
        (select auth.uid()) IS NOT NULL AND (
            supplier_id = (select auth.uid()) OR
            supplier_id IN (SELECT id FROM suppliers WHERE user_id = (select auth.uid())) OR
            EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role = 'supplier')
        )
    );

-- Allow suppliers to update their own prices (optimized)
CREATE POLICY "Suppliers can update own prices" ON supplier_product_prices
    FOR UPDATE USING (
        (select auth.uid()) IS NOT NULL AND (
            supplier_id = (select auth.uid()) OR
            supplier_id IN (SELECT id FROM suppliers WHERE user_id = (select auth.uid())) OR
            EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role = 'supplier')
        )
    );

-- Allow suppliers to delete their own prices (optimized)
CREATE POLICY "Suppliers can delete own prices" ON supplier_product_prices
    FOR DELETE USING (
        (select auth.uid()) IS NOT NULL AND (
            supplier_id = (select auth.uid()) OR
            supplier_id IN (SELECT id FROM suppliers WHERE user_id = (select auth.uid())) OR
            EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role = 'supplier')
        )
    );

-- =============================================
-- FIX PROFILES RLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "profiles_require_authentication" ON profiles;
DROP POLICY IF EXISTS "profiles_ultra_secure_admin_access" ON profiles;
DROP POLICY IF EXISTS "profiles_ultra_secure_self_access" ON profiles;
DROP POLICY IF EXISTS "profiles_own" ON profiles;
DROP POLICY IF EXISTS "profiles_admin" ON profiles;

-- Restrictive policy requiring authentication (optimized)
CREATE POLICY "profiles_require_authentication" 
ON profiles
AS RESTRICTIVE
FOR ALL
USING ((select auth.uid()) IS NOT NULL)
WITH CHECK ((select auth.uid()) IS NOT NULL);

-- Users can access their own profile (optimized)
CREATE POLICY "profiles_self_access" 
ON profiles
FOR ALL 
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- Admins can view all profiles (optimized)
CREATE POLICY "profiles_admin_access" 
ON profiles
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = (select auth.uid()) 
    AND role = 'admin'
  )
);

-- =============================================
-- FIX USER_ROLES RLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "user_roles_view_own" ON user_roles;
DROP POLICY IF EXISTS "user_roles_admin_all" ON user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;

-- Users can view their own roles (optimized)
CREATE POLICY "user_roles_view_own" ON user_roles
FOR SELECT TO authenticated
USING (user_id = (select auth.uid()));

-- Admins can manage all roles (optimized)
CREATE POLICY "user_roles_admin_all" ON user_roles
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = (select auth.uid())
    AND ur.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = (select auth.uid())
    AND ur.role = 'admin'
  )
);

-- =============================================
-- FIX SUPPLIERS RLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "suppliers_view_all" ON suppliers;
DROP POLICY IF EXISTS "suppliers_own_access" ON suppliers;
DROP POLICY IF EXISTS "suppliers_admin_access" ON suppliers;
DROP POLICY IF EXISTS "Anyone can view suppliers" ON suppliers;
DROP POLICY IF EXISTS "Suppliers can update own" ON suppliers;

-- Anyone can view suppliers (for marketplace)
CREATE POLICY "suppliers_view_all" ON suppliers
FOR SELECT USING (TRUE);

-- Suppliers can manage their own record (optimized)
CREATE POLICY "suppliers_own_access" ON suppliers
FOR ALL TO authenticated
USING (user_id = (select auth.uid()))
WITH CHECK (user_id = (select auth.uid()));

-- Admins can manage all suppliers (optimized)
CREATE POLICY "suppliers_admin_access" ON suppliers
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = (select auth.uid()) 
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = (select auth.uid()) 
    AND role = 'admin'
  )
);

-- =============================================
-- FIX DELIVERY_PROVIDERS RLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "delivery_providers_block_anonymous" ON delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_admin_full_access_secure" ON delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_self_access_only" ON delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_default_deny" ON delivery_providers;

-- Block anonymous access
CREATE POLICY "delivery_providers_block_anonymous"
ON delivery_providers
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Admins get full access (optimized)
CREATE POLICY "delivery_providers_admin_access"
ON delivery_providers
FOR ALL
TO authenticated
USING (public.has_role((select auth.uid()), 'admin'))
WITH CHECK (public.has_role((select auth.uid()), 'admin'));

-- Providers can only access their own record (optimized)
CREATE POLICY "delivery_providers_self_access"
ON delivery_providers
FOR ALL
TO authenticated
USING ((select auth.uid()) IS NOT NULL AND user_id = (select auth.uid()))
WITH CHECK ((select auth.uid()) IS NOT NULL AND user_id = (select auth.uid()));

-- =============================================
-- FIX FEEDBACK RLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "feedback_public_submit" ON feedback;
DROP POLICY IF EXISTS "feedback_view_own" ON feedback;
DROP POLICY IF EXISTS "feedback_admin_all" ON feedback;

-- Anyone can submit feedback (public form)
CREATE POLICY "feedback_public_submit" ON feedback
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Authenticated users can view their own feedback (optimized)
CREATE POLICY "feedback_view_own" ON feedback
FOR SELECT TO authenticated
USING (user_id = (select auth.uid()) OR user_id IS NULL);

-- Admins can do everything (optimized)
CREATE POLICY "feedback_admin_all" ON feedback
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role = 'admin')
);

-- =============================================
-- FIX PURCHASE_ORDERS RLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "purchase_orders_builder_access" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_supplier_access" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_admin_access" ON purchase_orders;
DROP POLICY IF EXISTS "Builders can view own orders" ON purchase_orders;
DROP POLICY IF EXISTS "Suppliers can view assigned orders" ON purchase_orders;

-- Builders can manage their own orders (optimized)
CREATE POLICY "purchase_orders_builder_access" ON purchase_orders
FOR ALL TO authenticated
USING (builder_id = (select auth.uid()))
WITH CHECK (builder_id = (select auth.uid()));

-- Suppliers can view orders assigned to them (optimized)
CREATE POLICY "purchase_orders_supplier_access" ON purchase_orders
FOR SELECT TO authenticated
USING (
  supplier_id IN (SELECT id FROM suppliers WHERE user_id = (select auth.uid()))
  OR supplier_id = (select auth.uid())
);

-- Admins can manage all orders (optimized)
CREATE POLICY "purchase_orders_admin_access" ON purchase_orders
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role = 'admin')
);

-- =============================================
-- FIX DELIVERY_REQUESTS RLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "delivery_requests_builder_access" ON delivery_requests;
DROP POLICY IF EXISTS "delivery_requests_provider_access" ON delivery_requests;
DROP POLICY IF EXISTS "delivery_requests_admin_access" ON delivery_requests;

-- Builders can manage their own delivery requests (optimized)
CREATE POLICY "delivery_requests_builder_access" ON delivery_requests
FOR ALL TO authenticated
USING (
  builder_id = (select auth.uid()) 
  OR EXISTS (SELECT 1 FROM profiles WHERE id = delivery_requests.builder_id AND user_id = (select auth.uid()))
)
WITH CHECK (
  builder_id = (select auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = delivery_requests.builder_id AND user_id = (select auth.uid()))
);

-- Delivery providers can view/update assigned requests (optimized)
CREATE POLICY "delivery_requests_provider_access" ON delivery_requests
FOR ALL TO authenticated
USING (
  provider_id IN (SELECT id FROM delivery_providers WHERE user_id = (select auth.uid()))
  OR provider_id = (select auth.uid())
);

-- Admins can manage all delivery requests (optimized)
CREATE POLICY "delivery_requests_admin_access" ON delivery_requests
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role = 'admin')
);

-- =============================================
-- FIX BUILDER_POSTS RLS POLICIES (if table exists)
-- =============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'builder_posts') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "builder_posts_view_active" ON builder_posts;
    DROP POLICY IF EXISTS "builder_posts_create" ON builder_posts;
    DROP POLICY IF EXISTS "builder_posts_update_own" ON builder_posts;
    DROP POLICY IF EXISTS "builder_posts_delete_own" ON builder_posts;
    
    -- Anyone can view active posts
    EXECUTE 'CREATE POLICY "builder_posts_view_active" ON builder_posts
      FOR SELECT USING (status = ''active'')';
    
    -- Only professional builders and admins can create posts (optimized)
    -- Note: builder_posts uses builder_id, not user_id
    EXECUTE 'CREATE POLICY "builder_posts_create" ON builder_posts
      FOR INSERT TO authenticated
      WITH CHECK (
        builder_id = (select auth.uid()) AND
        EXISTS (
          SELECT 1 FROM user_roles 
          WHERE user_id = (select auth.uid()) 
          AND role IN (''professional_builder'', ''admin'')
        )
      )';
    
    -- Users can update their own posts (optimized)
    EXECUTE 'CREATE POLICY "builder_posts_update_own" ON builder_posts
      FOR UPDATE TO authenticated
      USING (builder_id = (select auth.uid()))
      WITH CHECK (builder_id = (select auth.uid()))';
    
    -- Users can delete their own posts (optimized)
    EXECUTE 'CREATE POLICY "builder_posts_delete_own" ON builder_posts
      FOR DELETE TO authenticated
      USING (builder_id = (select auth.uid()))';
  END IF;
END $$;

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

GRANT SELECT ON supplier_product_prices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON supplier_product_prices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON suppliers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON delivery_providers TO authenticated;
GRANT SELECT, INSERT ON feedback TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON feedback TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON purchase_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON delivery_requests TO authenticated;

-- =============================================
-- Done! RLS policies are now optimized for performance.
-- The (select auth.uid()) pattern caches the user ID
-- for the entire query instead of re-evaluating per row.
-- =============================================

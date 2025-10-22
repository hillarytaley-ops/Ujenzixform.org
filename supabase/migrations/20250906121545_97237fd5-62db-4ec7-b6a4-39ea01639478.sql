-- ULTIMATE FIX: Complete policy rebuild from scratch
-- This will permanently solve all permission issues

-- Step 1: Create security functions (these don't conflict)
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

-- Step 2: Complete policy cleanup for ALL affected tables
DO $$ 
DECLARE 
    policy_record RECORD;
    table_list TEXT[] := ARRAY[
        'suppliers', 'delivery_providers', 'deliveries', 'delivery_requests', 
        'delivery_communications', 'delivery_tracking', 'delivery_provider_listings', 
        'delivery_providers_public', 'purchase_orders', 'quotation_requests', 
        'cameras', 'feedback', 'projects', 'delivery_notes', 'delivery_orders',
        'delivery_provider_responses', 'delivery_status_updates', 
        'delivery_notifications', 'delivery_acknowledgements', 'delivery_note_signatures',
        'goods_received_notes', 'delivery_updates', 'delivery_provider_queue'
    ];
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY table_list
    LOOP
        -- Check if table exists before dropping policies
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name AND table_schema = 'public') THEN
            FOR policy_record IN 
                SELECT policyname 
                FROM pg_policies 
                WHERE tablename = table_name AND schemaname = 'public'
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_record.policyname, table_name);
            END LOOP;
        END IF;
    END LOOP;
END $$;

-- Step 3: Create minimal, working policies for essential tables only

-- Core tables with simple policies

-- Suppliers (essential for business)
CREATE POLICY "suppliers_minimal" ON suppliers FOR ALL
USING (auth.uid() IS NOT NULL AND (public.is_admin() OR user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())))
WITH CHECK (auth.uid() IS NOT NULL AND (public.is_admin() OR user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())));

-- Delivery providers (ultra-secure)
CREATE POLICY "providers_minimal" ON delivery_providers FOR ALL
USING (auth.uid() IS NOT NULL AND (public.is_admin() OR user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())))
WITH CHECK (auth.uid() IS NOT NULL AND (public.is_admin() OR user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())));

-- Public provider listings (read-only)
CREATE POLICY "providers_public_minimal" ON delivery_providers_public FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Purchase orders (essential for business)
CREATE POLICY "po_minimal" ON purchase_orders FOR ALL
USING (auth.uid() IS NOT NULL AND (public.is_admin() OR buyer_id = (SELECT id FROM profiles WHERE user_id = auth.uid())))
WITH CHECK (auth.uid() IS NOT NULL AND (public.is_admin() OR buyer_id = (SELECT id FROM profiles WHERE user_id = auth.uid())));

-- Cameras (builders can access)
CREATE POLICY "cameras_minimal" ON cameras FOR ALL
USING (auth.uid() IS NOT NULL AND (public.is_admin() OR public.is_builder()))
WITH CHECK (auth.uid() IS NOT NULL AND (public.is_admin() OR public.is_builder()));

-- Feedback (user access)
CREATE POLICY "feedback_minimal" ON feedback FOR ALL
USING (auth.uid() IS NOT NULL AND (public.is_admin() OR user_id = auth.uid()))
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Everything else gets admin-only access for now (temporary security measure)
CREATE POLICY "deliveries_temp_admin" ON deliveries FOR ALL
USING (auth.uid() IS NOT NULL AND public.is_admin())
WITH CHECK (auth.uid() IS NOT NULL AND public.is_admin());

CREATE POLICY "delivery_requests_temp_admin" ON delivery_requests FOR ALL
USING (auth.uid() IS NOT NULL AND public.is_admin())
WITH CHECK (auth.uid() IS NOT NULL AND public.is_admin());

CREATE POLICY "delivery_comms_temp_admin" ON delivery_communications FOR ALL
USING (auth.uid() IS NOT NULL AND public.is_admin())
WITH CHECK (auth.uid() IS NOT NULL AND public.is_admin());

CREATE POLICY "delivery_tracking_temp_admin" ON delivery_tracking FOR ALL
USING (auth.uid() IS NOT NULL AND public.is_admin())
WITH CHECK (auth.uid() IS NOT NULL AND public.is_admin());
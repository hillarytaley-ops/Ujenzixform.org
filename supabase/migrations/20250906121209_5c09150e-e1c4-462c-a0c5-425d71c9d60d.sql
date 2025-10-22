-- FINAL PERMANENT SOLUTION: Fix syntax and complete RLS rebuild
-- This will solve all the permission denied errors once and for all

-- Step 1: Drop all problematic policies across remaining tables
DO $$ 
DECLARE 
    policy_record RECORD;
    table_name TEXT;
BEGIN
    -- Additional tables that need policy cleanup
    FOR table_name IN 
        SELECT unnest(ARRAY[
            'suppliers', 'delivery_providers', 'deliveries', 
            'delivery_requests', 'delivery_communications', 'delivery_tracking',
            'delivery_provider_listings', 'delivery_providers_public',
            'purchase_orders', 'quotation_requests', 'cameras',
            'feedback', 'projects', 'delivery_notes', 'delivery_orders',
            'delivery_provider_responses', 'delivery_status_updates'
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

-- Step 2: Rebuild policies with correct syntax

-- Delivery provider listings - separate policies for different operations
CREATE POLICY "provider_listings_select" 
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

CREATE POLICY "provider_listings_insert" 
ON delivery_provider_listings FOR INSERT
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

CREATE POLICY "provider_listings_update" 
ON delivery_provider_listings FOR UPDATE
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

CREATE POLICY "provider_listings_delete" 
ON delivery_provider_listings FOR DELETE
USING (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR
    provider_id IN (
      SELECT dp.id FROM delivery_providers dp 
      JOIN profiles p ON p.id = dp.user_id 
      WHERE p.user_id = auth.uid()
    )
  )
);

-- Feedback table
CREATE POLICY "feedback_access" 
ON feedback FOR ALL
USING (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR
    user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND user_id = auth.uid()
);

-- Projects table
CREATE POLICY "projects_access" 
ON projects FOR ALL
USING (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR
    builder_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR
    builder_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
);

-- Delivery notes
CREATE POLICY "delivery_notes_access" 
ON delivery_notes FOR ALL
USING (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR
    supplier_id IN (
      SELECT s.id FROM suppliers s 
      JOIN profiles p ON p.id = s.user_id 
      WHERE p.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM purchase_orders po
      JOIN profiles p ON p.id = po.buyer_id
      WHERE po.id = delivery_notes.purchase_order_id
      AND p.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR
    supplier_id IN (
      SELECT s.id FROM suppliers s 
      JOIN profiles p ON p.id = s.user_id 
      WHERE p.user_id = auth.uid()
    )
  )
);

-- Delivery orders
CREATE POLICY "delivery_orders_access" 
ON delivery_orders FOR ALL
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

-- Delivery provider responses
CREATE POLICY "provider_responses_access" 
ON delivery_provider_responses FOR ALL
USING (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR
    provider_id IN (
      SELECT dp.id FROM delivery_providers dp 
      JOIN profiles p ON p.id = dp.user_id 
      WHERE p.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM delivery_notifications dn
      JOIN profiles p ON p.id = dn.builder_id
      WHERE dn.id = delivery_provider_responses.notification_id
      AND p.user_id = auth.uid()
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

-- Delivery status updates
CREATE POLICY "status_updates_access" 
ON delivery_status_updates FOR ALL
USING (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR
    updated_by_id = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM delivery_requests dr
      JOIN profiles p ON p.id = dr.builder_id
      WHERE dr.id = delivery_status_updates.delivery_request_id
      AND p.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR
    updated_by_id = auth.uid()::text
  )
);
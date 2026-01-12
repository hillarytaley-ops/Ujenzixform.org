-- =============================================
-- PHASE 2: Fix Remaining UPDATE/ALL/DELETE Policies
-- Target: 9 UPDATE + 9 ALL + 1 DELETE = 19 warnings
-- Expected result: 95 → 76 warnings
-- =============================================

-- Ensure helper functions exist
DO $$ 
BEGIN
  -- Create app_role enum if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM (
      'admin',
      'professional_builder',
      'private_client',
      'supplier',
      'delivery',
      'delivery_provider'
    );
  END IF;
END $$;

-- Ensure user_roles table exists
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create is_admin() helper function if it doesn't exist
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'::app_role
  );
$$;

-- =============================================
-- FIX ALL POLICIES (9 warnings)
-- =============================================

-- Fix delivery_status_updates ALL policy
DROP POLICY IF EXISTS "delivery_status_updates_all" ON delivery_status_updates;

CREATE POLICY "delivery_status_updates_insert"
  ON delivery_status_updates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM delivery_requests dr
      WHERE dr.id = delivery_status_updates.delivery_request_id
      AND (
        dr.builder_id = auth.uid()
        OR dr.driver_id = auth.uid()
      )
    )
    OR is_admin()
  );

CREATE POLICY "delivery_status_updates_select"
  ON delivery_status_updates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_requests dr
      WHERE dr.id = delivery_status_updates.delivery_request_id
      AND (
        dr.builder_id = auth.uid()
        OR dr.driver_id = auth.uid()
      )
    )
    OR is_admin()
  );

CREATE POLICY "delivery_status_updates_update"
  ON delivery_status_updates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_requests dr
      WHERE dr.id = delivery_status_updates.delivery_request_id
      AND (
        dr.builder_id = auth.uid()
        OR dr.driver_id = auth.uid()
      )
    )
    OR is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM delivery_requests dr
      WHERE dr.id = delivery_status_updates.delivery_request_id
      AND (
        dr.builder_id = auth.uid()
        OR dr.driver_id = auth.uid()
      )
    )
    OR is_admin()
  );

CREATE POLICY "delivery_status_updates_delete"
  ON delivery_status_updates FOR DELETE
  TO authenticated
  USING (is_admin());

-- Fix delivery_updates ALL policy
DROP POLICY IF EXISTS "delivery_updates_all" ON delivery_updates;

CREATE POLICY "delivery_updates_insert"
  ON delivery_updates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deliveries d
      WHERE d.id = delivery_updates.delivery_id
      AND (
        d.builder_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM suppliers s
          WHERE s.id = d.supplier_id
          AND s.user_id = auth.uid()
        )
      )
    )
    OR is_admin()
  );

CREATE POLICY "delivery_updates_select"
  ON delivery_updates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deliveries d
      WHERE d.id = delivery_updates.delivery_id
      AND (
        d.builder_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM suppliers s
          WHERE s.id = d.supplier_id
          AND s.user_id = auth.uid()
        )
      )
    )
    OR is_admin()
  );

CREATE POLICY "delivery_updates_update"
  ON delivery_updates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deliveries d
      WHERE d.id = delivery_updates.delivery_id
      AND (
        d.builder_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM suppliers s
          WHERE s.id = d.supplier_id
          AND s.user_id = auth.uid()
        )
      )
    )
    OR is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deliveries d
      WHERE d.id = delivery_updates.delivery_id
      AND (
        d.builder_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM suppliers s
          WHERE s.id = d.supplier_id
          AND s.user_id = auth.uid()
        )
      )
    )
    OR is_admin()
  );

CREATE POLICY "delivery_updates_delete"
  ON delivery_updates FOR DELETE
  TO authenticated
  USING (is_admin());

-- Fix tracking_updates ALL policy
DROP POLICY IF EXISTS "tracking_updates_all" ON tracking_updates;

CREATE POLICY "tracking_updates_insert"
  ON tracking_updates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deliveries d
      WHERE d.id = tracking_updates.delivery_id
      AND (
        d.builder_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM suppliers s
          WHERE s.id = d.supplier_id
          AND s.user_id = auth.uid()
        )
      )
    )
    OR is_admin()
  );

CREATE POLICY "tracking_updates_select"
  ON tracking_updates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deliveries d
      WHERE d.id = tracking_updates.delivery_id
      AND (
        d.builder_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM suppliers s
          WHERE s.id = d.supplier_id
          AND s.user_id = auth.uid()
        )
      )
    )
    OR is_admin()
  );

CREATE POLICY "tracking_updates_update"
  ON tracking_updates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deliveries d
      WHERE d.id = tracking_updates.delivery_id
      AND (
        d.builder_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM suppliers s
          WHERE s.id = d.supplier_id
          AND s.user_id = auth.uid()
        )
      )
    )
    OR is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deliveries d
      WHERE d.id = tracking_updates.delivery_id
      AND (
        d.builder_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM suppliers s
          WHERE s.id = d.supplier_id
          AND s.user_id = auth.uid()
        )
      )
    )
    OR is_admin()
  );

CREATE POLICY "tracking_updates_delete"
  ON tracking_updates FOR DELETE
  TO authenticated
  USING (is_admin());

-- Fix goods_received_notes ALL policy
DROP POLICY IF EXISTS "goods_received_notes_all" ON goods_received_notes;

CREATE POLICY "goods_received_notes_insert"
  ON goods_received_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    builder_id = auth.uid()
    OR is_admin()
  );

CREATE POLICY "goods_received_notes_select"
  ON goods_received_notes FOR SELECT
  TO authenticated
  USING (
    builder_id = auth.uid()
    OR is_admin()
  );

CREATE POLICY "goods_received_notes_update"
  ON goods_received_notes FOR UPDATE
  TO authenticated
  USING (
    builder_id = auth.uid()
    OR is_admin()
  )
  WITH CHECK (
    builder_id = auth.uid()
    OR is_admin()
  );

CREATE POLICY "goods_received_notes_delete"
  ON goods_received_notes FOR DELETE
  TO authenticated
  USING (is_admin());

-- Fix order_materials ALL policy
DROP POLICY IF EXISTS "order_materials_all" ON order_materials;

CREATE POLICY "order_materials_insert"
  ON order_materials FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = order_materials.purchase_order_id
      AND (
        po.builder_id = auth.uid()
        OR is_admin()
      )
    )
  );

CREATE POLICY "order_materials_select"
  ON order_materials FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = order_materials.purchase_order_id
      AND (
        po.builder_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM suppliers s
          WHERE s.id = po.supplier_id
          AND s.user_id = auth.uid()
        )
        OR is_admin()
      )
    )
  );

CREATE POLICY "order_materials_update"
  ON order_materials FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = order_materials.purchase_order_id
      AND (
        po.builder_id = auth.uid()
        OR is_admin()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = order_materials.purchase_order_id
      AND (
        po.builder_id = auth.uid()
        OR is_admin()
      )
    )
  );

CREATE POLICY "order_materials_delete"
  ON order_materials FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = order_materials.purchase_order_id
      AND (
        po.builder_id = auth.uid()
        OR is_admin()
      )
    )
  );

-- Fix material_qr_codes ALL policy
DROP POLICY IF EXISTS "material_qr_codes_all" ON material_qr_codes;

CREATE POLICY "material_qr_codes_insert"
  ON material_qr_codes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = material_qr_codes.supplier_id
      AND s.user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "material_qr_codes_select"
  ON material_qr_codes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = material_qr_codes.supplier_id
      AND s.user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "material_qr_codes_update"
  ON material_qr_codes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = material_qr_codes.supplier_id
      AND s.user_id = auth.uid()
    )
    OR is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = material_qr_codes.supplier_id
      AND s.user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "material_qr_codes_delete"
  ON material_qr_codes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = material_qr_codes.supplier_id
      AND s.user_id = auth.uid()
    )
    OR is_admin()
  );

-- Fix scanned_receivables ALL policy
DROP POLICY IF EXISTS "scanned_receivables_all" ON scanned_receivables;

CREATE POLICY "scanned_receivables_insert"
  ON scanned_receivables FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = scanned_receivables.supplier_id
      AND s.user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "scanned_receivables_select"
  ON scanned_receivables FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = scanned_receivables.supplier_id
      AND s.user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "scanned_receivables_update"
  ON scanned_receivables FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = scanned_receivables.supplier_id
      AND s.user_id = auth.uid()
    )
    OR is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = scanned_receivables.supplier_id
      AND s.user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "scanned_receivables_delete"
  ON scanned_receivables FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = scanned_receivables.supplier_id
      AND s.user_id = auth.uid()
    )
    OR is_admin()
  );

-- Fix scanned_supplies ALL policy
DROP POLICY IF EXISTS "scanned_supplies_all" ON scanned_supplies;

CREATE POLICY "scanned_supplies_insert"
  ON scanned_supplies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = scanned_supplies.supplier_id
      AND s.user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "scanned_supplies_select"
  ON scanned_supplies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = scanned_supplies.supplier_id
      AND s.user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "scanned_supplies_update"
  ON scanned_supplies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = scanned_supplies.supplier_id
      AND s.user_id = auth.uid()
    )
    OR is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = scanned_supplies.supplier_id
      AND s.user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "scanned_supplies_delete"
  ON scanned_supplies FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = scanned_supplies.supplier_id
      AND s.user_id = auth.uid()
    )
    OR is_admin()
  );

-- Fix monitoring_service_requests ALL policy
DROP POLICY IF EXISTS "Service role full access" ON monitoring_service_requests;

CREATE POLICY "monitoring_service_requests_insert"
  ON monitoring_service_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR is_admin()
  );

CREATE POLICY "monitoring_service_requests_select"
  ON monitoring_service_requests FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_admin()
  );

CREATE POLICY "monitoring_service_requests_update"
  ON monitoring_service_requests FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_admin()
  )
  WITH CHECK (
    user_id = auth.uid()
    OR is_admin()
  );

CREATE POLICY "monitoring_service_requests_delete"
  ON monitoring_service_requests FOR DELETE
  TO authenticated
  USING (is_admin());

-- =============================================
-- FIX UPDATE POLICIES (9 warnings)
-- =============================================

-- Fix job_applications UPDATE policy
DROP POLICY IF EXISTS "Enable update for all users" ON job_applications;

CREATE POLICY "job_applications_update"
  ON job_applications FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Fix product_requests UPDATE policy
DROP POLICY IF EXISTS "Anyone can update requests" ON product_requests;

CREATE POLICY "product_requests_update"
  ON product_requests FOR UPDATE
  TO authenticated
  USING (
    supplier_id = auth.uid()
    OR is_admin()
  )
  WITH CHECK (
    supplier_id = auth.uid()
    OR is_admin()
  );

-- Fix chatbot_messages UPDATE policy (if not already fixed)
DROP POLICY IF EXISTS "Authenticated can update chatbot messages" ON chatbot_messages;

CREATE POLICY "chatbot_messages_update"
  ON chatbot_messages FOR UPDATE
  TO authenticated
  USING (
    (user_id IS NOT NULL AND user_id::uuid = auth.uid())
    OR is_admin()
  )
  WITH CHECK (
    (user_id IS NOT NULL AND user_id::uuid = auth.uid())
    OR is_admin()
  );

-- Fix conversations UPDATE policy
DROP POLICY IF EXISTS "allow_all_update_conversations" ON conversations;

CREATE POLICY "conversations_update"
  ON conversations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_messages cm
      WHERE cm.conversation_id = conversations.id
      AND cm.sender_id::uuid = auth.uid()
    )
    OR is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_messages cm
      WHERE cm.conversation_id = conversations.id
      AND cm.sender_id::uuid = auth.uid()
    )
    OR is_admin()
  );

-- Fix delivery_provider_registrations UPDATE policy
DROP POLICY IF EXISTS "delivery_reg_admin_update" ON delivery_provider_registrations;

CREATE POLICY "delivery_provider_registrations_update"
  ON delivery_provider_registrations FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Fix api_rate_limits UPDATE policy
DROP POLICY IF EXISTS "api_rate_limits_system_update" ON api_rate_limits;

CREATE POLICY "api_rate_limits_update"
  ON api_rate_limits FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Fix supplier_product_prices UPDATE policy
DROP POLICY IF EXISTS "Suppliers can update own prices" ON supplier_product_prices;

CREATE POLICY "supplier_product_prices_update"
  ON supplier_product_prices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = supplier_product_prices.supplier_id
      AND s.user_id = auth.uid()
    )
    OR is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = supplier_product_prices.supplier_id
      AND s.user_id = auth.uid()
    )
    OR is_admin()
  );

-- Fix material_qr_codes UPDATE policy (if separate from ALL)
DROP POLICY IF EXISTS "Suppliers can update own QR codes" ON material_qr_codes;

-- Note: This is already covered by the ALL policy fix above, but keeping for safety
-- If a separate UPDATE policy exists, it will be dropped and replaced

-- Fix monitoring_service_requests UPDATE policy (if separate from ALL)
DROP POLICY IF EXISTS "Anyone can update monitoring requests" ON monitoring_service_requests;

-- Note: This is already covered by the ALL policy fix above

-- =============================================
-- FIX DELETE POLICIES (1 warning)
-- =============================================

-- Fix job_applications DELETE policy
DROP POLICY IF EXISTS "Enable delete for all users" ON job_applications;

CREATE POLICY "job_applications_delete"
  ON job_applications FOR DELETE
  TO authenticated
  USING (is_admin());


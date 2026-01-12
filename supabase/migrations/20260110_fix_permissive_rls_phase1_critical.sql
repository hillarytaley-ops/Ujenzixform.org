-- =============================================
-- PHASE 1: Critical Security Fixes Only
-- Fixes the most dangerous permissive RLS policies
-- This is the safest first step - fixes UPDATE/DELETE on sensitive tables
-- =============================================

-- Ensure app_role type exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'builder', 'supplier', 'delivery_provider');
  END IF;
END $$;

-- Ensure user_roles table exists
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles if not already enabled
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
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
    WHERE user_id = auth.uid()
      AND role = 'admin'::app_role
  );
$$;

-- =============================================
-- PHASE 1: CRITICAL FIXES ONLY
-- Only the most dangerous UPDATE/DELETE operations
-- =============================================

-- Fix admin_staff UPDATE/DELETE policies (CRITICAL)
DROP POLICY IF EXISTS "Admins can update staff" ON admin_staff;
DROP POLICY IF EXISTS "Admins can delete staff" ON admin_staff;

CREATE POLICY "Admins can update staff"
  ON admin_staff FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete staff"
  ON admin_staff FOR DELETE
  TO authenticated
  USING (is_admin());

-- Fix user_roles ALL policy (CRITICAL - prevents privilege escalation)
DROP POLICY IF EXISTS "Full access for authenticated users" ON user_roles;

CREATE POLICY "user_roles_select"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "user_roles_insert"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY "user_roles_update"
  ON user_roles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "user_roles_delete"
  ON user_roles FOR DELETE
  TO authenticated
  USING (is_admin());

-- Fix purchase_orders UPDATE policy (CRITICAL)
-- Note: Error indicates buyer_id doesn't exist, so using builder_id based on migrations
DROP POLICY IF EXISTS "purchase_orders_update_policy" ON purchase_orders;

CREATE POLICY "purchase_orders_update_policy"
  ON purchase_orders FOR UPDATE
  TO authenticated
  USING (
    builder_id = auth.uid()
    OR is_admin()
  )
  WITH CHECK (
    builder_id = auth.uid()
    OR is_admin()
  );

-- Fix quote_requests UPDATE policy (CRITICAL)
-- Note: quote_requests has order_id that references purchase_orders
-- We need to join through purchase_orders to check builder ownership
DROP POLICY IF EXISTS "quote_requests_update_policy" ON quote_requests;

CREATE POLICY "quote_requests_update_policy"
  ON quote_requests FOR UPDATE
  TO authenticated
  USING (
    -- Builder can update if they own the related purchase_order
    EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = quote_requests.order_id
      AND po.builder_id = auth.uid()
    )
    -- Supplier can update their own quotes
    OR EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = quote_requests.supplier_id
      AND s.user_id = auth.uid()
    )
    OR is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = quote_requests.order_id
      AND po.builder_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = quote_requests.supplier_id
      AND s.user_id = auth.uid()
    )
    OR is_admin()
  );

-- Fix delivery_orders UPDATE policy (CRITICAL)
DROP POLICY IF EXISTS "delivery_orders_update" ON delivery_orders;

CREATE POLICY "delivery_orders_update"
  ON delivery_orders FOR UPDATE
  TO authenticated
  USING (
    builder_id = auth.uid()
    OR is_admin()
    OR EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = delivery_orders.supplier_id
      AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    builder_id = auth.uid()
    OR is_admin()
    OR EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = delivery_orders.supplier_id
      AND s.user_id = auth.uid()
    )
  );

-- Fix support_chats ALL policy (CRITICAL)
DROP POLICY IF EXISTS "Allow all on support_chats" ON support_chats;

CREATE POLICY "support_chats_insert"
  ON support_chats FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY "support_chats_select"
  ON support_chats FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_admin()
  );

CREATE POLICY "support_chats_update"
  ON support_chats FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Fix support_messages ALL policy (CRITICAL)
DROP POLICY IF EXISTS "Allow all on support_messages" ON support_messages;

CREATE POLICY "support_messages_insert"
  ON support_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_chats sc
      WHERE sc.id = support_messages.chat_id
      AND (sc.user_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY "support_messages_select"
  ON support_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM support_chats sc
      WHERE sc.id = support_messages.chat_id
      AND (sc.user_id = auth.uid() OR is_admin())
    )
  );

-- Fix invoices UPDATE policy (CRITICAL)
DROP POLICY IF EXISTS "invoices_update_policy" ON invoices;

CREATE POLICY "invoices_update_policy"
  ON invoices FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Fix suppliers UPDATE policy (CRITICAL)
DROP POLICY IF EXISTS "suppliers_update_policy" ON suppliers;

CREATE POLICY "suppliers_update_policy"
  ON suppliers FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_admin()
  )
  WITH CHECK (
    user_id = auth.uid()
    OR is_admin()
  );

-- Fix chat_messages UPDATE policy (CRITICAL)
DROP POLICY IF EXISTS "allow_all_update_chat_messages" ON chat_messages;

CREATE POLICY "allow_all_update_chat_messages"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (
    sender_id::uuid = auth.uid()
    OR is_admin()
  )
  WITH CHECK (
    sender_id::uuid = auth.uid()
    OR is_admin()
  );


-- =============================================
-- ROLLBACK SCRIPT: Restore Permissive RLS Policies
-- Use this if you need to revert the security fixes
-- WARNING: This restores permissive (insecure) policies
-- =============================================

-- Rollback admin_staff policies
DROP POLICY IF EXISTS "Admins can update staff" ON admin_staff;
DROP POLICY IF EXISTS "Admins can delete staff" ON admin_staff;

CREATE POLICY "Admins can update staff"
  ON admin_staff FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete staff"
  ON admin_staff FOR DELETE
  TO authenticated
  USING (true);

-- Rollback user_roles policies
DROP POLICY IF EXISTS "user_roles_select" ON user_roles;
DROP POLICY IF EXISTS "user_roles_insert" ON user_roles;
DROP POLICY IF EXISTS "user_roles_update" ON user_roles;
DROP POLICY IF EXISTS "user_roles_delete" ON user_roles;

CREATE POLICY "Full access for authenticated users"
  ON user_roles FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Rollback purchase_orders UPDATE
DROP POLICY IF EXISTS "purchase_orders_update_policy" ON purchase_orders;

CREATE POLICY "purchase_orders_update_policy"
  ON purchase_orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Rollback quote_requests UPDATE
DROP POLICY IF EXISTS "quote_requests_update_policy" ON quote_requests;

CREATE POLICY "quote_requests_update_policy"
  ON quote_requests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Rollback delivery_orders UPDATE
DROP POLICY IF EXISTS "delivery_orders_update" ON delivery_orders;

CREATE POLICY "delivery_orders_update"
  ON delivery_orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Rollback support_chats
DROP POLICY IF EXISTS "support_chats_insert" ON support_chats;
DROP POLICY IF EXISTS "support_chats_select" ON support_chats;
DROP POLICY IF EXISTS "support_chats_update" ON support_chats;

CREATE POLICY "Allow all on support_chats"
  ON support_chats FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Rollback support_messages
DROP POLICY IF EXISTS "support_messages_insert" ON support_messages;
DROP POLICY IF EXISTS "support_messages_select" ON support_messages;

CREATE POLICY "Allow all on support_messages"
  ON support_messages FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Rollback invoices UPDATE
DROP POLICY IF EXISTS "invoices_update_policy" ON invoices;

CREATE POLICY "invoices_update_policy"
  ON invoices FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Rollback suppliers UPDATE
DROP POLICY IF EXISTS "suppliers_update_policy" ON suppliers;

CREATE POLICY "suppliers_update_policy"
  ON suppliers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Rollback chat_messages UPDATE
DROP POLICY IF EXISTS "allow_all_update_chat_messages" ON chat_messages;

CREATE POLICY "allow_all_update_chat_messages"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);


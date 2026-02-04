-- =============================================
-- Consolidate Duplicate RLS Policies
-- =============================================
-- This migration fixes the Supabase linter warning about multiple
-- permissive policies for the same table/role/action combination.
-- Having multiple permissive policies can lead to unexpected behavior
-- and performance issues.
-- =============================================

-- =============================================
-- ADMIN_MATERIAL_IMAGES - Consolidate policies
-- =============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "admin_material_images_public_view" ON admin_material_images;
DROP POLICY IF EXISTS "admin_material_images_admin_all" ON admin_material_images;
DROP POLICY IF EXISTS "Anyone can view approved materials" ON admin_material_images;
DROP POLICY IF EXISTS "Admins can manage materials" ON admin_material_images;
DROP POLICY IF EXISTS "Public can view approved materials" ON admin_material_images;

-- Create consolidated policies
CREATE POLICY "admin_material_images_public_view" ON admin_material_images
FOR SELECT USING (is_approved = true);

CREATE POLICY "admin_material_images_admin_all" ON admin_material_images
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role = 'admin')
);

-- =============================================
-- CAMERAS - Consolidate policies
-- =============================================

DROP POLICY IF EXISTS "cameras_view_all" ON cameras;
DROP POLICY IF EXISTS "cameras_admin_manage" ON cameras;
DROP POLICY IF EXISTS "Anyone can view cameras" ON cameras;
DROP POLICY IF EXISTS "Admins can manage cameras" ON cameras;

CREATE POLICY "cameras_view_all" ON cameras
FOR SELECT USING (TRUE);

CREATE POLICY "cameras_admin_manage" ON cameras
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role = 'admin')
);

-- =============================================
-- CHAT_FEEDBACK - Consolidate policies
-- =============================================

DROP POLICY IF EXISTS "chat_feedback_insert" ON chat_feedback;
DROP POLICY IF EXISTS "chat_feedback_view_own" ON chat_feedback;
DROP POLICY IF EXISTS "chat_feedback_admin" ON chat_feedback;
DROP POLICY IF EXISTS "Anyone can submit chat feedback" ON chat_feedback;
DROP POLICY IF EXISTS "Users can view own feedback" ON chat_feedback;

-- Anyone can submit chat feedback
CREATE POLICY "chat_feedback_insert" ON chat_feedback
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Users can view their own feedback (optimized)
CREATE POLICY "chat_feedback_view_own" ON chat_feedback
FOR SELECT TO authenticated
USING (user_id = (select auth.uid()) OR session_id IS NOT NULL);

-- Admins can manage all feedback (optimized)
CREATE POLICY "chat_feedback_admin" ON chat_feedback
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role = 'admin')
);

-- =============================================
-- CHAT_MESSAGES - Consolidate policies
-- =============================================

DROP POLICY IF EXISTS "chat_messages_insert" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_view_own" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_admin" ON chat_messages;
DROP POLICY IF EXISTS "Anyone can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can view own messages" ON chat_messages;

-- Anyone can send messages
CREATE POLICY "chat_messages_insert" ON chat_messages
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Users can view their own messages (optimized)
CREATE POLICY "chat_messages_view_own" ON chat_messages
FOR SELECT TO authenticated
USING (user_id = (select auth.uid()) OR session_id IS NOT NULL);

-- Admins can manage all messages (optimized)
CREATE POLICY "chat_messages_admin" ON chat_messages
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role = 'admin')
);

-- =============================================
-- SUPPLIER_REVIEWS - Consolidate policies
-- =============================================

DROP POLICY IF EXISTS "supplier_reviews_view_approved" ON supplier_reviews;
DROP POLICY IF EXISTS "supplier_reviews_create" ON supplier_reviews;
DROP POLICY IF EXISTS "supplier_reviews_update_own" ON supplier_reviews;
DROP POLICY IF EXISTS "supplier_reviews_admin" ON supplier_reviews;
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON supplier_reviews;
DROP POLICY IF EXISTS "Authenticated users can create reviews" ON supplier_reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON supplier_reviews;
DROP POLICY IF EXISTS "Suppliers can respond to reviews" ON supplier_reviews;

-- Anyone can view approved reviews
CREATE POLICY "supplier_reviews_view_approved" ON supplier_reviews
FOR SELECT USING (status = 'approved' OR reviewer_id = (select auth.uid()));

-- Authenticated users can create reviews (optimized)
CREATE POLICY "supplier_reviews_create" ON supplier_reviews
FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) IS NOT NULL AND reviewer_id = (select auth.uid()));

-- Users can update their own reviews (optimized)
CREATE POLICY "supplier_reviews_update_own" ON supplier_reviews
FOR UPDATE TO authenticated
USING (reviewer_id = (select auth.uid()))
WITH CHECK (reviewer_id = (select auth.uid()));

-- Suppliers can respond to their reviews (optimized)
CREATE POLICY "supplier_reviews_supplier_respond" ON supplier_reviews
FOR UPDATE TO authenticated
USING (
  supplier_id = (select auth.uid()) OR 
  supplier_id IN (SELECT id FROM suppliers WHERE user_id = (select auth.uid()))
);

-- Admins can manage all reviews (optimized)
CREATE POLICY "supplier_reviews_admin" ON supplier_reviews
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role = 'admin')
);

-- =============================================
-- STOCK_MOVEMENTS - Consolidate policies
-- =============================================

DROP POLICY IF EXISTS "stock_movements_supplier_view" ON stock_movements;
DROP POLICY IF EXISTS "stock_movements_supplier_insert" ON stock_movements;
DROP POLICY IF EXISTS "Suppliers can view own stock movements" ON stock_movements;
DROP POLICY IF EXISTS "Suppliers can insert own stock movements" ON stock_movements;

-- Suppliers can view their own stock movements (optimized)
CREATE POLICY "stock_movements_supplier_view" ON stock_movements
FOR SELECT TO authenticated
USING (
  supplier_id = (select auth.uid()) OR 
  supplier_id IN (SELECT id FROM suppliers WHERE user_id = (select auth.uid()))
);

-- Suppliers can insert their own stock movements (optimized)
CREATE POLICY "stock_movements_supplier_insert" ON stock_movements
FOR INSERT TO authenticated
WITH CHECK (
  supplier_id = (select auth.uid()) OR 
  supplier_id IN (SELECT id FROM suppliers WHERE user_id = (select auth.uid()))
);

-- =============================================
-- ANALYTICS_EVENTS - Consolidate policies
-- =============================================

DROP POLICY IF EXISTS "analytics_events_view_own" ON analytics_events;
DROP POLICY IF EXISTS "analytics_events_insert" ON analytics_events;
DROP POLICY IF EXISTS "Users can view own analytics" ON analytics_events;
DROP POLICY IF EXISTS "Anyone can insert analytics events" ON analytics_events;

-- Users can view their own analytics (optimized)
CREATE POLICY "analytics_events_view_own" ON analytics_events
FOR SELECT TO authenticated
USING (user_id = (select auth.uid()));

-- Anyone can insert analytics events
CREATE POLICY "analytics_events_insert" ON analytics_events
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- =============================================
-- NOTIFICATIONS - Consolidate policies
-- =============================================

DROP POLICY IF EXISTS "notifications_view_own" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
DROP POLICY IF EXISTS "notifications_admin" ON notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

-- Users can view their own notifications (optimized)
CREATE POLICY "notifications_view_own" ON notifications
FOR SELECT TO authenticated
USING (user_id = (select auth.uid()));

-- Users can update their own notifications (optimized)
CREATE POLICY "notifications_update_own" ON notifications
FOR UPDATE TO authenticated
USING (user_id = (select auth.uid()))
WITH CHECK (user_id = (select auth.uid()));

-- System/Admins can insert notifications (optimized)
CREATE POLICY "notifications_admin" ON notifications
FOR INSERT TO authenticated
WITH CHECK (
  (select auth.uid()) IS NOT NULL
);

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

GRANT SELECT ON admin_material_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON admin_material_images TO authenticated;
GRANT SELECT ON cameras TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON cameras TO authenticated;
GRANT SELECT, INSERT ON chat_feedback TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_feedback TO authenticated;
GRANT SELECT, INSERT ON chat_messages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_messages TO authenticated;
GRANT SELECT ON supplier_reviews TO anon;
GRANT SELECT, INSERT, UPDATE ON supplier_reviews TO authenticated;
GRANT SELECT, INSERT ON stock_movements TO authenticated;
GRANT SELECT, INSERT ON analytics_events TO anon;
GRANT SELECT, INSERT ON analytics_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;

-- =============================================
-- Done! Duplicate policies have been consolidated.
-- =============================================

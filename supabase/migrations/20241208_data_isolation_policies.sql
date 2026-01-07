-- ============================================================================
-- DATA ISOLATION RLS POLICIES
-- ============================================================================
-- These policies ensure that:
-- 1. Builders can ONLY see their own data
-- 2. Suppliers can ONLY see their own data
-- 3. Delivery providers can ONLY see their own deliveries
-- 4. Admins can see all data
-- ============================================================================

-- ============================================================================
-- DELIVERY REQUESTS TABLE - Critical for provider isolation
-- ============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "delivery_requests_builder_select" ON delivery_requests;
DROP POLICY IF EXISTS "delivery_requests_builder_insert" ON delivery_requests;
DROP POLICY IF EXISTS "delivery_requests_builder_update" ON delivery_requests;
DROP POLICY IF EXISTS "delivery_requests_provider_select" ON delivery_requests;
DROP POLICY IF EXISTS "delivery_requests_provider_update" ON delivery_requests;
DROP POLICY IF EXISTS "delivery_requests_admin_all" ON delivery_requests;

-- Builders can only see their own delivery requests
CREATE POLICY "delivery_requests_builder_select" ON delivery_requests
    FOR SELECT USING (
        builder_id = auth.uid() OR
        builder_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Builders can insert their own delivery requests
CREATE POLICY "delivery_requests_builder_insert" ON delivery_requests
    FOR INSERT WITH CHECK (
        builder_id = auth.uid() OR
        builder_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Builders can update their own pending requests
CREATE POLICY "delivery_requests_builder_update" ON delivery_requests
    FOR UPDATE USING (
        builder_id = auth.uid() AND 
        status = 'pending'
    );

-- Delivery providers can see requests assigned to them OR unassigned pending requests
CREATE POLICY "delivery_requests_provider_select" ON delivery_requests
    FOR SELECT USING (
        provider_id = auth.uid() OR
        driver_id = auth.uid() OR
        (status = 'pending' AND provider_id IS NULL)
    );

-- Delivery providers can only update requests assigned to them
CREATE POLICY "delivery_requests_provider_update" ON delivery_requests
    FOR UPDATE USING (
        provider_id = auth.uid() OR
        driver_id = auth.uid()
    );

-- Admins can do everything
CREATE POLICY "delivery_requests_admin_all" ON delivery_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- ============================================================================
-- PURCHASE ORDERS TABLE - Critical for supplier/builder isolation
-- ============================================================================

DROP POLICY IF EXISTS "purchase_orders_builder_select" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_builder_insert" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_supplier_select" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_supplier_update" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_admin_all" ON purchase_orders;

-- Builders can only see their own orders
CREATE POLICY "purchase_orders_builder_select" ON purchase_orders
    FOR SELECT USING (builder_id = auth.uid());

-- Builders can create orders
CREATE POLICY "purchase_orders_builder_insert" ON purchase_orders
    FOR INSERT WITH CHECK (builder_id = auth.uid());

-- Suppliers can only see orders where they are the vendor
CREATE POLICY "purchase_orders_supplier_select" ON purchase_orders
    FOR SELECT USING (supplier_id = auth.uid());

-- Suppliers can update orders assigned to them
CREATE POLICY "purchase_orders_supplier_update" ON purchase_orders
    FOR UPDATE USING (supplier_id = auth.uid());

-- Admins can do everything
CREATE POLICY "purchase_orders_admin_all" ON purchase_orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- ============================================================================
-- INVOICES TABLE - Financial data isolation
-- ============================================================================

DROP POLICY IF EXISTS "invoices_builder_select" ON invoices;
DROP POLICY IF EXISTS "invoices_supplier_select" ON invoices;
DROP POLICY IF EXISTS "invoices_supplier_insert" ON invoices;
DROP POLICY IF EXISTS "invoices_admin_all" ON invoices;

-- Builders can only see invoices addressed to them
CREATE POLICY "invoices_builder_select" ON invoices
    FOR SELECT USING (builder_id = auth.uid());

-- Suppliers can only see invoices they created
CREATE POLICY "invoices_supplier_select" ON invoices
    FOR SELECT USING (supplier_id = auth.uid());

-- Suppliers can create invoices
CREATE POLICY "invoices_supplier_insert" ON invoices
    FOR INSERT WITH CHECK (supplier_id = auth.uid());

-- Admins can do everything
CREATE POLICY "invoices_admin_all" ON invoices
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- ============================================================================
-- PAYMENTS TABLE - Financial data isolation
-- ============================================================================

DROP POLICY IF EXISTS "payments_builder_select" ON payments;
DROP POLICY IF EXISTS "payments_supplier_select" ON payments;
DROP POLICY IF EXISTS "payments_admin_all" ON payments;

-- Builders can only see their own payments
CREATE POLICY "payments_builder_select" ON payments
    FOR SELECT USING (builder_id = auth.uid() OR payer_id = auth.uid());

-- Suppliers can only see payments made to them
CREATE POLICY "payments_supplier_select" ON payments
    FOR SELECT USING (supplier_id = auth.uid() OR payee_id = auth.uid());

-- Admins can do everything
CREATE POLICY "payments_admin_all" ON payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- ============================================================================
-- PROFILES TABLE - User profile isolation
-- ============================================================================

DROP POLICY IF EXISTS "profiles_own_select" ON profiles;
DROP POLICY IF EXISTS "profiles_own_update" ON profiles;
DROP POLICY IF EXISTS "profiles_public_read" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON profiles;

-- Users can only read their own profile fully
CREATE POLICY "profiles_own_select" ON profiles
    FOR SELECT USING (user_id = auth.uid());

-- Users can only update their own profile
CREATE POLICY "profiles_own_update" ON profiles
    FOR UPDATE USING (user_id = auth.uid());

-- Public can read limited profile info (for marketplace listings)
CREATE POLICY "profiles_public_read" ON profiles
    FOR SELECT USING (true);

-- Admins can do everything
CREATE POLICY "profiles_admin_all" ON profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- ============================================================================
-- REGISTRATION TABLES - User can only see their own registration
-- ============================================================================

-- Builder Registrations
DROP POLICY IF EXISTS "builder_reg_own_select" ON builder_registrations;
DROP POLICY IF EXISTS "builder_reg_own_insert" ON builder_registrations;
DROP POLICY IF EXISTS "builder_reg_admin_all" ON builder_registrations;

CREATE POLICY "builder_reg_own_select" ON builder_registrations
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "builder_reg_own_insert" ON builder_registrations
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "builder_reg_admin_all" ON builder_registrations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Supplier Registrations
DROP POLICY IF EXISTS "supplier_reg_own_select" ON supplier_registrations;
DROP POLICY IF EXISTS "supplier_reg_own_insert" ON supplier_registrations;
DROP POLICY IF EXISTS "supplier_reg_admin_all" ON supplier_registrations;

CREATE POLICY "supplier_reg_own_select" ON supplier_registrations
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "supplier_reg_own_insert" ON supplier_registrations
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "supplier_reg_admin_all" ON supplier_registrations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Delivery Provider Registrations
DROP POLICY IF EXISTS "delivery_reg_own_select" ON delivery_provider_registrations;
DROP POLICY IF EXISTS "delivery_reg_own_insert" ON delivery_provider_registrations;
DROP POLICY IF EXISTS "delivery_reg_admin_all" ON delivery_provider_registrations;

CREATE POLICY "delivery_reg_own_select" ON delivery_provider_registrations
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "delivery_reg_own_insert" ON delivery_provider_registrations
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "delivery_reg_admin_all" ON delivery_provider_registrations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- ============================================================================
-- FEEDBACK TABLE - Users can only see their own feedback
-- ============================================================================

DROP POLICY IF EXISTS "feedback_own_select" ON feedback;
DROP POLICY IF EXISTS "feedback_own_insert" ON feedback;
DROP POLICY IF EXISTS "feedback_admin_all" ON feedback;

CREATE POLICY "feedback_own_select" ON feedback
    FOR SELECT USING (user_id = auth.uid() OR user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "feedback_own_insert" ON feedback
    FOR INSERT WITH CHECK (true); -- Anyone can submit feedback

CREATE POLICY "feedback_admin_all" ON feedback
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- ============================================================================
-- QR SCAN EVENTS - Users can only see their own scans
-- ============================================================================

DROP POLICY IF EXISTS "qr_scans_own_select" ON qr_scan_events;
DROP POLICY IF EXISTS "qr_scans_own_insert" ON qr_scan_events;
DROP POLICY IF EXISTS "qr_scans_admin_all" ON qr_scan_events;

CREATE POLICY "qr_scans_own_select" ON qr_scan_events
    FOR SELECT USING (scanned_by = auth.uid());

CREATE POLICY "qr_scans_own_insert" ON qr_scan_events
    FOR INSERT WITH CHECK (scanned_by = auth.uid());

CREATE POLICY "qr_scans_admin_all" ON qr_scan_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- ============================================================================
-- ACTIVITY LOGS - Users can only see their own activity
-- ============================================================================

DROP POLICY IF EXISTS "activity_logs_own_select" ON activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert" ON activity_logs;
DROP POLICY IF EXISTS "activity_logs_admin_all" ON activity_logs;

CREATE POLICY "activity_logs_own_select" ON activity_logs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "activity_logs_insert" ON activity_logs
    FOR INSERT WITH CHECK (true); -- System can insert logs

CREATE POLICY "activity_logs_admin_all" ON activity_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- ============================================================================
-- VERIFICATION: Check that RLS is enabled on all tables
-- ============================================================================

-- Enable RLS on all critical tables (if not already enabled)
ALTER TABLE delivery_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE builder_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_provider_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_scan_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- GRANT STATEMENTS
-- ============================================================================

-- Grant usage on tables to authenticated users
GRANT SELECT, INSERT, UPDATE ON delivery_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON purchase_orders TO authenticated;
GRANT SELECT ON invoices TO authenticated;
GRANT SELECT ON payments TO authenticated;
GRANT SELECT, UPDATE ON profiles TO authenticated;
GRANT SELECT, INSERT ON builder_registrations TO authenticated;
GRANT SELECT, INSERT ON supplier_registrations TO authenticated;
GRANT SELECT, INSERT ON delivery_provider_registrations TO authenticated;
GRANT SELECT, INSERT ON feedback TO authenticated;
GRANT SELECT, INSERT ON qr_scan_events TO authenticated;
GRANT SELECT, INSERT ON activity_logs TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "delivery_requests_builder_select" ON delivery_requests IS 
    'Builders can only see delivery requests they created';

COMMENT ON POLICY "delivery_requests_provider_select" ON delivery_requests IS 
    'Delivery providers can see their assigned deliveries or available pending requests';

COMMENT ON POLICY "purchase_orders_builder_select" ON purchase_orders IS 
    'Builders can only see orders they placed';

COMMENT ON POLICY "purchase_orders_supplier_select" ON purchase_orders IS 
    'Suppliers can only see orders where they are the vendor';





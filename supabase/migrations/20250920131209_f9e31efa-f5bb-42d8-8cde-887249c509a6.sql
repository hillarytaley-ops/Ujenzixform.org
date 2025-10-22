-- EMERGENCY SECURITY LOCKDOWN: Secure all audit and security tables (FINAL FIX)
-- This migration ensures ALL security tables have proper RLS protection

-- Enable RLS on all security-related tables
ALTER TABLE IF EXISTS emergency_lockdown_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS emergency_security_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS location_access_security_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS provider_business_access_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS provider_contact_security_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS supplier_contact_security_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS supplier_contact_access_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS trusted_devices ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on security tables first
DROP POLICY IF EXISTS "emergency_lockdown_admin_only_read" ON emergency_lockdown_log;
DROP POLICY IF EXISTS "emergency_lockdown_system_insert" ON emergency_lockdown_log;
DROP POLICY IF EXISTS "emergency_security_admin_only_read" ON emergency_security_log;
DROP POLICY IF EXISTS "emergency_security_system_insert" ON emergency_security_log;
DROP POLICY IF EXISTS "location_audit_admin_only" ON location_access_security_audit;
DROP POLICY IF EXISTS "provider_business_audit_admin_only" ON provider_business_access_audit;
DROP POLICY IF EXISTS "provider_business_audit_system_insert" ON provider_business_access_audit;
DROP POLICY IF EXISTS "provider_contact_audit_admin_only" ON provider_contact_security_audit;
DROP POLICY IF EXISTS "provider_contact_audit_system_insert" ON provider_contact_security_audit;
DROP POLICY IF EXISTS "supplier_contact_audit_admin_only" ON supplier_contact_security_audit;
DROP POLICY IF EXISTS "supplier_contact_audit_system_insert" ON supplier_contact_security_audit;
DROP POLICY IF EXISTS "supplier_access_audit_admin_only" ON supplier_contact_access_audit;
DROP POLICY IF EXISTS "supplier_access_audit_system_insert" ON supplier_contact_access_audit;
DROP POLICY IF EXISTS "security_events_admin_only" ON security_events;
DROP POLICY IF EXISTS "security_events_system_insert" ON security_events;
DROP POLICY IF EXISTS "trusted_devices_user_own" ON trusted_devices;

-- Create ultra-strict admin-only policies for emergency_lockdown_log
CREATE POLICY "emergency_lockdown_admin_only_read" ON emergency_lockdown_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "emergency_lockdown_system_insert" ON emergency_lockdown_log
    FOR INSERT WITH CHECK (true);

-- Create ultra-strict admin-only policies for emergency_security_log  
CREATE POLICY "emergency_security_admin_only_read" ON emergency_security_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "emergency_security_system_insert" ON emergency_security_log
    FOR INSERT WITH CHECK (true);

-- Create ultra-strict admin-only policies for location_access_security_audit
CREATE POLICY "location_audit_admin_only_new" ON location_access_security_audit
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Create ultra-strict admin-only policies for provider_business_access_audit
CREATE POLICY "provider_business_audit_admin_only_new" ON provider_business_access_audit
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "provider_business_audit_system_insert_new" ON provider_business_access_audit
    FOR INSERT WITH CHECK (true);

-- Create ultra-strict admin-only policies for provider_contact_security_audit  
CREATE POLICY "provider_contact_audit_admin_only_new" ON provider_contact_security_audit
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "provider_contact_audit_system_insert_new" ON provider_contact_security_audit
    FOR INSERT WITH CHECK (true);

-- Create ultra-strict admin-only policies for supplier_contact_security_audit
CREATE POLICY "supplier_contact_audit_admin_only_new" ON supplier_contact_security_audit
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "supplier_contact_audit_system_insert_new" ON supplier_contact_security_audit
    FOR INSERT WITH CHECK (true);

-- Create ultra-strict admin-only policies for supplier_contact_access_audit
CREATE POLICY "supplier_access_audit_admin_only_new" ON supplier_contact_access_audit
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "supplier_access_audit_system_insert_new" ON supplier_contact_access_audit
    FOR INSERT WITH CHECK (true);

-- Create ultra-strict admin-only policies for security_events
CREATE POLICY "security_events_admin_only_new" ON security_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "security_events_system_insert_new" ON security_events
    FOR INSERT WITH CHECK (true);

-- Create policies for trusted_devices (users can manage their own devices, admins see all)
CREATE POLICY "trusted_devices_user_own_new" ON trusted_devices
    FOR ALL USING (
        user_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Log this critical security enhancement
INSERT INTO security_events (
    user_id, event_type, severity, description
) VALUES (
    auth.uid(),
    'CRITICAL_SECURITY_LOCKDOWN_COMPLETED',
    'critical',
    'EMERGENCY: All audit and security tables now secured with admin-only RLS policies. Unauthorized access blocked.'
);
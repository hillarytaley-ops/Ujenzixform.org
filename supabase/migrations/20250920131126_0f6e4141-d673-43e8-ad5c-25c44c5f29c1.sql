-- EMERGENCY SECURITY LOCKDOWN: Secure all audit and security tables (FINAL)
-- This migration ensures ALL security tables have proper RLS protection

-- First, enable RLS on all security-related tables
ALTER TABLE IF EXISTS emergency_lockdown_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS emergency_security_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS location_access_security_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS provider_business_access_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS provider_contact_security_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS supplier_contact_security_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS supplier_contact_access_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS trusted_devices ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on these tables to start fresh
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- Drop all policies on emergency_lockdown_log
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'emergency_lockdown_log') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON emergency_lockdown_log', r.policyname);
    END LOOP;
    
    -- Drop all policies on emergency_security_log
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'emergency_security_log') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON emergency_security_log', r.policyname);
    END LOOP;
    
    -- Drop all policies on location_access_security_audit
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'location_access_security_audit') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON location_access_security_audit', r.policyname);
    END LOOP;
    
    -- Drop all policies on provider_business_access_audit
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'provider_business_access_audit') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON provider_business_access_audit', r.policyname);
    END LOOP;
    
    -- Drop all policies on provider_contact_security_audit
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'provider_contact_security_audit') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON provider_contact_security_audit', r.policyname);
    END LOOP;
    
    -- Drop all policies on supplier_contact_security_audit
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'supplier_contact_security_audit') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON supplier_contact_security_audit', r.policyname);
    END LOOP;
    
    -- Drop all policies on supplier_contact_access_audit
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'supplier_contact_access_audit') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON supplier_contact_access_audit', r.policyname);
    END LOOP;
    
    -- Drop all policies on security_events
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'security_events') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON security_events', r.policyname);
    END LOOP;
    
    -- Drop all policies on trusted_devices
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'trusted_devices') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON trusted_devices', r.policyname);
    END LOOP;
END $$;

-- Now create ultra-strict admin-only policies

-- emergency_lockdown_log: Admin read, system insert
CREATE POLICY "lockdown_log_admin_read" ON emergency_lockdown_log
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "lockdown_log_system_insert" ON emergency_lockdown_log
    FOR INSERT WITH CHECK (true);

-- emergency_security_log: Admin read, system insert
CREATE POLICY "security_log_admin_read" ON emergency_security_log
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "security_log_system_insert" ON emergency_security_log
    FOR INSERT WITH CHECK (true);

-- location_access_security_audit: Admin only
CREATE POLICY "location_audit_admin_access" ON location_access_security_audit
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- provider_business_access_audit: Admin read, system insert
CREATE POLICY "provider_business_audit_admin_read" ON provider_business_access_audit
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "provider_business_audit_system_insert" ON provider_business_access_audit
    FOR INSERT WITH CHECK (true);

-- provider_contact_security_audit: Admin read, system insert
CREATE POLICY "provider_contact_audit_admin_read" ON provider_contact_security_audit
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "provider_contact_audit_system_insert" ON provider_contact_security_audit
    FOR INSERT WITH CHECK (true);

-- supplier_contact_security_audit: Admin read, system insert
CREATE POLICY "supplier_contact_audit_admin_read" ON supplier_contact_security_audit
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "supplier_contact_audit_system_insert" ON supplier_contact_security_audit
    FOR INSERT WITH CHECK (true);

-- supplier_contact_access_audit: Admin read, system insert
CREATE POLICY "supplier_access_audit_admin_read" ON supplier_contact_access_audit
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "supplier_access_audit_system_insert" ON supplier_contact_access_audit
    FOR INSERT WITH CHECK (true);

-- security_events: Admin read, system insert
CREATE POLICY "security_events_admin_read" ON security_events
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "security_events_system_insert" ON security_events
    FOR INSERT WITH CHECK (true);

-- trusted_devices: Users own devices, admins all
CREATE POLICY "trusted_devices_access" ON trusted_devices
    FOR ALL USING (
        user_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- Create security function for logging violations
CREATE OR REPLACE FUNCTION log_security_violation(
    violation_type text,
    table_name text,
    details text DEFAULT 'Unauthorized access attempt'
)
RETURNS void AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role FROM profiles WHERE user_id = auth.uid();
    
    INSERT INTO emergency_security_log (
        user_id, event_type, event_data, risk_level
    ) VALUES (
        auth.uid(),
        violation_type,
        format('SECURITY: %s - Table: %s, Role: %s, Details: %s', 
               violation_type, table_name, COALESCE(user_role, 'unknown'), details),
        'critical'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Log completion of security lockdown
INSERT INTO security_events (
    user_id, event_type, severity, description
) VALUES (
    auth.uid(),
    'audit_tables_security_lockdown_complete',
    'high',
    'All audit and security tables now secured with admin-only RLS policies'
);
-- EMERGENCY SECURITY LOCKDOWN: Secure all audit and security tables (SIMPLIFIED)
-- This migration ensures ALL security tables have proper RLS protection

-- Enable RLS on all security-related tables that exist
DO $$
BEGIN
    -- Enable RLS on existing security tables
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'emergency_lockdown_log') THEN
        ALTER TABLE emergency_lockdown_log ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'emergency_security_log') THEN
        ALTER TABLE emergency_security_log ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'location_access_security_audit') THEN
        ALTER TABLE location_access_security_audit ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'provider_business_access_audit') THEN
        ALTER TABLE provider_business_access_audit ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'provider_contact_security_audit') THEN
        ALTER TABLE provider_contact_security_audit ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'supplier_contact_security_audit') THEN
        ALTER TABLE supplier_contact_security_audit ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'supplier_contact_access_audit') THEN
        ALTER TABLE supplier_contact_access_audit ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'security_events') THEN
        ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'trusted_devices') THEN
        ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Drop ALL existing policies on security tables to avoid conflicts
DROP POLICY IF EXISTS "emergency_lockdown_admin_only_read" ON emergency_lockdown_log;
DROP POLICY IF EXISTS "emergency_lockdown_system_insert" ON emergency_lockdown_log;
DROP POLICY IF EXISTS "emergency_security_admin_only_read" ON emergency_security_log;
DROP POLICY IF EXISTS "emergency_security_system_insert" ON emergency_security_log;
DROP POLICY IF EXISTS "location_audit_admin_only" ON location_access_security_audit;
DROP POLICY IF EXISTS "location_audit_admin_only_new" ON location_access_security_audit;
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

-- Create function to check if user is admin (avoids recursion)
CREATE OR REPLACE FUNCTION is_admin_user_secure()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Create ultra-strict admin-only policies
DO $$
BEGIN
    -- Emergency lockdown log policies
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'emergency_lockdown_log') THEN
        EXECUTE 'CREATE POLICY "emergency_lockdown_admin_read" ON emergency_lockdown_log FOR SELECT USING (is_admin_user_secure())';
        EXECUTE 'CREATE POLICY "emergency_lockdown_system_write" ON emergency_lockdown_log FOR INSERT WITH CHECK (true)';
    END IF;
    
    -- Emergency security log policies
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'emergency_security_log') THEN
        EXECUTE 'CREATE POLICY "emergency_security_admin_read" ON emergency_security_log FOR SELECT USING (is_admin_user_secure())';
        EXECUTE 'CREATE POLICY "emergency_security_system_write" ON emergency_security_log FOR INSERT WITH CHECK (true)';
    END IF;
    
    -- Location audit policies
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'location_access_security_audit') THEN
        EXECUTE 'CREATE POLICY "location_audit_admin_access" ON location_access_security_audit FOR ALL USING (is_admin_user_secure())';
    END IF;
    
    -- Provider business audit policies
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'provider_business_access_audit') THEN
        EXECUTE 'CREATE POLICY "provider_business_audit_admin_read" ON provider_business_access_audit FOR SELECT USING (is_admin_user_secure())';
        EXECUTE 'CREATE POLICY "provider_business_audit_system_write" ON provider_business_access_audit FOR INSERT WITH CHECK (true)';
    END IF;
    
    -- Provider contact audit policies
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'provider_contact_security_audit') THEN
        EXECUTE 'CREATE POLICY "provider_contact_audit_admin_read" ON provider_contact_security_audit FOR SELECT USING (is_admin_user_secure())';
        EXECUTE 'CREATE POLICY "provider_contact_audit_system_write" ON provider_contact_security_audit FOR INSERT WITH CHECK (true)';
    END IF;
    
    -- Supplier contact audit policies
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'supplier_contact_security_audit') THEN
        EXECUTE 'CREATE POLICY "supplier_contact_audit_admin_read" ON supplier_contact_security_audit FOR SELECT USING (is_admin_user_secure())';
        EXECUTE 'CREATE POLICY "supplier_contact_audit_system_write" ON supplier_contact_security_audit FOR INSERT WITH CHECK (true)';
    END IF;
    
    -- Supplier access audit policies
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'supplier_contact_access_audit') THEN
        EXECUTE 'CREATE POLICY "supplier_access_audit_admin_read" ON supplier_contact_access_audit FOR SELECT USING (is_admin_user_secure())';
        EXECUTE 'CREATE POLICY "supplier_access_audit_system_write" ON supplier_contact_access_audit FOR INSERT WITH CHECK (true)';
    END IF;
    
    -- Security events policies
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'security_events') THEN
        EXECUTE 'CREATE POLICY "security_events_admin_read" ON security_events FOR SELECT USING (is_admin_user_secure())';
        EXECUTE 'CREATE POLICY "security_events_system_write" ON security_events FOR INSERT WITH CHECK (true)';
    END IF;
    
    -- Trusted devices policies (users own + admin)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'trusted_devices') THEN
        EXECUTE 'CREATE POLICY "trusted_devices_secure_access" ON trusted_devices FOR ALL USING (user_id = auth.uid() OR is_admin_user_secure())';
    END IF;
END $$;

-- Create comprehensive security verification query
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as "RLS_ENABLED"
FROM pg_tables 
WHERE schemaname = 'public' 
    AND (tablename LIKE '%audit%' 
         OR tablename LIKE '%log%' 
         OR tablename LIKE '%security%'
         OR tablename = 'trusted_devices')
ORDER BY tablename;
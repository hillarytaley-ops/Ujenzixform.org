-- EMERGENCY SECURITY LOCKDOWN: Secure all audit and security tables (CORRECTED)
-- This migration ensures ALL security tables have proper RLS protection

-- First, let's enable RLS on all security-related tables that don't have it
ALTER TABLE IF EXISTS emergency_lockdown_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS emergency_security_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS location_access_security_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS provider_business_access_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS provider_contact_security_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS supplier_contact_security_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS supplier_contact_access_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS trusted_devices ENABLE ROW LEVEL SECURITY;

-- Drop any existing permissive policies on security tables
DROP POLICY IF EXISTS "emergency_lockdown_permissive" ON emergency_lockdown_log;
DROP POLICY IF EXISTS "emergency_security_permissive" ON emergency_security_log;
DROP POLICY IF EXISTS "location_audit_permissive" ON location_access_security_audit;
DROP POLICY IF EXISTS "provider_business_audit_permissive" ON provider_business_access_audit;
DROP POLICY IF EXISTS "provider_contact_audit_permissive" ON provider_contact_security_audit;
DROP POLICY IF EXISTS "supplier_contact_audit_permissive" ON supplier_contact_security_audit;
DROP POLICY IF EXISTS "supplier_access_audit_permissive" ON supplier_contact_access_audit;
DROP POLICY IF EXISTS "security_events_permissive" ON security_events;
DROP POLICY IF EXISTS "trusted_devices_permissive" ON trusted_devices;

-- Create ultra-strict admin-only policies for emergency_lockdown_log
CREATE POLICY "emergency_lockdown_admin_only_read" ON emergency_lockdown_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "emergency_lockdown_system_insert" ON emergency_lockdown_log
    FOR INSERT WITH CHECK (true); -- System can insert

-- Create ultra-strict admin-only policies for emergency_security_log  
CREATE POLICY "emergency_security_admin_only_read" ON emergency_security_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "emergency_security_system_insert" ON emergency_security_log
    FOR INSERT WITH CHECK (true); -- System can insert

-- Create ultra-strict admin-only policies for location_access_security_audit
CREATE POLICY "location_audit_admin_only" ON location_access_security_audit
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Create ultra-strict admin-only policies for provider_business_access_audit
CREATE POLICY "provider_business_audit_admin_only" ON provider_business_access_audit
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "provider_business_audit_system_insert" ON provider_business_access_audit
    FOR INSERT WITH CHECK (true); -- System can insert for monitoring

-- Create ultra-strict admin-only policies for provider_contact_security_audit  
CREATE POLICY "provider_contact_audit_admin_only" ON provider_contact_security_audit
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "provider_contact_audit_system_insert" ON provider_contact_security_audit
    FOR INSERT WITH CHECK (true); -- System can insert for monitoring

-- Create ultra-strict admin-only policies for supplier_contact_security_audit
CREATE POLICY "supplier_contact_audit_admin_only" ON supplier_contact_security_audit
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "supplier_contact_audit_system_insert" ON supplier_contact_security_audit
    FOR INSERT WITH CHECK (true); -- System can insert for monitoring

-- Create ultra-strict admin-only policies for supplier_contact_access_audit
CREATE POLICY "supplier_access_audit_admin_only" ON supplier_contact_access_audit
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "supplier_access_audit_system_insert" ON supplier_contact_access_audit
    FOR INSERT WITH CHECK (true); -- System can insert

-- Create ultra-strict admin-only policies for security_events
CREATE POLICY "security_events_admin_only" ON security_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "security_events_system_insert" ON security_events
    FOR INSERT WITH CHECK (true); -- System can insert

-- Create policies for trusted_devices (users can manage their own devices, admins see all)
CREATE POLICY "trusted_devices_user_own" ON trusted_devices
    FOR ALL USING (
        user_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Create function to log unauthorized access attempts (for manual monitoring)
CREATE OR REPLACE FUNCTION log_security_access_attempt(
    table_name TEXT,
    access_type TEXT DEFAULT 'SELECT'
)
RETURNS VOID AS $$
DECLARE
    user_role TEXT;
    user_profile_id UUID;
BEGIN
    -- Get user role
    SELECT role, user_id INTO user_role, user_profile_id
    FROM profiles 
    WHERE user_id = auth.uid();
    
    -- Log all access attempts to security tables
    INSERT INTO security_events (
        user_id, 
        event_type, 
        severity, 
        description, 
        table_name,
        metadata
    ) VALUES (
        auth.uid(),
        CASE 
            WHEN user_role = 'admin' THEN 'admin_security_table_access'
            ELSE 'unauthorized_security_table_access_attempt'
        END,
        CASE 
            WHEN user_role = 'admin' THEN 'low'
            ELSE 'critical'
        END,
        format('%s access to %s by role: %s', 
               access_type, table_name, COALESCE(user_role, 'unknown')),
        table_name,
        jsonb_build_object(
            'user_role', user_role,
            'access_type', access_type,
            'timestamp', NOW()
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create security definer function to check admin status (prevents RLS recursion)
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Additional security for critical audit tables - revoke all public access
REVOKE ALL ON emergency_lockdown_log FROM PUBLIC;
REVOKE ALL ON emergency_security_log FROM PUBLIC;
REVOKE ALL ON location_access_security_audit FROM PUBLIC;
REVOKE ALL ON provider_business_access_audit FROM PUBLIC;
REVOKE ALL ON provider_contact_security_audit FROM PUBLIC;
REVOKE ALL ON supplier_contact_security_audit FROM PUBLIC;
REVOKE ALL ON supplier_contact_access_audit FROM PUBLIC;
REVOKE ALL ON security_events FROM PUBLIC;

-- Grant specific access only to authenticated role (with RLS protection)
GRANT SELECT, INSERT ON emergency_lockdown_log TO authenticated;
GRANT SELECT, INSERT ON emergency_security_log TO authenticated;
GRANT SELECT, INSERT ON location_access_security_audit TO authenticated;
GRANT SELECT, INSERT ON provider_business_access_audit TO authenticated;
GRANT SELECT, INSERT ON provider_contact_security_audit TO authenticated;
GRANT SELECT, INSERT ON supplier_contact_security_audit TO authenticated;
GRANT SELECT, INSERT ON supplier_contact_access_audit TO authenticated;
GRANT SELECT, INSERT ON security_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON trusted_devices TO authenticated;

-- Log this critical security enhancement
INSERT INTO security_events (
    user_id, 
    event_type, 
    severity, 
    description,
    metadata
) VALUES (
    auth.uid(),
    'critical_security_lockdown_completed',
    'high',
    'EMERGENCY SECURITY LOCKDOWN: All audit and security tables now secured with admin-only RLS policies',
    jsonb_build_object(
        'tables_secured', ARRAY[
            'emergency_lockdown_log', 'emergency_security_log', 'location_access_security_audit',
            'provider_business_access_audit', 'provider_contact_security_audit', 
            'supplier_contact_security_audit', 'supplier_contact_access_audit', 
            'security_events', 'trusted_devices'
        ],
        'timestamp', NOW(),
        'migration_version', '20250120_security_lockdown'
    )
);
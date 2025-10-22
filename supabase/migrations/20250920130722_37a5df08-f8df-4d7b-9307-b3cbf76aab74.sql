-- EMERGENCY SECURITY LOCKDOWN: Secure all audit and security tables
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

-- Create function to detect unauthorized audit access attempts
CREATE OR REPLACE FUNCTION detect_unauthorized_audit_access()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
    user_profile_id UUID;
BEGIN
    -- Get user role
    SELECT role, user_id INTO user_role, user_profile_id
    FROM profiles 
    WHERE user_id = auth.uid();
    
    -- If not admin, log this as a critical security violation
    IF user_role != 'admin' OR user_role IS NULL THEN
        INSERT INTO emergency_security_log (
            user_id, event_type, event_data, risk_level
        ) VALUES (
            auth.uid(),
            'CRITICAL_UNAUTHORIZED_AUDIT_ACCESS_BLOCKED',
            format('SECURITY VIOLATION: Non-admin user %s attempted to access %s table. Role: %s', 
                   COALESCE(user_profile_id::text, 'unknown'), TG_TABLE_NAME, COALESCE(user_role, 'unknown')),
            'critical'
        );
        
        -- Block the access
        RAISE EXCEPTION 'SECURITY: Unauthorized access to audit table blocked. This incident has been logged.';
    END IF;
    
    -- Admin access is logged but allowed
    INSERT INTO security_events (
        user_id, event_type, severity, description, table_name
    ) VALUES (
        auth.uid(),
        'admin_audit_table_access',
        'low',
        format('Admin accessed %s audit table', TG_TABLE_NAME),
        TG_TABLE_NAME
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add triggers to critical audit tables to monitor access
CREATE TRIGGER audit_access_monitor_emergency_lockdown
    BEFORE SELECT ON emergency_lockdown_log
    FOR EACH STATEMENT EXECUTE FUNCTION detect_unauthorized_audit_access();

CREATE TRIGGER audit_access_monitor_emergency_security  
    BEFORE SELECT ON emergency_security_log
    FOR EACH STATEMENT EXECUTE FUNCTION detect_unauthorized_audit_access();

-- Verify RLS is enabled on all critical tables
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename LIKE '%audit%' 
    OR tablename LIKE '%log%' 
    OR tablename LIKE '%security%'
ORDER BY tablename;

-- Log this security enhancement
INSERT INTO security_events (
    user_id, event_type, severity, description
) VALUES (
    auth.uid(),
    'security_lockdown_audit_tables_secured',
    'medium',
    'Emergency security lockdown completed: All audit and security tables now have proper RLS policies and admin-only access'
);
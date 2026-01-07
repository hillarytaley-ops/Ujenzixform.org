-- =====================================================
-- MradiPro Comprehensive Database Schema
-- Created: 2024-12-14
-- Description: Complete table structure for app improvement
-- =====================================================

-- =====================================================
-- 1. ERROR TRACKING & MONITORING
-- =====================================================

-- Application Error Logs (for Sentry-like tracking)
CREATE TABLE IF NOT EXISTS app_error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    error_message TEXT NOT NULL,
    error_stack TEXT,
    component_stack TEXT,
    error_type VARCHAR(100),
    severity VARCHAR(20) DEFAULT 'error' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    page_url TEXT,
    user_agent TEXT,
    browser_info JSONB,
    device_info JSONB,
    session_id VARCHAR(255),
    request_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster error queries
CREATE INDEX IF NOT EXISTS idx_app_error_logs_created_at ON app_error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_error_logs_severity ON app_error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_app_error_logs_user_id ON app_error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_app_error_logs_resolved ON app_error_logs(resolved);

-- Performance Metrics Table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,2) NOT NULL,
    metric_unit VARCHAR(50) DEFAULT 'ms',
    page_url TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    device_type VARCHAR(50),
    connection_type VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics(created_at DESC);

-- =====================================================
-- 2. USER ANALYTICS & BEHAVIOR
-- =====================================================

-- User Sessions Table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    device_id VARCHAR(255),
    device_type VARCHAR(50),
    browser VARCHAR(100),
    os VARCHAR(100),
    ip_address INET,
    location_country VARCHAR(100),
    location_city VARCHAR(100),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);

-- Page Views / Analytics
CREATE TABLE IF NOT EXISTS page_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,
    page_path TEXT NOT NULL,
    page_title TEXT,
    referrer TEXT,
    time_on_page INTEGER, -- seconds
    scroll_depth INTEGER, -- percentage
    interactions INTEGER DEFAULT 0,
    device_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_analytics_page_path ON page_analytics(page_path);
CREATE INDEX IF NOT EXISTS idx_page_analytics_created_at ON page_analytics(created_at DESC);

-- =====================================================
-- 3. NOTIFICATION SYSTEM
-- =====================================================

-- Notification Templates
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'sms', 'push', 'in_app')),
    subject TEXT,
    body_template TEXT NOT NULL,
    variables JSONB DEFAULT '[]', -- List of variable names used in template
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Notifications
CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES notification_templates(id),
    type VARCHAR(50) NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error', 'order', 'delivery', 'system')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    action_label VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON user_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at DESC);

-- Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    push_enabled BOOLEAN DEFAULT true,
    in_app_enabled BOOLEAN DEFAULT true,
    order_updates BOOLEAN DEFAULT true,
    delivery_updates BOOLEAN DEFAULT true,
    promotional BOOLEAN DEFAULT false,
    security_alerts BOOLEAN DEFAULT true,
    weekly_summary BOOLEAN DEFAULT true,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- =====================================================
-- 4. AUDIT TRAIL & COMPLIANCE
-- =====================================================

-- Comprehensive Audit Log
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    user_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    request_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failed', 'pending')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Data Export Requests (GDPR compliance)
CREATE TABLE IF NOT EXISTS data_export_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('export', 'delete', 'restrict')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES auth.users(id),
    export_url TEXT,
    expires_at TIMESTAMPTZ,
    notes TEXT,
    metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- 5. FEATURE FLAGS & A/B TESTING
-- =====================================================

-- Feature Flags
CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT false,
    rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    target_roles TEXT[] DEFAULT '{}',
    target_users UUID[] DEFAULT '{}',
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- A/B Test Experiments
CREATE TABLE IF NOT EXISTS ab_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    hypothesis TEXT,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'cancelled')),
    variants JSONB NOT NULL DEFAULT '[{"name": "control", "weight": 50}, {"name": "variant_a", "weight": 50}]',
    target_metric VARCHAR(100),
    sample_size INTEGER,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    results JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Experiment Assignments
CREATE TABLE IF NOT EXISTS experiment_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID NOT NULL REFERENCES ab_experiments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    variant VARCHAR(100) NOT NULL,
    converted BOOLEAN DEFAULT false,
    conversion_value DECIMAL(10,2),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    converted_at TIMESTAMPTZ,
    UNIQUE(experiment_id, user_id)
);

-- =====================================================
-- 6. SYSTEM CONFIGURATION
-- =====================================================

-- System Settings (app_system_settings to avoid conflict with existing table)
CREATE TABLE IF NOT EXISTS app_system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(50),
    is_public BOOLEAN DEFAULT false,
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default system settings
INSERT INTO app_system_settings (setting_key, setting_value, description, category, is_public) VALUES
    ('maintenance_mode', 'false', 'Enable maintenance mode', 'system', true),
    ('max_file_upload_size', '10485760', 'Maximum file upload size in bytes (10MB)', 'uploads', true),
    ('allowed_file_types', '["jpg", "jpeg", "png", "gif", "webp", "pdf"]', 'Allowed file types for upload', 'uploads', true),
    ('session_timeout_minutes', '60', 'Session timeout in minutes', 'security', false),
    ('max_login_attempts', '5', 'Maximum failed login attempts before lockout', 'security', false),
    ('lockout_duration_minutes', '15', 'Account lockout duration in minutes', 'security', false),
    ('enable_2fa', 'true', 'Enable two-factor authentication', 'security', false),
    ('default_currency', '"KES"', 'Default currency code', 'localization', true),
    ('default_language', '"en"', 'Default language', 'localization', true),
    ('supported_languages', '["en", "sw"]', 'Supported languages', 'localization', true)
ON CONFLICT (setting_key) DO NOTHING;

-- =====================================================
-- 7. SEARCH & INDEXING
-- =====================================================

-- Search History
CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    search_type VARCHAR(50), -- 'suppliers', 'products', 'builders', etc.
    results_count INTEGER,
    clicked_result_id UUID,
    session_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_query ON search_history(query);

-- Popular Searches (aggregated)
CREATE TABLE IF NOT EXISTS popular_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT NOT NULL,
    search_type VARCHAR(50),
    search_count INTEGER DEFAULT 1,
    last_searched_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(query, search_type)
);

-- =====================================================
-- 8. FILE MANAGEMENT
-- =====================================================

-- File Uploads Metadata
CREATE TABLE IF NOT EXISTS file_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    file_type VARCHAR(100),
    file_size INTEGER,
    mime_type VARCHAR(100),
    storage_path TEXT NOT NULL,
    public_url TEXT,
    bucket_name VARCHAR(100),
    purpose VARCHAR(100), -- 'profile_photo', 'product_image', 'document', etc.
    related_table VARCHAR(100),
    related_id UUID,
    is_public BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_file_uploads_user_id ON file_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_related ON file_uploads(related_table, related_id);

-- =====================================================
-- 9. REPORTS & EXPORTS
-- =====================================================

-- Scheduled Reports
CREATE TABLE IF NOT EXISTS scheduled_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type VARCHAR(100) NOT NULL,
    query_params JSONB DEFAULT '{}',
    schedule_cron VARCHAR(100), -- Cron expression
    recipients TEXT[], -- Email addresses
    format VARCHAR(20) DEFAULT 'csv' CHECK (format IN ('csv', 'pdf', 'xlsx', 'json')),
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report Executions
CREATE TABLE IF NOT EXISTS report_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES scheduled_reports(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    file_url TEXT,
    file_size INTEGER,
    row_count INTEGER,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- 10. COMMUNICATION LOGS
-- =====================================================

-- Email Logs
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    to_email VARCHAR(255) NOT NULL,
    from_email VARCHAR(255),
    subject TEXT NOT NULL,
    body_preview TEXT,
    template_id UUID REFERENCES notification_templates(id),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
    provider VARCHAR(100), -- 'sendgrid', 'resend', 'mailgun', etc.
    provider_message_id VARCHAR(255),
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);

-- SMS Logs
CREATE TABLE IF NOT EXISTS sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    to_phone VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    provider VARCHAR(100), -- 'twilio', 'africastalking', etc.
    provider_message_id VARCHAR(255),
    cost DECIMAL(10,4),
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 11. VIEWS FOR ANALYTICS DASHBOARDS
-- =====================================================

-- Daily Registration Stats View
CREATE OR REPLACE VIEW daily_registration_stats AS
SELECT 
    DATE(created_at) as date,
    'supplier' as type,
    COUNT(*) as count
FROM supplier_registrations
GROUP BY DATE(created_at)
UNION ALL
SELECT 
    DATE(created_at) as date,
    'builder' as type,
    COUNT(*) as count
FROM builder_registrations
GROUP BY DATE(created_at)
UNION ALL
SELECT 
    DATE(created_at) as date,
    'delivery_provider' as type,
    COUNT(*) as count
FROM delivery_provider_registrations
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Registration Summary View
CREATE OR REPLACE VIEW registration_summary AS
SELECT 
    'suppliers' as category,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'approved') as approved,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected
FROM supplier_registrations
UNION ALL
SELECT 
    'builders' as category,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'approved') as approved,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected
FROM builder_registrations
UNION ALL
SELECT 
    'delivery_providers' as category,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'approved') as approved,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected
FROM delivery_provider_registrations;

-- =====================================================
-- 12. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE app_error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

-- Admin can read all error logs
CREATE POLICY "Admins can read error logs" ON app_error_logs
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ));

-- Users can insert their own error logs
CREATE POLICY "Users can insert error logs" ON app_error_logs
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Anonymous can insert error logs
CREATE POLICY "Anonymous can insert error logs" ON app_error_logs
    FOR INSERT TO anon
    WITH CHECK (user_id IS NULL);

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications" ON user_notifications
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON user_notifications
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- System can insert notifications
CREATE POLICY "System can insert notifications" ON user_notifications
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Users can manage their notification preferences
CREATE POLICY "Users can manage own notification preferences" ON notification_preferences
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can read their own sessions
CREATE POLICY "Users can read own sessions" ON user_sessions
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Users can read their own audit logs
CREATE POLICY "Users can read own audit logs" ON audit_logs
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Admins can read all audit logs
CREATE POLICY "Admins can read all audit logs" ON audit_logs
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ));

-- System can insert audit logs
CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Users can manage their data export requests
CREATE POLICY "Users can manage own data export requests" ON data_export_requests
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can read their own search history
CREATE POLICY "Users can read own search history" ON search_history
    FOR ALL TO authenticated
    USING (user_id = auth.uid() OR user_id IS NULL)
    WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Users can manage their own file uploads
CREATE POLICY "Users can manage own file uploads" ON file_uploads
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Public files can be read by anyone
CREATE POLICY "Anyone can read public files" ON file_uploads
    FOR SELECT TO authenticated
    USING (is_public = true);

-- =====================================================
-- 13. HELPER FUNCTIONS
-- =====================================================

-- Function to log an audit event
CREATE OR REPLACE FUNCTION log_audit_event(
    p_action VARCHAR(100),
    p_resource_type VARCHAR(100),
    p_resource_id UUID DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
    v_user_email VARCHAR(255);
    v_user_role VARCHAR(50);
    v_log_id UUID;
BEGIN
    -- Get current user info
    SELECT id, email INTO v_user_id, v_user_email
    FROM auth.users WHERE id = auth.uid();
    
    -- Get user role
    SELECT role INTO v_user_role
    FROM user_roles WHERE user_id = auth.uid() LIMIT 1;
    
    -- Insert audit log
    INSERT INTO audit_logs (
        user_id, user_email, user_role, action, resource_type, resource_id,
        old_values, new_values, metadata
    ) VALUES (
        v_user_id, v_user_email, v_user_role, p_action, p_resource_type, p_resource_id,
        p_old_values, p_new_values, p_metadata
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send notification to user
CREATE OR REPLACE FUNCTION send_user_notification(
    p_user_id UUID,
    p_type VARCHAR(50),
    p_title VARCHAR(255),
    p_message TEXT,
    p_action_url TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO user_notifications (
        user_id, type, title, message, action_url, metadata
    ) VALUES (
        p_user_id, p_type, p_title, p_message, p_action_url, p_metadata
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM user_notifications
    WHERE user_id = COALESCE(p_user_id, auth.uid())
    AND is_read = false
    AND is_archived = false;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check feature flag
CREATE OR REPLACE FUNCTION is_feature_enabled(p_feature_name VARCHAR(100))
RETURNS BOOLEAN AS $$
DECLARE
    v_flag RECORD;
    v_user_role VARCHAR(50);
BEGIN
    SELECT * INTO v_flag FROM feature_flags WHERE name = p_feature_name;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    IF NOT v_flag.is_enabled THEN
        RETURN false;
    END IF;
    
    -- Check date range
    IF v_flag.start_date IS NOT NULL AND NOW() < v_flag.start_date THEN
        RETURN false;
    END IF;
    
    IF v_flag.end_date IS NOT NULL AND NOW() > v_flag.end_date THEN
        RETURN false;
    END IF;
    
    -- Check if user is in target users
    IF auth.uid() = ANY(v_flag.target_users) THEN
        RETURN true;
    END IF;
    
    -- Check if user role matches target roles
    SELECT role INTO v_user_role FROM user_roles WHERE user_id = auth.uid() LIMIT 1;
    IF v_user_role = ANY(v_flag.target_roles) THEN
        RETURN true;
    END IF;
    
    -- Check rollout percentage
    IF v_flag.rollout_percentage >= 100 THEN
        RETURN true;
    END IF;
    
    IF v_flag.rollout_percentage > 0 THEN
        -- Use user ID hash for consistent rollout
        RETURN (abs(hashtext(auth.uid()::text)) % 100) < v_flag.rollout_percentage;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 14. TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
CREATE TRIGGER update_notification_templates_updated_at
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_flags_updated_at
    BEFORE UPDATE ON feature_flags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ab_experiments_updated_at
    BEFORE UPDATE ON ab_experiments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_system_settings_updated_at
    BEFORE UPDATE ON app_system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_reports_updated_at
    BEFORE UPDATE ON scheduled_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 15. GRANT PERMISSIONS
-- =====================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant select on views
GRANT SELECT ON daily_registration_stats TO authenticated;
GRANT SELECT ON registration_summary TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION log_audit_event TO authenticated;
GRANT EXECUTE ON FUNCTION send_user_notification TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notification_count TO authenticated;
GRANT EXECUTE ON FUNCTION is_feature_enabled TO authenticated;

COMMENT ON TABLE app_error_logs IS 'Stores application errors for monitoring and debugging';
COMMENT ON TABLE user_notifications IS 'In-app notifications for users';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for compliance and security';
COMMENT ON TABLE feature_flags IS 'Feature toggle system for gradual rollouts';
COMMENT ON TABLE app_system_settings IS 'Configurable system settings';
















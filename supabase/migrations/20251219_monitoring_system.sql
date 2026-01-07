-- =====================================================
-- MradiPro Monitoring System Tables
-- Created: 2024-12-19
-- Features:
--   1. Delivery provider route tracking
--   2. Builder camera access requests
--   3. Monitoring alerts & notifications
-- =====================================================

-- =====================================================
-- 1. DELIVERY PROVIDER ROUTES TABLE
-- Tracks delivery routes for monitoring on the map
-- =====================================================

CREATE TABLE IF NOT EXISTS public.delivery_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id UUID REFERENCES public.deliveries(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL,
    provider_name TEXT,
    
    -- Route details
    origin_address TEXT NOT NULL,
    origin_lat DECIMAL(10, 8),
    origin_lng DECIMAL(11, 8),
    destination_address TEXT NOT NULL,
    destination_lat DECIMAL(10, 8),
    destination_lng DECIMAL(11, 8),
    
    -- Current position (updated in real-time)
    current_lat DECIMAL(10, 8),
    current_lng DECIMAL(11, 8),
    current_address TEXT,
    heading DECIMAL(5, 2), -- Direction in degrees
    speed DECIMAL(6, 2), -- km/h
    
    -- Route status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'near_destination', 'arrived', 'completed', 'cancelled')),
    estimated_arrival TIMESTAMPTZ,
    actual_arrival TIMESTAMPTZ,
    distance_km DECIMAL(8, 2),
    duration_minutes INTEGER,
    
    -- Timestamps
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_delivery_routes_provider ON delivery_routes(provider_id);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_status ON delivery_routes(status);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_delivery ON delivery_routes(delivery_id);

-- Enable RLS
ALTER TABLE public.delivery_routes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "delivery_routes_select_own" ON delivery_routes;
CREATE POLICY "delivery_routes_select_own" ON delivery_routes
    FOR SELECT TO authenticated
    USING (
        provider_id = auth.uid() OR
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "delivery_routes_insert_provider" ON delivery_routes;
CREATE POLICY "delivery_routes_insert_provider" ON delivery_routes
    FOR INSERT TO authenticated
    WITH CHECK (provider_id = auth.uid());

DROP POLICY IF EXISTS "delivery_routes_update_own" ON delivery_routes;
CREATE POLICY "delivery_routes_update_own" ON delivery_routes
    FOR UPDATE TO authenticated
    USING (provider_id = auth.uid())
    WITH CHECK (provider_id = auth.uid());


-- =====================================================
-- 2. CAMERA ACCESS REQUESTS TABLE
-- Builders request access to project cameras
-- =====================================================

CREATE TABLE IF NOT EXISTS public.camera_access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Requester info
    requester_id UUID NOT NULL,
    requester_name TEXT,
    requester_email TEXT,
    requester_role TEXT DEFAULT 'builder',
    
    -- Project/Camera info
    project_id UUID,
    project_name TEXT NOT NULL,
    camera_ids TEXT[], -- Array of camera IDs requested
    
    -- Request details
    reason TEXT NOT NULL,
    access_type TEXT DEFAULT 'view_only' CHECK (access_type IN ('view_only', 'view_and_record', 'full_control')),
    requested_duration TEXT DEFAULT '30_days' CHECK (requested_duration IN ('1_day', '7_days', '30_days', '90_days', 'permanent')),
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'revoked')),
    
    -- Admin response
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    admin_notes TEXT,
    rejection_reason TEXT,
    
    -- Access period (set when approved)
    access_starts_at TIMESTAMPTZ,
    access_expires_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_camera_requests_requester ON camera_access_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_camera_requests_status ON camera_access_requests(status);
CREATE INDEX IF NOT EXISTS idx_camera_requests_project ON camera_access_requests(project_id);

-- Enable RLS
ALTER TABLE public.camera_access_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "camera_requests_select" ON camera_access_requests;
CREATE POLICY "camera_requests_select" ON camera_access_requests
    FOR SELECT TO authenticated
    USING (
        requester_id = auth.uid() OR
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "camera_requests_insert" ON camera_access_requests;
CREATE POLICY "camera_requests_insert" ON camera_access_requests
    FOR INSERT TO authenticated
    WITH CHECK (requester_id = auth.uid());

DROP POLICY IF EXISTS "camera_requests_update_admin" ON camera_access_requests;
CREATE POLICY "camera_requests_update_admin" ON camera_access_requests
    FOR UPDATE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );


-- =====================================================
-- 3. MONITORING ALERTS TABLE
-- System alerts and notifications for monitoring
-- =====================================================

CREATE TABLE IF NOT EXISTS public.monitoring_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Alert type and severity
    alert_type TEXT NOT NULL CHECK (alert_type IN (
        'camera_offline', 'camera_low_battery', 'motion_detected', 'intrusion_detected',
        'delivery_delayed', 'delivery_arrived', 'route_deviation',
        'system_error', 'maintenance_required', 'access_request', 'security_breach'
    )),
    severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical', 'emergency')),
    
    -- Alert details
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    
    -- Related entities
    camera_id UUID,
    project_id UUID,
    delivery_id UUID,
    route_id UUID REFERENCES delivery_routes(id),
    
    -- Target users (who should see this alert)
    target_user_id UUID, -- Specific user
    target_role TEXT, -- Or target by role (admin, builder, etc.)
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
    acknowledged_by UUID,
    acknowledged_at TIMESTAMPTZ,
    resolved_by UUID,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    
    -- Push notification status
    push_sent BOOLEAN DEFAULT FALSE,
    push_sent_at TIMESTAMPTZ,
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_type ON monitoring_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_severity ON monitoring_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_status ON monitoring_alerts(status);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_target_user ON monitoring_alerts(target_user_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_target_role ON monitoring_alerts(target_role);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_created ON monitoring_alerts(created_at DESC);

-- Enable RLS
ALTER TABLE public.monitoring_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "monitoring_alerts_select" ON monitoring_alerts;
CREATE POLICY "monitoring_alerts_select" ON monitoring_alerts
    FOR SELECT TO authenticated
    USING (
        target_user_id = auth.uid() OR
        target_role IN (SELECT role FROM user_roles WHERE user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "monitoring_alerts_insert_admin" ON monitoring_alerts;
CREATE POLICY "monitoring_alerts_insert_admin" ON monitoring_alerts
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "monitoring_alerts_update" ON monitoring_alerts;
CREATE POLICY "monitoring_alerts_update" ON monitoring_alerts
    FOR UPDATE TO authenticated
    USING (
        target_user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );


-- =====================================================
-- 4. NOTIFICATION PREFERENCES TABLE
-- User preferences for push notifications
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    
    -- Push notification settings
    push_enabled BOOLEAN DEFAULT TRUE,
    push_token TEXT, -- FCM or APNs token
    push_platform TEXT CHECK (push_platform IN ('web', 'ios', 'android')),
    
    -- Email notification settings
    email_enabled BOOLEAN DEFAULT TRUE,
    email_address TEXT,
    
    -- Alert type preferences (which alerts to receive)
    alert_camera_offline BOOLEAN DEFAULT TRUE,
    alert_camera_low_battery BOOLEAN DEFAULT TRUE,
    alert_motion_detected BOOLEAN DEFAULT FALSE,
    alert_intrusion_detected BOOLEAN DEFAULT TRUE,
    alert_delivery_delayed BOOLEAN DEFAULT TRUE,
    alert_delivery_arrived BOOLEAN DEFAULT TRUE,
    alert_route_deviation BOOLEAN DEFAULT TRUE,
    alert_system_error BOOLEAN DEFAULT TRUE,
    alert_maintenance_required BOOLEAN DEFAULT TRUE,
    alert_access_request BOOLEAN DEFAULT TRUE,
    alert_security_breach BOOLEAN DEFAULT TRUE,
    
    -- Quiet hours
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "notification_prefs_select_own" ON notification_preferences;
CREATE POLICY "notification_prefs_select_own" ON notification_preferences
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notification_prefs_insert_own" ON notification_preferences;
CREATE POLICY "notification_prefs_insert_own" ON notification_preferences
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notification_prefs_update_own" ON notification_preferences;
CREATE POLICY "notification_prefs_update_own" ON notification_preferences
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());


-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Function to create a monitoring alert
CREATE OR REPLACE FUNCTION create_monitoring_alert(
    p_alert_type TEXT,
    p_severity TEXT,
    p_title TEXT,
    p_message TEXT,
    p_target_user_id UUID DEFAULT NULL,
    p_target_role TEXT DEFAULT NULL,
    p_details JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_alert_id UUID;
BEGIN
    INSERT INTO public.monitoring_alerts (
        alert_type, severity, title, message,
        target_user_id, target_role, details
    ) VALUES (
        p_alert_type, p_severity, p_title, p_message,
        p_target_user_id, p_target_role, p_details
    )
    RETURNING id INTO v_alert_id;
    
    RETURN v_alert_id;
END;
$$;

-- Function to get pending camera access requests count
CREATE OR REPLACE FUNCTION get_pending_camera_requests_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM public.camera_access_requests WHERE status = 'pending');
END;
$$;

-- Function to get active alerts count by severity
CREATE OR REPLACE FUNCTION get_active_alerts_summary()
RETURNS TABLE (
    severity TEXT,
    count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT ma.severity, COUNT(*)
    FROM public.monitoring_alerts ma
    WHERE ma.status = 'active'
    GROUP BY ma.severity;
END;
$$;

-- Function to update delivery route position
CREATE OR REPLACE FUNCTION update_route_position(
    p_route_id UUID,
    p_lat DECIMAL,
    p_lng DECIMAL,
    p_address TEXT DEFAULT NULL,
    p_heading DECIMAL DEFAULT NULL,
    p_speed DECIMAL DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.delivery_routes
    SET 
        current_lat = p_lat,
        current_lng = p_lng,
        current_address = COALESCE(p_address, current_address),
        heading = COALESCE(p_heading, heading),
        speed = COALESCE(p_speed, speed),
        updated_at = NOW()
    WHERE id = p_route_id;
    
    RETURN FOUND;
END;
$$;


-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

GRANT SELECT ON delivery_routes TO authenticated;
GRANT INSERT, UPDATE ON delivery_routes TO authenticated;

GRANT SELECT ON camera_access_requests TO authenticated;
GRANT INSERT, UPDATE ON camera_access_requests TO authenticated;

GRANT SELECT ON monitoring_alerts TO authenticated;
GRANT INSERT, UPDATE ON monitoring_alerts TO authenticated;

GRANT SELECT, INSERT, UPDATE ON notification_preferences TO authenticated;

GRANT EXECUTE ON FUNCTION create_monitoring_alert TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_camera_requests_count TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_alerts_summary TO authenticated;
GRANT EXECUTE ON FUNCTION update_route_position TO authenticated;















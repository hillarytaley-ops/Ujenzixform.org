-- Webhook Integrations Table
CREATE TABLE IF NOT EXISTS webhook_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('slack', 'teams', 'discord', 'custom')),
  webhook_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  alert_types TEXT[] DEFAULT '{}',
  min_severity TEXT DEFAULT 'warning',
  include_deliveries BOOLEAN DEFAULT true,
  include_cameras BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook Logs
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES webhook_integrations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  response_code INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Geofences for delivery tracking
CREATE TABLE IF NOT EXISTS geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  project_id UUID,
  fence_type TEXT NOT NULL CHECK (fence_type IN ('circle', 'polygon')),
  center_lat DECIMAL(10, 8),
  center_lng DECIMAL(11, 8),
  radius_meters INTEGER,
  polygon_coords JSONB,
  is_active BOOLEAN DEFAULT true,
  alert_on_enter BOOLEAN DEFAULT true,
  alert_on_exit BOOLEAN DEFAULT true,
  alert_severity TEXT DEFAULT 'info',
  notify_roles TEXT[] DEFAULT '{"admin"}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Geofence Events Log
CREATE TABLE IF NOT EXISTS geofence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  geofence_id UUID REFERENCES geofences(id) ON DELETE CASCADE,
  delivery_route_id UUID REFERENCES delivery_routes(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('enter', 'exit', 'dwell')),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  alert_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Builder Analytics View (limited access)
CREATE OR REPLACE VIEW builder_analytics_summary AS
SELECT 
  p.id as project_id,
  p.name as project_name,
  p.builder_id,
  COUNT(DISTINCT c.id) as camera_count,
  COUNT(DISTINCT CASE WHEN c.status = 'online' THEN c.id END) as cameras_online,
  COUNT(DISTINCT dr.id) as total_deliveries,
  COUNT(DISTINCT CASE WHEN dr.status = 'completed' THEN dr.id END) as completed_deliveries,
  COUNT(DISTINCT CASE WHEN ma.status = 'pending' OR ma.status = 'acknowledged' THEN ma.id END) as active_alerts
FROM projects p
LEFT JOIN cameras c ON c.project_id = p.id
LEFT JOIN delivery_routes dr ON dr.destination_name ILIKE '%' || p.name || '%'
LEFT JOIN monitoring_alerts ma ON ma.related_project_id = p.id
GROUP BY p.id, p.name, p.builder_id;

-- RLS Policies
ALTER TABLE webhook_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofence_events ENABLE ROW LEVEL SECURITY;

-- Webhook: Admin only
CREATE POLICY "Admins can manage webhooks"
  ON webhook_integrations FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can view webhook logs"
  ON webhook_logs FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Geofences: Admin and Delivery Providers
CREATE POLICY "Admins can manage geofences"
  ON geofences FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Delivery providers can view geofences"
  ON geofences FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'delivery_provider'));

CREATE POLICY "Geofence events viewable by admins and delivery providers"
  ON geofence_events FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'delivery_provider')));

-- Function to check if point is in geofence
CREATE OR REPLACE FUNCTION check_geofence(
  p_lat DECIMAL,
  p_lng DECIMAL,
  p_geofence_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fence geofences%ROWTYPE;
  v_distance DECIMAL;
BEGIN
  SELECT * INTO v_fence FROM geofences WHERE id = p_geofence_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  IF v_fence.fence_type = 'circle' THEN
    -- Calculate distance using Haversine formula (simplified)
    v_distance := 111320 * SQRT(
      POWER(p_lat - v_fence.center_lat, 2) + 
      POWER((p_lng - v_fence.center_lng) * COS(RADIANS(v_fence.center_lat)), 2)
    );
    RETURN v_distance <= v_fence.radius_meters;
  END IF;
  
  -- For polygon, would need more complex point-in-polygon check
  RETURN FALSE;
END;
$$;

-- Function to trigger geofence alerts
CREATE OR REPLACE FUNCTION trigger_geofence_alert(
  p_geofence_id UUID,
  p_delivery_route_id UUID,
  p_event_type TEXT,
  p_lat DECIMAL,
  p_lng DECIMAL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fence geofences%ROWTYPE;
  v_event_id UUID;
  v_alert_id UUID;
BEGIN
  SELECT * INTO v_fence FROM geofences WHERE id = p_geofence_id;
  
  -- Log the event
  INSERT INTO geofence_events (geofence_id, delivery_route_id, event_type, latitude, longitude)
  VALUES (p_geofence_id, p_delivery_route_id, p_event_type, p_lat, p_lng)
  RETURNING id INTO v_event_id;
  
  -- Create alert if configured
  IF (p_event_type = 'enter' AND v_fence.alert_on_enter) OR
     (p_event_type = 'exit' AND v_fence.alert_on_exit) THEN
    
    INSERT INTO monitoring_alerts (
      alert_type, severity, title, message,
      related_geofence_id, target_role
    )
    VALUES (
      'geofence_' || p_event_type,
      v_fence.alert_severity,
      'Geofence ' || UPPER(p_event_type) || ': ' || v_fence.name,
      'Delivery vehicle ' || p_event_type || 'ed geofence zone: ' || v_fence.name,
      p_geofence_id,
      v_fence.notify_roles[1]
    )
    RETURNING id INTO v_alert_id;
    
    -- Mark event as alerted
    UPDATE geofence_events SET alert_sent = true WHERE id = v_event_id;
  END IF;
  
  RETURN v_event_id;
END;
$$;

-- Add geofence reference to alerts
ALTER TABLE monitoring_alerts ADD COLUMN IF NOT EXISTS related_geofence_id UUID REFERENCES geofences(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_geofence_events_geofence_id ON geofence_events(geofence_id);
CREATE INDEX IF NOT EXISTS idx_geofence_events_delivery_route ON geofence_events(delivery_route_id);
CREATE INDEX IF NOT EXISTS idx_geofences_active ON geofences(is_active) WHERE is_active = true;















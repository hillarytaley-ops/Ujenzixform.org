-- =====================================================
-- MradiPro Monitoring System Enhancements
-- Created: 2024-12-19
-- Features:
--   1. Extended alert types for specific scenarios
--   2. Email notification templates
--   3. Monitoring analytics tables
-- =====================================================

-- =====================================================
-- 1. EMAIL NOTIFICATION TEMPLATES TABLE
-- Store customizable email templates for different alerts
-- =====================================================

CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Template identification
    template_key TEXT UNIQUE NOT NULL, -- e.g., 'camera_offline', 'delivery_delayed'
    template_name TEXT NOT NULL,
    description TEXT,
    
    -- Template content
    subject TEXT NOT NULL,
    html_body TEXT NOT NULL,
    text_body TEXT, -- Plain text fallback
    
    -- Available variables (for documentation)
    available_variables JSONB DEFAULT '[]', -- e.g., ["{{user_name}}", "{{project_name}}"]
    
    -- Settings
    is_active BOOLEAN DEFAULT TRUE,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Audit
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Only admins can manage email templates
DROP POLICY IF EXISTS "email_templates_admin_only" ON email_templates;
CREATE POLICY "email_templates_admin_only" ON email_templates
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));


-- =====================================================
-- 2. EMAIL NOTIFICATION LOG TABLE
-- Track all sent email notifications
-- =====================================================

CREATE TABLE IF NOT EXISTS public.email_notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Recipient info
    recipient_id UUID,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    
    -- Email details
    template_id UUID REFERENCES email_templates(id),
    template_key TEXT,
    subject TEXT NOT NULL,
    
    -- Related entities
    alert_id UUID REFERENCES monitoring_alerts(id),
    
    -- Status tracking
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_log_recipient ON email_notification_log(recipient_id);
CREATE INDEX IF NOT EXISTS idx_email_log_status ON email_notification_log(status);
CREATE INDEX IF NOT EXISTS idx_email_log_created ON email_notification_log(created_at DESC);

-- Enable RLS
ALTER TABLE public.email_notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_log_select" ON email_notification_log;
CREATE POLICY "email_log_select" ON email_notification_log
    FOR SELECT TO authenticated
    USING (
        recipient_id = auth.uid() OR
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );


-- =====================================================
-- 3. MONITORING ANALYTICS TABLE
-- Aggregate statistics for monitoring dashboard
-- =====================================================

CREATE TABLE IF NOT EXISTS public.monitoring_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Time period
    date DATE NOT NULL,
    hour INTEGER, -- 0-23, NULL for daily aggregates
    
    -- Camera metrics
    cameras_online INTEGER DEFAULT 0,
    cameras_offline INTEGER DEFAULT 0,
    camera_uptime_percent DECIMAL(5, 2),
    total_viewers INTEGER DEFAULT 0,
    peak_viewers INTEGER DEFAULT 0,
    
    -- Delivery metrics
    deliveries_started INTEGER DEFAULT 0,
    deliveries_completed INTEGER DEFAULT 0,
    deliveries_delayed INTEGER DEFAULT 0,
    avg_delivery_time_minutes INTEGER,
    total_distance_km DECIMAL(10, 2),
    
    -- Alert metrics
    alerts_created INTEGER DEFAULT 0,
    alerts_critical INTEGER DEFAULT 0,
    alerts_resolved INTEGER DEFAULT 0,
    avg_resolution_time_minutes INTEGER,
    
    -- Access request metrics
    access_requests_created INTEGER DEFAULT 0,
    access_requests_approved INTEGER DEFAULT 0,
    access_requests_rejected INTEGER DEFAULT 0,
    
    -- System metrics
    api_requests INTEGER DEFAULT 0,
    avg_response_time_ms INTEGER,
    error_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(date, hour)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_analytics_date ON monitoring_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_date_hour ON monitoring_analytics(date, hour);

-- Enable RLS
ALTER TABLE public.monitoring_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "analytics_admin_only" ON monitoring_analytics;
CREATE POLICY "analytics_admin_only" ON monitoring_analytics
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));


-- =====================================================
-- 4. ALERT ESCALATION RULES TABLE
-- Define when/how alerts should be escalated
-- =====================================================

CREATE TABLE IF NOT EXISTS public.alert_escalation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Rule definition
    name TEXT NOT NULL,
    description TEXT,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    
    -- Escalation timing
    escalate_after_minutes INTEGER NOT NULL, -- Time before escalation
    
    -- Escalation actions
    escalate_to_role TEXT, -- Role to notify
    escalate_to_user_id UUID, -- Specific user to notify
    send_email BOOLEAN DEFAULT TRUE,
    send_push BOOLEAN DEFAULT TRUE,
    send_sms BOOLEAN DEFAULT FALSE,
    
    -- New severity after escalation
    escalated_severity TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.alert_escalation_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "escalation_rules_admin_only" ON alert_escalation_rules;
CREATE POLICY "escalation_rules_admin_only" ON alert_escalation_rules
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));


-- =====================================================
-- 5. INSERT DEFAULT EMAIL TEMPLATES
-- =====================================================

INSERT INTO email_templates (template_key, template_name, description, subject, html_body, text_body, available_variables, priority) VALUES

-- Camera Offline Alert
('camera_offline', 'Camera Offline Notification', 'Sent when a camera goes offline', 
'🚨 Camera Offline: {{camera_name}} at {{project_name}}',
'<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">🚨 Camera Offline Alert</h1>
  </div>
  <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;">
    <p>Dear {{user_name}},</p>
    <p>A camera at your monitored site has gone <strong style="color: #dc2626;">offline</strong>.</p>
    <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
      <tr><td style="padding: 10px; border-bottom: 1px solid #e5e5e5;"><strong>Camera:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">{{camera_name}}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid #e5e5e5;"><strong>Project:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">{{project_name}}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid #e5e5e5;"><strong>Location:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">{{location}}</td></tr>
      <tr><td style="padding: 10px;"><strong>Offline Since:</strong></td><td style="padding: 10px;">{{timestamp}}</td></tr>
    </table>
    <a href="{{dashboard_url}}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">View Dashboard</a>
    <p style="margin-top: 30px; color: #666; font-size: 12px;">This is an automated message from MradiPro Monitoring System.</p>
  </div>
</body>
</html>',
'Camera Offline Alert\n\nDear {{user_name}},\n\nA camera at your monitored site has gone offline.\n\nCamera: {{camera_name}}\nProject: {{project_name}}\nLocation: {{location}}\nOffline Since: {{timestamp}}\n\nView Dashboard: {{dashboard_url}}\n\nThis is an automated message from MradiPro Monitoring System.',
'["{{user_name}}", "{{camera_name}}", "{{project_name}}", "{{location}}", "{{timestamp}}", "{{dashboard_url}}"]',
'high'),

-- Delivery Delayed Alert
('delivery_delayed', 'Delivery Delayed Notification', 'Sent when a delivery is running late',
'⏰ Delivery Delayed: {{delivery_id}} to {{destination}}',
'<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">⏰ Delivery Delayed</h1>
  </div>
  <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;">
    <p>Dear {{user_name}},</p>
    <p>A delivery to your site is <strong style="color: #f59e0b;">running behind schedule</strong>.</p>
    <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
      <tr><td style="padding: 10px; border-bottom: 1px solid #e5e5e5;"><strong>Delivery ID:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">{{delivery_id}}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid #e5e5e5;"><strong>Provider:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">{{provider_name}}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid #e5e5e5;"><strong>Destination:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">{{destination}}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid #e5e5e5;"><strong>Original ETA:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">{{original_eta}}</td></tr>
      <tr><td style="padding: 10px;"><strong>New ETA:</strong></td><td style="padding: 10px; color: #f59e0b; font-weight: bold;">{{new_eta}}</td></tr>
    </table>
    <p><strong>Reason:</strong> {{delay_reason}}</p>
    <a href="{{tracking_url}}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">Track Delivery</a>
  </div>
</body>
</html>',
'Delivery Delayed\n\nDear {{user_name}},\n\nA delivery to your site is running behind schedule.\n\nDelivery ID: {{delivery_id}}\nProvider: {{provider_name}}\nDestination: {{destination}}\nOriginal ETA: {{original_eta}}\nNew ETA: {{new_eta}}\nReason: {{delay_reason}}\n\nTrack Delivery: {{tracking_url}}',
'["{{user_name}}", "{{delivery_id}}", "{{provider_name}}", "{{destination}}", "{{original_eta}}", "{{new_eta}}", "{{delay_reason}}", "{{tracking_url}}"]',
'normal'),

-- Delivery Arrived Alert
('delivery_arrived', 'Delivery Arrived Notification', 'Sent when a delivery reaches the destination',
'✅ Delivery Arrived: {{delivery_id}} at {{destination}}',
'<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">✅ Delivery Arrived</h1>
  </div>
  <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;">
    <p>Dear {{user_name}},</p>
    <p>Your delivery has <strong style="color: #16a34a;">arrived successfully</strong>!</p>
    <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
      <tr><td style="padding: 10px; border-bottom: 1px solid #e5e5e5;"><strong>Delivery ID:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">{{delivery_id}}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid #e5e5e5;"><strong>Provider:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">{{provider_name}}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid #e5e5e5;"><strong>Destination:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">{{destination}}</td></tr>
      <tr><td style="padding: 10px;"><strong>Arrived At:</strong></td><td style="padding: 10px;">{{arrival_time}}</td></tr>
    </table>
    <p>Please confirm receipt of materials using the QR scanner.</p>
    <a href="{{scanner_url}}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">Open Scanner</a>
  </div>
</body>
</html>',
'Delivery Arrived\n\nDear {{user_name}},\n\nYour delivery has arrived successfully!\n\nDelivery ID: {{delivery_id}}\nProvider: {{provider_name}}\nDestination: {{destination}}\nArrived At: {{arrival_time}}\n\nPlease confirm receipt: {{scanner_url}}',
'["{{user_name}}", "{{delivery_id}}", "{{provider_name}}", "{{destination}}", "{{arrival_time}}", "{{scanner_url}}"]',
'normal'),

-- Security Breach Alert
('security_breach', 'Security Breach Alert', 'Sent when suspicious activity is detected',
'🚨 SECURITY ALERT: Suspicious Activity at {{project_name}}',
'<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">🚨 SECURITY ALERT</h1>
  </div>
  <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="color: #dc2626; font-weight: bold; font-size: 18px;">IMMEDIATE ATTENTION REQUIRED</p>
    <p>Dear {{user_name}},</p>
    <p>Suspicious activity has been detected at your construction site.</p>
    <table style="width: 100%; margin: 20px 0; border-collapse: collapse; background: #fef2f2;">
      <tr><td style="padding: 10px; border-bottom: 1px solid #fecaca;"><strong>Project:</strong></td><td style="padding: 10px; border-bottom: 1px solid #fecaca;">{{project_name}}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid #fecaca;"><strong>Location:</strong></td><td style="padding: 10px; border-bottom: 1px solid #fecaca;">{{location}}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid #fecaca;"><strong>Alert Type:</strong></td><td style="padding: 10px; border-bottom: 1px solid #fecaca;">{{alert_type}}</td></tr>
      <tr><td style="padding: 10px;"><strong>Detected At:</strong></td><td style="padding: 10px;">{{timestamp}}</td></tr>
    </table>
    <p><strong>Details:</strong> {{details}}</p>
    <a href="{{live_feed_url}}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">View Live Feed</a>
    <p style="margin-top: 20px; padding: 15px; background: #fef2f2; border-left: 4px solid #dc2626;">
      <strong>Recommended Actions:</strong><br>
      1. Review live camera footage immediately<br>
      2. Contact site security if needed<br>
      3. Report incident to authorities if required
    </p>
  </div>
</body>
</html>',
'🚨 SECURITY ALERT - IMMEDIATE ATTENTION REQUIRED\n\nDear {{user_name}},\n\nSuspicious activity has been detected at your construction site.\n\nProject: {{project_name}}\nLocation: {{location}}\nAlert Type: {{alert_type}}\nDetected At: {{timestamp}}\n\nDetails: {{details}}\n\nView Live Feed: {{live_feed_url}}\n\nRecommended Actions:\n1. Review live camera footage immediately\n2. Contact site security if needed\n3. Report incident to authorities if required',
'["{{user_name}}", "{{project_name}}", "{{location}}", "{{alert_type}}", "{{timestamp}}", "{{details}}", "{{live_feed_url}}"]',
'urgent'),

-- Camera Access Approved
('access_approved', 'Camera Access Approved', 'Sent when camera access request is approved',
'✅ Camera Access Approved: {{project_name}}',
'<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">✅ Access Approved</h1>
  </div>
  <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;">
    <p>Dear {{user_name}},</p>
    <p>Your camera access request has been <strong style="color: #16a34a;">approved</strong>!</p>
    <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
      <tr><td style="padding: 10px; border-bottom: 1px solid #e5e5e5;"><strong>Project:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">{{project_name}}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid #e5e5e5;"><strong>Access Type:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">{{access_type}}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid #e5e5e5;"><strong>Valid From:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">{{start_date}}</td></tr>
      <tr><td style="padding: 10px;"><strong>Valid Until:</strong></td><td style="padding: 10px;">{{end_date}}</td></tr>
    </table>
    {{#admin_notes}}<p><strong>Admin Notes:</strong> {{admin_notes}}</p>{{/admin_notes}}
    <a href="{{monitoring_url}}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">Access Cameras</a>
  </div>
</body>
</html>',
'Camera Access Approved\n\nDear {{user_name}},\n\nYour camera access request has been approved!\n\nProject: {{project_name}}\nAccess Type: {{access_type}}\nValid From: {{start_date}}\nValid Until: {{end_date}}\n\nAdmin Notes: {{admin_notes}}\n\nAccess Cameras: {{monitoring_url}}',
'["{{user_name}}", "{{project_name}}", "{{access_type}}", "{{start_date}}", "{{end_date}}", "{{admin_notes}}", "{{monitoring_url}}"]',
'normal'),

-- Camera Access Rejected
('access_rejected', 'Camera Access Rejected', 'Sent when camera access request is rejected',
'❌ Camera Access Request Declined: {{project_name}}',
'<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">❌ Access Request Declined</h1>
  </div>
  <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;">
    <p>Dear {{user_name}},</p>
    <p>Unfortunately, your camera access request has been <strong>declined</strong>.</p>
    <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
      <tr><td style="padding: 10px; border-bottom: 1px solid #e5e5e5;"><strong>Project:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">{{project_name}}</td></tr>
      <tr><td style="padding: 10px;"><strong>Requested:</strong></td><td style="padding: 10px;">{{request_date}}</td></tr>
    </table>
    <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <strong>Reason:</strong><br>{{rejection_reason}}
    </div>
    <p>If you believe this was an error, please contact the site administrator or submit a new request with additional information.</p>
    <a href="{{new_request_url}}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">Submit New Request</a>
  </div>
</body>
</html>',
'Camera Access Request Declined\n\nDear {{user_name}},\n\nUnfortunately, your camera access request has been declined.\n\nProject: {{project_name}}\nRequested: {{request_date}}\n\nReason: {{rejection_reason}}\n\nIf you believe this was an error, please contact the site administrator or submit a new request.\n\nSubmit New Request: {{new_request_url}}',
'["{{user_name}}", "{{project_name}}", "{{request_date}}", "{{rejection_reason}}", "{{new_request_url}}"]',
'normal'),

-- Material Quality Alert
('material_quality', 'Material Quality Alert', 'Sent when material quality issues are detected',
'⚠️ Material Quality Issue: {{material_name}} at {{project_name}}',
'<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">⚠️ Quality Alert</h1>
  </div>
  <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;">
    <p>Dear {{user_name}},</p>
    <p>A <strong style="color: #f59e0b;">quality concern</strong> has been flagged for received materials.</p>
    <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
      <tr><td style="padding: 10px; border-bottom: 1px solid #e5e5e5;"><strong>Material:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">{{material_name}}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid #e5e5e5;"><strong>Supplier:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">{{supplier_name}}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid #e5e5e5;"><strong>Project:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">{{project_name}}</td></tr>
      <tr><td style="padding: 10px;"><strong>Delivery Date:</strong></td><td style="padding: 10px;">{{delivery_date}}</td></tr>
    </table>
    <div style="background: #fef3cd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <strong>Issue Description:</strong><br>{{issue_description}}
    </div>
    <p><strong>Recommended Actions:</strong></p>
    <ul>
      <li>Inspect the materials thoroughly</li>
      <li>Document any defects with photos</li>
      <li>Contact supplier for resolution</li>
    </ul>
    <a href="{{dispute_url}}" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">File Dispute</a>
  </div>
</body>
</html>',
'Material Quality Alert\n\nDear {{user_name}},\n\nA quality concern has been flagged for received materials.\n\nMaterial: {{material_name}}\nSupplier: {{supplier_name}}\nProject: {{project_name}}\nDelivery Date: {{delivery_date}}\n\nIssue: {{issue_description}}\n\nRecommended Actions:\n1. Inspect the materials thoroughly\n2. Document any defects with photos\n3. Contact supplier for resolution\n\nFile Dispute: {{dispute_url}}',
'["{{user_name}}", "{{material_name}}", "{{supplier_name}}", "{{project_name}}", "{{delivery_date}}", "{{issue_description}}", "{{dispute_url}}"]',
'high'),

-- Daily Summary Report
('daily_summary', 'Daily Summary Report', 'Daily monitoring summary sent to admins',
'📊 MradiPro Daily Summary - {{date}}',
'<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">📊 Daily Summary</h1>
    <p style="color: #bfdbfe; margin: 10px 0 0 0;">{{date}}</p>
  </div>
  <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;">
    <p>Dear {{user_name}},</p>
    <p>Here is your daily monitoring summary:</p>
    
    <h3 style="color: #1d4ed8; border-bottom: 2px solid #dbeafe; padding-bottom: 10px;">📹 Camera Status</h3>
    <table style="width: 100%; margin: 10px 0 20px 0;">
      <tr><td>Online</td><td style="text-align: right; color: #16a34a; font-weight: bold;">{{cameras_online}}</td></tr>
      <tr><td>Offline</td><td style="text-align: right; color: #dc2626; font-weight: bold;">{{cameras_offline}}</td></tr>
      <tr><td>Uptime</td><td style="text-align: right; font-weight: bold;">{{uptime_percent}}%</td></tr>
    </table>
    
    <h3 style="color: #1d4ed8; border-bottom: 2px solid #dbeafe; padding-bottom: 10px;">🚚 Deliveries</h3>
    <table style="width: 100%; margin: 10px 0 20px 0;">
      <tr><td>Completed</td><td style="text-align: right; color: #16a34a; font-weight: bold;">{{deliveries_completed}}</td></tr>
      <tr><td>In Progress</td><td style="text-align: right; color: #2563eb; font-weight: bold;">{{deliveries_in_progress}}</td></tr>
      <tr><td>Delayed</td><td style="text-align: right; color: #f59e0b; font-weight: bold;">{{deliveries_delayed}}</td></tr>
    </table>
    
    <h3 style="color: #1d4ed8; border-bottom: 2px solid #dbeafe; padding-bottom: 10px;">🔔 Alerts</h3>
    <table style="width: 100%; margin: 10px 0 20px 0;">
      <tr><td>Total Alerts</td><td style="text-align: right; font-weight: bold;">{{alerts_total}}</td></tr>
      <tr><td>Critical</td><td style="text-align: right; color: #dc2626; font-weight: bold;">{{alerts_critical}}</td></tr>
      <tr><td>Resolved</td><td style="text-align: right; color: #16a34a; font-weight: bold;">{{alerts_resolved}}</td></tr>
    </table>
    
    <a href="{{dashboard_url}}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">View Full Dashboard</a>
  </div>
</body>
</html>',
'MradiPro Daily Summary - {{date}}\n\nDear {{user_name}},\n\nHere is your daily monitoring summary:\n\n📹 CAMERA STATUS\nOnline: {{cameras_online}}\nOffline: {{cameras_offline}}\nUptime: {{uptime_percent}}%\n\n🚚 DELIVERIES\nCompleted: {{deliveries_completed}}\nIn Progress: {{deliveries_in_progress}}\nDelayed: {{deliveries_delayed}}\n\n🔔 ALERTS\nTotal: {{alerts_total}}\nCritical: {{alerts_critical}}\nResolved: {{alerts_resolved}}\n\nView Dashboard: {{dashboard_url}}',
'["{{user_name}}", "{{date}}", "{{cameras_online}}", "{{cameras_offline}}", "{{uptime_percent}}", "{{deliveries_completed}}", "{{deliveries_in_progress}}", "{{deliveries_delayed}}", "{{alerts_total}}", "{{alerts_critical}}", "{{alerts_resolved}}", "{{dashboard_url}}"]',
'low')

ON CONFLICT (template_key) DO NOTHING;


-- =====================================================
-- 6. INSERT DEFAULT ESCALATION RULES
-- =====================================================

INSERT INTO alert_escalation_rules (name, description, alert_type, severity, escalate_after_minutes, escalate_to_role, send_email, send_push, escalated_severity) VALUES
('Critical Camera Offline', 'Escalate camera offline alerts if not acknowledged within 15 minutes', 'camera_offline', 'critical', 15, 'admin', TRUE, TRUE, 'emergency'),
('Security Breach Escalation', 'Immediately escalate security breaches', 'security_breach', 'critical', 5, 'admin', TRUE, TRUE, 'emergency'),
('Delayed Delivery Escalation', 'Escalate delayed deliveries after 30 minutes', 'delivery_delayed', 'warning', 30, 'admin', TRUE, FALSE, 'critical'),
('Unacknowledged Critical Alert', 'Escalate any critical alert not acknowledged within 10 minutes', 'system_error', 'critical', 10, 'admin', TRUE, TRUE, 'emergency')
ON CONFLICT DO NOTHING;


-- =====================================================
-- 7. ANALYTICS HELPER FUNCTIONS
-- =====================================================

-- Function to aggregate daily analytics
CREATE OR REPLACE FUNCTION aggregate_daily_analytics(p_date DATE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.monitoring_analytics (
        date,
        hour,
        alerts_created,
        alerts_critical,
        alerts_resolved,
        access_requests_created,
        access_requests_approved,
        access_requests_rejected,
        deliveries_completed,
        deliveries_delayed
    )
    SELECT 
        p_date,
        NULL, -- Daily aggregate (no specific hour)
        (SELECT COUNT(*) FROM public.monitoring_alerts WHERE DATE(created_at) = p_date),
        (SELECT COUNT(*) FROM public.monitoring_alerts WHERE DATE(created_at) = p_date AND severity IN ('critical', 'emergency')),
        (SELECT COUNT(*) FROM public.monitoring_alerts WHERE DATE(resolved_at) = p_date),
        (SELECT COUNT(*) FROM public.camera_access_requests WHERE DATE(created_at) = p_date),
        (SELECT COUNT(*) FROM public.camera_access_requests WHERE DATE(reviewed_at) = p_date AND status = 'approved'),
        (SELECT COUNT(*) FROM public.camera_access_requests WHERE DATE(reviewed_at) = p_date AND status = 'rejected'),
        (SELECT COUNT(*) FROM public.delivery_routes WHERE DATE(completed_at) = p_date AND status = 'completed'),
        (SELECT COUNT(*) FROM public.delivery_routes WHERE DATE(created_at) = p_date AND status = 'cancelled')
    ON CONFLICT (date, hour) DO UPDATE SET
        alerts_created = EXCLUDED.alerts_created,
        alerts_critical = EXCLUDED.alerts_critical,
        alerts_resolved = EXCLUDED.alerts_resolved,
        access_requests_created = EXCLUDED.access_requests_created,
        access_requests_approved = EXCLUDED.access_requests_approved,
        access_requests_rejected = EXCLUDED.access_requests_rejected,
        deliveries_completed = EXCLUDED.deliveries_completed,
        deliveries_delayed = EXCLUDED.deliveries_delayed,
        updated_at = NOW();
END;
$$;

-- Function to get analytics summary for date range
CREATE OR REPLACE FUNCTION get_analytics_summary(
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    total_alerts BIGINT,
    critical_alerts BIGINT,
    resolved_alerts BIGINT,
    total_access_requests BIGINT,
    approved_requests BIGINT,
    rejected_requests BIGINT,
    completed_deliveries BIGINT,
    delayed_deliveries BIGINT,
    avg_resolution_time_min NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        SUM(alerts_created)::BIGINT,
        SUM(alerts_critical)::BIGINT,
        SUM(alerts_resolved)::BIGINT,
        SUM(access_requests_created)::BIGINT,
        SUM(access_requests_approved)::BIGINT,
        SUM(access_requests_rejected)::BIGINT,
        SUM(deliveries_completed)::BIGINT,
        SUM(deliveries_delayed)::BIGINT,
        AVG(avg_resolution_time_minutes)::NUMERIC
    FROM public.monitoring_analytics
    WHERE date BETWEEN p_start_date AND p_end_date;
END;
$$;

-- Function to send email notification
CREATE OR REPLACE FUNCTION send_email_notification(
    p_recipient_email TEXT,
    p_recipient_name TEXT,
    p_template_key TEXT,
    p_alert_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_template RECORD;
    v_log_id UUID;
BEGIN
    -- Get template
    SELECT * INTO v_template
    FROM public.email_templates
    WHERE template_key = p_template_key AND is_active = TRUE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Email template not found: %', p_template_key;
    END IF;
    
    -- Log the email (actual sending would be done by Edge Function)
    INSERT INTO public.email_notification_log (
        recipient_email,
        recipient_name,
        template_id,
        template_key,
        subject,
        alert_id,
        status,
        metadata
    ) VALUES (
        p_recipient_email,
        p_recipient_name,
        v_template.id,
        p_template_key,
        v_template.subject,
        p_alert_id,
        'pending',
        p_metadata
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;


-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

GRANT SELECT ON email_templates TO authenticated;
GRANT SELECT ON email_notification_log TO authenticated;
GRANT SELECT ON monitoring_analytics TO authenticated;
GRANT SELECT ON alert_escalation_rules TO authenticated;

GRANT EXECUTE ON FUNCTION aggregate_daily_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_analytics_summary TO authenticated;
GRANT EXECUTE ON FUNCTION send_email_notification TO authenticated;















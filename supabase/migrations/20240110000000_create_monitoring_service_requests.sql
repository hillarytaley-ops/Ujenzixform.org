-- Create monitoring_service_requests table
CREATE TABLE IF NOT EXISTS monitoring_service_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Project Information
    project_name TEXT NOT NULL,
    project_location TEXT NOT NULL,
    project_size TEXT,
    project_type TEXT,
    project_duration TEXT,
    start_date DATE,
    
    -- Contact Information
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    company_name TEXT,
    
    -- Service Requirements
    selected_services JSONB NOT NULL DEFAULT '[]'::jsonb,
    camera_count INTEGER DEFAULT 0,
    drone_hours INTEGER DEFAULT 0,
    security_level TEXT,
    special_requirements TEXT,
    
    -- Budget & Timeline
    budget_range TEXT,
    urgency TEXT,
    estimated_cost DECIMAL(12,2) DEFAULT 0,
    
    -- Additional Information
    additional_notes TEXT,
    
    -- Status and Metadata
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'quoted', 'approved', 'rejected', 'completed')),
    admin_notes TEXT,
    quote_amount DECIMAL(12,2),
    quote_valid_until DATE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_monitoring_requests_user_id ON monitoring_service_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_requests_status ON monitoring_service_requests(status);
CREATE INDEX IF NOT EXISTS idx_monitoring_requests_created_at ON monitoring_service_requests(created_at);

-- Enable RLS
ALTER TABLE monitoring_service_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own requests
CREATE POLICY "Users can view own monitoring requests" ON monitoring_service_requests
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own requests
CREATE POLICY "Users can create monitoring requests" ON monitoring_service_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own requests (limited fields)
CREATE POLICY "Users can update own monitoring requests" ON monitoring_service_requests
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all monitoring requests" ON monitoring_service_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Admins can update all requests
CREATE POLICY "Admins can update all monitoring requests" ON monitoring_service_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_monitoring_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_monitoring_requests_updated_at
    BEFORE UPDATE ON monitoring_service_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_monitoring_requests_updated_at();

-- Create function to send notification when new request is created
CREATE OR REPLACE FUNCTION notify_new_monitoring_request()
RETURNS TRIGGER AS $$
BEGIN
    -- In a real implementation, this could send notifications to admins
    -- For now, we'll just log the event
    INSERT INTO system_logs (event_type, description, metadata)
    VALUES (
        'monitoring_request_created',
        'New monitoring service request submitted',
        jsonb_build_object(
            'request_id', NEW.id,
            'user_id', NEW.user_id,
            'project_name', NEW.project_name,
            'estimated_cost', NEW.estimated_cost
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new request notifications
CREATE TRIGGER trigger_notify_new_monitoring_request
    AFTER INSERT ON monitoring_service_requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_monitoring_request();

-- Create system_logs table if it doesn't exist (for notifications)
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for system_logs
CREATE INDEX IF NOT EXISTS idx_system_logs_event_type ON system_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);


















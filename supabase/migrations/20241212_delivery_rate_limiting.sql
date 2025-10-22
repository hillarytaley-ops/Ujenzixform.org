-- Enhanced rate limiting for delivery operations
-- Migration: 20241212_delivery_rate_limiting.sql

-- Create delivery-specific rate limiting table
CREATE TABLE IF NOT EXISTS public.delivery_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    operation_type TEXT NOT NULL CHECK (operation_type IN ('create_delivery', 'track_delivery', 'contact_driver', 'bulk_create', 'status_update')),
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    window_duration_minutes INTEGER DEFAULT 60,
    ip_address INET,
    user_agent TEXT,
    blocked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_delivery_rate_limits_user_operation ON public.delivery_rate_limits(user_id, operation_type);
CREATE INDEX IF NOT EXISTS idx_delivery_rate_limits_window ON public.delivery_rate_limits(window_start, operation_type);
CREATE INDEX IF NOT EXISTS idx_delivery_rate_limits_ip ON public.delivery_rate_limits(ip_address, operation_type);

-- Enable RLS on rate limits table
ALTER TABLE public.delivery_rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can only view their own rate limit data
CREATE POLICY "delivery_rate_limits_self_view" ON public.delivery_rate_limits
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Admins can view all rate limit data
CREATE POLICY "delivery_rate_limits_admin_view" ON public.delivery_rate_limits
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
    );

-- Function to check and enforce delivery rate limits
CREATE OR REPLACE FUNCTION public.check_delivery_rate_limit(
    operation_type TEXT,
    max_requests INTEGER DEFAULT 10,
    window_minutes INTEGER DEFAULT 60
)
RETURNS TABLE (
    allowed BOOLEAN,
    current_count INTEGER,
    reset_time TIMESTAMP WITH TIME ZONE,
    blocked BOOLEAN
) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    window_start_time TIMESTAMP WITH TIME ZONE;
    current_requests INTEGER;
    is_blocked BOOLEAN;
    client_ip INET;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RETURN QUERY SELECT false, 0, NOW(), true;
        RETURN;
    END IF;
    
    -- Calculate window start time
    window_start_time := NOW() - (window_minutes || ' minutes')::INTERVAL;
    
    -- Get client IP (would be passed from application)
    client_ip := '0.0.0.0'::INET; -- Placeholder
    
    -- Count current requests in window
    SELECT COUNT(*), bool_or(blocked) INTO current_requests, is_blocked
    FROM public.delivery_rate_limits
    WHERE user_id = current_user_id
    AND operation_type = check_delivery_rate_limit.operation_type
    AND window_start >= window_start_time;
    
    -- Check if user is currently blocked
    IF is_blocked THEN
        RETURN QUERY SELECT false, current_requests, window_start_time + (window_minutes || ' minutes')::INTERVAL, true;
        RETURN;
    END IF;
    
    -- Check if limit exceeded
    IF current_requests >= max_requests THEN
        -- Block user temporarily
        INSERT INTO public.delivery_rate_limits (
            user_id, operation_type, request_count, window_start, 
            window_duration_minutes, ip_address, blocked
        ) VALUES (
            current_user_id, check_delivery_rate_limit.operation_type, current_requests + 1, 
            NOW(), window_minutes, client_ip, true
        );
        
        -- Log security event
        INSERT INTO public.security_events (
            user_id, event_type, severity, details
        ) VALUES (
            current_user_id, 'rate_limit_exceeded', 'medium',
            jsonb_build_object(
                'operation_type', operation_type,
                'request_count', current_requests + 1,
                'max_allowed', max_requests,
                'window_minutes', window_minutes
            )
        );
        
        RETURN QUERY SELECT false, current_requests + 1, window_start_time + (window_minutes || ' minutes')::INTERVAL, true;
        RETURN;
    END IF;
    
    -- Record this request
    INSERT INTO public.delivery_rate_limits (
        user_id, operation_type, request_count, window_start, 
        window_duration_minutes, ip_address
    ) VALUES (
        current_user_id, check_delivery_rate_limit.operation_type, current_requests + 1, 
        NOW(), window_minutes, client_ip
    );
    
    RETURN QUERY SELECT true, current_requests + 1, window_start_time + (window_minutes || ' minutes')::INTERVAL, false;
END;
$$;

-- Function to check bulk operation limits (stricter)
CREATE OR REPLACE FUNCTION public.check_bulk_delivery_limit(
    bulk_size INTEGER
)
RETURNS TABLE (
    allowed BOOLEAN,
    max_bulk_size INTEGER,
    reason TEXT
) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT;
    daily_bulk_count INTEGER;
    max_allowed INTEGER;
BEGIN
    -- Get user role
    SELECT ur.role INTO user_role
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    LIMIT 1;
    
    -- Set limits based on role
    max_allowed := CASE user_role
        WHEN 'admin' THEN 100
        WHEN 'supplier' THEN 50
        WHEN 'builder' THEN 20
        ELSE 5
    END;
    
    -- Check daily bulk operations
    SELECT COUNT(*) INTO daily_bulk_count
    FROM public.delivery_rate_limits
    WHERE user_id = auth.uid()
    AND operation_type = 'bulk_create'
    AND window_start >= CURRENT_DATE;
    
    -- Check if bulk size exceeds limits
    IF bulk_size > max_allowed THEN
        RETURN QUERY SELECT false, max_allowed, 'Bulk size exceeds role limit';
        RETURN;
    END IF;
    
    -- Check daily bulk limit
    IF daily_bulk_count >= 5 THEN
        RETURN QUERY SELECT false, max_allowed, 'Daily bulk operation limit exceeded';
        RETURN;
    END IF;
    
    RETURN QUERY SELECT true, max_allowed, 'Bulk operation allowed';
END;
$$;

-- Function to detect suspicious delivery patterns
CREATE OR REPLACE FUNCTION public.detect_suspicious_delivery_activity(
    user_uuid UUID DEFAULT auth.uid()
)
RETURNS TABLE (
    is_suspicious BOOLEAN,
    risk_score INTEGER,
    risk_factors TEXT[],
    recommended_action TEXT
) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    recent_requests INTEGER;
    failed_requests INTEGER;
    unusual_locations INTEGER;
    risk_factors_array TEXT[] := ARRAY[]::TEXT[];
    calculated_risk_score INTEGER := 0;
BEGIN
    -- Count recent delivery requests (last hour)
    SELECT COUNT(*) INTO recent_requests
    FROM public.delivery_rate_limits
    WHERE user_id = user_uuid
    AND operation_type = 'create_delivery'
    AND window_start >= NOW() - INTERVAL '1 hour';
    
    -- Count failed requests
    SELECT COUNT(*) INTO failed_requests
    FROM public.security_events
    WHERE user_id = user_uuid
    AND event_type LIKE '%delivery%'
    AND severity IN ('high', 'critical')
    AND created_at >= NOW() - INTERVAL '24 hours';
    
    -- Analyze risk factors
    IF recent_requests > 20 THEN
        risk_factors_array := array_append(risk_factors_array, 'High request frequency');
        calculated_risk_score := calculated_risk_score + 30;
    END IF;
    
    IF failed_requests > 5 THEN
        risk_factors_array := array_append(risk_factors_array, 'Multiple failed requests');
        calculated_risk_score := calculated_risk_score + 25;
    END IF;
    
    -- Check for unusual delivery patterns
    SELECT COUNT(DISTINCT pickup_address) INTO unusual_locations
    FROM public.deliveries
    WHERE builder_id = user_uuid
    AND created_at >= NOW() - INTERVAL '1 hour';
    
    IF unusual_locations > 10 THEN
        risk_factors_array := array_append(risk_factors_array, 'Unusual location patterns');
        calculated_risk_score := calculated_risk_score + 20;
    END IF;
    
    -- Determine recommended action
    RETURN QUERY SELECT 
        calculated_risk_score > 50,
        calculated_risk_score,
        risk_factors_array,
        CASE 
            WHEN calculated_risk_score > 80 THEN 'Block user temporarily'
            WHEN calculated_risk_score > 60 THEN 'Require additional verification'
            WHEN calculated_risk_score > 40 THEN 'Monitor closely'
            ELSE 'Normal monitoring'
        END;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_delivery_rate_limit(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_bulk_delivery_limit(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.detect_suspicious_delivery_activity(UUID) TO authenticated;

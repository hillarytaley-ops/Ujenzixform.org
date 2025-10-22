-- Comprehensive security policies for scanner system
-- Migration: 20241212_scanner_security_policies.sql

-- Create scanner audit trail table
CREATE TABLE IF NOT EXISTS public.scanner_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    material_item_id UUID REFERENCES public.material_items(id),
    
    -- Scan details
    qr_code TEXT NOT NULL,
    scan_type TEXT NOT NULL CHECK (scan_type IN ('dispatch', 'receiving', 'verification', 'quality_check')),
    scanner_type TEXT NOT NULL CHECK (scanner_type IN ('mobile_camera', 'physical_scanner', 'web_scanner', 'handheld_device')),
    scanner_device_id TEXT,
    
    -- Location and context
    scan_location_lat DECIMAL(10,8),
    scan_location_lng DECIMAL(11,8),
    scan_location_description TEXT,
    ip_address INET,
    user_agent TEXT,
    
    -- Material condition and notes
    material_condition TEXT CHECK (material_condition IN ('excellent', 'good', 'acceptable', 'damaged', 'rejected')),
    scan_notes TEXT,
    quality_photos TEXT[], -- URLs to quality assessment photos
    
    -- Security and validation
    scan_verified BOOLEAN DEFAULT false,
    verification_method TEXT,
    security_flags TEXT[] DEFAULT ARRAY[]::TEXT[],
    fraud_risk_score INTEGER DEFAULT 0 CHECK (fraud_risk_score >= 0 AND fraud_risk_score <= 100),
    
    -- Metadata
    scan_duration_ms INTEGER, -- Time taken to complete scan
    scan_attempts INTEGER DEFAULT 1,
    scan_success BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create scanner access control table
CREATE TABLE IF NOT EXISTS public.scanner_access_control (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Access permissions
    can_dispatch_scan BOOLEAN DEFAULT false,
    can_receive_scan BOOLEAN DEFAULT false,
    can_verify_scan BOOLEAN DEFAULT false,
    can_quality_check BOOLEAN DEFAULT false,
    
    -- Location restrictions
    allowed_locations TEXT[], -- Array of allowed scanning locations
    restricted_locations TEXT[], -- Array of restricted locations
    max_daily_scans INTEGER DEFAULT 100,
    
    -- Device restrictions
    allowed_devices TEXT[], -- Array of allowed device IDs
    require_device_verification BOOLEAN DEFAULT false,
    
    -- Time restrictions
    allowed_hours JSONB DEFAULT '{"start": "06:00", "end": "22:00"}'::jsonb,
    allowed_days TEXT[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']::TEXT[],
    
    -- Security settings
    require_photo_verification BOOLEAN DEFAULT false,
    require_location_verification BOOLEAN DEFAULT false,
    max_scan_radius_km DECIMAL(8,2) DEFAULT 50.0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    suspended_until TIMESTAMP WITH TIME ZONE,
    suspension_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one record per user
    CONSTRAINT unique_user_scanner_access UNIQUE(user_id)
);

-- Create scanner fraud detection table
CREATE TABLE IF NOT EXISTS public.scanner_fraud_detection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    qr_code TEXT NOT NULL,
    
    -- Fraud indicators
    fraud_type TEXT NOT NULL CHECK (fraud_type IN ('duplicate_scan', 'location_spoofing', 'time_manipulation', 'fake_qr', 'unauthorized_access')),
    risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    confidence_level DECIMAL(5,2) NOT NULL CHECK (confidence_level >= 0 AND confidence_level <= 100),
    
    -- Detection details
    detection_method TEXT NOT NULL,
    evidence JSONB,
    related_scans TEXT[], -- Array of related scan IDs
    
    -- Investigation status
    status TEXT DEFAULT 'detected' CHECK (status IN ('detected', 'investigating', 'confirmed', 'false_positive', 'resolved')),
    investigated_by UUID REFERENCES auth.users(id),
    investigation_notes TEXT,
    resolution_action TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scanner_audit_log_user_id ON public.scanner_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_scanner_audit_log_qr_code ON public.scanner_audit_log(qr_code);
CREATE INDEX IF NOT EXISTS idx_scanner_audit_log_scan_type ON public.scanner_audit_log(scan_type);
CREATE INDEX IF NOT EXISTS idx_scanner_audit_log_created_at ON public.scanner_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scanner_audit_log_location ON public.scanner_audit_log(scan_location_lat, scan_location_lng);

CREATE INDEX IF NOT EXISTS idx_scanner_access_control_user_id ON public.scanner_access_control(user_id);
CREATE INDEX IF NOT EXISTS idx_scanner_fraud_detection_user_id ON public.scanner_fraud_detection(user_id);
CREATE INDEX IF NOT EXISTS idx_scanner_fraud_detection_qr_code ON public.scanner_fraud_detection(qr_code);
CREATE INDEX IF NOT EXISTS idx_scanner_fraud_detection_status ON public.scanner_fraud_detection(status);

-- Enable Row Level Security
ALTER TABLE public.scanner_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scanner_access_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scanner_fraud_detection ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scanner_audit_log
-- Users can view their own scan logs
CREATE POLICY "scanner_audit_log_self_view" ON public.scanner_audit_log
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Admins can view all scan logs
CREATE POLICY "scanner_audit_log_admin_view" ON public.scanner_audit_log
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
    );

-- System can insert scan logs (controlled by application logic)
CREATE POLICY "scanner_audit_log_system_insert" ON public.scanner_audit_log
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- RLS Policies for scanner_access_control
-- Users can view their own access control settings
CREATE POLICY "scanner_access_control_self_view" ON public.scanner_access_control
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Admins can manage all access control settings
CREATE POLICY "scanner_access_control_admin_all" ON public.scanner_access_control
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
    );

-- RLS Policies for scanner_fraud_detection
-- Admins can view all fraud detection records
CREATE POLICY "scanner_fraud_detection_admin_view" ON public.scanner_fraud_detection
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
    );

-- System can insert fraud detection records
CREATE POLICY "scanner_fraud_detection_system_insert" ON public.scanner_fraud_detection
    FOR INSERT TO authenticated
    WITH CHECK (true); -- Controlled by application logic

-- Create function to validate scanner access
CREATE OR REPLACE FUNCTION public.validate_scanner_access(
    scan_type_param TEXT,
    scanner_device_id_param TEXT DEFAULT NULL,
    scan_location_lat_param DECIMAL(10,8) DEFAULT NULL,
    scan_location_lng_param DECIMAL(11,8) DEFAULT NULL
)
RETURNS TABLE (
    access_granted BOOLEAN,
    access_level TEXT,
    restrictions TEXT[],
    security_warnings TEXT[]
) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    user_access RECORD;
    current_hour INTEGER;
    current_day TEXT;
    daily_scan_count INTEGER;
    location_allowed BOOLEAN := true;
    device_allowed BOOLEAN := true;
    time_allowed BOOLEAN := true;
    restrictions_array TEXT[] := ARRAY[]::TEXT[];
    warnings_array TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Get user access control settings
    SELECT * INTO user_access
    FROM public.scanner_access_control
    WHERE user_id = auth.uid() AND is_active = true;
    
    -- If no access control record exists, create restrictive default for authenticated users
    IF NOT FOUND THEN
        INSERT INTO public.scanner_access_control (
            user_id, can_dispatch_scan, can_receive_scan, can_verify_scan, can_quality_check,
            max_daily_scans, require_photo_verification, require_location_verification
        ) VALUES (
            auth.uid(), false, false, false, false, 10, true, true
        );
        
        -- Get the newly created record
        SELECT * INTO user_access
        FROM public.scanner_access_control
        WHERE user_id = auth.uid();
    END IF;
    
    -- Check if user is suspended
    IF user_access.suspended_until IS NOT NULL AND user_access.suspended_until > NOW() THEN
        RETURN QUERY SELECT false, 'suspended', 
            ARRAY['Account suspended: ' || COALESCE(user_access.suspension_reason, 'Security violation')],
            ARRAY['Contact administrator to restore access'];
        RETURN;
    END IF;
    
    -- Check scan type permissions
    CASE scan_type_param
        WHEN 'dispatch' THEN
            IF NOT user_access.can_dispatch_scan THEN
                restrictions_array := array_append(restrictions_array, 'Dispatch scanning not permitted');
            END IF;
        WHEN 'receiving' THEN
            IF NOT user_access.can_receive_scan THEN
                restrictions_array := array_append(restrictions_array, 'Receiving scanning not permitted');
            END IF;
        WHEN 'verification' THEN
            IF NOT user_access.can_verify_scan THEN
                restrictions_array := array_append(restrictions_array, 'Verification scanning not permitted');
            END IF;
        WHEN 'quality_check' THEN
            IF NOT user_access.can_quality_check THEN
                restrictions_array := array_append(restrictions_array, 'Quality check scanning not permitted');
            END IF;
    END CASE;
    
    -- Check daily scan limits
    SELECT COUNT(*) INTO daily_scan_count
    FROM public.scanner_audit_log
    WHERE user_id = auth.uid()
    AND created_at >= CURRENT_DATE;
    
    IF daily_scan_count >= user_access.max_daily_scans THEN
        restrictions_array := array_append(restrictions_array, 
            'Daily scan limit reached (' || user_access.max_daily_scans || ')');
    END IF;
    
    -- Check time restrictions
    current_hour := EXTRACT(HOUR FROM NOW());
    current_day := LOWER(TO_CHAR(NOW(), 'Day'));
    
    IF user_access.allowed_hours IS NOT NULL THEN
        DECLARE
            start_hour INTEGER := (user_access.allowed_hours->>'start')::TIME::INTEGER;
            end_hour INTEGER := (user_access.allowed_hours->>'end')::TIME::INTEGER;
        BEGIN
            IF current_hour < start_hour OR current_hour > end_hour THEN
                time_allowed := false;
                restrictions_array := array_append(restrictions_array, 
                    'Scanning outside allowed hours');
            END IF;
        END;
    END IF;
    
    IF NOT (current_day = ANY(user_access.allowed_days)) THEN
        time_allowed := false;
        restrictions_array := array_append(restrictions_array, 
            'Scanning not allowed on ' || current_day);
    END IF;
    
    -- Check location restrictions
    IF scan_location_lat_param IS NOT NULL AND scan_location_lng_param IS NOT NULL THEN
        -- Check if location is in restricted areas
        IF user_access.restricted_locations IS NOT NULL THEN
            -- Simple location check (in production, would use proper geospatial functions)
            warnings_array := array_append(warnings_array, 'Location verification required');
        END IF;
    END IF;
    
    -- Check device restrictions
    IF user_access.require_device_verification AND scanner_device_id_param IS NOT NULL THEN
        IF user_access.allowed_devices IS NOT NULL AND 
           NOT (scanner_device_id_param = ANY(user_access.allowed_devices)) THEN
            device_allowed := false;
            restrictions_array := array_append(restrictions_array, 'Device not authorized for scanning');
        END IF;
    END IF;
    
    -- Determine access level and final decision
    DECLARE
        final_access BOOLEAN := (array_length(restrictions_array, 1) IS NULL OR array_length(restrictions_array, 1) = 0);
        access_level_text TEXT := CASE 
            WHEN NOT final_access THEN 'denied'
            WHEN array_length(warnings_array, 1) > 0 THEN 'restricted'
            ELSE 'full'
        END;
    BEGIN
        RETURN QUERY SELECT final_access, access_level_text, restrictions_array, warnings_array;
    END;
END;
$$;

-- Create function to detect scanner fraud
CREATE OR REPLACE FUNCTION public.detect_scanner_fraud(
    qr_code_param TEXT,
    scan_type_param TEXT,
    scan_location_lat_param DECIMAL(10,8) DEFAULT NULL,
    scan_location_lng_param DECIMAL(11,8) DEFAULT NULL
)
RETURNS TABLE (
    is_fraudulent BOOLEAN,
    fraud_type TEXT,
    risk_score INTEGER,
    evidence JSONB,
    recommended_action TEXT
) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    recent_scans INTEGER;
    duplicate_scans INTEGER;
    location_inconsistency BOOLEAN := false;
    time_inconsistency BOOLEAN := false;
    calculated_risk_score INTEGER := 0;
    fraud_evidence JSONB := '{}'::jsonb;
    detected_fraud_type TEXT := 'none';
BEGIN
    -- Check for duplicate scans in short time window
    SELECT COUNT(*) INTO duplicate_scans
    FROM public.scanner_audit_log
    WHERE qr_code = qr_code_param
    AND user_id = auth.uid()
    AND created_at >= NOW() - INTERVAL '5 minutes';
    
    IF duplicate_scans > 0 THEN
        detected_fraud_type := 'duplicate_scan';
        calculated_risk_score := calculated_risk_score + 40;
        fraud_evidence := jsonb_set(fraud_evidence, '{duplicate_scans}', to_jsonb(duplicate_scans));
    END IF;
    
    -- Check for excessive scanning frequency
    SELECT COUNT(*) INTO recent_scans
    FROM public.scanner_audit_log
    WHERE user_id = auth.uid()
    AND created_at >= NOW() - INTERVAL '1 hour';
    
    IF recent_scans > 50 THEN
        detected_fraud_type := 'excessive_scanning';
        calculated_risk_score := calculated_risk_score + 30;
        fraud_evidence := jsonb_set(fraud_evidence, '{hourly_scans}', to_jsonb(recent_scans));
    END IF;
    
    -- Check for location inconsistencies
    IF scan_location_lat_param IS NOT NULL AND scan_location_lng_param IS NOT NULL THEN
        -- Check if location is drastically different from recent scans
        DECLARE
            avg_lat DECIMAL(10,8);
            avg_lng DECIMAL(11,8);
            distance_km DECIMAL(8,2);
        BEGIN
            SELECT AVG(scan_location_lat), AVG(scan_location_lng) INTO avg_lat, avg_lng
            FROM public.scanner_audit_log
            WHERE user_id = auth.uid()
            AND scan_location_lat IS NOT NULL
            AND scan_location_lng IS NOT NULL
            AND created_at >= NOW() - INTERVAL '24 hours';
            
            IF avg_lat IS NOT NULL AND avg_lng IS NOT NULL THEN
                distance_km := (6371 * acos(
                    cos(radians(scan_location_lat_param)) * 
                    cos(radians(avg_lat)) * 
                    cos(radians(avg_lng) - radians(scan_location_lng_param)) + 
                    sin(radians(scan_location_lat_param)) * 
                    sin(radians(avg_lat))
                ));
                
                IF distance_km > 100 THEN -- More than 100km from usual location
                    location_inconsistency := true;
                    calculated_risk_score := calculated_risk_score + 25;
                    fraud_evidence := jsonb_set(fraud_evidence, '{location_distance_km}', to_jsonb(distance_km));
                END IF;
            END IF;
        END;
    END IF;
    
    -- Check for unusual time patterns
    DECLARE
        current_hour INTEGER := EXTRACT(HOUR FROM NOW());
        night_scans INTEGER;
    BEGIN
        IF current_hour < 6 OR current_hour > 22 THEN
            SELECT COUNT(*) INTO night_scans
            FROM public.scanner_audit_log
            WHERE user_id = auth.uid()
            AND EXTRACT(HOUR FROM created_at) NOT BETWEEN 6 AND 22
            AND created_at >= NOW() - INTERVAL '7 days';
            
            IF night_scans > 5 THEN
                time_inconsistency := true;
                calculated_risk_score := calculated_risk_score + 20;
                fraud_evidence := jsonb_set(fraud_evidence, '{night_scans}', to_jsonb(night_scans));
            END IF;
        END IF;
    END;
    
    -- Determine recommended action
    DECLARE
        recommended_action_text TEXT := CASE 
            WHEN calculated_risk_score > 70 THEN 'Block user and require manual verification'
            WHEN calculated_risk_score > 50 THEN 'Require additional verification for scans'
            WHEN calculated_risk_score > 30 THEN 'Monitor user activity closely'
            ELSE 'Continue normal monitoring'
        END;
    BEGIN
        RETURN QUERY SELECT 
            calculated_risk_score > 30,
            detected_fraud_type,
            calculated_risk_score,
            fraud_evidence,
            recommended_action_text;
    END;
END;
$$;

-- Create function to log secure scan
CREATE OR REPLACE FUNCTION public.log_secure_scan(
    qr_code_param TEXT,
    scan_type_param TEXT,
    scanner_type_param TEXT,
    scanner_device_id_param TEXT DEFAULT NULL,
    material_condition_param TEXT DEFAULT 'good',
    scan_notes_param TEXT DEFAULT NULL,
    scan_location_lat_param DECIMAL(10,8) DEFAULT NULL,
    scan_location_lng_param DECIMAL(11,8) DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    scan_id UUID,
    security_warnings TEXT[],
    fraud_detected BOOLEAN
) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    new_scan_id UUID;
    access_validation RECORD;
    fraud_check RECORD;
    warnings_array TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Validate scanner access
    SELECT * INTO access_validation
    FROM public.validate_scanner_access(
        scan_type_param, 
        scanner_device_id_param, 
        scan_location_lat_param, 
        scan_location_lng_param
    );
    
    IF NOT access_validation.access_granted THEN
        RETURN QUERY SELECT false, NULL::UUID, access_validation.restrictions, false;
        RETURN;
    END IF;
    
    -- Check for fraud
    SELECT * INTO fraud_check
    FROM public.detect_scanner_fraud(
        qr_code_param,
        scan_type_param,
        scan_location_lat_param,
        scan_location_lng_param
    );
    
    -- Log the scan attempt
    INSERT INTO public.scanner_audit_log (
        user_id,
        qr_code,
        scan_type,
        scanner_type,
        scanner_device_id,
        scan_location_lat,
        scan_location_lng,
        material_condition,
        scan_notes,
        fraud_risk_score,
        security_flags,
        scan_success
    ) VALUES (
        auth.uid(),
        qr_code_param,
        scan_type_param,
        scanner_type_param,
        scanner_device_id_param,
        scan_location_lat_param,
        scan_location_lng_param,
        material_condition_param,
        scan_notes_param,
        fraud_check.risk_score,
        CASE WHEN fraud_check.is_fraudulent THEN ARRAY[fraud_check.fraud_type] ELSE ARRAY[]::TEXT[] END,
        NOT fraud_check.is_fraudulent
    ) RETURNING id INTO new_scan_id;
    
    -- If fraud detected, log it
    IF fraud_check.is_fraudulent THEN
        INSERT INTO public.scanner_fraud_detection (
            user_id,
            qr_code,
            fraud_type,
            risk_score,
            confidence_level,
            detection_method,
            evidence
        ) VALUES (
            auth.uid(),
            qr_code_param,
            fraud_check.fraud_type,
            fraud_check.risk_score,
            85.0, -- Default confidence
            'automated_detection',
            fraud_check.evidence
        );
        
        warnings_array := array_append(warnings_array, 'Potential fraud detected - scan flagged for review');
    END IF;
    
    -- Add access validation warnings
    IF access_validation.security_warnings IS NOT NULL THEN
        warnings_array := warnings_array || access_validation.security_warnings;
    END IF;
    
    RETURN QUERY SELECT 
        NOT fraud_check.is_fraudulent, 
        new_scan_id, 
        warnings_array, 
        fraud_check.is_fraudulent;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.validate_scanner_access(TEXT, TEXT, DECIMAL(10,8), DECIMAL(11,8)) TO authenticated;
GRANT EXECUTE ON FUNCTION public.detect_scanner_fraud(TEXT, TEXT, DECIMAL(10,8), DECIMAL(11,8)) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_secure_scan(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DECIMAL(10,8), DECIMAL(11,8)) TO authenticated;

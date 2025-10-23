-- Enhanced Scanner Security Functions
-- Migration: 20241213_enhanced_scanner_security.sql

-- Create server-side QR code validation function
CREATE OR REPLACE FUNCTION public.validate_qr_code_server_side(
    qr_code_param TEXT,
    material_data_param JSONB DEFAULT NULL
)
RETURNS TABLE (
    is_valid BOOLEAN,
    validation_score INTEGER,
    security_flags TEXT[],
    error_message TEXT
) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    material_record RECORD;
    validation_score_val INTEGER := 0;
    security_flags_array TEXT[] := ARRAY[]::TEXT[];
    error_msg TEXT := NULL;
BEGIN
    -- Input validation
    IF qr_code_param IS NULL OR LENGTH(qr_code_param) < 10 THEN
        RETURN QUERY SELECT false, 0, ARRAY['INVALID_FORMAT'], 'QR code format invalid';
        RETURN;
    END IF;

    -- Check QR code format
    IF NOT qr_code_param ~ '^UJP-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+(-CHK[a-f0-9]{8})?$' THEN
        security_flags_array := array_append(security_flags_array, 'INVALID_FORMAT');
        validation_score_val := validation_score_val - 50;
    ELSE
        validation_score_val := validation_score_val + 20;
    END IF;

    -- Check if QR code exists in database
    SELECT * INTO material_record
    FROM public.material_items
    WHERE qr_code = qr_code_param AND is_active = true;

    IF NOT FOUND THEN
        security_flags_array := array_append(security_flags_array, 'NOT_FOUND');
        RETURN QUERY SELECT false, validation_score_val, security_flags_array, 'QR code not found in database';
        RETURN;
    END IF;

    validation_score_val := validation_score_val + 30;

    -- Validate material data consistency if provided
    IF material_data_param IS NOT NULL THEN
        IF (material_data_param->>'material_type') != material_record.material_type THEN
            security_flags_array := array_append(security_flags_array, 'MATERIAL_TYPE_MISMATCH');
            validation_score_val := validation_score_val - 30;
        END IF;

        IF (material_data_param->>'supplier_id')::UUID != material_record.supplier_id THEN
            security_flags_array := array_append(security_flags_array, 'SUPPLIER_MISMATCH');
            validation_score_val := validation_score_val - 20;
        END IF;
    END IF;

    -- Check for recent suspicious activity
    IF EXISTS (
        SELECT 1 FROM public.scanner_fraud_detection
        WHERE qr_code = qr_code_param 
        AND created_at > NOW() - INTERVAL '24 hours'
        AND status = 'active'
    ) THEN
        security_flags_array := array_append(security_flags_array, 'RECENT_FRAUD_ALERT');
        validation_score_val := validation_score_val - 40;
    END IF;

    -- Final validation score
    IF validation_score_val >= 50 THEN
        RETURN QUERY SELECT true, validation_score_val, security_flags_array, NULL::TEXT;
    ELSE
        RETURN QUERY SELECT false, validation_score_val, security_flags_array, 'Validation failed - security score too low';
    END IF;
END;
$$;

-- Create location verification function
CREATE OR REPLACE FUNCTION public.verify_scan_location(
    scan_lat DECIMAL(10,8),
    scan_lng DECIMAL(11,8),
    ip_address_param INET DEFAULT NULL
)
RETURNS TABLE (
    location_valid BOOLEAN,
    confidence_score INTEGER,
    verification_method TEXT,
    warnings TEXT[]
) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    user_access RECORD;
    ip_location RECORD;
    distance_km DECIMAL;
    confidence INTEGER := 0;
    warnings_array TEXT[] := ARRAY[]::TEXT[];
    verification_methods TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Get user access control settings
    SELECT * INTO user_access
    FROM public.scanner_access_control
    WHERE user_id = auth.uid() AND is_active = true;

    -- GPS coordinate validation
    IF scan_lat IS NOT NULL AND scan_lng IS NOT NULL THEN
        -- Check if coordinates are within reasonable bounds
        IF scan_lat BETWEEN -90 AND 90 AND scan_lng BETWEEN -180 AND 180 THEN
            confidence := confidence + 30;
            verification_methods := array_append(verification_methods, 'GPS');
            
            -- Check against allowed locations if configured
            IF user_access.allowed_locations IS NOT NULL AND array_length(user_access.allowed_locations, 1) > 0 THEN
                -- Simplified location check (in production, use proper geospatial functions)
                confidence := confidence + 20;
            END IF;
        ELSE
            warnings_array := array_append(warnings_array, 'INVALID_GPS_COORDINATES');
            confidence := confidence - 20;
        END IF;
    ELSE
        warnings_array := array_append(warnings_array, 'NO_GPS_DATA');
        confidence := confidence - 10;
    END IF;

    -- IP-based location verification (simplified)
    IF ip_address_param IS NOT NULL THEN
        verification_methods := array_append(verification_methods, 'IP_GEOLOCATION');
        confidence := confidence + 15;
        
        -- Check for VPN/Proxy indicators (simplified check)
        IF ip_address_param <<= '10.0.0.0/8'::inet OR 
           ip_address_param <<= '172.16.0.0/12'::inet OR 
           ip_address_param <<= '192.168.0.0/16'::inet THEN
            warnings_array := array_append(warnings_array, 'PRIVATE_IP_ADDRESS');
            confidence := confidence - 5;
        END IF;
    END IF;

    -- Time-based validation
    IF user_access.allowed_hours IS NOT NULL THEN
        DECLARE
            current_hour INTEGER := EXTRACT(HOUR FROM NOW());
            start_hour INTEGER := (user_access.allowed_hours->>'start')::TIME::INTEGER;
            end_hour INTEGER := (user_access.allowed_hours->>'end')::TIME::INTEGER;
        BEGIN
            IF current_hour BETWEEN start_hour AND end_hour THEN
                confidence := confidence + 10;
            ELSE
                warnings_array := array_append(warnings_array, 'OUTSIDE_ALLOWED_HOURS');
                confidence := confidence - 15;
            END IF;
        END;
    END IF;

    -- Return results
    RETURN QUERY SELECT 
        confidence >= 40,
        confidence,
        array_to_string(verification_methods, ','),
        warnings_array;
END;
$$;

-- Create device fingerprinting function
CREATE OR REPLACE FUNCTION public.generate_device_fingerprint(
    user_agent_param TEXT,
    screen_resolution TEXT DEFAULT NULL,
    timezone_offset INTEGER DEFAULT NULL,
    language_param TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    fingerprint_data TEXT;
    fingerprint_hash TEXT;
BEGIN
    -- Combine device characteristics
    fingerprint_data := COALESCE(user_agent_param, '') || '|' ||
                       COALESCE(screen_resolution, '') || '|' ||
                       COALESCE(timezone_offset::TEXT, '') || '|' ||
                       COALESCE(language_param, '');

    -- Generate hash
    fingerprint_hash := encode(digest(fingerprint_data, 'sha256'), 'hex');
    
    RETURN fingerprint_hash;
END;
$$;

-- Create rate limiting function
CREATE OR REPLACE FUNCTION public.check_scan_rate_limit(
    user_id_param UUID DEFAULT auth.uid()
)
RETURNS TABLE (
    rate_limit_ok BOOLEAN,
    current_count INTEGER,
    limit_threshold INTEGER,
    reset_time TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    scan_count INTEGER;
    daily_limit INTEGER;
    hourly_count INTEGER;
    user_access RECORD;
BEGIN
    -- Get user access control settings
    SELECT * INTO user_access
    FROM public.scanner_access_control
    WHERE user_id = user_id_param AND is_active = true;

    daily_limit := COALESCE(user_access.max_daily_scans, 100);

    -- Check daily scan count
    SELECT COUNT(*) INTO scan_count
    FROM public.scanner_audit_log
    WHERE user_id = user_id_param
    AND created_at >= CURRENT_DATE;

    -- Check hourly scan count (additional protection)
    SELECT COUNT(*) INTO hourly_count
    FROM public.scanner_audit_log
    WHERE user_id = user_id_param
    AND created_at >= NOW() - INTERVAL '1 hour';

    -- Return rate limit status
    RETURN QUERY SELECT 
        scan_count < daily_limit AND hourly_count < 50,
        scan_count,
        daily_limit,
        (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMP WITH TIME ZONE;
END;
$$;

-- Create QR validation logging functions
CREATE OR REPLACE FUNCTION public.log_qr_validation_success(
    qr_code_param TEXT,
    material_id_param UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.scanner_audit_log (
        user_id,
        material_item_id,
        qr_code,
        scan_type,
        scanner_type,
        scan_verified,
        verification_method,
        scan_success
    ) VALUES (
        auth.uid(),
        material_id_param,
        qr_code_param,
        'verification',
        'web_scanner',
        true,
        'server_side_validation',
        true
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.log_qr_validation_failure(
    qr_code_param TEXT,
    error_message TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.scanner_audit_log (
        user_id,
        qr_code,
        scan_type,
        scanner_type,
        scan_verified,
        verification_method,
        scan_success,
        scan_notes
    ) VALUES (
        auth.uid(),
        qr_code_param,
        'verification',
        'web_scanner',
        false,
        'server_side_validation',
        false,
        'Validation failed: ' || error_message
    );

    -- Log potential security incident
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
        'fake_qr',
        75,
        85.0,
        'validation_failure',
        jsonb_build_object('error', error_message, 'timestamp', NOW())
    );
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scanner_audit_log_user_date ON public.scanner_audit_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_scanner_fraud_detection_qr_date ON public.scanner_fraud_detection(qr_code, created_at);
CREATE INDEX IF NOT EXISTS idx_material_items_qr_active ON public.material_items(qr_code, is_active);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.validate_qr_code_server_side TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_scan_location TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_device_fingerprint TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_scan_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_qr_validation_success TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_qr_validation_failure TO authenticated;















-- Geographic security and geofencing for delivery operations
-- Migration: 20241212_delivery_geographic_security.sql

-- Create delivery geofencing table
CREATE TABLE IF NOT EXISTS public.delivery_geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    
    -- Geographic boundaries
    center_lat DECIMAL(10,8) NOT NULL,
    center_lng DECIMAL(11,8) NOT NULL,
    radius_km DECIMAL(8,2) NOT NULL CHECK (radius_km > 0),
    
    -- Polygon boundaries (for complex shapes)
    boundary_polygon JSONB, -- Array of lat/lng points
    
    -- Security settings
    security_level TEXT NOT NULL DEFAULT 'medium' CHECK (security_level IN ('low', 'medium', 'high', 'critical')),
    allowed_operations TEXT[] DEFAULT ARRAY['create_delivery', 'track_delivery']::TEXT[],
    restricted_operations TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Time-based restrictions
    active_hours JSONB DEFAULT '{"start": "06:00", "end": "22:00"}'::jsonb,
    active_days TEXT[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']::TEXT[],
    
    -- Access control
    allowed_roles TEXT[] DEFAULT ARRAY['admin', 'builder', 'supplier']::TEXT[],
    requires_approval BOOLEAN DEFAULT false,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create delivery location restrictions table
CREATE TABLE IF NOT EXISTS public.delivery_location_restrictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_name TEXT NOT NULL,
    restriction_type TEXT NOT NULL CHECK (restriction_type IN ('blocked', 'restricted', 'high_security', 'time_limited')),
    
    -- Location definition
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    radius_km DECIMAL(8,2) DEFAULT 1.0,
    
    -- Restriction details
    reason TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    
    -- Time restrictions
    restricted_hours JSONB,
    restricted_days TEXT[],
    
    -- Override permissions
    override_roles TEXT[] DEFAULT ARRAY['admin']::TEXT[],
    requires_special_approval BOOLEAN DEFAULT false,
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create delivery security zones table
CREATE TABLE IF NOT EXISTS public.delivery_security_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_name TEXT NOT NULL,
    zone_type TEXT NOT NULL CHECK (zone_type IN ('safe', 'monitored', 'restricted', 'prohibited')),
    
    -- Geographic definition
    center_lat DECIMAL(10,8) NOT NULL,
    center_lng DECIMAL(11,8) NOT NULL,
    radius_km DECIMAL(8,2) NOT NULL,
    
    -- Security measures
    requires_escort BOOLEAN DEFAULT false,
    requires_tracking BOOLEAN DEFAULT true,
    requires_photo_verification BOOLEAN DEFAULT false,
    max_delivery_value DECIMAL(12,2),
    
    -- Monitoring settings
    enhanced_monitoring BOOLEAN DEFAULT false,
    alert_on_entry BOOLEAN DEFAULT false,
    alert_on_extended_stay BOOLEAN DEFAULT false,
    max_stay_minutes INTEGER DEFAULT 120,
    
    -- Access control
    allowed_vehicle_types TEXT[],
    prohibited_times JSONB,
    special_requirements TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for geographic queries
CREATE INDEX IF NOT EXISTS idx_delivery_geofences_location ON public.delivery_geofences(center_lat, center_lng);
CREATE INDEX IF NOT EXISTS idx_delivery_location_restrictions_location ON public.delivery_location_restrictions(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_delivery_security_zones_location ON public.delivery_security_zones(center_lat, center_lng);

-- Enable RLS on geographic security tables
ALTER TABLE public.delivery_geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_location_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_security_zones ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read active geofences
CREATE POLICY "delivery_geofences_read_active" ON public.delivery_geofences
    FOR SELECT TO authenticated
    USING (is_active = true);

-- Authenticated users can read active restrictions
CREATE POLICY "delivery_location_restrictions_read_active" ON public.delivery_location_restrictions
    FOR SELECT TO authenticated
    USING (is_active = true);

-- Authenticated users can read security zones
CREATE POLICY "delivery_security_zones_read_all" ON public.delivery_security_zones
    FOR SELECT TO authenticated
    USING (true);

-- Admins can manage all geographic security data
CREATE POLICY "delivery_geofences_admin_all" ON public.delivery_geofences
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- Function to validate delivery location security
CREATE OR REPLACE FUNCTION public.validate_delivery_location_security(
    pickup_lat DECIMAL(10,8),
    pickup_lng DECIMAL(11,8),
    delivery_lat DECIMAL(10,8),
    delivery_lng DECIMAL(11,8),
    operation_type TEXT DEFAULT 'create_delivery'
)
RETURNS TABLE (
    allowed BOOLEAN,
    security_level TEXT,
    restrictions TEXT[],
    warnings TEXT[],
    required_approvals TEXT[]
) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    pickup_restrictions TEXT[] := ARRAY[]::TEXT[];
    delivery_restrictions TEXT[] := ARRAY[]::TEXT[];
    security_warnings TEXT[] := ARRAY[]::TEXT[];
    approval_requirements TEXT[] := ARRAY[]::TEXT[];
    max_security_level TEXT := 'low';
    location_allowed BOOLEAN := true;
BEGIN
    -- Check pickup location restrictions
    FOR rec IN 
        SELECT * FROM public.delivery_location_restrictions
        WHERE is_active = true
        AND (6371 * acos(
            cos(radians(pickup_lat)) * 
            cos(radians(latitude)) * 
            cos(radians(longitude) - radians(pickup_lng)) + 
            sin(radians(pickup_lat)) * 
            sin(radians(latitude))
        )) <= radius_km
    LOOP
        pickup_restrictions := array_append(pickup_restrictions, 
            'Pickup: ' || rec.restriction_type || ' - ' || rec.reason);
        
        IF rec.restriction_type = 'blocked' THEN
            location_allowed := false;
        END IF;
        
        IF rec.severity = 'critical' THEN
            max_security_level := 'critical';
        ELSIF rec.severity = 'high' AND max_security_level != 'critical' THEN
            max_security_level := 'high';
        END IF;
        
        IF rec.requires_special_approval THEN
            approval_requirements := array_append(approval_requirements, 
                'Special approval required for pickup location');
        END IF;
    END LOOP;
    
    -- Check delivery location restrictions
    FOR rec IN 
        SELECT * FROM public.delivery_location_restrictions
        WHERE is_active = true
        AND (6371 * acos(
            cos(radians(delivery_lat)) * 
            cos(radians(latitude)) * 
            cos(radians(longitude) - radians(delivery_lng)) + 
            sin(radians(delivery_lat)) * 
            sin(radians(latitude))
        )) <= radius_km
    LOOP
        delivery_restrictions := array_append(delivery_restrictions, 
            'Delivery: ' || rec.restriction_type || ' - ' || rec.reason);
        
        IF rec.restriction_type = 'blocked' THEN
            location_allowed := false;
        END IF;
        
        IF rec.requires_special_approval THEN
            approval_requirements := array_append(approval_requirements, 
                'Special approval required for delivery location');
        END IF;
    END LOOP;
    
    -- Check security zones
    FOR rec IN 
        SELECT * FROM public.delivery_security_zones
        WHERE zone_type IN ('restricted', 'prohibited')
        AND (
            (6371 * acos(
                cos(radians(pickup_lat)) * 
                cos(radians(center_lat)) * 
                cos(radians(center_lng) - radians(pickup_lng)) + 
                sin(radians(pickup_lat)) * 
                sin(radians(center_lat))
            )) <= radius_km
            OR
            (6371 * acos(
                cos(radians(delivery_lat)) * 
                cos(radians(center_lat)) * 
                cos(radians(center_lng) - radians(delivery_lng)) + 
                sin(radians(delivery_lat)) * 
                sin(radians(center_lat))
            )) <= radius_km
        )
    LOOP
        security_warnings := array_append(security_warnings, 
            'Security zone: ' || rec.zone_name || ' (' || rec.zone_type || ')');
        
        IF rec.zone_type = 'prohibited' THEN
            location_allowed := false;
        END IF;
        
        IF rec.requires_escort THEN
            approval_requirements := array_append(approval_requirements, 
                'Security escort required in ' || rec.zone_name);
        END IF;
    END LOOP;
    
    -- Combine all restrictions
    RETURN QUERY SELECT 
        location_allowed,
        max_security_level,
        pickup_restrictions || delivery_restrictions,
        security_warnings,
        approval_requirements;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_delivery_rate_limit(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_bulk_delivery_limit(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_delivery_location_security(DECIMAL(10,8), DECIMAL(11,8), DECIMAL(10,8), DECIMAL(11,8), TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.detect_suspicious_delivery_activity(UUID) TO authenticated;

-- Create delivery system functions
-- Migration: 20241212_delivery_functions.sql

-- Function to find available delivery providers
CREATE OR REPLACE FUNCTION public.find_available_providers(
    pickup_lat DECIMAL(10,8),
    pickup_lng DECIMAL(11,8),
    delivery_lat DECIMAL(10,8),
    delivery_lng DECIMAL(11,8),
    material_weight_kg DECIMAL(10,2) DEFAULT NULL,
    urgency TEXT DEFAULT 'normal'
)
RETURNS TABLE (
    id UUID,
    provider_name TEXT,
    provider_type TEXT,
    vehicle_type TEXT,
    rating DECIMAL(3,2),
    estimated_cost DECIMAL(10,2),
    estimated_time_hours DECIMAL(5,2),
    distance_from_pickup_km DECIMAL(8,2),
    availability_status TEXT
) 
LANGUAGE SQL SECURITY DEFINER
AS $$
    WITH pickup_distance AS (
        SELECT 
            dp.*,
            -- Calculate distance from provider to pickup location
            (6371 * acos(
                cos(radians(pickup_lat)) * 
                cos(radians(dp.base_location_lat)) * 
                cos(radians(dp.base_location_lng) - radians(pickup_lng)) + 
                sin(radians(pickup_lat)) * 
                sin(radians(dp.base_location_lat))
            )) as distance_to_pickup,
            -- Calculate delivery distance
            (6371 * acos(
                cos(radians(pickup_lat)) * 
                cos(radians(delivery_lat)) * 
                cos(radians(delivery_lng) - radians(pickup_lng)) + 
                sin(radians(pickup_lat)) * 
                sin(radians(delivery_lat))
            )) as delivery_distance
        FROM public.delivery_providers dp
        WHERE 
            dp.is_verified = true 
            AND dp.is_active = true 
            AND dp.availability_status = 'available'
            AND dp.base_location_lat IS NOT NULL 
            AND dp.base_location_lng IS NOT NULL
    )
    SELECT 
        pd.id,
        pd.provider_name,
        pd.provider_type,
        pd.vehicle_type,
        pd.rating,
        -- Calculate estimated cost
        ROUND(
            (pd.minimum_charge + 
             pd.pricing_per_km * pd.delivery_distance + 
             COALESCE(pd.pricing_per_kg * material_weight_kg, 0) +
             CASE urgency 
                 WHEN 'urgent' THEN pd.minimum_charge * 0.5
                 WHEN 'emergency' THEN pd.minimum_charge * 1.0
                 ELSE 0 
             END)::numeric, 2
        ) as estimated_cost,
        -- Calculate estimated delivery time
        ROUND(
            (pd.delivery_distance / 40.0 + -- Assume 40 km/h average speed
             pd.distance_to_pickup / 50.0)::numeric, 2 -- Assume 50 km/h to pickup
        ) as estimated_time_hours,
        ROUND(pd.distance_to_pickup::numeric, 2) as distance_from_pickup_km,
        pd.availability_status
    FROM pickup_distance pd
    WHERE 
        pd.distance_to_pickup <= pd.max_delivery_radius_km
        AND (material_weight_kg IS NULL OR material_weight_kg <= pd.vehicle_capacity_kg)
    ORDER BY 
        -- Prioritize by rating, then by distance, then by cost
        pd.rating DESC,
        pd.distance_to_pickup ASC,
        estimated_cost ASC;
$$;

-- Function to get delivery with full details
CREATE OR REPLACE FUNCTION public.get_delivery_details(delivery_uuid UUID)
RETURNS TABLE (
    id UUID,
    tracking_number TEXT,
    material_type TEXT,
    quantity DECIMAL(10,2),
    unit TEXT,
    status TEXT,
    progress INTEGER,
    pickup_address TEXT,
    delivery_address TEXT,
    contact_name TEXT,
    contact_phone TEXT,
    scheduled_pickup_time TIMESTAMP WITH TIME ZONE,
    scheduled_delivery_time TIMESTAMP WITH TIME ZONE,
    actual_pickup_time TIMESTAMP WITH TIME ZONE,
    actual_delivery_time TIMESTAMP WITH TIME ZONE,
    estimated_cost DECIMAL(10,2),
    final_cost DECIMAL(10,2),
    provider_name TEXT,
    provider_phone TEXT,
    provider_rating DECIMAL(3,2),
    current_location JSONB,
    can_contact_provider BOOLEAN
) 
LANGUAGE SQL SECURITY DEFINER
AS $$
    SELECT 
        d.id,
        d.tracking_number,
        d.material_type,
        d.quantity,
        d.unit,
        d.status,
        d.progress,
        d.pickup_address,
        d.delivery_address,
        d.contact_name,
        d.contact_phone,
        d.scheduled_pickup_time,
        d.scheduled_delivery_time,
        d.actual_pickup_time,
        d.actual_delivery_time,
        d.estimated_cost,
        d.final_cost,
        dp.provider_name,
        -- Only show provider contact to authorized users
        CASE 
            WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
                OR d.builder_id = auth.uid()
                OR d.supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid())
            THEN dp.phone
            ELSE '[Contact via platform]'
        END as provider_phone,
        dp.rating as provider_rating,
        -- Get latest location from tracking
        (
            SELECT jsonb_build_object(
                'latitude', dt.latitude,
                'longitude', dt.longitude,
                'location_description', dt.location_description,
                'recorded_at', dt.recorded_at,
                'speed_kmh', dt.speed_kmh,
                'heading_degrees', dt.heading_degrees
            )
            FROM public.delivery_tracking dt
            WHERE dt.delivery_id = d.id
            ORDER BY dt.recorded_at DESC
            LIMIT 1
        ) as current_location,
        -- Check if user can contact provider directly
        (
            EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
            OR d.builder_id = auth.uid()
        ) as can_contact_provider
    FROM public.deliveries d
    LEFT JOIN public.delivery_providers dp ON d.provider_id = dp.id
    WHERE d.id = delivery_uuid;
$$;

-- Function to create delivery request with cost calculation
CREATE OR REPLACE FUNCTION public.create_delivery_request(
    material_type TEXT,
    quantity DECIMAL(10,2),
    unit TEXT,
    pickup_address TEXT,
    pickup_lat DECIMAL(10,8),
    pickup_lng DECIMAL(11,8),
    delivery_address TEXT,
    delivery_lat DECIMAL(10,8),
    delivery_lng DECIMAL(11,8),
    contact_name TEXT,
    contact_phone TEXT,
    requested_date DATE DEFAULT NULL,
    priority TEXT DEFAULT 'normal',
    special_instructions TEXT DEFAULT NULL,
    weight_kg DECIMAL(10,2) DEFAULT NULL
)
RETURNS TABLE (
    delivery_id UUID,
    tracking_number TEXT,
    estimated_cost DECIMAL(10,2),
    available_providers INTEGER
) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    new_delivery_id UUID;
    new_tracking_number TEXT;
    calculated_distance DECIMAL(8,2);
    base_cost DECIMAL(10,2);
    provider_count INTEGER;
BEGIN
    -- Generate unique tracking number
    new_tracking_number := 'UJP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD((RANDOM() * 9999)::INTEGER::TEXT, 4, '0');
    
    -- Calculate distance
    calculated_distance := (6371 * acos(
        cos(radians(pickup_lat)) * 
        cos(radians(delivery_lat)) * 
        cos(radians(delivery_lng) - radians(pickup_lng)) + 
        sin(radians(pickup_lat)) * 
        sin(radians(delivery_lat))
    ));
    
    -- Calculate base cost (using average provider rates)
    base_cost := 500 + (calculated_distance * 50) + COALESCE(weight_kg * 10, 0);
    
    -- Apply priority multiplier
    base_cost := base_cost * CASE priority
        WHEN 'urgent' THEN 1.5
        WHEN 'emergency' THEN 2.0
        ELSE 1.0
    END;
    
    -- Create delivery record
    INSERT INTO public.deliveries (
        tracking_number,
        builder_id,
        material_type,
        quantity,
        unit,
        pickup_address,
        pickup_lat,
        pickup_lng,
        delivery_address,
        delivery_lat,
        delivery_lng,
        distance_km,
        contact_name,
        contact_phone,
        requested_date,
        priority,
        special_instructions,
        weight_kg,
        estimated_cost,
        status
    ) VALUES (
        new_tracking_number,
        auth.uid(),
        material_type,
        quantity,
        unit,
        pickup_address,
        pickup_lat,
        pickup_lng,
        delivery_address,
        delivery_lat,
        delivery_lng,
        calculated_distance,
        contact_name,
        contact_phone,
        requested_date,
        priority,
        special_instructions,
        weight_kg,
        base_cost,
        'pending'
    ) RETURNING id INTO new_delivery_id;
    
    -- Count available providers
    SELECT COUNT(*) INTO provider_count
    FROM public.find_available_providers(
        pickup_lat, pickup_lng, delivery_lat, delivery_lng, weight_kg, priority
    );
    
    -- Create initial notification
    INSERT INTO public.delivery_notifications (
        delivery_id,
        recipient_id,
        type,
        title,
        message,
        priority,
        delivery_info
    ) VALUES (
        new_delivery_id,
        auth.uid(),
        'status_update',
        'Delivery Request Created',
        'Your delivery request has been created and is being processed.',
        'medium',
        jsonb_build_object(
            'tracking_number', new_tracking_number,
            'material_type', material_type,
            'status', 'pending'
        )
    );
    
    RETURN QUERY SELECT new_delivery_id, new_tracking_number, base_cost, provider_count;
END;
$$;

-- Function to update delivery status with notifications
CREATE OR REPLACE FUNCTION public.update_delivery_status(
    delivery_uuid UUID,
    new_status TEXT,
    location_description TEXT DEFAULT NULL,
    notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    delivery_record RECORD;
    notification_title TEXT;
    notification_message TEXT;
BEGIN
    -- Get delivery details
    SELECT * INTO delivery_record FROM public.deliveries WHERE id = delivery_uuid;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Update delivery status
    UPDATE public.deliveries 
    SET 
        status = new_status,
        progress = CASE new_status
            WHEN 'confirmed' THEN 10
            WHEN 'dispatched' THEN 25
            WHEN 'picked_up' THEN 40
            WHEN 'in_transit' THEN 60
            WHEN 'out_for_delivery' THEN 80
            WHEN 'delivered' THEN 95
            WHEN 'completed' THEN 100
            ELSE progress
        END,
        actual_pickup_time = CASE WHEN new_status = 'picked_up' AND actual_pickup_time IS NULL THEN NOW() ELSE actual_pickup_time END,
        actual_delivery_time = CASE WHEN new_status = 'delivered' AND actual_delivery_time IS NULL THEN NOW() ELSE actual_delivery_time END,
        delivery_notes = COALESCE(notes, delivery_notes),
        updated_at = NOW()
    WHERE id = delivery_uuid;
    
    -- Create status-specific notifications
    notification_title := CASE new_status
        WHEN 'confirmed' THEN 'Delivery Confirmed'
        WHEN 'dispatched' THEN 'Delivery Dispatched'
        WHEN 'picked_up' THEN 'Materials Picked Up'
        WHEN 'in_transit' THEN 'Delivery In Transit'
        WHEN 'out_for_delivery' THEN 'Out for Delivery'
        WHEN 'delivered' THEN 'Delivery Completed'
        WHEN 'completed' THEN 'Order Completed'
        ELSE 'Status Updated'
    END;
    
    notification_message := CASE new_status
        WHEN 'confirmed' THEN 'Your delivery has been confirmed and a provider has been assigned.'
        WHEN 'dispatched' THEN 'Your delivery is on the way from the supplier.'
        WHEN 'picked_up' THEN 'Materials have been picked up and are en route to your location.'
        WHEN 'in_transit' THEN 'Your delivery is currently in transit.'
        WHEN 'out_for_delivery' THEN 'Your delivery is out for final delivery and should arrive soon.'
        WHEN 'delivered' THEN 'Your materials have been delivered successfully.'
        WHEN 'completed' THEN 'Delivery has been completed and confirmed.'
        ELSE 'Delivery status has been updated to: ' || new_status
    END;
    
    -- Add location information if provided
    IF location_description IS NOT NULL THEN
        notification_message := notification_message || ' Current location: ' || location_description;
    END IF;
    
    -- Create notification for builder
    INSERT INTO public.delivery_notifications (
        delivery_id,
        recipient_id,
        type,
        title,
        message,
        priority,
        delivery_info
    ) VALUES (
        delivery_uuid,
        delivery_record.builder_id,
        'status_update',
        notification_title,
        notification_message,
        CASE new_status WHEN 'delivered' THEN 'high' ELSE 'medium' END,
        jsonb_build_object(
            'tracking_number', delivery_record.tracking_number,
            'material_type', delivery_record.material_type,
            'status', new_status,
            'location', location_description
        )
    );
    
    RETURN TRUE;
END;
$$;

-- Function to get delivery analytics
CREATE OR REPLACE FUNCTION public.get_delivery_analytics(
    user_uuid UUID DEFAULT NULL,
    time_range TEXT DEFAULT '30days'
)
RETURNS TABLE (
    total_deliveries INTEGER,
    completed_deliveries INTEGER,
    pending_deliveries INTEGER,
    in_transit_deliveries INTEGER,
    average_delivery_time_hours DECIMAL(5,2),
    on_time_delivery_rate DECIMAL(5,2),
    total_cost DECIMAL(12,2),
    average_cost DECIMAL(10,2),
    top_materials JSONB,
    provider_performance JSONB
) 
LANGUAGE SQL SECURITY DEFINER
AS $$
DECLARE
    date_filter TIMESTAMP WITH TIME ZONE;
    user_filter TEXT;
BEGIN
    -- Calculate date filter
    date_filter := CASE time_range
        WHEN '7days' THEN NOW() - INTERVAL '7 days'
        WHEN '30days' THEN NOW() - INTERVAL '30 days'
        WHEN '90days' THEN NOW() - INTERVAL '90 days'
        WHEN '1year' THEN NOW() - INTERVAL '1 year'
        ELSE NOW() - INTERVAL '30 days'
    END;
    
    -- Apply user filter if specified
    user_filter := CASE 
        WHEN user_uuid IS NOT NULL THEN 'AND d.builder_id = ''' || user_uuid || ''''
        ELSE ''
    END;
    
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_deliveries,
        COUNT(*) FILTER (WHERE d.status = 'completed')::INTEGER as completed_deliveries,
        COUNT(*) FILTER (WHERE d.status IN ('pending', 'confirmed'))::INTEGER as pending_deliveries,
        COUNT(*) FILTER (WHERE d.status IN ('dispatched', 'picked_up', 'in_transit', 'out_for_delivery'))::INTEGER as in_transit_deliveries,
        ROUND(AVG(EXTRACT(EPOCH FROM (d.actual_delivery_time - d.actual_pickup_time)) / 3600)::numeric, 2) as average_delivery_time_hours,
        ROUND((COUNT(*) FILTER (WHERE d.actual_delivery_time <= d.scheduled_delivery_time AND d.status = 'completed') * 100.0 / NULLIF(COUNT(*) FILTER (WHERE d.status = 'completed'), 0))::numeric, 2) as on_time_delivery_rate,
        ROUND(SUM(COALESCE(d.final_cost, d.estimated_cost))::numeric, 2) as total_cost,
        ROUND(AVG(COALESCE(d.final_cost, d.estimated_cost))::numeric, 2) as average_cost,
        -- Top materials JSON
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'material_type', material_type,
                    'count', material_count,
                    'percentage', ROUND((material_count * 100.0 / total_count)::numeric, 1)
                )
            )
            FROM (
                SELECT 
                    d2.material_type,
                    COUNT(*) as material_count,
                    (SELECT COUNT(*) FROM public.deliveries d3 WHERE d3.created_at >= date_filter) as total_count
                FROM public.deliveries d2
                WHERE d2.created_at >= date_filter
                GROUP BY d2.material_type
                ORDER BY material_count DESC
                LIMIT 5
            ) top_materials_query
        ) as top_materials,
        -- Provider performance JSON
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'provider_name', dp.provider_name,
                    'total_deliveries', provider_deliveries,
                    'completion_rate', ROUND((completed_deliveries * 100.0 / provider_deliveries)::numeric, 1),
                    'average_rating', dp.rating
                )
            )
            FROM (
                SELECT 
                    d2.provider_id,
                    COUNT(*) as provider_deliveries,
                    COUNT(*) FILTER (WHERE d2.status = 'completed') as completed_deliveries
                FROM public.deliveries d2
                WHERE d2.created_at >= date_filter AND d2.provider_id IS NOT NULL
                GROUP BY d2.provider_id
                ORDER BY provider_deliveries DESC
                LIMIT 5
            ) provider_stats
            JOIN public.delivery_providers dp ON dp.id = provider_stats.provider_id
        ) as provider_performance
    FROM public.deliveries d
    WHERE d.created_at >= date_filter;
END;
$$;

-- Function to track delivery location
CREATE OR REPLACE FUNCTION public.update_delivery_location(
    delivery_uuid UUID,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    accuracy DECIMAL(8,2) DEFAULT NULL,
    speed_kmh DECIMAL(6,2) DEFAULT NULL,
    heading_degrees INTEGER DEFAULT NULL,
    battery_level INTEGER DEFAULT NULL,
    signal_strength INTEGER DEFAULT NULL,
    location_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    provider_record RECORD;
BEGIN
    -- Verify that the current user is the assigned provider
    SELECT dp.* INTO provider_record
    FROM public.delivery_providers dp
    JOIN public.deliveries d ON d.provider_id = dp.id
    WHERE d.id = delivery_uuid AND dp.user_id = auth.uid();
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Insert tracking record
    INSERT INTO public.delivery_tracking (
        delivery_id,
        provider_id,
        latitude,
        longitude,
        accuracy,
        speed_kmh,
        heading_degrees,
        battery_level,
        signal_strength,
        status,
        location_description
    ) VALUES (
        delivery_uuid,
        provider_record.id,
        latitude,
        longitude,
        accuracy,
        speed_kmh,
        heading_degrees,
        battery_level,
        signal_strength,
        (SELECT status FROM public.deliveries WHERE id = delivery_uuid),
        location_description
    );
    
    -- Update delivery progress based on proximity to destination
    UPDATE public.deliveries 
    SET updated_at = NOW()
    WHERE id = delivery_uuid;
    
    RETURN TRUE;
END;
$$;

-- Function to get delivery notifications for user
CREATE OR REPLACE FUNCTION public.get_user_delivery_notifications(
    user_uuid UUID DEFAULT auth.uid(),
    unread_only BOOLEAN DEFAULT false,
    limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    delivery_id UUID,
    type TEXT,
    title TEXT,
    message TEXT,
    priority TEXT,
    delivery_info JSONB,
    read BOOLEAN,
    action_required BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE SQL SECURITY DEFINER
AS $$
    SELECT 
        dn.id,
        dn.delivery_id,
        dn.type,
        dn.title,
        dn.message,
        dn.priority,
        dn.delivery_info,
        dn.read,
        dn.action_required,
        dn.created_at
    FROM public.delivery_notifications dn
    WHERE 
        dn.recipient_id = user_uuid
        AND (NOT unread_only OR dn.read = false)
    ORDER BY dn.created_at DESC
    LIMIT limit_count;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.find_available_providers(DECIMAL(10,8), DECIMAL(11,8), DECIMAL(10,8), DECIMAL(11,8), DECIMAL(10,2), TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_delivery_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_delivery_request(TEXT, DECIMAL(10,2), TEXT, TEXT, DECIMAL(10,8), DECIMAL(11,8), TEXT, DECIMAL(10,8), DECIMAL(11,8), TEXT, TEXT, DATE, TEXT, TEXT, DECIMAL(10,2)) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_delivery_location(UUID, DECIMAL(10,8), DECIMAL(11,8), DECIMAL(8,2), DECIMAL(6,2), INTEGER, INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_delivery_status(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_delivery_notifications(UUID, BOOLEAN, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_delivery_analytics(UUID, TEXT) TO authenticated;

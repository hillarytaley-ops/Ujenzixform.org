-- Create comprehensive delivery system tables
-- Migration: 20241212_create_delivery_system_tables.sql

-- Create delivery_providers table
CREATE TABLE IF NOT EXISTS public.delivery_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider_name TEXT NOT NULL,
    provider_type TEXT NOT NULL CHECK (provider_type IN ('individual', 'company')),
    business_registration TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    
    -- Vehicle information
    vehicle_type TEXT CHECK (vehicle_type IN ('motorcycle', 'van', 'pickup', 'truck', 'trailer')),
    vehicle_registration TEXT,
    vehicle_capacity_kg INTEGER CHECK (vehicle_capacity_kg > 0),
    vehicle_capacity_m3 DECIMAL(8,2) CHECK (vehicle_capacity_m3 > 0),
    
    -- Service area
    service_counties TEXT[] DEFAULT ARRAY[]::TEXT[],
    max_delivery_radius_km INTEGER DEFAULT 50 CHECK (max_delivery_radius_km > 0),
    base_location_lat DECIMAL(10,8),
    base_location_lng DECIMAL(11,8),
    
    -- Performance metrics
    rating DECIMAL(3,2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5.00),
    total_deliveries INTEGER DEFAULT 0,
    completed_deliveries INTEGER DEFAULT 0,
    on_time_delivery_rate DECIMAL(5,2) DEFAULT 0.00,
    average_delivery_time_hours DECIMAL(5,2),
    customer_satisfaction DECIMAL(3,2) DEFAULT 0.00,
    
    -- Business details
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    availability_status TEXT DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'offline', 'suspended')),
    pricing_per_km DECIMAL(8,2) DEFAULT 50.00,
    pricing_per_kg DECIMAL(8,2) DEFAULT 10.00,
    minimum_charge DECIMAL(10,2) DEFAULT 500.00,
    
    -- Operational details
    operating_hours JSONB DEFAULT '{"monday": {"start": "06:00", "end": "18:00"}, "tuesday": {"start": "06:00", "end": "18:00"}, "wednesday": {"start": "06:00", "end": "18:00"}, "thursday": {"start": "06:00", "end": "18:00"}, "friday": {"start": "06:00", "end": "18:00"}, "saturday": {"start": "06:00", "end": "14:00"}, "sunday": {"closed": true}}'::jsonb,
    emergency_available BOOLEAN DEFAULT false,
    insurance_coverage BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create deliveries table
CREATE TABLE IF NOT EXISTS public.deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_number TEXT UNIQUE NOT NULL,
    
    -- Order information
    order_id UUID REFERENCES public.purchase_orders(id),
    builder_id UUID REFERENCES public.profiles(user_id),
    supplier_id UUID REFERENCES public.suppliers(id),
    provider_id UUID REFERENCES public.delivery_providers(id),
    
    -- Material details
    material_type TEXT NOT NULL,
    material_description TEXT,
    quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
    unit TEXT NOT NULL,
    weight_kg DECIMAL(10,2) CHECK (weight_kg > 0),
    volume_m3 DECIMAL(10,2) CHECK (volume_m3 > 0),
    
    -- Location details
    pickup_address TEXT NOT NULL,
    pickup_lat DECIMAL(10,8),
    pickup_lng DECIMAL(11,8),
    delivery_address TEXT NOT NULL,
    delivery_lat DECIMAL(10,8),
    delivery_lng DECIMAL(11,8),
    distance_km DECIMAL(8,2),
    
    -- Contact information
    contact_name TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    contact_email TEXT,
    
    -- Scheduling
    requested_date DATE,
    requested_time_start TIME,
    requested_time_end TIME,
    scheduled_pickup_time TIMESTAMP WITH TIME ZONE,
    scheduled_delivery_time TIMESTAMP WITH TIME ZONE,
    actual_pickup_time TIMESTAMP WITH TIME ZONE,
    actual_delivery_time TIMESTAMP WITH TIME ZONE,
    
    -- Status and progress
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'dispatched', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'completed', 'cancelled', 'failed')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    
    -- Pricing
    estimated_cost DECIMAL(10,2),
    final_cost DECIMAL(10,2),
    currency TEXT DEFAULT 'KES',
    cost_breakdown JSONB,
    
    -- Priority and urgency
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent', 'emergency')),
    urgency_multiplier DECIMAL(3,2) DEFAULT 1.00,
    
    -- Special instructions and notes
    special_instructions TEXT,
    delivery_notes TEXT,
    internal_notes TEXT,
    
    -- Verification and completion
    delivery_confirmed BOOLEAN DEFAULT false,
    signature_url TEXT,
    photo_urls TEXT[],
    completion_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create delivery_tracking table for GPS data
CREATE TABLE IF NOT EXISTS public.delivery_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES public.delivery_providers(id),
    
    -- GPS coordinates
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    accuracy DECIMAL(8,2),
    altitude DECIMAL(8,2),
    
    -- Movement data
    speed_kmh DECIMAL(6,2),
    heading_degrees INTEGER CHECK (heading_degrees >= 0 AND heading_degrees <= 360),
    
    -- Device information
    battery_level INTEGER CHECK (battery_level >= 0 AND battery_level <= 100),
    signal_strength INTEGER CHECK (signal_strength >= 0 AND signal_strength <= 100),
    device_id TEXT,
    
    -- Status information
    status TEXT NOT NULL,
    location_description TEXT,
    traffic_conditions TEXT,
    
    -- Metadata
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create delivery_notifications table
CREATE TABLE IF NOT EXISTS public.delivery_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Notification details
    type TEXT NOT NULL CHECK (type IN ('status_update', 'location_update', 'delay_alert', 'arrival_notification', 'completion', 'emergency')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    
    -- Delivery context
    delivery_info JSONB,
    
    -- Notification state
    read BOOLEAN DEFAULT false,
    action_required BOOLEAN DEFAULT false,
    acknowledged BOOLEAN DEFAULT false,
    
    -- Delivery channels
    sent_push BOOLEAN DEFAULT false,
    sent_email BOOLEAN DEFAULT false,
    sent_sms BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    acknowledged_at TIMESTAMP WITH TIME ZONE
);

-- Create delivery_reviews table
CREATE TABLE IF NOT EXISTS public.delivery_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES public.delivery_providers(id),
    reviewer_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Ratings (1-5 scale)
    overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    timeliness_rating INTEGER CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
    care_handling_rating INTEGER CHECK (care_handling_rating >= 1 AND care_handling_rating <= 5),
    
    -- Review content
    comment TEXT,
    would_recommend BOOLEAN DEFAULT true,
    
    -- Verification
    verified_delivery BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one review per delivery per user
    CONSTRAINT unique_delivery_reviewer UNIQUE(delivery_id, reviewer_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_delivery_providers_user_id ON public.delivery_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_providers_location ON public.delivery_providers(base_location_lat, base_location_lng);
CREATE INDEX IF NOT EXISTS idx_delivery_providers_service_area ON public.delivery_providers USING GIN(service_counties);
CREATE INDEX IF NOT EXISTS idx_delivery_providers_rating ON public.delivery_providers(rating DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_providers_availability ON public.delivery_providers(availability_status, is_active);

CREATE INDEX IF NOT EXISTS idx_deliveries_tracking_number ON public.deliveries(tracking_number);
CREATE INDEX IF NOT EXISTS idx_deliveries_builder_id ON public.deliveries(builder_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_supplier_id ON public.deliveries(supplier_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_provider_id ON public.deliveries(provider_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON public.deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_scheduled_delivery ON public.deliveries(scheduled_delivery_time);
CREATE INDEX IF NOT EXISTS idx_deliveries_location ON public.deliveries(pickup_lat, pickup_lng, delivery_lat, delivery_lng);

CREATE INDEX IF NOT EXISTS idx_delivery_tracking_delivery_id ON public.delivery_tracking(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_recorded_at ON public.delivery_tracking(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_location ON public.delivery_tracking(latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_delivery_notifications_recipient ON public.delivery_notifications(recipient_id, read);
CREATE INDEX IF NOT EXISTS idx_delivery_notifications_delivery ON public.delivery_notifications(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notifications_priority ON public.delivery_notifications(priority, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_delivery_reviews_provider ON public.delivery_reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_delivery_reviews_delivery ON public.delivery_reviews(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_reviews_rating ON public.delivery_reviews(overall_rating DESC);

-- Add comments for documentation
COMMENT ON TABLE public.delivery_providers IS 'Registered delivery service providers with vehicle and service area information';
COMMENT ON TABLE public.deliveries IS 'Main delivery orders with complete lifecycle tracking';
COMMENT ON TABLE public.delivery_tracking IS 'Real-time GPS tracking data for active deliveries';
COMMENT ON TABLE public.delivery_notifications IS 'Notification system for delivery updates and alerts';
COMMENT ON TABLE public.delivery_reviews IS 'Customer reviews and ratings for delivery providers';

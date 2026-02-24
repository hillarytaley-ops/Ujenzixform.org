-- ============================================================
-- Fix Delivery Providers Table - Add Missing Columns
-- Created: February 24, 2026
-- This migration adds any missing columns to the delivery_providers table
-- ============================================================

-- Add missing columns to delivery_providers table
DO $$ 
BEGIN
    -- Service area columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'delivery_providers' AND column_name = 'service_counties') THEN
        ALTER TABLE delivery_providers ADD COLUMN service_counties TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'delivery_providers' AND column_name = 'max_delivery_radius_km') THEN
        ALTER TABLE delivery_providers ADD COLUMN max_delivery_radius_km INTEGER DEFAULT 50;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'delivery_providers' AND column_name = 'base_location_lat') THEN
        ALTER TABLE delivery_providers ADD COLUMN base_location_lat DECIMAL(10,8);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'delivery_providers' AND column_name = 'base_location_lng') THEN
        ALTER TABLE delivery_providers ADD COLUMN base_location_lng DECIMAL(11,8);
    END IF;
    
    -- Performance metrics
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'delivery_providers' AND column_name = 'rating') THEN
        ALTER TABLE delivery_providers ADD COLUMN rating DECIMAL(3,2) DEFAULT 0.00;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'delivery_providers' AND column_name = 'total_deliveries') THEN
        ALTER TABLE delivery_providers ADD COLUMN total_deliveries INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'delivery_providers' AND column_name = 'completed_deliveries') THEN
        ALTER TABLE delivery_providers ADD COLUMN completed_deliveries INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'delivery_providers' AND column_name = 'on_time_delivery_rate') THEN
        ALTER TABLE delivery_providers ADD COLUMN on_time_delivery_rate DECIMAL(5,2) DEFAULT 0.00;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'delivery_providers' AND column_name = 'average_delivery_time_hours') THEN
        ALTER TABLE delivery_providers ADD COLUMN average_delivery_time_hours DECIMAL(5,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'delivery_providers' AND column_name = 'customer_satisfaction') THEN
        ALTER TABLE delivery_providers ADD COLUMN customer_satisfaction DECIMAL(3,2) DEFAULT 0.00;
    END IF;
    
    -- Business details
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'delivery_providers' AND column_name = 'is_verified') THEN
        ALTER TABLE delivery_providers ADD COLUMN is_verified BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'delivery_providers' AND column_name = 'is_active') THEN
        ALTER TABLE delivery_providers ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'delivery_providers' AND column_name = 'availability_status') THEN
        ALTER TABLE delivery_providers ADD COLUMN availability_status TEXT DEFAULT 'available';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'delivery_providers' AND column_name = 'pricing_per_km') THEN
        ALTER TABLE delivery_providers ADD COLUMN pricing_per_km DECIMAL(8,2) DEFAULT 50.00;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'delivery_providers' AND column_name = 'pricing_per_kg') THEN
        ALTER TABLE delivery_providers ADD COLUMN pricing_per_kg DECIMAL(8,2) DEFAULT 10.00;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'delivery_providers' AND column_name = 'minimum_charge') THEN
        ALTER TABLE delivery_providers ADD COLUMN minimum_charge DECIMAL(10,2) DEFAULT 500.00;
    END IF;
    
    -- Operational details
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'delivery_providers' AND column_name = 'operating_hours') THEN
        ALTER TABLE delivery_providers ADD COLUMN operating_hours JSONB DEFAULT '{"monday": {"start": "06:00", "end": "18:00"}, "tuesday": {"start": "06:00", "end": "18:00"}, "wednesday": {"start": "06:00", "end": "18:00"}, "thursday": {"start": "06:00", "end": "18:00"}, "friday": {"start": "06:00", "end": "18:00"}, "saturday": {"start": "06:00", "end": "14:00"}, "sunday": {"closed": true}}'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'delivery_providers' AND column_name = 'emergency_available') THEN
        ALTER TABLE delivery_providers ADD COLUMN emergency_available BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'delivery_providers' AND column_name = 'insurance_coverage') THEN
        ALTER TABLE delivery_providers ADD COLUMN insurance_coverage BOOLEAN DEFAULT false;
    END IF;
    
    -- Vehicle information
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'delivery_providers' AND column_name = 'vehicle_type') THEN
        ALTER TABLE delivery_providers ADD COLUMN vehicle_type TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'delivery_providers' AND column_name = 'vehicle_registration') THEN
        ALTER TABLE delivery_providers ADD COLUMN vehicle_registration TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'delivery_providers' AND column_name = 'vehicle_capacity_kg') THEN
        ALTER TABLE delivery_providers ADD COLUMN vehicle_capacity_kg INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'delivery_providers' AND column_name = 'vehicle_capacity_m3') THEN
        ALTER TABLE delivery_providers ADD COLUMN vehicle_capacity_m3 DECIMAL(8,2);
    END IF;
    
    -- Timestamps
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'delivery_providers' AND column_name = 'created_at') THEN
        ALTER TABLE delivery_providers ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'delivery_providers' AND column_name = 'updated_at') THEN
        ALTER TABLE delivery_providers ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Create indexes if they don't exist (wrapped in DO block to handle errors gracefully)
DO $$
BEGIN
    -- Try to create each index, ignore if it already exists
    BEGIN
        CREATE INDEX idx_delivery_providers_location ON public.delivery_providers(base_location_lat, base_location_lng);
    EXCEPTION WHEN duplicate_table THEN
        NULL; -- Index already exists
    END;
    
    BEGIN
        CREATE INDEX idx_delivery_providers_service_area ON public.delivery_providers USING GIN(service_counties);
    EXCEPTION WHEN duplicate_table THEN
        NULL;
    END;
    
    BEGIN
        CREATE INDEX idx_delivery_providers_rating ON public.delivery_providers(rating DESC);
    EXCEPTION WHEN duplicate_table THEN
        NULL;
    END;
    
    BEGIN
        CREATE INDEX idx_delivery_providers_availability ON public.delivery_providers(availability_status, is_active);
    EXCEPTION WHEN duplicate_table THEN
        NULL;
    END;
END $$;

-- ============================================================
-- Migration Complete
-- ============================================================

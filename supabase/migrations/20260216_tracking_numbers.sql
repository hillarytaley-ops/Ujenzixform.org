-- ============================================================
-- Tracking Numbers System
-- Auto-generated when delivery provider accepts delivery request
-- Created: February 16, 2026
-- ============================================================

-- 1. TRACKING_NUMBERS TABLE
CREATE TABLE IF NOT EXISTS public.tracking_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_number TEXT NOT NULL UNIQUE,
    
    -- References
    delivery_request_id UUID,
    purchase_order_id UUID,
    builder_id UUID NOT NULL REFERENCES auth.users(id),
    delivery_provider_id UUID REFERENCES auth.users(id),
    supplier_id UUID,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',           -- Waiting for provider to accept
        'accepted',          -- Provider accepted, tracking active
        'picked_up',         -- Materials picked up from supplier
        'in_transit',        -- On the way to delivery location
        'near_destination',  -- Within 5km of destination
        'delivered',         -- Successfully delivered
        'cancelled'          -- Delivery cancelled
    )),
    
    -- Location tracking
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    last_location_update TIMESTAMPTZ,
    
    -- Route info
    pickup_address TEXT,
    pickup_latitude DECIMAL(10, 8),
    pickup_longitude DECIMAL(11, 8),
    delivery_address TEXT NOT NULL,
    delivery_latitude DECIMAL(10, 8),
    delivery_longitude DECIMAL(11, 8),
    
    -- Delivery details
    materials_description TEXT,
    estimated_delivery_date DATE,
    actual_delivery_date DATE,
    estimated_arrival_time TIMESTAMPTZ,
    
    -- Provider info
    provider_name TEXT,
    provider_phone TEXT,
    vehicle_type TEXT,
    vehicle_registration TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    picked_up_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TRACKING_HISTORY TABLE (for location history)
CREATE TABLE IF NOT EXISTS public.tracking_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_number_id UUID NOT NULL REFERENCES public.tracking_numbers(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    status TEXT,
    notes TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_tracking_numbers_tracking ON public.tracking_numbers(tracking_number);
CREATE INDEX IF NOT EXISTS idx_tracking_numbers_builder ON public.tracking_numbers(builder_id);
CREATE INDEX IF NOT EXISTS idx_tracking_numbers_provider ON public.tracking_numbers(delivery_provider_id);
CREATE INDEX IF NOT EXISTS idx_tracking_numbers_status ON public.tracking_numbers(status);
CREATE INDEX IF NOT EXISTS idx_tracking_numbers_created ON public.tracking_numbers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_history_tracking ON public.tracking_history(tracking_number_id);

-- 4. RLS POLICIES
ALTER TABLE public.tracking_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_history ENABLE ROW LEVEL SECURITY;

-- Tracking numbers policies
DROP POLICY IF EXISTS "tracking_numbers_select" ON public.tracking_numbers;
DROP POLICY IF EXISTS "tracking_numbers_insert" ON public.tracking_numbers;
DROP POLICY IF EXISTS "tracking_numbers_update" ON public.tracking_numbers;

CREATE POLICY "tracking_numbers_select" ON public.tracking_numbers 
FOR SELECT USING (
    builder_id = auth.uid() OR 
    delivery_provider_id = auth.uid() OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "tracking_numbers_insert" ON public.tracking_numbers 
FOR INSERT WITH CHECK (true);

CREATE POLICY "tracking_numbers_update" ON public.tracking_numbers 
FOR UPDATE USING (
    delivery_provider_id = auth.uid() OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Tracking history policies
DROP POLICY IF EXISTS "tracking_history_select" ON public.tracking_history;
DROP POLICY IF EXISTS "tracking_history_insert" ON public.tracking_history;

CREATE POLICY "tracking_history_select" ON public.tracking_history 
FOR SELECT USING (true);

CREATE POLICY "tracking_history_insert" ON public.tracking_history 
FOR INSERT WITH CHECK (true);

-- 5. FUNCTION TO GENERATE TRACKING NUMBER
-- Drop existing function first to allow return type change
DROP FUNCTION IF EXISTS generate_tracking_number();

CREATE OR REPLACE FUNCTION generate_tracking_number()
RETURNS TEXT AS $$
DECLARE
    new_tracking TEXT;
    date_part TEXT;
    random_part TEXT;
BEGIN
    date_part := TO_CHAR(NOW(), 'YYYYMMDD');
    random_part := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    new_tracking := 'TRK-' || date_part || '-' || random_part;
    RETURN new_tracking;
END;
$$ LANGUAGE plpgsql;

-- 6. FUNCTION TO CREATE TRACKING NUMBER WHEN DELIVERY IS ACCEPTED
CREATE OR REPLACE FUNCTION create_tracking_on_delivery_accept()
RETURNS TRIGGER AS $$
BEGIN
    -- When a delivery request is accepted (status changes to 'accepted' or 'assigned')
    IF (NEW.status IN ('accepted', 'assigned') AND OLD.status = 'pending') THEN
        INSERT INTO public.tracking_numbers (
            tracking_number,
            delivery_request_id,
            builder_id,
            delivery_provider_id,
            status,
            delivery_address,
            materials_description,
            estimated_delivery_date,
            provider_name,
            provider_phone,
            accepted_at
        )
        SELECT 
            generate_tracking_number(),
            NEW.id,
            NEW.builder_id,
            NEW.provider_id,
            'accepted',
            NEW.delivery_address,
            NEW.materials_description,
            NEW.preferred_date,
            p.full_name,
            p.phone,
            NOW()
        FROM profiles p
        WHERE p.user_id = NEW.provider_id
        ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. CREATE TRIGGER ON DELIVERY_REQUESTS TABLE
DROP TRIGGER IF EXISTS trigger_create_tracking_on_accept ON delivery_requests;
CREATE TRIGGER trigger_create_tracking_on_accept
    AFTER UPDATE ON delivery_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_tracking_on_delivery_accept();

-- 8. GRANT PERMISSIONS
GRANT SELECT, INSERT, UPDATE ON public.tracking_numbers TO authenticated;
GRANT SELECT, INSERT ON public.tracking_history TO authenticated;
GRANT EXECUTE ON FUNCTION generate_tracking_number TO authenticated;

-- ============================================================
-- Migration Complete
-- ============================================================

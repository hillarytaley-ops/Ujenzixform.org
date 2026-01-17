-- =====================================================
-- CREATE DELIVERIES TABLE
-- Run this in Supabase SQL Editor
-- =====================================================

-- Create the deliveries table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.deliveries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tracking_number TEXT UNIQUE NOT NULL,
    builder_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    pickup_address TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    material_type TEXT NOT NULL,
    quantity TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    preferred_date DATE,
    preferred_time TEXT,
    special_instructions TEXT,
    urgency TEXT DEFAULT 'normal',
    status TEXT DEFAULT 'pending',
    driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    driver_name TEXT,
    driver_phone TEXT,
    estimated_arrival TIMESTAMPTZ,
    actual_arrival TIMESTAMPTZ,
    pickup_time TIMESTAMPTZ,
    delivery_time TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_deliveries_tracking_number ON public.deliveries(tracking_number);
CREATE INDEX IF NOT EXISTS idx_deliveries_builder_id ON public.deliveries(builder_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON public.deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_created_at ON public.deliveries(created_at DESC);

-- Enable RLS
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can create deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Users can view their own deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Users can update their own deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Admins can do everything" ON public.deliveries;
DROP POLICY IF EXISTS "Delivery providers can view assigned deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Delivery providers can update assigned deliveries" ON public.deliveries;

-- Policy: Anyone can create a delivery request (even anonymous users)
CREATE POLICY "Anyone can create deliveries"
ON public.deliveries
FOR INSERT
TO public
WITH CHECK (true);

-- Policy: Users can view their own deliveries
CREATE POLICY "Users can view their own deliveries"
ON public.deliveries
FOR SELECT
TO authenticated
USING (
    builder_id = auth.uid() 
    OR driver_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'delivery', 'delivery_provider')
    )
);

-- Policy: Anonymous users can view deliveries by tracking number (for public tracking)
CREATE POLICY "Anyone can view by tracking number"
ON public.deliveries
FOR SELECT
TO public
USING (true);

-- Policy: Users can update their own deliveries (before pickup)
CREATE POLICY "Users can update their own deliveries"
ON public.deliveries
FOR UPDATE
TO authenticated
USING (
    builder_id = auth.uid() 
    AND status = 'pending'
);

-- Policy: Delivery providers can update assigned deliveries
CREATE POLICY "Delivery providers can update assigned deliveries"
ON public.deliveries
FOR UPDATE
TO authenticated
USING (
    driver_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'delivery', 'delivery_provider')
    )
);

-- Policy: Admins can do everything
CREATE POLICY "Admins can do everything"
ON public.deliveries
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_deliveries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_deliveries_updated_at ON public.deliveries;
CREATE TRIGGER trigger_update_deliveries_updated_at
    BEFORE UPDATE ON public.deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_deliveries_updated_at();

-- Grant permissions
GRANT ALL ON public.deliveries TO authenticated;
GRANT INSERT, SELECT ON public.deliveries TO anon;

SELECT 'Deliveries table created successfully!' AS result;


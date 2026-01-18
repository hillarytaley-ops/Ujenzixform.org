-- ============================================================================
-- CREATE DELIVERY_REQUESTS TABLE WITH ALL REQUIRED COLUMNS
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Create the delivery_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.delivery_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Builder/Requester info
    builder_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    purchase_order_id UUID,
    
    -- Location details
    pickup_address TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    
    -- Material details
    material_type TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    weight_kg DECIMAL(10,2),
    
    -- Scheduling
    pickup_date DATE DEFAULT CURRENT_DATE,
    preferred_time TEXT,
    
    -- Requirements
    special_instructions TEXT,
    budget_range TEXT,
    required_vehicle_type TEXT,
    
    -- Provider matching
    provider_id UUID,
    provider_response TEXT,
    tracking_number TEXT UNIQUE,
    
    -- Auto-rotation settings
    auto_rotation_enabled BOOLEAN DEFAULT true,
    max_rotation_attempts INTEGER DEFAULT 5,
    current_rotation_attempt INTEGER DEFAULT 0,
    
    -- Status tracking
    status TEXT DEFAULT 'pending',
    accepted_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add any missing columns to existing table
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS builder_id UUID;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS purchase_order_id UUID;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS pickup_address TEXT;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS material_type TEXT;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(10,2);
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS pickup_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS preferred_time TEXT;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS special_instructions TEXT;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS budget_range TEXT;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS required_vehicle_type TEXT;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS provider_id UUID;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS provider_response TEXT;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS auto_rotation_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS max_rotation_attempts INTEGER DEFAULT 5;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS current_rotation_attempt INTEGER DEFAULT 0;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_delivery_requests_builder_id ON public.delivery_requests(builder_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_status ON public.delivery_requests(status);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_provider_id ON public.delivery_requests(provider_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_tracking_number ON public.delivery_requests(tracking_number);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_created_at ON public.delivery_requests(created_at DESC);

-- Enable RLS
ALTER TABLE public.delivery_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Builders can create delivery requests" ON public.delivery_requests;
DROP POLICY IF EXISTS "Builders can view their own requests" ON public.delivery_requests;
DROP POLICY IF EXISTS "Providers can view pending requests" ON public.delivery_requests;
DROP POLICY IF EXISTS "Providers can update assigned requests" ON public.delivery_requests;
DROP POLICY IF EXISTS "Admins can do everything" ON public.delivery_requests;

-- Policy: Authenticated users can create delivery requests
CREATE POLICY "Builders can create delivery requests"
ON public.delivery_requests
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Users can view their own delivery requests
CREATE POLICY "Builders can view their own requests"
ON public.delivery_requests
FOR SELECT
TO authenticated
USING (
    builder_id = auth.uid() 
    OR provider_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'delivery', 'delivery_provider')
    )
);

-- Policy: Delivery providers can view pending requests
CREATE POLICY "Providers can view pending requests"
ON public.delivery_requests
FOR SELECT
TO authenticated
USING (
    status = 'pending'
    OR provider_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'delivery', 'delivery_provider')
    )
);

-- Policy: Providers can update requests they're assigned to
CREATE POLICY "Providers can update assigned requests"
ON public.delivery_requests
FOR UPDATE
TO authenticated
USING (
    provider_id = auth.uid()
    OR builder_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- Policy: Admins can do everything
CREATE POLICY "Admins can do everything"
ON public.delivery_requests
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
CREATE OR REPLACE FUNCTION update_delivery_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_delivery_requests_updated_at ON public.delivery_requests;
CREATE TRIGGER trigger_update_delivery_requests_updated_at
    BEFORE UPDATE ON public.delivery_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_delivery_requests_updated_at();

-- Grant permissions
GRANT ALL ON public.delivery_requests TO authenticated;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'delivery_requests table created/updated successfully!' AS result;


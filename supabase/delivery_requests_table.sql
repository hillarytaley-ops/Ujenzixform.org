-- ===================================================================
-- DELIVERY REQUESTS TABLE - Run this in Supabase SQL Editor
-- ===================================================================

-- Create the delivery_requests table
CREATE TABLE IF NOT EXISTS public.delivery_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  builder_email TEXT,
  
  -- Pickup details
  pickup_location TEXT NOT NULL,
  pickup_address TEXT,
  
  -- Dropoff details
  dropoff_location TEXT NOT NULL,
  dropoff_address TEXT,
  
  -- Item details
  item_description TEXT NOT NULL,
  estimated_weight TEXT,
  
  -- Schedule
  preferred_date DATE,
  preferred_time TEXT,
  urgency TEXT DEFAULT 'normal',
  
  -- Additional info
  special_instructions TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending',
  -- pending, assigned, picked_up, in_transit, delivered, cancelled
  
  -- Driver assignment
  driver_id UUID REFERENCES auth.users(id),
  driver_name TEXT,
  driver_phone TEXT,
  vehicle_info TEXT,
  
  -- Timestamps
  assigned_at TIMESTAMP WITH TIME ZONE,
  picked_up_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  
  -- Pricing
  estimated_cost DECIMAL(10,2),
  final_cost DECIMAL(10,2),
  
  -- Tracking
  current_location TEXT,
  tracking_updates JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.delivery_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "delivery_requests_builder_insert" ON public.delivery_requests;
DROP POLICY IF EXISTS "delivery_requests_builder_select" ON public.delivery_requests;
DROP POLICY IF EXISTS "delivery_requests_builder_update" ON public.delivery_requests;
DROP POLICY IF EXISTS "delivery_requests_driver_select" ON public.delivery_requests;
DROP POLICY IF EXISTS "delivery_requests_driver_update" ON public.delivery_requests;
DROP POLICY IF EXISTS "delivery_requests_admin_all" ON public.delivery_requests;

-- Builders can create delivery requests
CREATE POLICY "delivery_requests_builder_insert"
ON public.delivery_requests
FOR INSERT
TO authenticated
WITH CHECK (builder_id = auth.uid());

-- Builders can view their own requests
CREATE POLICY "delivery_requests_builder_select"
ON public.delivery_requests
FOR SELECT
TO authenticated
USING (builder_id = auth.uid());

-- Builders can update their own pending requests (e.g., cancel)
CREATE POLICY "delivery_requests_builder_update"
ON public.delivery_requests
FOR UPDATE
TO authenticated
USING (builder_id = auth.uid() AND status = 'pending')
WITH CHECK (builder_id = auth.uid());

-- Delivery providers can view requests assigned to them
CREATE POLICY "delivery_requests_driver_select"
ON public.delivery_requests
FOR SELECT
TO authenticated
USING (driver_id = auth.uid());

-- Delivery providers can update requests assigned to them
CREATE POLICY "delivery_requests_driver_update"
ON public.delivery_requests
FOR UPDATE
TO authenticated
USING (driver_id = auth.uid())
WITH CHECK (driver_id = auth.uid());

-- Admins can do everything
CREATE POLICY "delivery_requests_admin_all"
ON public.delivery_requests
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_delivery_requests_builder ON public.delivery_requests(builder_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_driver ON public.delivery_requests(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_status ON public.delivery_requests(status);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_created ON public.delivery_requests(created_at DESC);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_delivery_requests_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS delivery_requests_updated_at ON public.delivery_requests;
CREATE TRIGGER delivery_requests_updated_at
  BEFORE UPDATE ON public.delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_requests_updated_at();

-- Success message
SELECT 'SUCCESS: Delivery requests table created!' as message;







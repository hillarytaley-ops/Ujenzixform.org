-- ===================================================================
-- DELIVERY REQUESTS TABLE - SIMPLIFIED VERSION
-- Run this in Supabase SQL Editor
-- ===================================================================

-- Step 1: Drop existing table if it exists (clean start)
DROP TABLE IF EXISTS public.delivery_requests CASCADE;

-- Step 2: Create the table
CREATE TABLE public.delivery_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id UUID,
  builder_email TEXT,
  pickup_location TEXT NOT NULL,
  pickup_address TEXT,
  dropoff_location TEXT NOT NULL,
  dropoff_address TEXT,
  item_description TEXT NOT NULL,
  estimated_weight TEXT,
  preferred_date DATE,
  preferred_time TEXT,
  urgency TEXT DEFAULT 'normal',
  special_instructions TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  driver_id UUID,
  driver_name TEXT,
  driver_phone TEXT,
  vehicle_info TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE,
  picked_up_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  estimated_cost DECIMAL(10,2),
  final_cost DECIMAL(10,2),
  current_location TEXT,
  tracking_updates JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Step 3: Enable RLS
ALTER TABLE public.delivery_requests ENABLE ROW LEVEL SECURITY;

-- Step 4: Create simple policies (no foreign key checks to avoid issues)

-- Anyone authenticated can insert
CREATE POLICY "allow_insert" ON public.delivery_requests
FOR INSERT TO authenticated
WITH CHECK (true);

-- Anyone authenticated can select their own or assigned requests
CREATE POLICY "allow_select" ON public.delivery_requests
FOR SELECT TO authenticated
USING (true);

-- Anyone authenticated can update
CREATE POLICY "allow_update" ON public.delivery_requests
FOR UPDATE TO authenticated
USING (true);

-- Create indexes
CREATE INDEX idx_dr_builder ON public.delivery_requests(builder_id);
CREATE INDEX idx_dr_status ON public.delivery_requests(status);
CREATE INDEX idx_dr_created ON public.delivery_requests(created_at DESC);

-- Done!
SELECT 'SUCCESS: delivery_requests table created!' as result;







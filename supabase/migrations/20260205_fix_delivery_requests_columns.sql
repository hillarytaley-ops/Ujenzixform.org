-- =====================================================================
-- FIX DELIVERY_REQUESTS TABLE - ADD MISSING COLUMNS
-- =====================================================================
-- This migration ensures all required columns exist in delivery_requests
-- =====================================================================

-- Add missing columns if they don't exist
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS builder_id UUID;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS purchase_order_id UUID;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS pickup_address TEXT;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS delivery_coordinates TEXT;
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS pickup_coordinates TEXT;
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

-- Refresh the schema cache so PostgREST picks up the changes
NOTIFY pgrst, 'reload schema';

SELECT 'delivery_requests columns added successfully!' AS result;

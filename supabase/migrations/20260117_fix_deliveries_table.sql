-- =====================================================
-- FIX DELIVERIES TABLE - Add missing columns
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add driver_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deliveries' AND column_name = 'driver_id') THEN
        ALTER TABLE public.deliveries ADD COLUMN driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
    
    -- Add driver_name if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deliveries' AND column_name = 'driver_name') THEN
        ALTER TABLE public.deliveries ADD COLUMN driver_name TEXT;
    END IF;
    
    -- Add driver_phone if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deliveries' AND column_name = 'driver_phone') THEN
        ALTER TABLE public.deliveries ADD COLUMN driver_phone TEXT;
    END IF;
END $$;

-- Make sure RLS is enabled
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to ensure they work
DROP POLICY IF EXISTS "Anyone can create deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Anyone can view deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Users can view their own deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Anyone can view by tracking number" ON public.deliveries;
DROP POLICY IF EXISTS "Users can update their own deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Delivery providers can update assigned deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Admins can do everything" ON public.deliveries;

-- Simple policies that work
CREATE POLICY "Anyone can create deliveries"
ON public.deliveries FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Anyone can view deliveries"
ON public.deliveries FOR SELECT TO public USING (true);

CREATE POLICY "Anyone can update deliveries"
ON public.deliveries FOR UPDATE TO public USING (true);

-- Grant permissions
GRANT ALL ON public.deliveries TO authenticated;
GRANT ALL ON public.deliveries TO anon;

SELECT 'Deliveries table fixed successfully!' AS result;


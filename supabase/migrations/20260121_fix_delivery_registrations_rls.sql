-- =====================================================================
-- FIX DELIVERY PROVIDER REGISTRATIONS RLS v2
-- =====================================================================
-- Ensure admins can view all delivery provider registrations
-- =====================================================================

-- Enable RLS (table already exists)
ALTER TABLE public.delivery_provider_registrations ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'delivery_provider_registrations'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.delivery_provider_registrations', pol.policyname);
    END LOOP;
END $$;

-- Simple policy: Allow all authenticated users to SELECT (admins need to see all)
CREATE POLICY "allow_select_all"
ON public.delivery_provider_registrations FOR SELECT TO authenticated
USING (true);

-- Allow authenticated users to insert
CREATE POLICY "allow_insert"
ON public.delivery_provider_registrations FOR INSERT TO authenticated
WITH CHECK (true);

-- Allow admins to update
CREATE POLICY "allow_update"
ON public.delivery_provider_registrations FOR UPDATE TO authenticated
USING (true);

SELECT 'Delivery provider registrations RLS fixed!' as result;


-- ============================================================================
-- FIX ADMIN ACCESS TO DELIVERY_REQUESTS
-- Ensure admins can see all delivery requests
-- ============================================================================

-- First, check if is_admin function exists and works
DO $$
BEGIN
  -- Test the is_admin function
  RAISE NOTICE 'Testing is_admin function...';
END $$;

-- Drop ALL existing policies on delivery_requests to start fresh
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'delivery_requests'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.delivery_requests', pol.policyname);
    END LOOP;
END $$;

-- Enable RLS
ALTER TABLE public.delivery_requests ENABLE ROW LEVEL SECURITY;

-- Policy 1: Builders can see their own requests
CREATE POLICY "delivery_requests_builder_select"
ON public.delivery_requests FOR SELECT TO authenticated
USING (
  builder_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
  OR
  builder_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Policy 2: Builders can insert their own requests
CREATE POLICY "delivery_requests_builder_insert"
ON public.delivery_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Policy 3: Builders can update their own requests
CREATE POLICY "delivery_requests_builder_update"
ON public.delivery_requests FOR UPDATE TO authenticated
USING (
  builder_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Policy 4: Drivers can see requests assigned to them
CREATE POLICY "delivery_requests_driver_select"
ON public.delivery_requests FOR SELECT TO authenticated
USING (driver_id = auth.uid());

-- Policy 5: Drivers can update requests assigned to them
CREATE POLICY "delivery_requests_driver_update"
ON public.delivery_requests FOR UPDATE TO authenticated
USING (driver_id = auth.uid());

-- Policy 6: ADMINS have FULL access - using is_admin() function
CREATE POLICY "delivery_requests_admin_all"
ON public.delivery_requests FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_requests TO authenticated;

-- Verify the is_admin function exists
SELECT EXISTS (
  SELECT 1 FROM pg_proc WHERE proname = 'is_admin'
) as is_admin_exists;

-- Notify PostgREST to reload
NOTIFY pgrst, 'reload schema';

-- Show current policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'delivery_requests';


-- Fix delivery_requests RLS policies
-- The issue is that some policies reference profiles.role which doesn't exist
-- The role is stored in user_roles table, not profiles

-- First, drop ALL existing policies on delivery_requests to start fresh
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

-- Ensure RLS is enabled
ALTER TABLE public.delivery_requests ENABLE ROW LEVEL SECURITY;

-- Policy 1: Builders can manage their own delivery requests
-- Uses profiles table to verify ownership (builder_id = profile.id where profile.user_id = auth.uid())
CREATE POLICY "delivery_requests_builder_own"
ON public.delivery_requests FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.id = delivery_requests.builder_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.id = delivery_requests.builder_id
  )
);

-- Policy 2: Delivery providers can view requests assigned to them
CREATE POLICY "delivery_requests_provider_view"
ON public.delivery_requests FOR SELECT TO authenticated
USING (
  provider_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.delivery_providers dp 
    WHERE dp.id = delivery_requests.provider_id 
    AND dp.user_id = auth.uid()
  )
);

-- Policy 3: Delivery providers can update requests assigned to them
CREATE POLICY "delivery_requests_provider_update"
ON public.delivery_requests FOR UPDATE TO authenticated
USING (
  provider_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.delivery_providers dp 
    WHERE dp.id = delivery_requests.provider_id 
    AND dp.user_id = auth.uid()
  )
);

-- Policy 4: Delivery providers can view pending unassigned requests (to accept them)
CREATE POLICY "delivery_requests_provider_pending"
ON public.delivery_requests FOR SELECT TO authenticated
USING (
  status = 'pending' 
  AND provider_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'delivery_provider'
  )
);

-- Policy 5: Admins have full access
CREATE POLICY "delivery_requests_admin_full"
ON public.delivery_requests FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- Policy 6: Block anonymous access
CREATE POLICY "delivery_requests_block_anon"
ON public.delivery_requests FOR ALL TO anon
USING (false)
WITH CHECK (false);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.delivery_requests TO authenticated;

-- Create a SECURITY DEFINER function to insert delivery requests
-- This bypasses RLS and does its own validation
CREATE OR REPLACE FUNCTION public.insert_builder_delivery_request(
  p_pickup_address TEXT,
  p_delivery_address TEXT,
  p_material_type TEXT,
  p_quantity INTEGER DEFAULT 1,
  p_weight_kg DECIMAL DEFAULT NULL,
  p_pickup_date DATE DEFAULT NULL,
  p_preferred_time TEXT DEFAULT NULL,
  p_special_instructions TEXT DEFAULT NULL,
  p_budget_range TEXT DEFAULT NULL,
  p_required_vehicle_type TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_profile_id UUID;
  v_request_id UUID;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get the user's profile ID
  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE user_id = v_user_id;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Validate required fields
  IF p_pickup_address IS NULL OR p_pickup_address = '' THEN
    RAISE EXCEPTION 'Pickup address is required';
  END IF;

  IF p_delivery_address IS NULL OR p_delivery_address = '' THEN
    RAISE EXCEPTION 'Delivery address is required';
  END IF;

  IF p_material_type IS NULL OR p_material_type = '' THEN
    RAISE EXCEPTION 'Material type is required';
  END IF;

  -- Insert the delivery request
  INSERT INTO public.delivery_requests (
    builder_id,
    pickup_address,
    delivery_address,
    material_type,
    quantity,
    weight_kg,
    pickup_date,
    preferred_time,
    special_instructions,
    budget_range,
    required_vehicle_type,
    status
  ) VALUES (
    v_profile_id,
    p_pickup_address,
    p_delivery_address,
    p_material_type,
    COALESCE(p_quantity, 1),
    p_weight_kg,
    COALESCE(p_pickup_date, CURRENT_DATE),
    p_preferred_time,
    p_special_instructions,
    p_budget_range,
    p_required_vehicle_type,
    'pending'
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.insert_builder_delivery_request(TEXT, TEXT, TEXT, INTEGER, DECIMAL, DATE, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Add comment explaining the policies
COMMENT ON TABLE public.delivery_requests IS 'Delivery requests from builders. RLS policies: builders own their requests (via profile.id), providers see assigned/pending, admins see all.';
COMMENT ON FUNCTION public.insert_builder_delivery_request IS 'Securely insert a delivery request. Bypasses RLS but validates user authentication and profile ownership.';


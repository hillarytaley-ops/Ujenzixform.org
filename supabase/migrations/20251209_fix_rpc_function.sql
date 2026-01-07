-- ============================================================================
-- FIX RPC FUNCTION TO MATCH ACTUAL DATABASE SCHEMA
-- ============================================================================

-- Drop the old function if it exists
DROP FUNCTION IF EXISTS public.insert_builder_delivery_request(TEXT, TEXT, TEXT, INTEGER, DECIMAL, DATE, TEXT, TEXT, TEXT, TEXT);

-- Create new function with ACTUAL database column names
CREATE OR REPLACE FUNCTION public.insert_builder_delivery_request(
  p_pickup_location TEXT,
  p_dropoff_location TEXT,
  p_item_description TEXT,
  p_estimated_weight TEXT DEFAULT NULL,
  p_preferred_date DATE DEFAULT NULL,
  p_preferred_time TEXT DEFAULT NULL,
  p_urgency TEXT DEFAULT 'normal',
  p_special_instructions TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_profile_id UUID;
  v_user_email TEXT;
  v_request_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get user email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;

  -- Get profile ID
  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE user_id = v_user_id;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Validate required fields
  IF p_pickup_location IS NULL OR p_pickup_location = '' THEN
    RAISE EXCEPTION 'Pickup location is required';
  END IF;

  IF p_dropoff_location IS NULL OR p_dropoff_location = '' THEN
    RAISE EXCEPTION 'Dropoff location is required';
  END IF;

  IF p_item_description IS NULL OR p_item_description = '' THEN
    RAISE EXCEPTION 'Item description is required';
  END IF;

  -- Insert with ACTUAL database column names
  INSERT INTO public.delivery_requests (
    builder_id,
    builder_email,
    pickup_location,
    pickup_address,
    dropoff_location,
    dropoff_address,
    item_description,
    estimated_weight,
    preferred_date,
    preferred_time,
    urgency,
    special_instructions,
    status
  ) VALUES (
    v_profile_id,
    v_user_email,
    p_pickup_location,
    p_pickup_location,
    p_dropoff_location,
    p_dropoff_location,
    p_item_description,
    p_estimated_weight,
    COALESCE(p_preferred_date, CURRENT_DATE),
    p_preferred_time,
    COALESCE(p_urgency, 'normal'),
    p_special_instructions,
    'pending'
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.insert_builder_delivery_request(TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT) TO authenticated;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';


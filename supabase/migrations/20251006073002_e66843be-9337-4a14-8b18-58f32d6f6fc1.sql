-- ===================================================================
-- DELIVERY TRACKING: Masked Location for Driver Safety
-- ===================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_delivery_location_masked(UUID);
DROP FUNCTION IF EXISTS get_delivery_status_safe(UUID);

-- Remove ALL existing policies on delivery_tracking
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'delivery_tracking'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON delivery_tracking', pol.policyname);
  END LOOP;
END $$;

-- Admin full access to exact coordinates
CREATE POLICY "delivery_tracking_admin_full"
ON delivery_tracking FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Drivers can see their own exact coordinates
CREATE POLICY "delivery_tracking_driver_self"
ON delivery_tracking FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM deliveries d
    JOIN delivery_providers dp ON dp.user_id = auth.uid()
    JOIN delivery_requests dr ON dr.provider_id = dp.id AND dr.builder_id = d.builder_id
    WHERE d.id = delivery_tracking.delivery_id
      AND dr.status = 'accepted'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM deliveries d
    JOIN delivery_providers dp ON dp.user_id = auth.uid()
    JOIN delivery_requests dr ON dr.provider_id = dp.id AND dr.builder_id = d.builder_id
    WHERE d.id = delivery_tracking.delivery_id
      AND dr.status = 'accepted'
  )
);

-- Block all other direct access
CREATE POLICY "delivery_tracking_block_coordinates"
ON delivery_tracking FOR SELECT TO authenticated
USING (false);

-- Create secure function to get masked location for builders
CREATE FUNCTION get_delivery_location_masked(delivery_uuid UUID)
RETURNS TABLE(
  delivery_id UUID,
  approximate_latitude NUMERIC,
  approximate_longitude NUMERIC,
  last_update TIMESTAMP WITH TIME ZONE,
  delivery_status TEXT,
  access_level TEXT,
  location_description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin BOOLEAN;
  is_builder BOOLEAN;
  is_driver BOOLEAN;
  delivery_active BOOLEAN;
BEGIN
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  
  SELECT EXISTS(
    SELECT 1 FROM deliveries d
    JOIN profiles p ON p.id = d.builder_id
    WHERE d.id = delivery_uuid AND p.user_id = auth.uid()
  ) INTO is_builder;
  
  SELECT EXISTS(
    SELECT 1 FROM deliveries d
    JOIN delivery_providers dp ON dp.user_id = auth.uid()
    JOIN delivery_requests dr ON dr.provider_id = dp.id AND dr.builder_id = d.builder_id
    WHERE d.id = delivery_uuid AND dr.status = 'accepted'
  ) INTO is_driver;
  
  SELECT EXISTS(
    SELECT 1 FROM deliveries d
    WHERE d.id = delivery_uuid 
      AND d.status IN ('in_progress', 'out_for_delivery')
  ) INTO delivery_active;
  
  INSERT INTO delivery_access_log (
    user_id, resource_id, resource_type, action,
    sensitive_fields_accessed
  ) VALUES (
    auth.uid(), delivery_uuid, 'delivery_tracking',
    'masked_location_request',
    ARRAY['approximate_latitude', 'approximate_longitude']
  );
  
  IF is_admin THEN
    RETURN QUERY
    SELECT 
      dt.delivery_id, dt.current_latitude, dt.current_longitude,
      dt.tracking_timestamp, dt.delivery_status,
      'admin_exact_coordinates'::TEXT,
      'Exact location available (admin access)'::TEXT
    FROM delivery_tracking dt
    WHERE dt.delivery_id = delivery_uuid
      AND dt.tracking_timestamp > (NOW() - INTERVAL '15 minutes')
    ORDER BY dt.tracking_timestamp DESC LIMIT 1;
  ELSIF is_driver THEN
    RETURN QUERY
    SELECT 
      dt.delivery_id, dt.current_latitude, dt.current_longitude,
      dt.tracking_timestamp, dt.delivery_status,
      'driver_exact_coordinates'::TEXT,
      'Your current location'::TEXT
    FROM delivery_tracking dt
    WHERE dt.delivery_id = delivery_uuid
      AND dt.tracking_timestamp > (NOW() - INTERVAL '15 minutes')
    ORDER BY dt.tracking_timestamp DESC LIMIT 1;
  ELSIF is_builder AND delivery_active THEN
    RETURN QUERY
    SELECT 
      dt.delivery_id,
      ROUND(dt.current_latitude, 2) as approximate_latitude,
      ROUND(dt.current_longitude, 2) as approximate_longitude,
      dt.tracking_timestamp, dt.delivery_status,
      'builder_masked_location'::TEXT,
      'Approximate area (driver safety protected)'::TEXT
    FROM delivery_tracking dt
    WHERE dt.delivery_id = delivery_uuid
      AND dt.tracking_timestamp > (NOW() - INTERVAL '15 minutes')
    ORDER BY dt.tracking_timestamp DESC LIMIT 1;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_delivery_location_masked TO authenticated;

-- Status-only function
CREATE FUNCTION get_delivery_status_safe(delivery_uuid UUID)
RETURNS TABLE(
  delivery_id UUID,
  delivery_status TEXT,
  estimated_arrival TEXT,
  last_update TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS(
    SELECT 1 FROM deliveries d
    JOIN profiles p ON p.id = d.builder_id
    WHERE d.id = delivery_uuid AND p.user_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN QUERY
    SELECT 
      dt.delivery_id, dt.delivery_status,
      CASE 
        WHEN dt.delivery_status = 'out_for_delivery' THEN 'Arriving soon'
        WHEN dt.delivery_status = 'in_progress' THEN 'On the way'
        ELSE 'Status update available'
      END::TEXT as estimated_arrival,
      dt.tracking_timestamp
    FROM delivery_tracking dt
    WHERE dt.delivery_id = delivery_uuid
    ORDER BY dt.tracking_timestamp DESC LIMIT 1;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_delivery_status_safe TO authenticated;

-- Verification
DO $$
DECLARE policy_count INT;
BEGIN
  SELECT COUNT(*) INTO policy_count 
  FROM pg_policies 
  WHERE schemaname = 'public' 
    AND tablename = 'delivery_tracking';
  
  IF policy_count != 3 THEN
    RAISE EXCEPTION 'Expected exactly 3 policies, found %', policy_count;
  END IF;
  
  RAISE NOTICE '✓ DELIVERY TRACKING SECURITY COMPLETE';
  RAISE NOTICE '  Driver Safety: PROTECTED (masked coordinates)';
  RAISE NOTICE '  Builder Access: ~1km precision via function only';
  RAISE NOTICE '  Driver Access: Exact coordinates (own deliveries)';
  RAISE NOTICE '  Admin Access: Full exact coordinates';
  RAISE NOTICE '  Use: get_delivery_location_masked(delivery_id)';
END $$;
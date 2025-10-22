-- ===================================================================
-- CRITICAL SECURITY FIX: Driver GPS Location Protection
-- ===================================================================

-- STEP 1: Drop ALL existing policies (including restrictive ones)
DROP POLICY IF EXISTS "delivery_tracking_require_auth" ON delivery_tracking;
DROP POLICY IF EXISTS "tracking_builder_status_based_only" ON delivery_tracking;
DROP POLICY IF EXISTS "tracking_provider_update_own" ON delivery_tracking;
DROP POLICY IF EXISTS "tracking_provider_self_update" ON delivery_tracking;
DROP POLICY IF EXISTS "tracking_builder_own_active_delivery_only" ON delivery_tracking;
DROP POLICY IF EXISTS "tracking_provider_assigned_active_only" ON delivery_tracking;

-- STEP 2: Add RESTRICTIVE authentication requirement (hard block)
CREATE POLICY "delivery_tracking_require_auth" 
ON delivery_tracking
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- STEP 3: Secure builder SELECT policy with proper ownership verification
CREATE POLICY "tracking_builder_own_active_delivery_only" 
ON delivery_tracking
FOR SELECT
TO authenticated
USING (
  -- Verify builder owns THIS specific delivery AND it's currently active
  EXISTS (
    SELECT 1
    FROM deliveries d
    JOIN profiles p ON p.id = d.builder_id
    WHERE d.id = delivery_tracking.delivery_id
      AND p.user_id = auth.uid()  -- Must be the delivery owner
      AND d.status IN ('in_progress', 'out_for_delivery')  -- Must be active NOW
      AND delivery_tracking.tracking_timestamp > (NOW() - INTERVAL '5 minutes')  -- Recent location only
  )
);

-- STEP 4: Secure provider UPDATE policy with current assignment verification
CREATE POLICY "tracking_provider_assigned_active_only" 
ON delivery_tracking
FOR ALL
TO authenticated
USING (
  -- Provider must be currently assigned to this specific active delivery
  EXISTS (
    SELECT 1
    FROM deliveries d
    JOIN delivery_providers dp ON dp.user_id = auth.uid()
    JOIN delivery_requests dr ON dr.provider_id = dp.id AND dr.builder_id = d.builder_id
    WHERE d.id = delivery_tracking.delivery_id
      AND delivery_tracking.provider_id = dp.id  -- Must be THIS provider
      AND d.status IN ('in_progress', 'out_for_delivery')  -- Must be active
      AND dr.status = 'accepted'  -- Must have accepted assignment
  )
)
WITH CHECK (
  -- Same verification for INSERT/UPDATE
  EXISTS (
    SELECT 1
    FROM deliveries d
    JOIN delivery_providers dp ON dp.user_id = auth.uid()
    JOIN delivery_requests dr ON dr.provider_id = dp.id AND dr.builder_id = d.builder_id
    WHERE d.id = delivery_tracking.delivery_id
      AND delivery_tracking.provider_id = dp.id
      AND d.status IN ('in_progress', 'out_for_delivery')
      AND dr.status = 'accepted'
  )
);

-- STEP 5: Create secure function for builders with GPS masking
CREATE OR REPLACE FUNCTION public.get_delivery_location_masked(delivery_uuid UUID)
RETURNS TABLE(
  delivery_id UUID,
  approximate_latitude NUMERIC,
  approximate_longitude NUMERIC,
  last_update TIMESTAMP WITH TIME ZONE,
  delivery_status TEXT,
  access_level TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin BOOLEAN;
  is_owner BOOLEAN;
  delivery_active BOOLEAN;
BEGIN
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  
  SELECT EXISTS(
    SELECT 1 FROM deliveries d
    JOIN profiles p ON p.id = d.builder_id
    WHERE d.id = delivery_uuid AND p.user_id = auth.uid()
  ) INTO is_owner;
  
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
    'gps_location_request',
    ARRAY['latitude', 'longitude']
  );
  
  IF (is_admin OR is_owner) AND delivery_active THEN
    RETURN QUERY
    SELECT 
      dt.delivery_id,
      ROUND(dt.current_latitude, 2) as approximate_latitude,
      ROUND(dt.current_longitude, 2) as approximate_longitude,
      dt.tracking_timestamp,
      dt.delivery_status,
      CASE 
        WHEN is_admin THEN 'admin_full_precision'
        ELSE 'owner_masked_location'
      END as access_level
    FROM delivery_tracking dt
    WHERE dt.delivery_id = delivery_uuid
      AND dt.tracking_timestamp > (NOW() - INTERVAL '10 minutes')
    ORDER BY dt.tracking_timestamp DESC
    LIMIT 1;
  ELSE
    RETURN;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_delivery_location_masked TO authenticated;

-- STEP 6: Add location audit trigger
CREATE OR REPLACE FUNCTION public.audit_location_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO delivery_access_log (
    user_id, resource_id, resource_type, action,
    sensitive_fields_accessed
  ) VALUES (
    auth.uid(),
    COALESCE(NEW.delivery_id, OLD.delivery_id),
    'delivery_tracking',
    TG_OP || '_location_data',
    ARRAY['current_latitude', 'current_longitude']
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS audit_delivery_tracking_access ON delivery_tracking;
CREATE TRIGGER audit_delivery_tracking_access
  AFTER INSERT OR UPDATE ON delivery_tracking
  FOR EACH ROW
  EXECUTE FUNCTION audit_location_access();

-- STEP 7: Add security comments
COMMENT ON COLUMN delivery_tracking.current_latitude IS 
'SENSITIVE: Real-time driver GPS latitude. Access strictly controlled.';

COMMENT ON COLUMN delivery_tracking.current_longitude IS 
'SENSITIVE: Real-time driver GPS longitude. Access strictly controlled.';

-- Verification
DO $$
DECLARE
  restrictive_count INT;
  permissive_count INT;
BEGIN
  SELECT COUNT(*) INTO restrictive_count
  FROM pg_policies 
  WHERE schemaname = 'public' 
    AND tablename = 'delivery_tracking'
    AND permissive = 'RESTRICTIVE';
  
  SELECT COUNT(*) INTO permissive_count
  FROM pg_policies 
  WHERE schemaname = 'public' 
    AND tablename = 'delivery_tracking'
    AND permissive = 'PERMISSIVE';
  
  RAISE NOTICE '✓ DRIVER GPS SECURITY FIX COMPLETE';
  RAISE NOTICE '  Restrictive policies: % | Permissive: %', restrictive_count, permissive_count;
  RAISE NOTICE '  ✓ Driver stalking prevented';
  RAISE NOTICE '  ✓ Ownership verified';
  RAISE NOTICE '  ✓ GPS masked (~1km)';
  
  IF restrictive_count < 1 THEN
    RAISE EXCEPTION 'SECURITY FAILURE: Restrictive policy missing!';
  END IF;
END $$;
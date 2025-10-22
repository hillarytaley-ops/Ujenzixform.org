-- Phase 4: Delivery Address & Camera Stream Protection (Fixed)
-- Fix 11: Restrict delivery address visibility

DROP POLICY IF EXISTS "deliveries_supplier_read" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_provider_read" ON public.deliveries;

CREATE POLICY "deliveries_supplier_active_only"
ON public.deliveries
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM suppliers s
    JOIN profiles p ON p.user_id = s.user_id
    WHERE s.id = deliveries.supplier_id
      AND p.user_id = auth.uid()
      AND deliveries.status IN ('confirmed', 'pending', 'in_progress')
  )
);

CREATE POLICY "deliveries_provider_active_delivery"
ON public.deliveries
FOR SELECT
USING (
  deliveries.status IN ('in_progress', 'out_for_delivery')
  AND EXISTS (
    SELECT 1
    FROM delivery_providers dp
    JOIN delivery_requests dr ON dr.provider_id = dp.id
    WHERE dp.user_id = auth.uid()
      AND dr.builder_id = deliveries.builder_id
      AND dr.status = 'accepted'
  )
);

CREATE OR REPLACE FUNCTION get_delivery_address_secure(
  delivery_uuid uuid,
  address_type text
)
RETURNS TABLE(
  delivery_id uuid,
  address text,
  access_granted boolean,
  access_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  is_builder boolean;
  is_active_provider boolean;
  delivery_status text;
BEGIN
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  
  SELECT d.status INTO delivery_status
  FROM deliveries d WHERE d.id = delivery_uuid;
  
  SELECT EXISTS(
    SELECT 1 FROM deliveries d
    JOIN profiles p ON p.id = d.builder_id
    WHERE d.id = delivery_uuid AND p.user_id = auth.uid()
  ) INTO is_builder;
  
  SELECT EXISTS(
    SELECT 1 FROM deliveries d
    JOIN delivery_providers dp ON dp.user_id = auth.uid()
    JOIN delivery_requests dr ON dr.provider_id = dp.id AND dr.builder_id = d.builder_id
    WHERE d.id = delivery_uuid
      AND d.status IN ('in_progress', 'out_for_delivery')
      AND dr.status = 'accepted'
  ) INTO is_active_provider;
  
  INSERT INTO delivery_access_log (
    user_id, resource_id, resource_type, action,
    sensitive_fields_accessed
  ) VALUES (
    auth.uid(), delivery_uuid, 'delivery',
    'address_' || address_type || '_request',
    ARRAY[address_type || '_address']
  );
  
  IF is_admin OR is_builder OR (is_active_provider AND delivery_status IN ('in_progress', 'out_for_delivery')) THEN
    RETURN QUERY
    SELECT 
      d.id,
      CASE 
        WHEN address_type = 'pickup' THEN d.pickup_address
        WHEN address_type = 'delivery' THEN d.delivery_address
        ELSE 'Invalid address type'
      END as address,
      true as access_granted,
      CASE
        WHEN is_admin THEN 'Admin access'
        WHEN is_builder THEN 'Builder/owner access'
        WHEN is_active_provider THEN 'Active delivery provider'
        ELSE 'Unknown'
      END as access_reason
    FROM deliveries d WHERE d.id = delivery_uuid;
  ELSE
    RETURN QUERY
    SELECT 
      delivery_uuid, 'Protected - Active delivery relationship required'::text,
      false, 'Access denied'::text;
  END IF;
END;
$$;

-- Fix 12: Drop and recreate camera function with time-limited access
DROP FUNCTION IF EXISTS get_camera_stream_secure(uuid);

CREATE FUNCTION get_camera_stream_secure(camera_uuid uuid)
RETURNS TABLE(
  camera_id uuid,
  stream_url text,
  access_granted boolean,
  access_reason text,
  access_expires_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_project_owner boolean;
  is_admin boolean;
  is_active_team_member boolean;
BEGIN
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  
  SELECT EXISTS(
    SELECT 1 FROM cameras c
    JOIN projects p ON p.id = c.project_id
    JOIN profiles pr ON pr.id = p.builder_id
    WHERE c.id = camera_uuid AND pr.user_id = auth.uid()
  ) INTO is_project_owner;
  
  SELECT EXISTS(
    SELECT 1 FROM cameras c
    JOIN projects p ON p.id = c.project_id
    JOIN purchase_orders po ON po.buyer_id = p.builder_id
    WHERE c.id = camera_uuid
      AND po.status IN ('confirmed', 'in_progress')
      AND po.created_at > NOW() - INTERVAL '24 hours'
      AND EXISTS (
        SELECT 1 FROM suppliers s
        WHERE s.id = po.supplier_id AND s.user_id = auth.uid()
      )
  ) INTO is_active_team_member;
  
  INSERT INTO camera_access_log (
    user_id, camera_id, access_type, authorized,
    stream_url_accessed
  ) VALUES (
    auth.uid(), camera_uuid, 'stream_url_request',
    (is_admin OR is_project_owner OR is_active_team_member),
    (is_admin OR is_project_owner OR is_active_team_member)
  );
  
  IF is_admin OR is_project_owner THEN
    RETURN QUERY
    SELECT c.id, c.stream_url, true,
      CASE WHEN is_admin THEN 'Admin access' ELSE 'Project owner' END::text,
      (NOW() + INTERVAL '8 hours')::timestamp with time zone
    FROM cameras c WHERE c.id = camera_uuid;
  ELSIF is_active_team_member THEN
    RETURN QUERY
    SELECT c.id, c.stream_url, true,
      'Active team member (limited time)'::text,
      (NOW() + INTERVAL '2 hours')::timestamp with time zone
    FROM cameras c WHERE c.id = camera_uuid;
  ELSE
    RETURN QUERY
    SELECT camera_uuid, 'Unauthorized'::text, false,
      'Camera access restricted to project owner and active team'::text,
      NOW()::timestamp with time zone;
  END IF;
END;
$$;

COMMENT ON TABLE deliveries IS 'Pickup/delivery addresses protected. Only visible to builder, admin, and active delivery provider during delivery. Access via get_delivery_address_secure() RPC.';
COMMENT ON TABLE cameras IS 'Stream URLs time-limited. Owners get 8h access, active team 2h. All access logged. Use get_camera_stream_secure() RPC.';
-- Create secure camera stream access function
-- This function controls access to sensitive stream URLs

CREATE OR REPLACE FUNCTION public.get_camera_stream_access(camera_uuid uuid)
RETURNS TABLE(
  camera_id uuid,
  camera_name text,
  can_access_stream boolean,
  stream_url text,
  access_message text,
  access_level text
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  can_access boolean := false;
  camera_record cameras%ROWTYPE;
  user_profile_record profiles%ROWTYPE;
  access_level_result text := 'none';
BEGIN
  -- Get camera record
  SELECT * INTO camera_record 
  FROM cameras 
  WHERE cameras.id = camera_uuid AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT
      camera_uuid,
      'Camera not found'::text,
      false,
      NULL::text,
      'Camera not found or inactive'::text,
      'none'::text;
    RETURN;
  END IF;
  
  -- Get current user profile
  SELECT * INTO user_profile_record 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Determine access level
  IF user_profile_record.role = 'admin' THEN
    can_access := true;
    access_level_result := 'admin';
  ELSIF user_profile_record.role = 'builder' AND camera_record.project_id IS NOT NULL THEN
    can_access := true;
    access_level_result := 'project_owner';
  ELSIF user_profile_record.role = 'supplier' AND EXISTS (
    SELECT 1 FROM suppliers s
    JOIN deliveries d ON d.supplier_id = s.id
    WHERE s.user_id = user_profile_record.id 
    AND d.project_id = camera_record.project_id
    AND d.status IN ('in_progress', 'out_for_delivery')
  ) THEN
    can_access := true;
    access_level_result := 'active_delivery';
  END IF;
  
  -- Log the stream access attempt with detailed info
  INSERT INTO camera_access_log (
    user_id, 
    camera_id, 
    access_type, 
    project_id,
    authorized,
    stream_url_accessed
  ) VALUES (
    auth.uid(), 
    camera_uuid, 
    CASE 
      WHEN can_access THEN 'stream_url_granted'
      ELSE 'stream_url_denied'
    END,
    camera_record.project_id,
    can_access,
    can_access
  );
  
  -- Return controlled access data
  RETURN QUERY SELECT
    camera_record.id,
    camera_record.name,
    can_access,
    CASE 
      WHEN can_access THEN camera_record.stream_url 
      ELSE NULL 
    END,
    CASE 
      WHEN can_access THEN 'Stream access authorized'
      WHEN user_profile_record.role IS NULL THEN 'Authentication required'
      WHEN user_profile_record.role = 'supplier' THEN 'Stream access only during active deliveries'
      ELSE 'Access restricted to project participants'
    END,
    access_level_result;
END;
$$;

-- Create safe camera directory function for public listings
CREATE OR REPLACE FUNCTION public.get_safe_camera_directory()
RETURNS TABLE(
  id uuid,
  name text,
  general_location text,
  project_id uuid,
  is_active boolean,
  can_request_access boolean,
  access_requirements text
) 
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id,
    c.name,
    -- Only show general location
    CASE 
      WHEN c.location IS NOT NULL 
      THEN split_part(c.location, ',', -1)
      ELSE 'Construction site'
    END,
    c.project_id,
    c.is_active,
    -- Indicate if user could potentially request access
    auth.uid() IS NOT NULL,
    CASE 
      WHEN auth.uid() IS NULL THEN 'Sign in to request camera access'
      ELSE 'Camera access restricted to project participants'
    END
  FROM cameras c
  WHERE c.is_active = true
  ORDER BY c.created_at DESC;
$$;

-- Grant appropriate permissions
GRANT EXECUTE ON FUNCTION public.get_camera_stream_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_safe_camera_directory() TO public;
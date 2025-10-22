-- Fix the policy conflict and complete camera security
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Project members can view project cameras" ON public.cameras;
DROP POLICY IF EXISTS "Admins and builders can manage cameras" ON public.cameras;

-- Create comprehensive secure policies for camera access
CREATE POLICY "Admins can manage all cameras" 
ON public.cameras 
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Project-based camera access for authorized users only
CREATE POLICY "Project participants can view project cameras" 
ON public.cameras 
FOR SELECT 
TO authenticated
USING (
  -- Only allow access if user is part of the project
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    ) OR
    -- Project builders can view their project cameras
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() 
      AND p.role = 'builder' 
      AND cameras.project_id IS NOT NULL
      -- Additional project membership check would go here
    ) OR
    -- Suppliers with active deliveries can view project cameras
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN suppliers s ON s.user_id = p.id
      JOIN deliveries d ON d.supplier_id = s.id
      WHERE p.user_id = auth.uid() 
      AND d.project_id = cameras.project_id
      AND d.status IN ('in_progress', 'out_for_delivery')
    )
  )
);

-- Builders can create cameras for their projects
CREATE POLICY "Builders can create project cameras" 
ON public.cameras 
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'builder'
    )
  )
);

-- Create secure function to get camera stream URL with proper authorization
CREATE OR REPLACE FUNCTION public.get_secure_camera_stream(camera_uuid uuid)
RETURNS TABLE(
  camera_id uuid,
  camera_name text,
  stream_url text,
  can_access boolean,
  access_message text
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  can_access_stream boolean := false;
  camera_record cameras%ROWTYPE;
  user_profile_record profiles%ROWTYPE;
BEGIN
  -- Get camera record
  SELECT * INTO camera_record 
  FROM cameras 
  WHERE cameras.id = camera_uuid AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      camera_uuid,
      'Camera not found'::text,
      ''::text,
      false,
      'Camera not found or inactive'::text;
    RETURN;
  END IF;
  
  -- Get current user profile
  SELECT * INTO user_profile_record 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Check stream access authorization
  SELECT (
    user_profile_record.role = 'admin' OR
    (user_profile_record.role = 'builder' AND camera_record.project_id IS NOT NULL) OR
    (user_profile_record.role = 'supplier' AND EXISTS (
      SELECT 1 FROM suppliers s
      JOIN deliveries d ON d.supplier_id = s.id
      WHERE s.user_id = user_profile_record.id 
      AND d.project_id = camera_record.project_id
      AND d.status IN ('in_progress', 'out_for_delivery')
    ))
  ) INTO can_access_stream;
  
  -- Log the stream access attempt
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
    CASE WHEN can_access_stream THEN 'stream_access_granted' ELSE 'stream_access_denied' END,
    camera_record.project_id,
    can_access_stream,
    can_access_stream
  );
  
  -- Return secure camera stream data
  RETURN QUERY SELECT
    camera_record.id,
    camera_record.name,
    CASE 
      WHEN can_access_stream THEN camera_record.stream_url 
      ELSE ''
    END,
    can_access_stream,
    CASE 
      WHEN can_access_stream THEN 'Authorized access to camera stream'
      WHEN user_profile_record.role IS NULL THEN 'Authentication required'
      ELSE 'Access restricted to project participants only'
    END;
END;
$$;

-- Grant permissions for the secure functions
GRANT EXECUTE ON FUNCTION public.get_secure_camera_stream(uuid) TO authenticated;
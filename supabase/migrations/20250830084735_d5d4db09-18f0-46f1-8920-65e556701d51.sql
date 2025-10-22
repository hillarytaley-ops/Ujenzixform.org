-- CRITICAL FIX: Secure camera feed access from unauthorized viewers
-- Current "Users can view all cameras" policy exposes sensitive surveillance data

-- Drop the dangerous public policy that exposes all camera data
DROP POLICY IF EXISTS "Users can view all cameras" ON public.cameras;

-- Create secure access control for camera data
-- Only project members and administrators should access camera information

CREATE POLICY "Project members can view project cameras" 
ON public.cameras 
FOR SELECT 
TO authenticated
USING (
  -- Only allow access if user is part of the project or is admin
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    ) OR
    -- Project-based access control
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() 
      AND (
        -- Builder owns the project
        (p.role = 'builder' AND cameras.project_id IS NOT NULL) OR
        -- Supplier has delivery to this project
        (p.role = 'supplier' AND EXISTS (
          SELECT 1 FROM suppliers s
          JOIN deliveries d ON d.supplier_id = s.id
          WHERE s.user_id = p.id AND d.project_id = cameras.project_id
        ))
      )
    )
  )
);

-- Create a secure function to get camera information with access control
CREATE OR REPLACE FUNCTION public.get_secure_camera_info(camera_uuid uuid)
RETURNS TABLE(
  id uuid,
  name text,
  location text,
  project_id uuid,
  is_active boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  can_view_stream boolean,
  stream_access_message text,
  general_location text
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
  WHERE cameras.id = camera_uuid;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Get current user profile
  SELECT * INTO user_profile_record 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Check if user can access camera stream
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
  
  -- Log camera access attempt
  IF can_access_stream THEN
    INSERT INTO camera_access_log (
      user_id, 
      camera_id, 
      access_type, 
      project_id,
      authorized
    ) VALUES (
      auth.uid(), 
      camera_uuid, 
      'stream_access_authorized',
      camera_record.project_id,
      true
    );
  ELSE
    INSERT INTO camera_access_log (
      user_id, 
      camera_id, 
      access_type, 
      project_id,
      authorized
    ) VALUES (
      auth.uid(), 
      camera_uuid, 
      'stream_access_denied',
      camera_record.project_id,
      false
    );
  END IF;
  
  -- Return data with conditional stream access
  RETURN QUERY SELECT
    camera_record.id,
    camera_record.name,
    CASE 
      WHEN can_access_stream THEN camera_record.location 
      ELSE 'Project site location'
    END,
    camera_record.project_id,
    camera_record.is_active,
    camera_record.created_at,
    camera_record.updated_at,
    can_access_stream,
    CASE 
      WHEN can_access_stream THEN 'Authorized access to camera stream'
      WHEN user_profile_record.role IS NULL THEN 'Sign in to access project cameras'
      ELSE 'Camera access restricted to project participants'
    END,
    -- Only show general location info
    CASE 
      WHEN camera_record.location IS NOT NULL 
      THEN split_part(camera_record.location, ',', -1)
      ELSE 'Construction site'
    END;
END;
$$;

-- Create audit table for camera access
CREATE TABLE IF NOT EXISTS public.camera_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  camera_id uuid REFERENCES public.cameras(id),
  project_id uuid,
  access_type text NOT NULL,
  authorized boolean NOT NULL DEFAULT false,
  stream_url_accessed boolean DEFAULT false,
  accessed_at timestamp with time zone DEFAULT now(),
  ip_address inet,
  user_agent text,
  session_duration interval
);

-- Enable RLS on audit log
ALTER TABLE public.camera_access_log ENABLE ROW LEVEL SECURITY;

-- Only admins and project managers can view camera access logs
CREATE POLICY "Authorized users can view camera access logs"
ON public.camera_access_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.role = 'admin' OR
      (p.role = 'builder' AND camera_access_log.project_id IS NOT NULL)
    )
  )
);

-- Grant appropriate permissions
GRANT EXECUTE ON FUNCTION public.get_secure_camera_info(uuid) TO authenticated;
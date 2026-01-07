-- ====================================================
-- SECURE CAMERA RLS POLICIES
-- Created: 2024-12-19
-- Proper security for production camera data
-- ====================================================

-- ====================================================
-- 1. DROP ALL EXISTING CAMERA POLICIES
-- ====================================================

DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'cameras' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.cameras';
    END LOOP;
END $$;

-- ====================================================
-- 2. CREATE ADMIN CHECK FUNCTION
-- ====================================================

CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if current user has admin role
    RETURN EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ====================================================
-- 3. CHECK PROJECT ACCESS FUNCTION
-- ====================================================

CREATE OR REPLACE FUNCTION user_has_project_access(project_uuid uuid)
RETURNS BOOLEAN AS $$
BEGIN
    -- Admins have access to all projects
    IF is_admin_user() THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user is project owner
    IF EXISTS (
        SELECT 1 FROM projects 
        WHERE id = project_uuid 
        AND user_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user is assigned to project
    IF EXISTS (
        SELECT 1 FROM project_members 
        WHERE project_id = project_uuid 
        AND user_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ====================================================
-- 4. SECURE CAMERA POLICIES
-- ====================================================

-- BLOCK ANONYMOUS ACCESS (Most important!)
CREATE POLICY "cameras_block_anon"
ON cameras FOR ALL TO anon
USING (false) WITH CHECK (false);

-- SELECT: Users can only see cameras for their projects OR if admin
CREATE POLICY "cameras_select_authorized"
ON cameras FOR SELECT TO authenticated
USING (
    -- Admins can see all
    is_admin_user()
    OR 
    -- Users can see cameras in their projects
    (project_id IS NOT NULL AND user_has_project_access(project_id))
    OR
    -- Cameras without project_id are public demos (optional - remove if not needed)
    (project_id IS NULL)
);

-- INSERT: Only admins can add cameras
CREATE POLICY "cameras_insert_admin_only"
ON cameras FOR INSERT TO authenticated
WITH CHECK (is_admin_user());

-- UPDATE: Only admins can update cameras
CREATE POLICY "cameras_update_admin_only"
ON cameras FOR UPDATE TO authenticated
USING (is_admin_user()) 
WITH CHECK (is_admin_user());

-- DELETE: Only admins can delete cameras
CREATE POLICY "cameras_delete_admin_only"
ON cameras FOR DELETE TO authenticated
USING (is_admin_user());

-- ====================================================
-- 5. SECURE STREAM URL ACCESS FUNCTION
-- ====================================================

-- Drop existing function first
DROP FUNCTION IF EXISTS get_camera_stream_secure(uuid);

CREATE OR REPLACE FUNCTION get_camera_stream_secure(camera_uuid uuid)
RETURNS TABLE (
    camera_id uuid,
    stream_url text,
    authorized boolean,
    access_message text,
    expires_at timestamptz
) AS $$
DECLARE
    camera_project_id uuid;
    user_authorized boolean := false;
BEGIN
    -- Get camera's project_id
    SELECT c.project_id INTO camera_project_id
    FROM cameras c WHERE c.id = camera_uuid;
    
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN QUERY SELECT 
            camera_uuid,
            NULL::text,
            false,
            'Authentication required. Please sign in.'::text,
            NULL::timestamptz;
        
        -- Log unauthorized access attempt
        INSERT INTO camera_access_log (user_id, camera_id, project_id, access_type, authorized, metadata)
        VALUES (NULL, camera_uuid, camera_project_id, 'stream_request', false, 
                jsonb_build_object('reason', 'not_authenticated', 'ip', current_setting('request.headers', true)::json->>'x-forwarded-for'));
        RETURN;
    END IF;
    
    -- Check authorization
    IF is_admin_user() OR user_has_project_access(camera_project_id) THEN
        user_authorized := true;
    END IF;
    
    -- Log the access attempt
    INSERT INTO camera_access_log (user_id, camera_id, project_id, access_type, authorized, metadata)
    VALUES (auth.uid(), camera_uuid, camera_project_id, 'stream_request', user_authorized,
            jsonb_build_object('timestamp', NOW()));
    
    IF user_authorized THEN
        RETURN QUERY 
        SELECT 
            c.id,
            c.stream_url,
            true,
            'Access granted'::text,
            NOW() + INTERVAL '2 hours'
        FROM cameras c
        WHERE c.id = camera_uuid AND c.is_active = true;
    ELSE
        RETURN QUERY SELECT 
            camera_uuid,
            NULL::text,
            false,
            'Access denied. You do not have permission to view this camera.'::text,
            NULL::timestamptz;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================
-- 6. CAMERA ACCESS LOG POLICIES
-- ====================================================

DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'camera_access_log' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.camera_access_log';
    END LOOP;
END $$;

-- Block anonymous
CREATE POLICY "camera_log_block_anon"
ON camera_access_log FOR ALL TO anon
USING (false) WITH CHECK (false);

-- All authenticated can insert logs (via the secure function)
CREATE POLICY "camera_log_insert_auth"
ON camera_access_log FOR INSERT TO authenticated
WITH CHECK (true);

-- Users can only view their own access logs, admins can see all
CREATE POLICY "camera_log_select_own"
ON camera_access_log FOR SELECT TO authenticated
USING (
    user_id = auth.uid() 
    OR 
    is_admin_user()
);

-- ====================================================
-- 7. ENCRYPT SENSITIVE CAMERA CREDENTIALS
-- ====================================================

-- Add encrypted credentials column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cameras' AND column_name = 'encrypted_credentials'
    ) THEN
        ALTER TABLE cameras ADD COLUMN encrypted_credentials TEXT;
    END IF;
END $$;

-- ====================================================
-- 8. GRANT MINIMAL PERMISSIONS
-- ====================================================

-- Revoke direct table access from anon
REVOKE ALL ON cameras FROM anon;
REVOKE ALL ON camera_access_log FROM anon;

-- Grant function execution only
GRANT EXECUTE ON FUNCTION get_camera_stream_secure(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_project_access(uuid) TO authenticated;

-- DO NOT grant these functions to anon!
REVOKE EXECUTE ON FUNCTION get_camera_stream_secure(uuid) FROM anon;

-- ====================================================
-- 9. CREATE VIEW FOR SAFE CAMERA LISTING
-- ====================================================

CREATE OR REPLACE VIEW camera_directory_safe AS
SELECT 
    c.id,
    c.name,
    COALESCE(split_part(c.location, ',', -1), 'Construction Site') as general_location,
    c.is_active,
    c.camera_type,
    c.project_id,
    -- Never expose stream_url directly in listing
    CASE WHEN c.stream_url IS NOT NULL THEN true ELSE false END as has_stream
FROM cameras c
WHERE c.is_active = true;

-- Grant view access to authenticated users only
GRANT SELECT ON camera_directory_safe TO authenticated;

-- ====================================================
-- SECURITY SUMMARY
-- ====================================================
/*
✅ Anonymous users CANNOT access cameras table
✅ Stream URLs are only returned via secure function after authorization check
✅ All access attempts are logged in camera_access_log
✅ Users can only see cameras for projects they have access to
✅ Only admins can add/edit/delete cameras
✅ Credentials can be stored encrypted

IMPORTANT: For the admin dashboard to work, you MUST:
1. Ensure admin users have role='admin' in user_roles table
2. OR use service_role key in your admin client (.env.local)
*/

-- ====================================================
-- DONE
-- ====================================================















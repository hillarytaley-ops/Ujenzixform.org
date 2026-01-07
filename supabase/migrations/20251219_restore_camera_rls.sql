-- ====================================================
-- RESTORE CAMERA RLS POLICIES - MINIMAL VERSION
-- Created: 2024-12-19
-- No subqueries to other tables to avoid RLS recursion issues
-- ====================================================

-- ====================================================
-- 1. CREATE/ENSURE CAMERAS TABLE
-- ====================================================

CREATE TABLE IF NOT EXISTS public.cameras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    location TEXT,
    stream_url TEXT,
    project_id UUID,
    is_active BOOLEAN DEFAULT true,
    camera_type VARCHAR(50) DEFAULT 'ip_camera',
    resolution VARCHAR(20) DEFAULT '1080p',
    recording_enabled BOOLEAN DEFAULT false,
    motion_detection BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cameras_project_id ON cameras(project_id);
CREATE INDEX IF NOT EXISTS idx_cameras_is_active ON cameras(is_active);

-- ====================================================
-- 2. CREATE/ENSURE CAMERA ACCESS LOG TABLE
-- ====================================================

CREATE TABLE IF NOT EXISTS public.camera_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    camera_id UUID,
    project_id UUID,
    access_type VARCHAR(100) NOT NULL,
    authorized BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_camera_access_log_user_id ON camera_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_camera_access_log_camera_id ON camera_access_log(camera_id);

-- ====================================================
-- 3. ENABLE RLS
-- ====================================================

ALTER TABLE cameras ENABLE ROW LEVEL SECURITY;
ALTER TABLE camera_access_log ENABLE ROW LEVEL SECURITY;

-- ====================================================
-- 4. DROP ALL EXISTING POLICIES ON CAMERAS
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

DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'camera_access_log' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.camera_access_log';
    END LOOP;
END $$;

-- ====================================================
-- 5. CREATE SIMPLE POLICIES - NO SUBQUERIES
-- ====================================================

-- All authenticated users can SELECT cameras
CREATE POLICY "cameras_select_authenticated"
ON cameras FOR SELECT TO authenticated
USING (true);

-- All authenticated users can INSERT cameras
CREATE POLICY "cameras_insert_authenticated"
ON cameras FOR INSERT TO authenticated
WITH CHECK (true);

-- All authenticated users can UPDATE cameras
CREATE POLICY "cameras_update_authenticated"
ON cameras FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);

-- All authenticated users can DELETE cameras
CREATE POLICY "cameras_delete_authenticated"
ON cameras FOR DELETE TO authenticated
USING (true);

-- Block anonymous access
CREATE POLICY "cameras_anon_block"
ON cameras FOR ALL TO anon
USING (false) WITH CHECK (false);

-- ====================================================
-- 6. CAMERA ACCESS LOG POLICIES
-- ====================================================

-- All authenticated can insert logs
CREATE POLICY "camera_log_insert"
ON camera_access_log FOR INSERT TO authenticated
WITH CHECK (true);

-- Users can view their own logs
CREATE POLICY "camera_log_select"
ON camera_access_log FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- ====================================================
-- 7. SIMPLE FUNCTIONS (NO TABLE LOOKUPS)
-- ====================================================

CREATE OR REPLACE FUNCTION get_camera_stream_secure(camera_uuid uuid)
RETURNS TABLE (
    camera_id uuid,
    stream_url text,
    authorized boolean,
    access_message text,
    expires_at timestamptz
) AS $$
BEGIN
    -- Simple: if authenticated, allow access
    IF auth.uid() IS NULL THEN
        RETURN QUERY SELECT 
            camera_uuid,
            'Unauthorized'::text,
            false,
            'Please sign in'::text,
            NULL::timestamptz;
        RETURN;
    END IF;
    
    RETURN QUERY 
    SELECT 
        c.id,
        c.stream_url,
        true,
        'Access granted'::text,
        NOW() + INTERVAL '2 hours'
    FROM cameras c
    WHERE c.id = camera_uuid AND c.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_secure_camera_info(camera_uuid uuid)
RETURNS TABLE (
    id uuid,
    name text,
    location text,
    project_id uuid,
    is_active boolean,
    camera_type text,
    can_view_stream boolean,
    general_location text,
    access_message text
) AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        c.id,
        c.name::text,
        c.location,
        c.project_id,
        c.is_active,
        c.camera_type::text,
        (auth.uid() IS NOT NULL),
        COALESCE(split_part(c.location, ',', -1), 'Construction Site'),
        CASE WHEN auth.uid() IS NOT NULL THEN 'Access granted' ELSE 'Sign in required' END
    FROM cameras c
    WHERE c.id = camera_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_camera_directory()
RETURNS TABLE (
    id uuid,
    name text,
    general_location text,
    is_active boolean,
    access_status text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name::text,
        COALESCE(split_part(c.location, ',', -1), 'Construction Site'),
        c.is_active,
        CASE WHEN auth.uid() IS NOT NULL THEN 'Access granted' ELSE 'Sign in required' END
    FROM cameras c
    WHERE c.is_active = true
    ORDER BY c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================
-- 8. GRANT PERMISSIONS
-- ====================================================

GRANT EXECUTE ON FUNCTION get_camera_stream_secure(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_camera_stream_secure(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_secure_camera_info(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_secure_camera_info(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_camera_directory() TO authenticated;
GRANT EXECUTE ON FUNCTION get_camera_directory() TO anon;

-- ====================================================
-- 9. TRIGGER FOR UPDATED_AT
-- ====================================================

CREATE OR REPLACE FUNCTION update_cameras_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cameras_updated_at ON cameras;
CREATE TRIGGER cameras_updated_at
    BEFORE UPDATE ON cameras
    FOR EACH ROW
    EXECUTE FUNCTION update_cameras_updated_at();

-- ====================================================
-- DONE
-- ====================================================
















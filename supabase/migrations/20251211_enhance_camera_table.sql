-- Enhance cameras table with additional connection options
-- This migration adds support for multiple camera connection types

-- Add new columns to cameras table if they don't exist
DO $$ 
BEGIN
  -- Connection type column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'cameras' AND column_name = 'connection_type') THEN
    ALTER TABLE public.cameras ADD COLUMN connection_type TEXT DEFAULT 'url';
  END IF;

  -- IP address for direct camera connections
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'cameras' AND column_name = 'ip_address') THEN
    ALTER TABLE public.cameras ADD COLUMN ip_address TEXT;
  END IF;

  -- Credentials stored as JSONB (username, password, port, api_key)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'cameras' AND column_name = 'credentials') THEN
    ALTER TABLE public.cameras ADD COLUMN credentials JSONB;
  END IF;

  -- Embed code for embedded viewers (iframe, etc.)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'cameras' AND column_name = 'embed_code') THEN
    ALTER TABLE public.cameras ADD COLUMN embed_code TEXT;
  END IF;

  -- Resolution setting
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'cameras' AND column_name = 'resolution') THEN
    ALTER TABLE public.cameras ADD COLUMN resolution TEXT;
  END IF;

  -- FPS setting
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'cameras' AND column_name = 'fps') THEN
    ALTER TABLE public.cameras ADD COLUMN fps INTEGER;
  END IF;

  -- Recording enabled flag
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'cameras' AND column_name = 'recording_enabled') THEN
    ALTER TABLE public.cameras ADD COLUMN recording_enabled BOOLEAN DEFAULT false;
  END IF;

  -- Motion detection flag
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'cameras' AND column_name = 'motion_detection') THEN
    ALTER TABLE public.cameras ADD COLUMN motion_detection BOOLEAN DEFAULT false;
  END IF;

  -- Last connected timestamp
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'cameras' AND column_name = 'last_connected') THEN
    ALTER TABLE public.cameras ADD COLUMN last_connected TIMESTAMPTZ;
  END IF;

  -- Camera type (physical type)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'cameras' AND column_name = 'camera_type') THEN
    ALTER TABLE public.cameras ADD COLUMN camera_type TEXT DEFAULT 'ip';
  END IF;
END $$;

-- Add check constraint for connection_type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'cameras_connection_type_check'
  ) THEN
    ALTER TABLE public.cameras ADD CONSTRAINT cameras_connection_type_check 
      CHECK (connection_type IN ('url', 'rtsp', 'hls', 'webrtc', 'ip_camera', 'onvif', 'embedded', 'usb', 'mobile'));
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add index on connection_type for filtering
CREATE INDEX IF NOT EXISTS idx_cameras_connection_type ON public.cameras(connection_type);

-- Add index on is_active for filtering online/offline cameras
CREATE INDEX IF NOT EXISTS idx_cameras_is_active ON public.cameras(is_active);

-- Comment on columns for documentation
COMMENT ON COLUMN public.cameras.connection_type IS 'Type of connection: url, rtsp, hls, webrtc, ip_camera, onvif, embedded, usb, mobile';
COMMENT ON COLUMN public.cameras.ip_address IS 'Direct IP address for IP camera connections';
COMMENT ON COLUMN public.cameras.credentials IS 'JSONB containing username, password, port, api_key for authenticated connections';
COMMENT ON COLUMN public.cameras.embed_code IS 'HTML embed code for embedded camera viewers (iframe, etc.)';
COMMENT ON COLUMN public.cameras.resolution IS 'Camera resolution setting (480p, 720p, 1080p, 1440p, 2160p)';
COMMENT ON COLUMN public.cameras.fps IS 'Frames per second setting';
COMMENT ON COLUMN public.cameras.recording_enabled IS 'Whether recording is enabled for this camera';
COMMENT ON COLUMN public.cameras.motion_detection IS 'Whether motion detection is enabled';
COMMENT ON COLUMN public.cameras.last_connected IS 'Timestamp of last successful connection';
COMMENT ON COLUMN public.cameras.camera_type IS 'Physical camera type: ip, analog, ptz, dome, bullet, thermal, 360';



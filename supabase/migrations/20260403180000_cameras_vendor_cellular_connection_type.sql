-- Allow solar / cellular vendor cameras (e.g. Hikvision 4G kits) as a first-class connection_type.
-- Same playback rules as url: HTTPS / HLS in stream_url, or use embed_code for vendor iframe.

ALTER TABLE public.cameras DROP CONSTRAINT IF EXISTS cameras_connection_type_check;

ALTER TABLE public.cameras ADD CONSTRAINT cameras_connection_type_check
  CHECK (
    connection_type IN (
      'url',
      'rtsp',
      'hls',
      'webrtc',
      'ip_camera',
      'onvif',
      'embedded',
      'usb',
      'mobile',
      'vendor_cellular'
    )
  );

COMMENT ON COLUMN public.cameras.connection_type IS
  'Type of connection: url, rtsp, hls, webrtc, ip_camera, onvif, embedded, usb, mobile, vendor_cellular (solar/4G IP kits; use HLS/HTTPS URL or embed, not raw rtsp:// in browser)';

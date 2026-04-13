-- MediaMTX WebRTC: maps to Docker env MTX_WEBRTCADDITIONALHOSTS (comma-separated IPs/hostnames).
-- Only needed when operators use the WebRTC viewer (e.g. :8889), not for HLS-only playback in UjenziXform.

ALTER TABLE public.cameras
  ADD COLUMN IF NOT EXISTS mediamtx_webrtc_additional_hosts TEXT;

COMMENT ON COLUMN public.cameras.mediamtx_webrtc_additional_hosts IS
  'Comma-separated hosts for MediaMTX MTX_WEBRTCADDITIONALHOSTS when using WebRTC; optional. HLS-only setups can leave null.';

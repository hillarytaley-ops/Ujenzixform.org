-- Optional flags for future PTZ and two-way audio (vendor / gateway dependent).
ALTER TABLE public.cameras
  ADD COLUMN IF NOT EXISTS supports_ptz boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS supports_two_way_audio boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.cameras.supports_ptz IS
  'Hardware supports pan/tilt/zoom; remote control requires ONVIF/vendor API or gateway — not wired in app yet.';
COMMENT ON COLUMN public.cameras.supports_two_way_audio IS
  'Hardware supports speaker/mic; browser talk-back requires vendor WebRTC or similar — not wired in app yet.';

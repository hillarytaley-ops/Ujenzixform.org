-- Optional ingest URLs for Case 2: camera pushes RTMP/SRT to MediaMTX (VPS).
-- Dashboard still uses stream_url (HLS). These fields are for installers / ops only.
-- Not exposed via resolve_monitoring_access_code (guest payload).

ALTER TABLE public.cameras
  ADD COLUMN IF NOT EXISTS ingest_rtmp_url TEXT,
  ADD COLUMN IF NOT EXISTS ingest_srt_url TEXT;

COMMENT ON COLUMN public.cameras.ingest_rtmp_url IS
  'RTMP publish URL to paste into the camera (e.g. rtmp://vps:1935/path). Optional; browsers do not play RTMP.';
COMMENT ON COLUMN public.cameras.ingest_srt_url IS
  'SRT publish URL for the camera if supported (e.g. srt://vps:8890?streamid=...). Optional.';

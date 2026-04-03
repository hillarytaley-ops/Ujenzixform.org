# Site vision & streaming — advanced integration (roadmap)

Practical notes for the four areas that are **not** fully productized in the SPA alone.

## 1. Custom CV (per-material, PPE, fine-tuned models)

**Today:** `workers/site-vision` supports optional **YOLO** (`USE_YOLO=1`) with generic COCO-style weights.

**To ship domain-specific CV:**

1. **Data** — Label frames for your classes (material piles, PPE on/off, etc.) in a tool compatible with YOLO export.
2. **Train** — Fine-tune YOLOv8 (or export to ONNX) on that dataset; keep class indices stable.
3. **Worker** — Point `YOLO_MODEL` / weights path at the new file; extend `process_yolo` to map class IDs to your taxonomy and to `site_vision_events.event_type` / `label` / `payload`.
4. **Thumbnails** — After inference, upload a crop or frame to Supabase Storage (or signed URL) and set `payload.thumbnail_url` so **Analytics → Site vision** shows previews.

No single repo change replaces steps 1–2; the worker is already the integration point for step 3.

## 2. RTSP and HLS in the browser

**RTSP:** Browsers do not speak RTSP. You need **FFmpeg / MediaMTX / vendor NVR** to produce **HLS** or **WebRTC** at an HTTPS URL.

**HLS (.m3u8):** The Monitoring page uses **`hls.js`** (and Safari native HLS) when the stream URL looks like an HLS playlist. Requirements:

- Playlist and segments must be served over **HTTPS** (or same-origin) where possible.
- The **media origin must allow CORS** (`Access-Control-Allow-Origin`) for your web app origin, or `hls.js` fetches will fail.

**WebRTC:** For sub-second latency, add a TURN-friendly gateway (e.g. LiveKit, Pion, vendor SDK) and a dedicated player component — not interchangeable with a single `<video src>`.

## 3. Byte-level HLS relay and signed tickets

**Today:** `camera-stream-url` (optional) returns the **stream URL** to the browser after JWT + rate limit; the client still fetches segments from the camera/CDN origin.

**Stricter deployments** may require:

- **Opaque tickets** — Short-lived server-issued token; Edge validates and returns redirect or one-time URL.
- **Segment relay** — Edge or a small VM proxies `.ts` / `.m3u8` so the **origin URL never reaches** the browser. Higher bandwidth and ops cost; implement only if red-team or contract requires it.

## 4. Edge-signed ingest (field PC without service role)

**Shipped in this repo:**

| Piece | Location |
|--------|-----------|
| Bucket + Storage RLS | Migration `supabase/migrations/20260403160000_site_vision_captures_bucket.sql` — private bucket **`site-vision-captures`**, paths `{camera_id}/{yyyy-mm-dd}/{uuid}.{ext}` |
| Edge Function | `supabase/functions/camera-vision-upload-ticket` — `POST` JSON with `camera_id` (UUID) and optional `file_extension` (`jpeg`, `png`, `webp`; default `webp`) — response `{ bucket, path, signedUrl, token }` |

**Auth (choose one):**

1. **Logged-in user:** `Authorization: Bearer <Supabase access token>` — must pass `auth_can_access_camera(camera_id)`.
2. **Field device:** set Edge secret **`SITE_VISION_DEVICE_SECRET`** on the project, then send header **`X-Site-Vision-Device-Secret: <same value>`** — function checks the `cameras` row exists (no full RLS parity with builders; rotate the secret if the device is compromised).

**Client upload:** `PUT` the image bytes to `signedUrl` with `Content-Type` matching the extension (`image/jpeg`, `image/png`, or `image/webp`). The bucket is **private**; for thumbnails in `site_vision_events.payload.thumbnail_url`, generate a **signed read URL** with the service role (or add a small read helper later).

**Deploy:** `supabase functions deploy camera-vision-upload-ticket` (see `supabase/config.toml`: `verify_jwt = false` because device path has no JWT). Per-user / per-IP rate limits use `vision_upload_ticket` in `supabase/functions/_shared/rateLimitCore.ts`.

---

See also: [MONITORING_AND_VISION_STATUS.md](./MONITORING_AND_VISION_STATUS.md), [EDGE_THROTTLING_AND_STREAM_RELAY.md](./EDGE_THROTTLING_AND_STREAM_RELAY.md), [workers/site-vision/README.md](../workers/site-vision/README.md).

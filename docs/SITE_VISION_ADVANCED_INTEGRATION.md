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

**Pattern:**

1. Field device authenticates to an **Edge Function** (device secret in header, or mTLS later).
2. Function verifies device + optional `camera_id`, then returns a **short-lived signed upload URL** (Supabase Storage `createSignedUploadUrl` or S3 presigned PUT).
3. Worker uploads **frames or clips** with that URL; **no service role** on the device.
4. **RLS** on `site_vision_events` stays tied to normal user access; optional `storage` policies restrict reads.

Requires: a **bucket** (e.g. `site-vision-captures`), policies, and one deployed function — not yet wired in this repo by default.

---

See also: [MONITORING_AND_VISION_STATUS.md](./MONITORING_AND_VISION_STATUS.md), [EDGE_THROTTLING_AND_STREAM_RELAY.md](./EDGE_THROTTLING_AND_STREAM_RELAY.md), [workers/site-vision/README.md](../workers/site-vision/README.md).

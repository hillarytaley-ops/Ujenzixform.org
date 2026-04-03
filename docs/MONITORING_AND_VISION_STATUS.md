# Monitoring, vision & hardware — product status

Single reference for what **exists today** vs **planned / future**. Aligns engineering, ops, and stakeholder expectations.

## Site vision (worker + database)

| Area | Status | Notes |
|------|--------|--------|
| **Motion + sampling worker** | **Shipped (repo)** | `workers/site-vision/` — Docker-friendly; reads active cameras, samples frames, writes `site_vision_events`. See `workers/site-vision/README.md`. |
| **Optional YOLO** | **Shipped (opt-in)** | `USE_YOLO=1` + `ultralytics`; generic COCO-style classes, not per-material Kenya catalog. |
| **Custom CV (per-material, PPE models, etc.)** | **Not built** | Would need labeled data, training pipeline, and worker changes beyond current YOLO hook. |
| **Thumbnails on every alert** | **Partial** | Worker payload may include `thumbnail_url` / `snapshot_url` / `image_url` / `frame_url`; Analytics **Site vision** table shows a preview column when present. Polished frame capture + storage policy is still ops-dependent. |
| **Edge-signed ingest (no service role on field PC)** | **Future** | Today the documented path uses service role on the worker. Alternatives: short-lived upload tokens via Edge, signed URLs to Storage, or VPN to a central ingest. |

## Streams (builder Monitoring page + admin cameras)

| Area | Status | Notes |
|------|--------|--------|
| **Share / gallery URLs (GoPro Quik web, etc.)** | **Not playable as `<video src>`** | These are **HTML pages**, not media URLs. The Monitoring player detects many such patterns and shows guidance **without** waiting for `error` events. Use **direct** `.mp4` / `.webm`, **HLS** where the browser supports it (or add `hls.js` later), **YouTube/Vimeo** page links (we rewrite to embed), or **iframe embed HTML** in admin. |
| **RTSP / RTSPS** | **Not in-browser** | Browsers cannot play RTSP natively. Needs **transmux** (e.g. FFmpeg → HLS/WebRTC) or a vendor gateway. |
| **Secure URL fetch** | **Shipped** | `get_camera_stream_secure` RPC; optional **`camera-stream-url`** Edge Function + `VITE_CAMERA_STREAM_VIA_EDGE=true`. See `docs/EDGE_THROTTLING_AND_STREAM_RELAY.md`. |

## Monitoring hardening

| Area | Status | Notes |
|------|--------|--------|
| **JWT + rate limit on stream resolution** | **Documented / optional** | Edge path above; URL still returned to the client today. |
| **Signed tickets, byte-level HLS relay, origin hidden** | **Future** | Would be a separate proxy architecture (cost + latency). |

## Admin access: JWT vs staff `localStorage`

| Mode | Behavior |
|------|----------|
| **Default** | Admin dashboard shell allows **either** valid **staff portal session** (`adminStaffSession` / `localStorage`) **or** **Supabase session** with admin role. See `src/utils/adminStaffSession.ts`. |
| **Strict** | Set **`VITE_REQUIRE_SUPABASE_SESSION_FOR_ADMIN=true`** so the shell requires a **Supabase JWT** (no staff-only bypass). Use when you want a single sign-in story aligned with RLS everywhere. |
| **Analytics / Site vision** | Data loads use the **current Supabase client session**. If staff portal has no JWT, RLS may return empty rows while the UI still opens — the **Material Analytics** tab explains demo vs live. |

## PTZ / two-way audio

| Area | Status | Notes |
|------|--------|--------|
| **UI** | **Scaffolding only** | `CameraRemoteCapabilitiesPanel` — disabled controls + copy that a **secure gateway** (vendor cloud, ONVIF bridge, WebRTC) is required before wiring. |

## Related docs

- `docs/EDGE_THROTTLING_AND_STREAM_RELAY.md` — Edge functions, stream URL, throttling.
- `docs/OPS_RUNBOOK.md` — Playable stream expectations, deploy checklist.
- `workers/site-vision/README.md` — Worker env vars, YOLO, motion.

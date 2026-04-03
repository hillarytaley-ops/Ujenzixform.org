# Infra, vendor, and ML boundaries (canonical)

**Purpose:** These topics are **not bugs in the React app**. They are fulfilled with **external services, hardware ops, or ML programs**. This document is the single place that says what UjenziXform ships in-repo vs what **you** (or a vendor) must provide.

**Step-by-step work plan (do this in order):** [MONITORING_STREAMING_IMPLEMENTATION_STEPS.md](./MONITORING_STREAMING_IMPLEMENTATION_STEPS.md) — RTSP→HLS (MediaMTX), HTTPS/CORS, optional relay, PTZ gateway, custom CV.

After this file exists, “fix RTSP / WhatsApp / PTZ in the SPA” is mis-scoped unless the ticket explicitly adds **gateway code** or **new Edge functions** here — follow the sections below instead.

---

## 1. WhatsApp Business API (Meta)

| In repo today | Admin SMS test panel simulates WhatsApp; no production Graph API client. |
|---------------|--------------------------------------------------------------------------|
| **You provide** | Meta Business Portfolio, WhatsApp Business Account, **approved message templates**, **permanent access token**, **webhook** HTTPS endpoint (often a dedicated small service or Edge function + verify token), phone number registration, opt-in/consent flows per Meta policy. |
| **Compliance** | User consent, template categories, country rules — Meta docs + legal review. |

**Next step when ready:** Add a Supabase Edge Function (or Node service) that implements webhook verification + inbound events, and outbound template sends via Graph API; store secrets in Supabase only. Until then, treat WhatsApp as **not a product channel**.

---

## 2. RTSP in the browser

Browsers cannot play **RTSP** or **RTSPS** natively. The app already plays **HLS (`.m3u8`)**, **MP4/WebM**, YouTube/Vimeo, and iframe embeds.

| In repo today | `hls.js` + Safari native HLS when `stream_url` is an HLS playlist over HTTPS (or same-origin). |
|---------------|------------------------------------------------------------------------------------------------|
| **You provide** | A **transcoder or NVR** that outputs **HLS or WebRTC** (or MP4) to a URL the **viewer’s browser** can reach. |

**Runnable example in this repo:** [`examples/mediamtx-rtsp-to-hls`](./examples/mediamtx-rtsp-to-hls/) — Docker **MediaMTX** pulls camera **RTSP** and serves **HLS** on port 8888. Put `https://…/site/index.m3u8` (or LAN URL if the builder is on-site VPN/Wi‑Fi) into `cameras.stream_url`.

**Remote builders:** LAN-only HLS URLs fail from the public internet — you need VPN, tunnel, or cloud relay (see §3).

---

## 3. Stricter streaming (signed tickets, byte-level HLS relay)

| In repo today | `get_camera_stream_secure` RPC; optional **`camera-stream-url`** Edge function returns **metadata** (URL still ends up in the browser for segment fetch). |
|---------------|--------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Stricter modes** | **Opaque tickets** (short-lived token → redirect), **segment relay** (Edge or VM proxies `.m3u8` / `.ts` so the camera origin never appears in DevTools). |

**You provide:** Extra **infrastructure** (bandwidth, CPU, TLS certs, caching), threat model (why origin hiding matters), and engineering time. Not a configuration toggle in Vite.

---

## 4. PTZ and two-way audio

| In repo today | `CameraRemoteCapabilitiesPanel` + DB flags — **UI scaffolding**, controls disabled until a gateway exists. |
|---------------|----------------------------------------------------------------------------------------------------------------|
| **You provide** | A **server-side** bridge: ONVIF, vendor cloud API, or WebRTC SFU. Camera credentials and control endpoints **must not** live in the browser. |

**Next step when ready:** Edge Function or small service that validates `auth_can_access_camera`, then issues signed commands to the NVR/camera SDK.

---

## 5. Custom CV / PPE product

| In repo today | `site_vision_events` + Python worker: **motion** + optional **generic YOLO** (COCO-style classes). Optional signed Storage ingest (`camera-vision-upload-ticket`, `site-vision-captures`). |
|---------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **You provide** | **Labeled datasets**, model training/evaluation, class → `event_type` mapping, ops for GPU or accelerated inference, safety/compliance sign-off for any “PPE enforcement” claim. |

This is a **product + ML program**, not a single PR.

---

## 6. On-site vision worker 24/7

| In repo today | `workers/site-vision/` — Python venv or Docker; `docker-compose.yml` uses `restart: unless-stopped`. |
|---------------|--------------------------------------------------------------------------------------------------------|
| **You provide** | A **physical or VM host** on the network that can reach camera streams: power, no-sleep policy, OS service or scheduler. |

**Runnable example:** [`workers/site-vision/scripts/register-windows-task.example.ps1`](../workers/site-vision/scripts/register-windows-task.example.ps1) — template to run the worker at logon / after failure (edit paths before use).

The **hosted SPA and Supabase** do not keep the worker alive; that is **site ops**.

---

## Where to go next

| Topic | Doc |
|--------|-----|
| Deploy checklist | [OPS_RUNBOOK.md](./OPS_RUNBOOK.md) |
| Monitoring vs vision status | [MONITORING_AND_VISION_STATUS.md](./MONITORING_AND_VISION_STATUS.md) |
| Vision ingest, HLS notes | [SITE_VISION_ADVANCED_INTEGRATION.md](./SITE_VISION_ADVANCED_INTEGRATION.md) |
| Edge stream URL throttling | [EDGE_THROTTLING_AND_STREAM_RELAY.md](./EDGE_THROTTLING_AND_STREAM_RELAY.md) |
| Plain-language gaps | [UJENZIXFORM_PENDING_AND_FUTURE_WORK.txt](./UJENZIXFORM_PENDING_AND_FUTURE_WORK.txt) |

---

*This file intentionally “closes” the scope debate: the listed items are **infrastructure / vendor / ML / ops**, not missing React components. Update links if you add new gateway services to the repo.*

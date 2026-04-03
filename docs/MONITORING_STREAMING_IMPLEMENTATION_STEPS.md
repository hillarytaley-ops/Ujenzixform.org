# Monitoring: full implementation steps (RTSP → HLS, relay, PTZ, custom CV)

Use this as **your** runbook. The UjenziXform **web app** already plays **HLS (`.m3u8`)**, MP4/WebM, YouTube/Vimeo, and iframe embeds. Everything below is **what you add** so cameras and advanced features work end-to-end.

**Related:** [INFRA_VENDOR_ML_BOUNDARIES.md](./INFRA_VENDOR_ML_BOUNDARIES.md) (scope), [examples/mediamtx-rtsp-to-hls](./examples/mediamtx-rtsp-to-hls/) (Docker template), [SITE_VISION_ADVANCED_INTEGRATION.md](./SITE_VISION_ADVANCED_INTEGRATION.md), [workers/site-vision/README.md](../workers/site-vision/README.md).

---

## Your stack: Vercel + domain on Hostinger

| Piece | Role |
|--------|------|
| **Vercel** | Hosts the **UjenziXform web app** (HTML/JS). Correct place for the SPA. |
| **Hostinger (domain)** | Usually **DNS only**: point `yourdomain.com` to Vercel ([Vercel custom domains](https://vercel.com/docs/concepts/projects/domains): add domain in Vercel, set Hostinger DNS to the records Vercel shows — often **A** / **CNAME** to `cname.vercel-dns.com` or similar). |
| **Camera HLS (MediaMTX)** | **Does not run on Vercel.** Vercel has no long-lived process pulling RTSP. HLS must be served from a **machine that can see the camera** (site LAN) plus a **reachable HTTPS URL** for browsers (see Part A). |

**If Hostinger is shared hosting only (no VPS):** use it for **email** and **DNS**; keep the app on Vercel. Do not expect cPanel shared hosting to replace MediaMTX for RTSP.

**If Hostinger is a VPS:** you *could* run **nginx/Caddy + TLS** on a subdomain like `streams.example.com`, but the VPS must still **reach the camera RTSP** (rare for a cloud VPS unless you use **VPN/site-to-site** from the site to that server). Typical pattern remains: **MediaMTX on-site** + **Cloudflare Tunnel**, **Tailscale**, or **port-forward** to publish HLS as **HTTPS**.

**Env / links:** After the domain moves, set `VITE_SITE_URL` (and any canonical URL in Vercel) to `https://your-hostinger-domain` so emails and deep links match production.

---

## Part A — RTSP cameras play inside Monitoring (required path: RTSP → HLS)

Browsers will **never** play `rtsp://` directly. You must expose **HLS** (or MP4 over HTTPS) that the **viewer’s browser** can request.

### A1. Prove the camera RTSP URL

1. Get the RTSP URL from the NVR/camera manual (often `rtsp://user:pass@IP:554/...`).
2. Open **VLC** → Media → Open Network Stream → paste URL → Play.  
   - If VLC fails, fix credentials/network before anything else.

### A2. Run MediaMTX on a host that can reach the camera

Pick a machine on the **same LAN** as the camera (mini PC, NVR sidecar, office PC, or small Linux VM).

1. Copy the repo folder **`docs/examples/mediamtx-rtsp-to-hls/`** to that machine.
2. Edit **`mediamtx.yml`**: set `paths.site.source` to your real RTSP URL (URL-encode special characters in the password if needed).
3. Install **Docker** on the host.
4. In that folder run:

   ```bash
   docker compose up -d
   ```

5. Default HLS URL shape:  
   `http://<HOST_LAN_IP>:8888/site/index.m3u8`  
   Test in VLC (Open Network Stream) or Safari.

### A3. HTTPS and mixed content

If your app is served at **`https://`** (e.g. Vercel), the browser may **block** `http://` stream URLs (**mixed content**).

**Pick one:**

| Approach | When to use |
|----------|-------------|
| **HTTPS on the HLS host** | Put **Caddy** or **nginx** in front of MediaMTX with a **Let’s Encrypt** cert (public hostname pointing at that host), or use a vendor tunnel with HTTPS. |
| **Same-site / reverse proxy** | Rare for Vercel; only if stream is same origin. |
| **Builders only on VPN** | **Tailscale** / WireGuard: builder’s PC joins the network where `http://10.x.x.x:8888/...` is reachable; Monitoring can use `http` inside the VPN (still prefer HTTPS long-term). |

### A4. CORS (so hls.js can fetch segments)

The **origin** serving `.m3u8` and `.ts` segments must send CORS headers allowing your app origin, e.g.:

- `Access-Control-Allow-Origin: https://your-app-domain` (or `*` for quick tests only)

Configure this on **nginx/Caddy** in front of MediaMTX, or use MediaMTX’s HTTP tuning per [MediaMTX docs](https://github.com/bluenviron/mediamtx).

### A5. Put the URL in Supabase

1. Supabase → **Table Editor** → **`cameras`** (or your admin Monitoring UI).
2. Set **`stream_url`** to the **final** playlist URL the browser will use (prefer **`https://.../index.m3u8`**).
3. Ensure the camera row is **active** and tied to the right **project** / monitoring assignment so RLS allows the builder to see it.

### A6. Verify in the app

1. Sign in as a user who passes **`auth_can_access_camera`** for that camera (builder on project, or approved monitoring assignment, or admin with JWT).
2. Open **Monitoring** → select the camera → you should see **HLS** playback (or the new **HLS error** help if CORS/HTTPS is wrong).

**Checkpoint:** Part A is “done” when a real user sees live video from an RTSP-only camera **via** an HLS URL you operate.

---

## Part B — Relay / “stricter” streaming (optional)

**Today in repo:** `get_camera_stream_secure` and optional **`camera-stream-url`** Edge function return stream **metadata**; the browser still fetches segments from the URL you stored.

**Stricter goals:**

- **Hide origin** from DevTools / shorten-lived URLs  
- **Proxy** `.m3u8` and `.ts` through **your** domain  

**What you do:**

1. **Threat model:** Decide if you need this (compliance, NDA with camera vendor, anti-scraping).
2. **Architecture (typical):**
   - Small **VM or container** (or future **Supabase Edge** + high bandwidth) that:
     - Authenticates the user (JWT or opaque ticket),
     - Fetches upstream HLS **server-side** or rewrites playlist URLs to your proxy,
     - Streams responses to the client with your **TLS** cert.
3. **Product change:** App would store a **proxy URL** or **ticket API** instead of the raw NVR URL — that requires **new backend/Edge code** and ops (CPU, egress). Not a Vite env toggle.

**Checkpoint:** Part B is “done” when segment URLs in Network tab point only at **your** relay domain (or tokens), and playback still works under load.

---

## Part C — PTZ and two-way audio (optional)

**Today in repo:** `CameraRemoteCapabilitiesPanel` is **UI only**; controls are disabled until a **gateway** exists.

**What you do:**

1. **Choose integration path:**
   - **Vendor cloud** (camera brand API), or  
   - **ONVIF** over a **server** on the site LAN, or  
   - **WebRTC** SFU for talk-back (separate from HLS playback).
2. **Never** put NVR passwords or ONVIF creds in the React app.
3. **Build a service** (pattern):
   - **Supabase Edge Function** or small **Node** service on a reachable host.
   - Validates caller with **`auth_can_access_camera`** (or duplicate rules server-side).
   - Translates “pan left” into vendor/ONVIF calls using secrets in **Supabase secrets** or the gateway host only.
4. **Wire the UI:** Replace `disabled` PTZ buttons with `fetch`/`supabase.functions.invoke` to your gateway.
5. **Test** on one camera model before rolling out flags in admin.

**Checkpoint:** Part C is “done” when an entitled user moves PTZ or uses push-to-talk **through your gateway**, not directly from the browser to the camera IP.

---

## Part D — Custom site vision / CV (optional)

**Today in repo:** Python worker — **motion** + optional **generic YOLO**; table **`site_vision_events`**; optional **signed upload** (`camera-vision-upload-ticket`, `site-vision-captures`).

**What you do:**

1. **Define labels** (e.g. material classes, PPE on/off) and **collect images** from site cameras (privacy/consent).
2. **Annotate** in a tool that exports **YOLO** format.
3. **Train** (YOLOv8 or similar); freeze **class indices** you will map in code.
4. **Deploy weights** next to the worker; set env **`USE_YOLO=1`**, **`YOLO_MODEL=...`** per [workers/site-vision/README.md](../workers/site-vision/README.md).
5. **Edit worker code** (`process_yolo` or equivalent) to map model classes → **`event_type`**, **`label`**, **`payload`** for your analytics.
6. **Thumbnails:** upload crops to Storage (service role or signed upload ticket) and set **`payload.thumbnail_url`** (private bucket needs signed read or public URL policy — see [SITE_VISION_ADVANCED_INTEGRATION.md](./SITE_VISION_ADVANCED_INTEGRATION.md)).
7. **Validate** on **Analytics → Site vision** with a real Supabase **JWT** (not staff-portal-only session if RLS blocks reads).

**Checkpoint:** Part D is “done” when events reflect **your** taxonomy and thumbnails show reliably for your ops story.

---

## Quick dependency order

1. **Part A** first — without a playable **HTTPS + CORS-safe HLS** URL, Monitoring cannot show RTSP cameras.  
2. **Part D** can run in parallel if the **worker** can already read the same RTSP (OpenCV); it does not require the browser to play RTSP.  
3. **Part B** when security/compliance requires hiding origins or tokens.  
4. **Part C** when you have a gateway design and test hardware.

---

## If you get stuck

| Symptom | Check |
|---------|--------|
| Black player, generic help | `stream_url` still RTSP, or wrong URL — complete Part A. |
| Mixed content error in console | Use HTTPS for HLS or VPN-only HTTP with known tradeoffs. |
| HLS loads then fails | **CORS** on segment responses; see Part A4. |
| Admin sees data, builder empty | **RLS** / `auth_can_access_camera` / project assignment — not a player bug. |
| PTZ buttons do nothing | Expected until Part C gateway exists. |

For scope boundaries (what the SPA will never do alone), re-read [INFRA_VENDOR_ML_BOUNDARIES.md](./INFRA_VENDOR_ML_BOUNDARIES.md).

---

*Last updated to match repo layout early 2026.*

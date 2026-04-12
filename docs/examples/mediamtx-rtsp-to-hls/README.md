# Example: RTSP camera → HLS for UjenziXform Monitoring

The Monitoring page can play **HLS** (`.m3u8`). Most IP cameras expose **RTSP**. [MediaMTX](https://github.com/bluenviron/mediamtx) can pull RTSP and serve HLS on HTTP.

**This folder is not started automatically** — copy it to a **mini PC, NVR sidecar, or VPS** that can reach the camera (usually same LAN).

## Prerequisites

- Docker (or Docker Desktop on Windows)
- Camera **RTSP URL** (test in VLC first)
- Understanding of **who can open** the HLS URL: same Wi‑Fi / VPN only vs public internet (TLS + firewall)

## Steps

1. Copy this directory to the host (e.g. `C:\mediamtx-site` or `/opt/mediamtx-site`).
2. Edit **`mediamtx.yml`**:
   - Set **`paths.cam1.source`** to your real `rtsp://user:pass@host:port/path` (URL-encode special characters in the password, e.g. `@` → `%40`).
   - Keep **`hlsVariant: mpegts`** unless you know you need Low-Latency HLS; `lowLatency` often causes empty or stuck playback in **hls.js** / Edge with some cameras.
   - **`pathDefaults.rtspTransport: tcp`** avoids many Docker + camera UDP issues.
3. Run:

   ```bash
   docker compose up -d
   ```

4. HLS playlist (path name **`cam1`** in this example):  
   `http://<THIS_HOST_IP>:8888/cam1/index.m3u8`  
   If you change the key under `paths:` (e.g. `site:`), change the URL segment to match (`…/site/index.m3u8`).
5. In Supabase **`cameras.stream_url`**, store that URL (use **HTTPS** if you terminate TLS with a reverse proxy; the browser must trust the origin and **CORS** must allow your app origin for `hls.js` segment fetches).

## Remote viewers

If builders use the app **from the internet**, a **private LAN** HLS URL will **not** work unless they use **VPN**, **tailscale**, or you put a **public** HTTPS endpoint in front of MediaMTX (with auth). See `docs/INFRA_VENDOR_ML_BOUNDARIES.md` §2–3.

### Quick tunnel on Windows (ngrok)

1. **Install ngrok** (otherwise PowerShell reports “not recognized”): download from [ngrok.com](https://ngrok.com/download), unzip, add the folder to your **PATH**, or run it by full path. Sign up for a free account and run `ngrok config add-authtoken <token>` once.
2. With MediaMTX listening on **8888** on the **same PC**, run: `ngrok http 8888`.
3. Copy the **HTTPS** forwarding URL ngrok prints (e.g. `https://abcd-12-34-56.ngrok-free.app`). Your playlist becomes something like:  
   `https://abcd-12-34-56.ngrok-free.app/cam1/index.m3u8` (path must match your `mediamtx.yml` path name, e.g. `cam1` or `site`).
4. Put **only that HTTPS URL** in **`cameras.stream_url`**. The production app is on **HTTPS** (e.g. Vercel); **`http://` HLS is blocked** as mixed content, even if the IP were reachable.

**`ERR_CONNECTION_REFUSED` to a public IP (e.g. `102.x.x.x:8888`)** usually means nothing is listening on that interface/port from the internet (MediaMTX not running, Windows firewall blocking 8888, or no router port-forward). Using **ngrok** avoids opening inbound ports: traffic goes **out** from the PC running Docker + ngrok.

## If playback still fails

| Symptom | What to check |
|--------|----------------|
| **404** on `…/cam1/index.m3u8` | Under `paths:` you must have a key **`cam1:`** (same spelling as the URL). A huge default file with only `all_others:` and no `cam1` will never serve `/cam1/`. |
| **Works in VLC, not in browser** | Use **`mpegts`** (this example) not `lowLatency`. Ensure **HTTPS** stream URL when the app is on HTTPS (ngrok / reverse proxy). |
| **Docker on Windows, RTSP timeout** | Confirm the **camera IP is reachable from inside the container** (same machine LAN usually OK). Try `rtspTransport: tcp` (already in example). Rarely you need `network_mode: host` (Linux only). |
| **ERR_CONNECTION_REFUSED** to your WAN IP | MediaMTX listens on **8888 on the PC running Docker**, not automatically on the public IP. Use **ngrok** or port-forward + firewall rule. |

## Security

- Do not commit real RTSP credentials to git.
- Restrict port `8888` with firewall rules; prefer reverse proxy + TLS for anything exposed beyond LAN.

### Optional: HTTPS directly from MediaMTX

Set `hlsEncryption: yes` and point `hlsServerKey` / `hlsServerCert` at real PEM files (trusted CA cert for browsers). Most teams use **Caddy/nginx in front of :8888** or **ngrok** instead so you do not manage certs on the LAN box.

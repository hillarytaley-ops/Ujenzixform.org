# Example: RTSP camera → HLS for UjenziXform Monitoring

The Monitoring page can play **HLS** (`.m3u8`). Most IP cameras expose **RTSP**. [MediaMTX](https://github.com/bluenviron/mediamtx) can pull RTSP and serve HLS on HTTP.

**This folder is not started automatically** — copy it to a **mini PC, NVR sidecar, or VPS** that can reach the camera (usually same LAN).

## Prerequisites

- Docker (or Docker Desktop on Windows)
- Camera **RTSP URL** (test in VLC first)
- Understanding of **who can open** the HLS URL: same Wi‑Fi / VPN only vs public internet (TLS + firewall)

## Steps

1. Copy this directory to the host (e.g. `C:\mediamtx-site` or `/opt/mediamtx-site`).
2. Edit **`mediamtx.yml`**: set `paths.site.source` to your real `rtsp://user:pass@host:port/path` (URL-encode special characters in the password).
3. Run:

   ```bash
   docker compose up -d
   ```

4. HLS playlist (default path name `site`):  
   `http://<THIS_HOST_IP>:8888/site/index.m3u8`
5. In Supabase **`cameras.stream_url`**, store that URL (use **HTTPS** if you terminate TLS with a reverse proxy; the browser must trust the origin and **CORS** must allow your app origin for `hls.js` segment fetches).

## Remote viewers

If builders use the app **from the internet**, a **private LAN** HLS URL will **not** work unless they use **VPN**, **tailscale**, or you put a **public** HTTPS endpoint in front of MediaMTX (with auth). See `docs/INFRA_VENDOR_ML_BOUNDARIES.md` §2–3.

## Security

- Do not commit real RTSP credentials to git.
- Restrict port `8888` with firewall rules; prefer reverse proxy + TLS for anything exposed beyond LAN.

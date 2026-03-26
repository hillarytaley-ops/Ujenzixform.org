# Site vision worker (edge / laptop / mini PC)

Pulls **active** cameras from Supabase (`cameras` with `stream_url` set), samples frames on an interval, optionally runs **YOLO**, always can emit **motion** events, and inserts rows into **`site_vision_events`**.

The UjenziXform app reads that table on **Analytics → Site vision** (no service key in the browser).

**Plain-language downloads (paragraph format, `.txt`):**

- [`SITE_VISION_WORKER_LAYMANS_GUIDE.txt`](./SITE_VISION_WORKER_LAYMANS_GUIDE.txt) — what the worker does and how to run it.
- [`CAMERAS_AND_SITE_SETUP_GUIDE.txt`](./CAMERAS_AND_SITE_SETUP_GUIDE.txt) — recommended cameras, how to connect streams, site PC setup, and what is still pending.

## Python version (Windows)

Use **64-bit Python 3.11 or 3.12** from [python.org](https://www.python.org/downloads/) if you hit **numpy / Meson** build errors. **3.13** is OK with the pinned **numpy 2.x** wheels in `requirements.txt`.

## Prerequisites

1. Apply the Supabase migration: `supabase/migrations/20260326120000_site_vision_events.sql` (or push migrations from CI).
2. In **Supabase → SQL** or dashboard, confirm table `site_vision_events` exists.
3. **Monitoring** cameras must have a **`stream_url` OpenCV can open** — typically **RTSP**, **RTMP**, or **HLS (`.m3u8`)**, not a normal web page.

### GoPro / gallery links (`gopro.com/v/...`)

Those are **HTML share pages** for humans in a browser. **OpenCV cannot use them.** You need a **direct stream** from your setup, for example:

- RTSP from the camera or NVR (check the device manual / app).
- An **HLS `.m3u8`** URL if your NVR or cloud product exposes one.
- **VLC test:** *Media → Open Network Stream* — if VLC cannot play it, the worker cannot either.

Update the **`cameras.stream_url`** in Supabase to that direct URL.

### Step-by-step: replace GoPro gallery links with a real stream

**1. Confirm in VLC (before touching the database)**  
[VLC](https://www.videolan.org/) → **Media** → **Open Network Stream** → paste the URL → **Play**.  
If you only see a webpage, login, or error — that URL is **not** a stream. Keep looking until VLC shows **live video**.

**2. IP / security cameras (Hikvision, Dahua, Reolink, Ubiquiti, etc.)**  
These usually expose **RTSP**. The format is in the **manual** or the vendor app (often under *Device info / Network / RTSP*). Typical patterns (yours may differ):

| Vendor (example) | RTSP URL pattern (example only) |
|--------------------|----------------------------------|
| Many Hikvision     | `rtsp://USER:PASS@192.168.1.64:554/Streaming/Channels/101` |
| Many Dahua         | `rtsp://USER:PASS@192.168.1.108:554/cam/realmonitor?channel=1&subtype=0` |
| Some Reolink       | `rtsp://USER:PASS@192.168.1.100:554/h264Preview_01_main` |

- Use the camera or NVR **LAN IP** if the worker PC is on the **same site Wi‑Fi**.  
- Put **username and password** in the URL if the device requires auth (special characters in passwords may need [URL-encoding](https://developer.mozilla.org/en-US/docs/Glossary/Percent-encoding)).

**3. NVR / cloud that outputs HLS**  
Some systems give an **`.m3u8`** link (Apple HLS). That often works in VLC and with OpenCV. Use the **exact** URL the NVR/software provides for “streaming” or “live view”, not the admin web page.

**4. GoPro (`gopro.com/v/...`) — important limitation**  
The **web gallery link is not a stream** and is not meant for OpenCV. Options:

- **GoPro “Live” / streaming** (model-dependent): stream to **YouTube**, **Facebook**, or a custom **RTMP** endpoint you control; then use whatever **playback URL** that platform exposes (often still not trivial for a worker — many are browser-only).  
- **Practical for construction CV:** add **IP cameras** or an **NVR** with RTSP on site, and point `stream_url` at those.  
- **USB / webcam GoPro** on the **same PC** as the worker is a different setup (local device), not a `gopro.com` URL.

**5. Put the working URL into Supabase**

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.  
2. **Table Editor** → **`cameras`**.  
3. Find the row (e.g. “Entrance”, “Moama”).  
4. Edit **`stream_url`**: paste the URL that **worked in VLC**.  
5. Save. Keep **`is_active`** = true if you want the worker to use it.

Alternatively: **SQL** → New query (replace UUID and URL):

```sql
update public.cameras
set stream_url = 'rtsp://user:pass@192.168.1.64:554/Streaming/Channels/101'
where id = 'YOUR-CAMERA-UUID';
```

**6. Restart the worker**  
Stop with Ctrl+C, then run `python main.py` again (or `.venv\Scripts\python.exe main.py` on Windows).

## Setup

```bash
cd workers/site-vision
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
```

Optional YOLO (better person/vehicle signals):

```bash
pip install ultralytics
# Uncomment ultralytics in requirements.txt or install manually
```

Copy `.env.example` → `.env` and fill `SUPABASE_URL` and **`SUPABASE_SERVICE_ROLE_KEY`**.

## Run

```bash
python main.py
```

Keep the laptop **plugged in** and **not sleeping** if this runs 24/7.

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `SAMPLE_INTERVAL_SEC` | `5` | Sleep after one pass over all cameras |
| `MOTION_THRESHOLD` | `25` | Higher = fewer motion events |
| `MIN_EVENT_GAP_SEC` | `20` | Throttle repeated inserts |
| `USE_YOLO` | `0` | Set `1` after installing `ultralytics` |
| `YOLO_MODEL` | `yolov8n.pt` | Smallest default weights |

## Security

- **Never** put `SUPABASE_SERVICE_ROLE_KEY` in the React app or Vercel client env.
- This key bypasses RLS; only this worker (or trusted backends) should use it.

## Operations

- **10 cameras**: one round-robin loop per cycle is fine; increase `SAMPLE_INTERVAL_SEC` if CPU is high.
- **RTSP on LAN**: run this worker **on the same network** as the NVR/cameras.
- **HLS in cloud**: worker can run on a small VPS if the URL is reachable.

## Troubleshooting

- **`Client.__init__() got an unexpected keyword argument 'proxy'`:** pip installed a **new** `gotrue` (e.g. 2.9) while `supabase 2.3.4` keeps **`httpx<0.26`**. Reinstall from `requirements.txt` — we pin **`gotrue==2.4.2`** so it matches `httpx` 0.25.x.
- **`Failed building wheel for pyiceberg` (Windows):** use the pinned `supabase==2.3.4` in `requirements.txt` (already set). Remove the old venv and reinstall: `Remove-Item -Recurse -Force .venv` then `python -m venv .venv` and `.\.venv\Scripts\pip.exe install --no-cache-dir -r requirements.txt`. Do not upgrade `supabase` blindly on Windows unless you install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/).
- `Cannot open stream`: test the URL with VLC/FFplay; add credentials to the URL if required.
- No rows in app: ensure you are logged into Supabase as **authenticated** on Analytics (localStorage-only admin may not pass RLS for `site_vision_events`).

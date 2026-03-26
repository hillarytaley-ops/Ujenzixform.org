# Site vision worker (edge / laptop / mini PC)

Pulls **active** cameras from Supabase (`cameras` with `stream_url` set), samples frames on an interval, optionally runs **YOLO**, always can emit **motion** events, and inserts rows into **`site_vision_events`**.

The UjenziXform app reads that table on **Analytics → Site vision** (no service key in the browser).

## Prerequisites

1. Apply the Supabase migration: `supabase/migrations/20260326120000_site_vision_events.sql` (or push migrations from CI).
2. In **Supabase → SQL** or dashboard, confirm table `site_vision_events` exists.
3. **Monitoring** cameras must have a working `stream_url` (RTSP or HLS; OpenCV/FFmpeg must decode it on the machine running this worker).

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

- **`Failed building wheel for pyiceberg` (Windows):** use the pinned `supabase==2.3.4` in `requirements.txt` (already set). Remove the old venv and reinstall: `Remove-Item -Recurse -Force .venv` then `python -m venv .venv` and `.\.venv\Scripts\pip.exe install --no-cache-dir -r requirements.txt`. Do not upgrade `supabase` blindly on Windows unless you install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/).
- `Cannot open stream`: test the URL with VLC/FFplay; add credentials to the URL if required.
- No rows in app: ensure you are logged into Supabase as **authenticated** on Analytics (localStorage-only admin may not pass RLS for `site_vision_events`).

# Vision worker (RTSP → YOLO → Supabase)

Long-running process that reads an **RTSP** stream, runs **YOLOv8n** person detection, and inserts rows into **`monitoring_vision_insights`** using the **Supabase service role** (bypasses RLS). Your React app already subscribes to those inserts.

## Requirements

- Docker (recommended) or Python 3.11 + FFmpeg on the host.
- A reachable **RTSP URL** (camera or NVR substream preferred).
- Supabase **`SUPABASE_SERVICE_ROLE_KEY`** and migration **`20260331_monitoring_vision_insights.sql`** applied.

## Configure

1. Copy `env.example` to `.env` on the machine that runs the worker.
2. Set `VISION_USER_ID` to the builder’s **`auth.users.id`** (same as Supabase Auth user UUID).
3. Set `RTSP_URL` (never expose this URL in the frontend).

## Run with Docker

```bash
cd services/vision-worker
docker build -t ujenzi-vision-worker .
docker run --rm --env-file .env ujenzi-vision-worker
```

## Run locally (dev)

```bash
cd services/vision-worker
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
copy env.example .env
# edit .env
python main.py
```

## Security

- **Never** ship `SUPABASE_SERVICE_ROLE_KEY` to browsers or mobile apps.
- Run this worker on a **VPS or edge PC** with network access to the camera VLAN.

## Operations

- **CPU**: `YOLO_DEVICE=cpu` — use a **substream** and `ANALYSIS_INTERVAL_SEC=2` or higher.
- **GPU**: use an NVIDIA host, install the NVIDIA Container Toolkit, pass `--gpus all`, set `YOLO_DEVICE=cuda:0`.

## Behavior

- On connect: inserts `Camera stream online` (`operations`).
- Then: emits when **person-count band** changes (`none` / `few` / `several` / `many`) or at least every **`INSIGHT_MIN_INTERVAL_SEC`** seconds.

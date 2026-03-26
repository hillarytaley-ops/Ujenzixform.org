"""
Site vision worker: sample camera streams, optional YOLO, motion fallback,
insert into public.site_vision_events using the Supabase service role.
"""

from __future__ import annotations

import os
import time
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

import cv2
import numpy as np
from dotenv import load_dotenv
from supabase import create_client

# Load .env from this folder (works even if you run python from another cwd)
_ENV_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(_ENV_DIR, ".env"))


def _require_env(name: str) -> str:
    v = os.environ.get(name, "").strip()
    if not v:
        env_path = os.path.join(_ENV_DIR, ".env")
        raise SystemExit(
            f"Missing {name}. Copy .env.example to .env in:\n  {_ENV_DIR}\n"
            f"and set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.\n"
            f"(.env file found: {os.path.isfile(env_path)})"
        )
    # Strip wrapping quotes from .env (e.g. SUPABASE_URL="https://...")
    if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
        v = v[1:-1].strip()
    return v


def _normalize_supabase_url(raw: str) -> str:
    u = raw.strip().rstrip("/")
    if not u.startswith("http://") and not u.startswith("https://"):
        u = "https://" + u
    return u


def _validate_supabase_url(url: str) -> None:
    from urllib.parse import urlparse

    p = urlparse(url)
    if p.scheme not in ("http", "https") or not p.netloc:
        raise SystemExit(
            "SUPABASE_URL is not a valid URL.\n"
            "Use exactly the Project URL from Supabase → Settings → API, e.g.\n"
            "  https://abcdefghijklmnop.supabase.co\n"
            "No /rest/v1 path, no quotes, no spaces. Do not paste the service_role key here."
        )


_raw_url = _require_env("SUPABASE_URL")
SUPABASE_URL = _normalize_supabase_url(_raw_url)
_validate_supabase_url(SUPABASE_URL)
SUPABASE_SERVICE_ROLE_KEY = _require_env("SUPABASE_SERVICE_ROLE_KEY")
SAMPLE_INTERVAL_SEC = float(os.environ.get("SAMPLE_INTERVAL_SEC", "5"))
MOTION_THRESHOLD = float(os.environ.get("MOTION_THRESHOLD", "25"))
MIN_EVENT_GAP_SEC = float(os.environ.get("MIN_EVENT_GAP_SEC", "20"))
USE_YOLO = os.environ.get("USE_YOLO", "0").lower() in ("1", "true", "yes")
SOURCE_WORKER = os.environ.get("SOURCE_WORKER", "site-vision-python-v1")
YOLO_MODEL = os.environ.get("YOLO_MODEL", "yolov8n.pt")
# Min seconds between repeated "cannot open" / "read failed" logs per camera (stops console spam)
LOG_STREAM_ERRORS_EVERY_SEC = float(os.environ.get("LOG_STREAM_ERRORS_EVERY_SEC", "120"))

_last_emit: dict[tuple[str, str], float] = {}
_last_stream_error_log: dict[tuple[str, str], float] = {}
_stream_error_counts: dict[tuple[str, str], int] = {}


def _now_ts() -> float:
    return time.time()


def _can_emit(camera_id: str, event_type: str) -> bool:
    key = (camera_id, event_type)
    t = _now_ts()
    if t - _last_emit.get(key, 0) < MIN_EVENT_GAP_SEC:
        return False
    _last_emit[key] = t
    return True


def get_supabase():
    try:
        return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    except Exception as e:
        err = str(e).lower()
        if "invalid url" in err or "invalidurl" in err.replace(" ", ""):
            raise SystemExit(
                "Supabase client rejected SUPABASE_URL.\n\n"
                "Fix your .env:\n"
                "  SUPABASE_URL=https://YOUR-REF.supabase.co\n"
                "  SUPABASE_SERVICE_ROLE_KEY=eyJ... (long JWT, service_role only)\n\n"
                "Common mistakes:\n"
                "  • Pasted the JWT into SUPABASE_URL (swap the two lines)\n"
                "  • Left placeholder text like YOUR_PROJECT_REF\n"
                "  • Included /rest/v1 or other path — use the short Project URL only\n"
                "  • Extra spaces or broken line in the middle of the URL\n\n"
                f"After normalizing, URL host is: {SUPABASE_URL!r}\n"
            ) from e
        raise


def load_cameras(sb) -> list[dict[str, Any]]:
    res = (
        sb.table("cameras")
        .select("id,name,stream_url,project_id,is_active")
        .eq("is_active", True)
        .execute()
    )
    rows = res.data or []
    return [c for c in rows if c.get("stream_url")]


def insert_event(
    sb,
    camera_id: str,
    project_id: str | None,
    event_type: str,
    label: str,
    confidence: float | None,
    payload: dict[str, Any],
) -> None:
    row = {
        "camera_id": camera_id,
        "project_id": project_id,
        "event_type": event_type,
        "label": label,
        "confidence": confidence,
        "payload": payload,
        "source_worker": SOURCE_WORKER,
        "occurred_at": datetime.now(timezone.utc).isoformat(),
    }
    sb.table("site_vision_events").insert(row).execute()


def load_yolo():
    if not USE_YOLO:
        return None
    try:
        from ultralytics import YOLO

        return YOLO(YOLO_MODEL)
    except Exception as exc:  # noqa: BLE001
        print(f"[site-vision] YOLO disabled: {exc}")
        return None


def coco_to_event(name: str) -> tuple[str, str] | None:
    n = name.lower()
    if n == "person":
        return "person", "Person detected"
    if n in ("truck", "bus", "car", "motorcycle"):
        return "vehicle", f"{name.capitalize()} detected"
    return None


def process_yolo(sb, cam: dict[str, Any], frame: np.ndarray, model) -> None:
    if model is None:
        return
    cam_id = cam["id"]
    proj = cam.get("project_id")
    results = model(frame, verbose=False)[0]
    names = results.names or {}
    for b in results.boxes:
        cls_id = int(b.cls[0])
        conf = float(b.conf[0])
        name = names.get(cls_id, "object")
        mapped = coco_to_event(name)
        if not mapped:
            continue
        etype, label = mapped
        if not _can_emit(cam_id, etype):
            continue
        try:
            xy = b.xyxy[0].cpu().numpy().tolist()
        except Exception:  # noqa: BLE001
            xy = None
        insert_event(
            sb,
            cam_id,
            proj,
            etype,
            label,
            round(conf * 100, 2),
            {"model": "yolo", "class": name, "bbox": xy},
        )


def process_motion(
    sb,
    cam: dict[str, Any],
    frame: np.ndarray,
    prev_gray: dict[str, np.ndarray | None],
) -> None:
    cam_id = cam["id"]
    proj = cam.get("project_id")
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (21, 21), 0)

    prev = prev_gray.get(cam_id)
    if prev is not None:
        diff = cv2.absdiff(prev, gray)
        score = float(np.mean(diff))
        if score > MOTION_THRESHOLD and _can_emit(cam_id, "motion"):
            insert_event(
                sb,
                cam_id,
                proj,
                "motion",
                "Motion above baseline",
                min(99.0, round(score, 2)),
                {"motion_score": score},
            )

    prev_gray[cam_id] = gray


def open_capture(url: str) -> cv2.VideoCapture:
    return cv2.VideoCapture(url, cv2.CAP_FFMPEG)


def _log_stream_error(cam_id: str, name: str, kind: str, detail: str, url: str) -> None:
    key = (cam_id, kind)
    now = time.time()
    prev = _last_stream_error_log.get(key, 0)
    if now - prev < LOG_STREAM_ERRORS_EVERY_SEC:
        _stream_error_counts[key] = _stream_error_counts.get(key, 0) + 1
        return
    _last_stream_error_log[key] = now
    n = _stream_error_counts.get(key, 0) + 1
    _stream_error_counts[key] = 0
    suffix = f" (x{n} failures since last log)" if n > 1 else ""
    print(f"[site-vision] {kind}: {name}{suffix} — {detail}")
    if n > 1:
        print(f"  url: {url[:96]}{'...' if len(url) > 96 else ''}")


def _stream_url_hint(url: str) -> str:
    u = url.lower()
    if "gopro.com/v/" in u or "gopro.com/channels" in u:
        return (
            "GoPro share pages are websites, not video streams. Use an RTSP/RTMP URL from the camera/NVR, "
            "or an HLS .m3u8 link your NVR/cloud provides — not the browser gallery link."
        )
    if u.startswith("http") and "m3u8" not in u and "mjpeg" not in u and "mp4" not in u:
        return (
            "Many HTTPS URLs are HTML pages; OpenCV needs a direct stream (RTSP, or HLS .m3u8, or MJPEG). "
            "Test the URL in VLC (Media → Open Network Stream)."
        )
    return "Use a URL that works in VLC → Open Network Stream (RTSP or HLS .m3u8)."


def main() -> None:
    sb = get_supabase()
    yolo = load_yolo()
    prev_gray: dict[str, np.ndarray | None] = {}

    print(
        f"[site-vision] started | yolo={'on' if yolo else 'off'} | interval={SAMPLE_INTERVAL_SEC}s | worker={SOURCE_WORKER}"
    )

    while True:
        try:
            cams = load_cameras(sb)
        except Exception as exc:  # noqa: BLE001
            print(f"[site-vision] load_cameras error: {exc}")
            time.sleep(30)
            continue

        if not cams:
            print("[site-vision] no active cameras with stream_url; sleep 60s")
            time.sleep(60)
            continue

        for cam in cams:
            url = (cam.get("stream_url") or "").strip()
            name = cam.get("name") or cam["id"]
            cid = str(cam["id"])
            cap = open_capture(url)
            if not cap.isOpened():
                _log_stream_error(
                    cid,
                    name,
                    "cannot open stream",
                    _stream_url_hint(url),
                    url,
                )
                continue
            ok, frame = cap.read()
            cap.release()
            if not ok or frame is None:
                _log_stream_error(cid, name, "read failed", "Opened but no frame (codec/end of stream?)", url)
                continue

            try:
                process_yolo(sb, cam, frame, yolo)
                process_motion(sb, cam, frame, prev_gray)
            except Exception as exc:  # noqa: BLE001
                print(f"[site-vision] process error {name}: {exc}")

        time.sleep(SAMPLE_INTERVAL_SEC)


if __name__ == "__main__":
    main()

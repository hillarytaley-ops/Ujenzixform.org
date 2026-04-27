import logging
import time
from typing import Any

from supabase import create_client

from worker.analyzer import PersonDetector
from worker.config import Settings
from worker.rtsp_capture import reconnect_loop
from worker.supabase_sink import insert_vision_insight

logger = logging.getLogger(__name__)


def _bucket_person_count(n: int) -> str:
    if n <= 0:
        return "none"
    if n <= 3:
        return "few"
    if n <= 10:
        return "several"
    return "many"


def run_forever(settings: Settings) -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    detector = PersonDetector(
        settings.yolo_model,
        confidence=settings.confidence,
        device=settings.device,
    )

    last_insight_ts = 0.0
    last_bucket: str | None = None
    stream_announced = False

    logger.info(
        "Vision worker started (user=%s…, model=%s, interval=%ss)",
        settings.vision_user_id[:8],
        settings.yolo_model,
        settings.analysis_interval_sec,
    )

    for _cap, frame in reconnect_loop(settings.rtsp_url):
        now = time.monotonic()

        analysis = detector.analyze(frame)
        bucket = _bucket_person_count(analysis.person_count)

        if not stream_announced:
            stream_announced = True
            insert_vision_insight(
                client,
                user_id=settings.vision_user_id,
                headline="Camera stream online",
                detail="RTSP ingest connected; person detection active.",
                insight_category="operations",
                severity="info",
                metrics={"person_count": analysis.person_count, "event": "stream_up"},
                project_id=settings.project_id,
                monitoring_request_id=settings.monitoring_request_id,
                camera_label=settings.camera_label,
                source_stream_id=settings.source_stream_id,
            )
            last_insight_ts = now
            last_bucket = bucket

        should_emit = False
        if bucket != last_bucket:
            should_emit = True
        elif now - last_insight_ts >= settings.insight_min_interval_sec:
            should_emit = True

        if should_emit:
            headline, severity, category = _headline_for_bucket(bucket, analysis.person_count)
            metrics: dict[str, Any] = {
                "person_count": analysis.person_count,
                "bucket": bucket,
                "frame_shape": list(frame.shape),
            }
            try:
                insert_vision_insight(
                    client,
                    user_id=settings.vision_user_id,
                    headline=headline,
                    detail=f"YOLOv8 person detections at confidence ≥ {settings.confidence}.",
                    insight_category=category,
                    severity=severity,
                    metrics=metrics,
                    project_id=settings.project_id,
                    monitoring_request_id=settings.monitoring_request_id,
                    camera_label=settings.camera_label,
                    source_stream_id=settings.source_stream_id,
                )
                last_insight_ts = now
                last_bucket = bucket
                logger.info("Insight emitted: %s (person_count=%s)", headline, analysis.person_count)
            except Exception:
                logger.exception("Failed to insert vision insight")

        time.sleep(max(0.1, settings.analysis_interval_sec))


def _headline_for_bucket(bucket: str, count: int) -> tuple[str, str, str]:
    if bucket == "none":
        return (
            "No people detected in frame",
            "low",
            "security",
        )
    if bucket == "few":
        return (
            f"Workforce activity: {count} person(s) visible",
            "info",
            "workforce",
        )
    if bucket == "several":
        return (
            f"Elevated activity: {count} people visible on site",
            "medium",
            "operations",
        )
    return (
        f"High occupancy: {count}+ people in view",
        "medium",
        "operations",
    )

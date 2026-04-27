import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    supabase_url: str
    supabase_service_role_key: str
    vision_user_id: str
    rtsp_url: str
    project_id: str | None
    monitoring_request_id: str | None
    camera_label: str | None
    source_stream_id: str | None
    analysis_interval_sec: float
    insight_min_interval_sec: float
    yolo_model: str
    confidence: float
    device: str

    @classmethod
    def from_env(cls) -> "Settings":
        url = os.environ.get("SUPABASE_URL", "").strip()
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        uid = os.environ.get("VISION_USER_ID", "").strip()
        rtsp = os.environ.get("RTSP_URL", "").strip()

        def opt(name: str) -> str | None:
            v = os.environ.get(name, "").strip()
            return v or None

        if not url or not key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
        if not uid:
            raise ValueError("VISION_USER_ID (auth user UUID) is required")
        if not rtsp:
            raise ValueError("RTSP_URL is required")

        return cls(
            supabase_url=url,
            supabase_service_role_key=key,
            vision_user_id=uid,
            rtsp_url=rtsp,
            project_id=opt("PROJECT_ID"),
            monitoring_request_id=opt("MONITORING_REQUEST_ID"),
            camera_label=opt("CAMERA_LABEL"),
            source_stream_id=opt("SOURCE_STREAM_ID"),
            analysis_interval_sec=float(os.environ.get("ANALYSIS_INTERVAL_SEC", "2")),
            insight_min_interval_sec=float(os.environ.get("INSIGHT_MIN_INTERVAL_SEC", "45")),
            yolo_model=os.environ.get("YOLO_MODEL", "yolov8n.pt").strip(),
            confidence=float(os.environ.get("CONFIDENCE", "0.35")),
            device=os.environ.get("YOLO_DEVICE", "cpu").strip().lower(),
        )

import logging
from typing import Any

from supabase import Client

logger = logging.getLogger(__name__)


def insert_vision_insight(
    client: Client,
    *,
    user_id: str,
    headline: str,
    detail: str | None,
    insight_category: str,
    severity: str,
    metrics: dict[str, Any],
    project_id: str | None,
    monitoring_request_id: str | None,
    camera_label: str | None,
    source_stream_id: str | None,
) -> None:
    row: dict[str, Any] = {
        "user_id": user_id,
        "headline": headline,
        "detail": detail,
        "insight_category": insight_category,
        "severity": severity,
        "metrics": metrics,
    }
    if project_id:
        row["project_id"] = project_id
    if monitoring_request_id:
        row["monitoring_request_id"] = monitoring_request_id
    if camera_label:
        row["camera_label"] = camera_label
    if source_stream_id:
        row["source_stream_id"] = source_stream_id

    client.table("monitoring_vision_insights").insert(row).execute()

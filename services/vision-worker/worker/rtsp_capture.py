import logging
import time

import cv2

logger = logging.getLogger(__name__)


def open_capture(rtsp_url: str) -> cv2.VideoCapture:
    cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    return cap


def read_frame_grab_flush(cap: cv2.VideoCapture):
    """Drop backlog then read one fresh frame (common RTSP latency trick)."""
    for _ in range(3):
        cap.grab()
    ok, frame = cap.read()
    return ok, frame


def reconnect_loop(rtsp_url: str, backoff_max: float = 60.0):
    """Yields (cap, frame_bgr) after successful read; recreates capture on failure."""
    backoff = 1.0
    cap: cv2.VideoCapture | None = None
    while True:
        if cap is None or not cap.isOpened():
            if cap is not None:
                cap.release()
            logger.warning("Opening RTSP stream (backoff=%.1fs)", backoff)
            cap = open_capture(rtsp_url)
            if not cap.isOpened():
                time.sleep(backoff)
                backoff = min(backoff * 2, backoff_max)
                continue
            backoff = 1.0

        ok, frame = read_frame_grab_flush(cap)
        if not ok or frame is None:
            logger.warning("RTSP read failed; reconnecting")
            cap.release()
            cap = None
            time.sleep(2)
            continue

        yield cap, frame

import logging
from dataclasses import dataclass

import numpy as np

logger = logging.getLogger(__name__)

# COCO class id for "person"
PERSON_CLASS_ID = 0


@dataclass
class FrameAnalysis:
    person_count: int
    raw_detections: int


class PersonDetector:
    """YOLOv8(n) person counting on CPU or CUDA."""

    def __init__(self, model_name: str, confidence: float, device: str) -> None:
        from ultralytics import YOLO

        self._confidence = confidence
        self._model = YOLO(model_name)
        self._device = device

    def analyze(self, frame_bgr: np.ndarray) -> FrameAnalysis:
        results = self._model.predict(
            source=frame_bgr,
            conf=self._confidence,
            device=self._device,
            verbose=False,
            classes=[PERSON_CLASS_ID],
        )
        if not results:
            return FrameAnalysis(person_count=0, raw_detections=0)

        r0 = results[0]
        boxes = r0.boxes
        if boxes is None or len(boxes) == 0:
            return FrameAnalysis(person_count=0, raw_detections=0)

        n = int(len(boxes))
        return FrameAnalysis(person_count=n, raw_detections=n)

#!/usr/bin/env python3
"""UjenziPro vision worker: RTSP → YOLOv8 (persons) → monitoring_vision_insights."""

import sys

from dotenv import load_dotenv

load_dotenv()

from worker.config import Settings
from worker.pipeline import run_forever


def main() -> None:
    try:
        settings = Settings.from_env()
    except ValueError as e:
        print(f"Configuration error: {e}", file=sys.stderr)
        sys.exit(1)
    run_forever(settings)


if __name__ == "__main__":
    main()

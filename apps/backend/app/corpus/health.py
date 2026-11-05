"""Worker liveness, refreshed while idle and after committed import batches."""

import time
from pathlib import Path

HEARTBEAT = Path("/tmp/corpus-worker-heartbeat")


def heartbeat():
    HEARTBEAT.touch()


if __name__ == "__main__":
    try:
        healthy = time.time() - HEARTBEAT.stat().st_mtime < 120
    except OSError:
        healthy = False
    raise SystemExit(0 if healthy else 1)

import os
from pathlib import Path


def get_reading_directory() -> Path:
    default = Path(__file__).resolve().parents[2] / "data" / "readings"
    return Path(os.getenv("READING_DATA_DIR", str(default)))

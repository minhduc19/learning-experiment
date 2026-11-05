import os
from pathlib import Path


def storage_directory() -> Path:
    return Path(
        os.getenv(
            "CORPUS_DATA_DIR",
            str(Path(__file__).resolve().parents[2] / "data" / "corpus"),
        )
    )


def max_upload_bytes() -> int:
    return int(os.getenv("CORPUS_MAX_UPLOAD_BYTES", str(1024**3)))


MAX_PATCH_BYTES = 8 * 1024**2
MAX_FRAGMENT_CHARACTERS = 4096
MAX_SEGMENT_CHARACTERS = 256

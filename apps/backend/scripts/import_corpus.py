#!/usr/bin/env python3
"""Upload a UTF-8 story in bounded chunks using only Python's standard library."""

import argparse
import json
from pathlib import Path
from urllib.request import Request, urlopen


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("file", type=Path)
    parser.add_argument("--api", default="http://localhost:8000")
    parser.add_argument("--title")
    parser.add_argument(
        "--upload-id", help="Resume the upload ID printed by an earlier run"
    )
    args = parser.parse_args()
    base = args.api.rstrip("/") + "/api/corpus"

    def request(path, method="GET", data=None, headers=None):
        if isinstance(data, dict):
            data = json.dumps(data).encode()
            headers = {"Content-Type": "application/json", **(headers or {})}
        with urlopen(
            Request(base + path, data=data, headers=headers or {}, method=method),
            timeout=120,
        ) as response:
            body = response.read()
            return json.loads(body) if body else None

    size = args.file.stat().st_size
    limits = request("/limits")
    if size > limits["max_upload_bytes"]:
        parser.error(f"File exceeds server limit of {limits['max_upload_bytes']} bytes")
    identifier = args.upload_id
    if not identifier:
        identifier = request(
            "/uploads", "POST", {"filename": args.file.name, "size": size}
        )["id"]
    print(f"Upload ID: {identifier}", flush=True)
    print(f"To resume: add --upload-id {identifier}", flush=True)
    status = request("/uploads/" + identifier)
    if status["size"] != size:
        parser.error("Existing upload size does not match this file")
    offset = status["offset_bytes"]
    with args.file.open("rb") as source:
        source.seek(offset)
        while chunk := source.read(limits["max_chunk_bytes"]):
            request(
                "/uploads/" + identifier,
                "PATCH",
                chunk,
                {
                    "Content-Type": "application/octet-stream",
                    "Upload-Offset": str(offset),
                },
            )
            offset += len(chunk)
            print(f"Uploaded {offset}/{size} bytes", flush=True)
    job = request(
        "/imports",
        "POST",
        {"upload_id": identifier, "title": args.title or args.file.stem},
    )
    print(json.dumps(job, ensure_ascii=False, indent=2))
    print("Progress: " + base + "/imports/" + job["id"])


if __name__ == "__main__":
    main()

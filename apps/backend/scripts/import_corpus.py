#!/usr/bin/env python3
"""Upload a UTF-8 story in bounded chunks using only Python's standard library."""

import argparse
import getpass
import json
from http.cookiejar import CookieJar
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import HTTPCookieProcessor, Request, build_opener


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("file", type=Path)
    parser.add_argument("--api", default="http://localhost:8000")
    parser.add_argument("--title")
    parser.add_argument(
        "--email", help="Your account email; the password is prompted securely"
    )
    parser.add_argument(
        "--upload-id", help="Resume the upload ID printed by an earlier run"
    )
    args = parser.parse_args()
    base = args.api.rstrip("/") + "/api/corpus"

    opener = build_opener(HTTPCookieProcessor(CookieJar()))
    email = args.email or input("Email: ")
    token = None

    def auth_request(path, data=None):
        body = json.dumps(data).encode() if data else None
        with opener.open(
            Request(
                args.api.rstrip("/") + "/api/auth/" + path,
                data=body,
                method="POST",
                headers={"Content-Type": "application/json"},
            ),
            timeout=30,
        ) as response:
            return json.loads(response.read())

    def sign_in():
        return auth_request(
            "login", {"email": email, "password": getpass.getpass("Password: ")}
        )["access_token"]

    token = sign_in()

    def request(path, method="GET", data=None, headers=None):
        nonlocal token
        if isinstance(data, dict):
            data = json.dumps(data).encode()
            headers = {"Content-Type": "application/json", **(headers or {})}
        for attempt in range(2):
            try:
                with opener.open(
                    Request(
                        base + path,
                        data=data,
                        headers={**(headers or {}), "Authorization": "Bearer " + token},
                        method=method,
                    ),
                    timeout=120,
                ) as response:
                    body = response.read()
                    return json.loads(body) if body else None
            except HTTPError as error:
                if error.code != 401 or attempt:
                    raise
                try:
                    token = auth_request("refresh")["access_token"]
                except HTTPError:
                    token = sign_in()

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

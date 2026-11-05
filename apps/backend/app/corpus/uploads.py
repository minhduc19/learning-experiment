import os
from uuid import uuid4

from fastapi import HTTPException

from app.auth.dependencies import user_id
from app.corpus.config import max_upload_bytes, storage_directory
from app.corpus.database import connect
from app.corpus.script_forms import CONVERSION_VERSION
from app.corpus.worker import fingerprint, path_for


def create_upload(data):
    if data.size > max_upload_bytes():
        raise HTTPException(
            413, f"File exceeds the configured {max_upload_bytes()} byte limit"
        )
    if not data.filename.lower().endswith(".txt"):
        raise HTTPException(422, "Upload a UTF-8 .txt file")
    identifier = uuid4()
    storage_directory().mkdir(parents=True, exist_ok=True)
    # The original filename is metadata only; never use it as a server path.
    with path_for(identifier).open("xb"):
        pass
    with connect() as db:
        row = db.execute(
            "INSERT INTO corpus.uploads(id,filename,size,user_id) VALUES (%s,%s,%s,%s) RETURNING *",
            (identifier, data.filename, data.size, user_id()),
        ).fetchone()
    return row


def upload_status(identifier):
    with connect() as db:
        row = db.execute(
            "SELECT * FROM corpus.uploads WHERE id=%s AND user_id=%s",
            (identifier, user_id()),
        ).fetchone()
    if row is None:
        raise HTTPException(404, "Upload not found")
    return row


def append_upload(identifier, offset, patch, size):
    with connect() as db:
        row = db.execute(
            "SELECT * FROM corpus.uploads WHERE id=%s AND user_id=%s FOR UPDATE",
            (identifier, user_id()),
        ).fetchone()
        if row is None:
            raise HTTPException(404, "Upload not found")
        if db.execute(
            "SELECT 1 FROM corpus.stories WHERE upload_id=%s", (identifier,)
        ).fetchone():
            raise HTTPException(409, "Upload is already queued and immutable")
        if row["offset_bytes"] != offset:
            raise HTTPException(
                409, "Upload offset mismatch; fetch the current offset before retrying"
            )
        if offset + size > row["size"]:
            raise HTTPException(413, "Chunk exceeds the declared file size")
        with path_for(identifier).open("r+b") as destination:
            destination.seek(offset)
            destination.truncate()
            patch.seek(0)
            while chunk := patch.read(65536):
                destination.write(chunk)
            destination.flush()
            os.fsync(destination.fileno())
        return db.execute(
            "UPDATE corpus.uploads SET offset_bytes=offset_bytes+%s WHERE id=%s RETURNING *",
            (size, identifier),
        ).fetchone()


def create_import(data):
    segmentation_version = fingerprint()
    with connect() as db:
        row = db.execute(
            "SELECT * FROM corpus.uploads WHERE id=%s AND user_id=%s FOR UPDATE",
            (data.upload_id, user_id()),
        ).fetchone()
        if row is None:
            raise HTTPException(404, "Upload not found")
        existing = db.execute(
            "SELECT id,story_id,status FROM corpus.import_jobs WHERE story_id IN (SELECT id FROM corpus.stories WHERE upload_id=%s)",
            (data.upload_id,),
        ).fetchone()
        if existing:
            return existing
        if row["offset_bytes"] != row["size"]:
            raise HTTPException(409, "Upload is incomplete")
        story_id, job_id = uuid4(), uuid4()
        db.execute(
            "INSERT INTO corpus.stories(id,upload_id,title,segmentation_version,conversion_version,user_id) VALUES (%s,%s,%s,%s,%s,%s)",
            (
                story_id,
                data.upload_id,
                data.title,
                segmentation_version,
                CONVERSION_VERSION,
                user_id(),
            ),
        )
        return db.execute(
            "INSERT INTO corpus.import_jobs(id,story_id) VALUES (%s,%s) RETURNING id,story_id,status",
            (job_id, story_id),
        ).fetchone()

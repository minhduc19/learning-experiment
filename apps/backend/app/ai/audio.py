"""Owned, persistent option recordings. One initial attempt and one explicit retry."""

import hashlib
import os
from time import monotonic
from threading import BoundedSemaphore
from typing import Annotated
from uuid import UUID, uuid4

import httpx
from elevenlabs.client import ElevenLabs
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import Field, field_validator, model_validator

from app.auth.dependencies import current_user, user_id
from app.corpus.config import storage_directory
from app.corpus.database import connect
from app.corpus.routes import CorpusRoute
from app.lessons.routes import Model, read_json, validate

from app.ai.voice import DEFAULT_VOICE, voice_id as normalize_voice

VOICE = DEFAULT_VOICE
MODEL = "eleven_multilingual_v2"
MAX_BYTES = 5 * 1024 * 1024
slots = BoundedSemaphore(2)
router = APIRouter(route_class=CorpusRoute, dependencies=[Depends(current_user)])


class AudioRequest(Model):
    text: str = Field(min_length=1, max_length=2000)
    retry: bool = False
    voice_id: str | None = VOICE

    @field_validator('voice_id')
    @classmethod
    def validate_voice(cls, value):
        return normalize_voice(value)

    @model_validator(mode="after")
    def nonblank(self):
        if not self.text.strip():
            raise ValueError("Option text must not be blank")
        return self


def audio_path(identifier):
    return storage_directory() / "option-audio" / (str(UUID(str(identifier))) + ".mp3")


def result(row):
    return {"audio_id": str(row["id"]) if row["status"] == "ready" else None,
            "status": row["status"], "attempts": row["attempts"],
            "can_retry": row["status"] == "failed" and row["attempts"] == 1}


def synthesize(text, path, key, voice_id=VOICE):
    started = monotonic()
    with httpx.Client(timeout=45) as transport:
        client = ElevenLabs(api_key=key, httpx_client=transport)
        with client.text_to_speech.with_raw_response.convert(
            text=text, voice_id=voice_id or "", model_id=MODEL, output_format="mp3_44100_128",
            request_options={"max_retries": 0, "timeout_in_seconds": 45},
        ) as response:
            size = 0
            with path.open("wb") as output:
                for chunk in response.data:
                    size += len(chunk)
                    if size > MAX_BYTES or monotonic() - started > 60:
                        raise ValueError("Audio exceeded generation limits")
                    output.write(chunk)
            if not size:
                raise ValueError("No audio returned")
            return tuple(response.headers.get(name) for name in ("character-cost", "request-id", "x-trace-id"))


@router.post("")
def generate_audio(raw: Annotated[object, Depends(read_json)]):
    request = validate(AudioRequest, raw)
    if not slots.acquire(blocking=False):
        raise HTTPException(429, "Audio generation is busy. Try again shortly.")
    try:
        return generate(request)
    finally:
        slots.release()


def generate(request):
    fingerprint = hashlib.sha256(((request.voice_id or "") + "\0" + MODEL + "\0" + request.text).encode()).hexdigest()
    # A transaction-level lock also works across backend processes. Commit the attempt
    # before contacting the provider so a crash cannot reset the paid-attempt counter.
    with connect() as db:
        lock = int.from_bytes(hashlib.sha256((str(user_id()) + fingerprint).encode()).digest()[:8], "big", signed=True)
        if not db.execute("SELECT pg_try_advisory_xact_lock(%s) AS locked", (lock,)).fetchone()["locked"]:
            raise HTTPException(409, "This option audio is already being processed")
        row = db.execute("SELECT *,updated_at < now()-interval '2 minutes' AS expired FROM corpus.option_audio WHERE user_id=%s AND fingerprint=%s FOR UPDATE", (user_id(), fingerprint)).fetchone()
        if row and row["status"] == "pending" and audio_path(row["id"]).is_file():
            row = db.execute("UPDATE corpus.option_audio SET status='ready',updated_at=now() WHERE id=%s RETURNING *,false AS expired", (row["id"],)).fetchone()
        if row and row["status"] == "ready":
            if audio_path(row["id"]).is_file():
                return result(row)
            raise HTTPException(503, "Stored audio is unavailable. Check persistent server storage.")
        if row and row["status"] == "pending" and not row["expired"]:
            raise HTTPException(409, "This option audio is still generating. Check again shortly.")
        if row:
            row["status"] = "failed"
            db.execute("UPDATE corpus.option_audio SET status='failed' WHERE id=%s", (row["id"],))
            if not request.retry or row["attempts"] >= 2:
                return result(row)
        elif request.retry:
            raise HTTPException(422, "Generate this option before retrying")
        key = os.getenv("ELEVEN", "").strip()
        if not key:
            raise HTTPException(503, "Audio generation is not configured. Set the ELEVEN Actions secret and redeploy.")
        if row:
            row = db.execute("UPDATE corpus.option_audio SET attempts=attempts+1,status='pending',updated_at=now() WHERE id=%s RETURNING *", (row["id"],)).fetchone()
        else:
            row = db.execute("INSERT INTO corpus.option_audio(id,user_id,fingerprint,text,voice_id,model_id,status,attempts) VALUES (%s,%s,%s,%s,%s,%s,'pending',1) RETURNING *", (uuid4(), user_id(), fingerprint, request.text, request.voice_id or "", MODEL)).fetchone()
    path = audio_path(row["id"])
    temporary = path.with_suffix(".tmp")
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        cost, request_id, trace_id = synthesize(request.text, temporary, key, request.voice_id)
        temporary.replace(path)
    except Exception:
        temporary.unlink(missing_ok=True)
        with connect() as db:
            db.execute("UPDATE corpus.option_audio SET status='failed',updated_at=now() WHERE id=%s", (row["id"],))
        row["status"] = "failed"
        return {**result(row), "message": "Audio generation failed. Successful recordings are preserved."}
    with connect() as db:
        row = db.execute("UPDATE corpus.option_audio SET status='ready',character_cost=%s,request_id=%s,trace_id=%s,updated_at=now() WHERE id=%s RETURNING *", (cost, request_id, trace_id, row["id"])).fetchone()
    return result(row)


@router.get("/{identifier}")
def get_audio(identifier: UUID):
    with connect() as db:
        row = db.execute("SELECT id FROM corpus.option_audio WHERE id=%s AND user_id=%s AND status='ready'", (identifier, user_id())).fetchone()
    if not row or not audio_path(identifier).is_file():
        raise HTTPException(404, "Audio not found")
    return FileResponse(audio_path(identifier), media_type="audio/mpeg")

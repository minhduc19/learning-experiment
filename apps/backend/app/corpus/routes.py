"""Resumable raw-byte uploads and paginated corpus concordance APIs."""

from functools import wraps
from tempfile import TemporaryFile
from typing import Annotated, Literal
from uuid import UUID

import psycopg
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response
from fastapi.responses import StreamingResponse
from fastapi.routing import APIRoute
from starlette.concurrency import run_in_threadpool

from app.auth.dependencies import current_user, user_id
from app.corpus import practice, progress, queries, uploads
from app.corpus.config import MAX_PATCH_BYTES, max_upload_bytes, storage_directory
from app.corpus.database import connect
from app.corpus.schemas import (
    Character,
    CharacterDetail,
    CharacterProgress,
    CharacterProgressUpdate,
    ImportAccepted,
    ImportCreate,
    ImportStatus,
    Page,
    Segment,
    Sentence,
    UploadCreate,
    UploadStatus,
)


class CorpusRoute(APIRoute):
    def get_route_handler(self):
        handler = super().get_route_handler()

        @wraps(handler)
        async def safe(request):
            try:
                response = await handler(request)
                response.headers["Cache-Control"] = "private, no-store"
                return response
            except psycopg.Error:
                raise HTTPException(
                    503,
                    "Corpus database unavailable; check migrations and database health",
                ) from None
            except OSError:
                raise HTTPException(503, "Corpus file storage unavailable") from None

        return safe


router = APIRouter(route_class=CorpusRoute, dependencies=[Depends(current_user)])
Limit = Annotated[int, Query(ge=1, le=100)]
Cursor = Annotated[str | None, Query(max_length=2048)]


@router.get("/practice-sentences")
def practice_sentences(
    cursor: Cursor = None, limit: Annotated[int, Query(ge=1, le=50)] = 20
):
    """Rank owned logical sentences by marked Han occurrences; return bounded original-text excerpts.

    Both flags count once in matched_count. The three breakdown counts are disjoint.
    Refresh pagination after changing marks or importing stories.
    """
    return practice.practice_sentences(cursor, limit)


@router.get("/limits")
def limits():
    return {
        "max_upload_bytes": max_upload_bytes(),
        "max_chunk_bytes": MAX_PATCH_BYTES,
        "encoding": "utf-8",
    }


@router.post("/uploads", status_code=201, response_model=UploadStatus)
def create_upload(data: UploadCreate, response: Response):
    """Start a resumable UTF-8 .txt upload; filename is metadata, size is bytes."""
    result = uploads.create_upload(data)
    response.headers["Location"] = f"/api/corpus/uploads/{result['id']}"
    return result


@router.get("/uploads/{upload_id}", response_model=UploadStatus)
def upload_status(upload_id: UUID):
    """Read offset_bytes to resume an interrupted upload."""
    return uploads.upload_status(upload_id)


@router.head("/uploads/{upload_id}")
def upload_head(upload_id: UUID, response: Response):
    row = uploads.upload_status(upload_id)
    response.headers["Upload-Offset"] = str(row["offset_bytes"])
    response.headers["Upload-Length"] = str(row["size"])
    response.headers["Cache-Control"] = "no-store"


@router.patch(
    "/uploads/{upload_id}",
    status_code=204,
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {
                "application/octet-stream": {
                    "schema": {"type": "string", "format": "binary"}
                }
            },
        }
    },
)
async def append_upload(
    upload_id: UUID,
    request: Request,
    response: Response,
    upload_offset: Annotated[int, Header(ge=0)],
):
    """Append at most 8 MiB of raw bytes at Upload-Offset. Retry using the saved offset.

    This is a small project-specific protocol, not an implementation of tus.
    UTF-8 byte sequences may span chunks; validation happens in the import worker.
    """
    await run_in_threadpool(uploads.upload_status, upload_id)
    if (
        request.headers.get("content-type", "").split(";")[0]
        != "application/octet-stream"
    ):
        raise HTTPException(415, "Use application/octet-stream for raw file bytes")
    await run_in_threadpool(storage_directory().mkdir, parents=True, exist_ok=True)
    size = 0
    with TemporaryFile(dir=storage_directory()) as patch:
        async for chunk in request.stream():
            size += len(chunk)
            if size > MAX_PATCH_BYTES:
                raise HTTPException(
                    413, f"Chunks may contain at most {MAX_PATCH_BYTES} bytes"
                )
            await run_in_threadpool(patch.write, chunk)
        if size == 0:
            raise HTTPException(422, "Upload chunk is empty")
        row = await run_in_threadpool(
            uploads.append_upload, upload_id, upload_offset, patch, size
        )
    response.headers["Upload-Offset"] = str(row["offset_bytes"])


@router.post("/imports", status_code=202, response_model=ImportAccepted)
def create_import(data: ImportCreate, response: Response):
    """Queue a completed upload. Repeated requests for an upload return its existing job."""
    row = uploads.create_import(data)
    response.headers["Location"] = f"/api/corpus/imports/{row['id']}"
    return row


@router.get("/imports/{import_id}", response_model=ImportStatus)
def import_status(import_id: UUID):
    with connect() as db:
        row = db.execute(
            """SELECT j.*,s.title,s.byte_offset,s.character_count,s.fragment_count,
            s.sentence_position AS completed_sentence_count,s.segmentation_version,s.conversion_version,s.checksum,
            u.size AS total_bytes FROM corpus.import_jobs j JOIN corpus.stories s ON s.id=j.story_id
            JOIN corpus.uploads u ON u.id=s.upload_id WHERE j.id=%s AND s.user_id=%s""",
            (import_id, user_id()),
        ).fetchone()
    if row is None:
        raise HTTPException(404, "Import not found")
    row["progress"] = row["byte_offset"] / row["total_bytes"]
    return row


@router.post(
    "/imports/{import_id}/retry", status_code=202, response_model=ImportAccepted
)
def retry_import(import_id: UUID):
    with connect() as db:
        row = db.execute(
            "SELECT j.* FROM corpus.import_jobs j JOIN corpus.stories s ON s.id=j.story_id WHERE j.id=%s AND s.user_id=%s FOR UPDATE OF j",
            (import_id, user_id()),
        ).fetchone()
        if row is None:
            raise HTTPException(404, "Import not found")
        if row["status"] != "failed":
            raise HTTPException(409, "Only failed jobs can be retried")
        db.execute(
            "UPDATE corpus.import_jobs SET status='queued',error=NULL,updated_at=now() WHERE id=%s",
            (import_id,),
        )
        db.execute(
            "UPDATE corpus.stories SET status='queued' WHERE id=%s", (row["story_id"],)
        )
    return {"id": import_id, "story_id": row["story_id"], "status": "queued"}


@router.get("/stories")
def stories(
    limit: Limit = 50, after: UUID | None = None, include_pending: bool = False
):
    with connect() as db:
        rows = db.execute(
            """SELECT s.id,s.title,s.status,s.character_count,s.fragment_count,s.sentence_position AS sentence_count,
            s.checksum,s.conversion_version,s.created_at,j.id AS import_id FROM corpus.stories s JOIN corpus.import_jobs j ON j.story_id=s.id WHERE s.user_id=%s AND (%s OR s.status='completed') AND s.id>%s ORDER BY s.id LIMIT %s""",
            (user_id(), include_pending, after or UUID(int=0), limit + 1),
        ).fetchall()
    return {
        "items": rows[:limit],
        "next_after": rows[limit - 1]["id"] if len(rows) > limit else None,
    }


@router.get("/stories/{story_id}")
def story_detail(story_id: UUID):
    with connect() as db:
        row = db.execute(
            "SELECT s.*,j.id AS import_id FROM corpus.stories s JOIN corpus.import_jobs j ON j.story_id=s.id WHERE s.id=%s AND s.user_id=%s",
            (story_id, user_id()),
        ).fetchone()
    if not row:
        raise HTTPException(404, "Story not found")
    return row


@router.get("/characters", response_model=Page[Character])
def characters(
    sort: Literal["occurrence_count", "distinct_segment_count"] = "occurrence_count",
    story_id: UUID | None = None,
    include_non_han: bool = False,
    character: Annotated[str | None, Query(min_length=1, max_length=1)] = None,
    cursor: Cursor = None,
    limit: Limit = 50,
):
    """Rank completed imports. Distinct segments count unique word texts, not occurrences.

    Cursor pages are stable while the corpus is unchanged. Restart pagination
    when publishing new stories, which can change ranking values.
    """
    return queries.characters(sort, story_id, include_non_han, cursor, limit, character)


@router.get("/characters/{character_id}", response_model=CharacterDetail)
def character_detail(character_id: int, story_id: UUID | None = None):
    """Character counts and distinct logical sentence total from completed stories."""
    return queries.character_detail(character_id, story_id)


@router.patch("/characters/{character_id}/progress", response_model=CharacterProgress)
def update_character_progress(character_id: int, data: CharacterProgressUpdate):
    """Set either or both personal flags. Both true means revision.

    Only characters in the current user's completed corpus may be marked.
    Omitted flags keep their previous values; false removes a mark.
    """
    return progress.update_character_progress(character_id, data)


@router.get(
    "/characters/{character_id}/segments",
    response_model=Page[Segment],
    response_model_exclude_unset=True,
)
def character_segments(
    character_id: int,
    story_id: UUID | None = None,
    include_non_words: bool = False,
    include_sentence_counts: bool = False,
    cursor: Cursor = None,
    limit: Limit = 50,
):
    return queries.character_segments(
        character_id,
        story_id,
        include_non_words,
        cursor,
        limit,
        include_sentence_counts,
    )


@router.get("/characters/{character_id}/sentences", response_model=Page[Sentence])
def character_sentences(
    character_id: int,
    story_id: UUID | None = None,
    cursor: Cursor = None,
    limit: Limit = 50,
):
    """Distinct sentence fragments with every matching character position highlighted by offsets."""
    return queries.sentences(
        character_id=character_id, story_id=story_id, cursor=cursor, limit=limit
    )


@router.get("/segments/{segment_id}/sentences", response_model=Page[Sentence])
def segment_sentences(
    segment_id: int,
    story_id: UUID | None = None,
    cursor: Cursor = None,
    limit: Limit = 50,
):
    return queries.sentences(
        segment_id=segment_id, story_id=story_id, cursor=cursor, limit=limit
    )


@router.get("/stories/{story_id}/sentences", response_model=Page[Sentence])
def story_sentences(story_id: UUID, cursor: Cursor = None, limit: Limit = 50):
    """Source order. Long sentences have ordered parts sharing sentence_position.

    position orders all fragments; part_position orders a logical sentence's
    pieces. is_final identifies its last part. All offsets count Unicode code
    points, not UTF-8 bytes or JavaScript UTF-16 code units; end is exclusive.
    """
    return queries.sentences(story_id=story_id, cursor=cursor, limit=limit)


@router.get("/stories/{story_id}/text")
def export_story(
    story_id: UUID,
    script: Literal["original", "traditional", "simplified"] = "original",
):
    """Stream original text (default) or the stored traditional/simplified forms in source order."""
    with connect() as db:
        queries.require_story(db, story_id)
    return StreamingResponse(
        queries.stream_text(story_id, script, owner_id=user_id()),
        media_type="text/plain; charset=utf-8",
    )

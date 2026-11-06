"""Resumable raw-byte uploads and paginated corpus concordance APIs."""

import logging
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
from app.corpus import history, practice, progress, queries, study, uploads
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
    SegmentProgress,
    SegmentProgressUpdate,
    Sentence,
    UploadCreate,
    UploadStatus,
)

logger = logging.getLogger("uvicorn.error")


class CorpusRoute(APIRoute):
    def get_route_handler(self):
        handler = super().get_route_handler()

        @wraps(handler)
        async def safe(request):
            try:
                response = await handler(request)
                response.headers["Cache-Control"] = "private, no-store"
                return response
            except psycopg.Error as error:
                logger.exception(
                    "Corpus database failure: method=%s path=%s sqlstate=%s",
                    request.method,
                    request.url.path,
                    error.sqlstate,
                )
                raise HTTPException(
                    503,
                    "Corpus database unavailable; check migrations and database health",
                ) from None
            except OSError:
                logger.exception(
                    "Corpus storage failure: method=%s path=%s",
                    request.method,
                    request.url.path,
                )
                raise HTTPException(503, "Corpus file storage unavailable") from None

        return safe


router = APIRouter(route_class=CorpusRoute, dependencies=[Depends(current_user)])
Limit = Annotated[int, Query(ge=1, le=100)]
Cursor = Annotated[str | None, Query(max_length=2048)]


@router.get("/study-selection")
def study_selection(
    learned_count: Annotated[int, Query(ge=0, le=50)] = 5,
    new_count: Annotated[int, Query(ge=0, le=50)] = 5,
):
    """Random learned review and new characters from sentences ranked by learned occurrences.

    Learned includes revision; new excludes learned and can include learning-only.
    Candidates within each ranked sentence sort by owned corpus frequency.
    Generates suggestions without changing marks. Each count is capped at 50.
    """
    return study.select_study(learned_count, new_count)


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
    direction: Literal["asc", "desc"] = "desc",
    status: Literal[
        "all",
        "unmarked",
        "learned",
        "learning",
        "learned_only",
        "learning_only",
        "revision",
        "marked",
    ] = "all",
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
    return queries.characters(
        sort, story_id, include_non_han, cursor, limit, character, direction, status
    )


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


@router.patch("/segments/{segment_id}/progress", response_model=SegmentProgress)
def update_segment_progress(segment_id: int, data: SegmentProgressUpdate):
    """Set either or both personal segment flags; both true means revision.

    Requires the segment in the user's completed corpus. Omitted flags retain
    their values; false removes a mark. Character marks remain independent.
    """
    return progress.update_segment_progress(segment_id, data)


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


@router.post("/study-history", status_code=201)
def save_study_selection(
    learned_count: Annotated[int, Query(ge=0, le=50)] = 5,
    new_count: Annotated[int, Query(ge=0, le=50)] = 5,
):
    return history.generate(learned_count, new_count)


@router.get("/study-history")
def study_history(before: Annotated[int, Query(ge=0)] = 0):
    return history.listing(before)


@router.get("/study-history/{identifier}")
def saved_study_selection(identifier: UUID):
    return history.retrieve(identifier)


@router.get("/segments/{segment_id}")
def segment_detail(segment_id: int):
    from app.corpus.script_forms import hydrate_forms

    with connect() as db:
        queries.require_vocabulary(db, "segment", segment_id)
        row = db.execute(
            """SELECT s.*,coalesce(p.learned,false) AS learned,
            coalesce(p.learning,false) AS learning,coalesce(p.practice,0) AS practice
            FROM corpus.segments s LEFT JOIN corpus.user_segment_progress p ON p.segment_id=s.id AND p.user_id=%s
            WHERE s.id=%s""",
            (user_id(), segment_id),
        ).fetchone()
        row["characters"] = db.execute(
            """SELECT c.* FROM corpus.segment_characters sc
            JOIN corpus.characters c ON c.id=sc.character_id WHERE sc.segment_id=%s ORDER BY c.id""",
            (segment_id,),
        ).fetchall()
        row["characters"] = [
            hydrate_forms(char, "value", vocabulary=True) for char in row["characters"]
        ]
    return hydrate_forms(row, "text", vocabulary=True)
